# Party Agent Nomination Platform — Bulk Export Design Spec

**Date:** 2026-09-22
**Status:** Approved by user, pending self-review + user sign-off on this file before an implementation plan is written.
**Sub-project 4 of 4** (final) in the larger Party Agent Nomination Platform (see `docs/superpowers/specs/2026-09-17-agent-nomination-foundation-design.md` for schema/auth, `docs/superpowers/specs/2026-09-18-agent-nomination-submission-flow-design.md` for the nominee wizard and PDF generation, `docs/superpowers/specs/2026-09-22-agent-nomination-candidate-dashboard-design.md` for the candidate dashboard this adds a button to).

## Context

Two gaps remain from the original PRD's "Bulk export" item, one of which was only discovered during this spec's brainstorming and is more significant than the export itself:

1. **The generated PDF is missing the ID document.** `generateNominationPdf` (`src/lib/agents/pdf-generate.ts`, built in Sub-project 2) stamps the photo and signature into boxes on the single-page official form template, but never receives or uses the uploaded means-of-ID file (`pvc_file` — the field is named for PVC but the wizard requires it regardless of which of PVC/NIN/BVN is selected, per `src/app/agents/submit/[slug]/steps/identification-step.tsx`). The file is uploaded to storage and linked via `agent_nomination_files` (`file_type: "pvc_copy"`), but the "generated PDF" nominees and the admin download today is just the form — the ID copy INEC expects attached is a separate, unmerged file. This must be fixed before the export matters, since export just bundles whatever `generated_pdf` already contains.
2. **No way for a candidate to get all their nominees' paperwork in one download.** Today each nomination's generated PDF is only reachable one at a time, from its own detail page (`/agents/nominations/[id]`).

There are no real (non-test) nominations submitted yet, so the PDF fix applies going forward only — no backfill/regeneration step is needed.

## Decisions locked in with the user before this spec

1. **Export is candidate-only**, run from their own dashboard (`/agents`) — no admin-side cross-candidate export. Matches the read-only, self-service shape the candidate dashboard already has.
2. **Export produces a zip of the existing generated PDFs** — not a CSV, not a newly-merged single PDF. Each nomination's already-generated per-agent PDF (form + ID page, after the fix below) goes into the zip unchanged.
3. **ID-page fix, not PDF-type-specific handling beyond what's needed:**
   - If the ID upload is an image (JPEG/PNG) → embedded as a new page, same technique already used for the photo/signature (`doc.embedPng`/`embedJpg` + `page.drawImage`).
   - If the ID upload is a PDF → its **first page only** is copied in via `pdfLib.copyPages(sourceDoc, [0])` and appended. Multi-page ID PDFs (e.g. front+back) are capped at page 1 — confirmed with the user, not treated as a gap to fix later.
4. **Synchronous, on-demand export — no background job.** At most a few hundred nominees per candidate (713 is the *entire* platform's ceiling across all candidates, not per-candidate), well within what a single request can zip and stream. No job table, no worker, no polling UI — the original PRD's "background job" framing is dropped as unnecessary for this scale, the same kind of scope correction made in Sub-projects 2 and 3.
5. **Export scope is always "everything this candidate has submitted,"** ignoring whatever search/duplicate filter is active on the list page — it's "give me all my paperwork," not "give me my current view."
6. **Empty state:** a candidate with zero nominations doesn't see an export control at all (rather than being able to trigger a request that produces an empty/near-empty zip).

## Part 1: ID page fix

### `src/lib/agents/pdf-generate.ts`

`GenerateNominationPdfInput` gains two fields:

```ts
idFileBytes: Uint8Array;
idFileContentType: "image/jpeg" | "image/png" | "application/pdf";
```

After the existing single-page form is built (photo/signature already drawn in), append the ID page:

- `image/jpeg` or `image/png`: embed via `doc.embedJpg`/`doc.embedPng` (same pattern as the existing `image()` helper in this file), add a new page sized to the embedded image's dimensions, draw it filling the page.
- `application/pdf`: `PDFDocument.load(idFileBytes)` to get a second `PDFDocument`, `doc.copyPages(idDoc, [0])` to copy just its first page, `doc.addPage(copiedPage)`.

This is the last step in `generateNominationPdf`, after the existing photo/signature drawing and before `doc.save()`.

### `src/app/agents/actions/submit.ts`

The call to `generateNominationPdf` already has `pvcBytes` and `pvcFile.type` in scope (both used earlier in the function for the storage upload) — pass them through as the two new fields. No new upload, no new query, no new validation: `pvcFile`'s type is already validated against `ALLOWED_PVC_TYPES` (`image/jpeg`, `image/png`, `application/pdf`) earlier in the same function, which is exactly the set `generateNominationPdf` now needs to handle.

## Part 2: Bulk export

### `src/app/agents/export/route.ts` (new)

A Route Handler, not a page — deliberately outside the `(dashboard)` route group, since:
- Route Handlers don't inherit a route group's `layout.tsx` guard, so this file calls `requireCandidateSession()` itself at the top (same function the dashboard layout uses — on failure it `redirect()`s to `/agents/login`, which works fine from a Route Handler).
- A plain link-triggered `GET` is the simplest way to get the browser to treat the response as a file download — no client-side JS, no Blob-URL plumbing, just `<a href="/agents/export">`.

```ts
export async function GET() {
  const session = await requireCandidateSession();
  const admin = createAdminSupabase();

  const { data: nominations } = await admin
    .from("agent_nominations")
    .select("id, reference_id, first_name, surname")
    .eq("candidate_id", session.id)
    .order("created_at", { ascending: true });

  const zip = new JSZip();
  for (const n of nominations ?? []) {
    const { data: fileRow } = await admin
      .from("agent_nomination_files")
      .select("storage_path")
      .eq("nomination_id", n.id)
      .eq("file_type", "generated_pdf")
      .maybeSingle();
    if (!fileRow) continue; // defensive: shouldn't happen post-fix, but never fail the whole export over one nominee

    const { data: blob } = await admin.storage.from("agent-nominations").download(fileRow.storage_path);
    if (!blob) continue;

    const safeName = `${n.reference_id}-${n.surname}-${n.first_name}`.replace(/[^a-zA-Z0-9-]/g, "_");
    zip.file(`${safeName}.pdf`, await blob.arrayBuffer());
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return new Response(zipBytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${session.slug}-nominations.zip"`,
    },
  });
}
```

Every query starts from `.eq("candidate_id", session.id)` (via the `nominations` query) — same isolation convention as the rest of the candidate dashboard (`src/lib/agents/nominations.ts`); the per-file query is scoped to a `nomination_id` already filtered to this candidate, so no separate ownership re-check is needed on the file query itself.

### `src/app/agents/(dashboard)/page.tsx`

Add an "Export all as ZIP" link (`<a href={agentsPath("/export")}>`, plain anchor — not a `<Link>`, since this must be a real navigation/download, not a client-side route transition) near the search/filter controls, rendered only when `total > 0` (Decision 6).

## File structure (new/modified files)

- Modify: `src/lib/agents/pdf-generate.ts` — append ID page (Part 1).
- Modify: `src/app/agents/actions/submit.ts` — pass `pvcBytes`/`pvcFile.type` through (Part 1).
- Create: `src/app/agents/export/route.ts` — zip export endpoint (Part 2).
- Modify: `src/app/agents/(dashboard)/page.tsx` — export link (Part 2).

`jszip` is already a dependency (added in Foundation, per that spec's "New dependencies" note, anticipating this sub-project).

## Testing

Same approach as the prior three sub-projects: `npm run lint` / `npm run build` (working around this environment's intermittent Google Fonts fetch failure the same way if it recurs), plus:
- A scripted check that `generateNominationPdf` produces a 2-page PDF for an image ID and a 2-page PDF for a PDF ID (page count assertion via `pdf-lib`'s `PDFDocument.load` on the output), confirming the multi-page-PDF-ID case only pulls in page 1.
- A scripted check against the real database/storage that the export endpoint's candidate-scoping actually excludes another candidate's files (create two candidates with nominations, hit the logic as each, assert isolation) — same pattern used to verify the dashboard's isolation in Sub-project 3.
- Disclosed manual dev-server testing (no browser automation available) — confirm `/agents/export` requires a session (redirects to login when logged out) and that a logged-in candidate with nominations gets a non-empty zip.

## Out of scope for this spec (deferred)

- Admin-side / cross-candidate export (Decision 1).
- CSV export (Decision 2) — not requested; revisit only if asked.
- Background job / async processing (Decision 4) — revisit only if real volume ever makes synchronous export impractical.
- Regenerating PDFs for nominations submitted before this fix — none exist (confirmed with user).
- Any Ward/LGA/State Desk Officer or separate National Admin role — still not planned, per the Foundation spec's original scope cut.
