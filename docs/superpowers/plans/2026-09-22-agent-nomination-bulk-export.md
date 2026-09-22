# Party Agent Nomination Platform — Bulk Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the generated nomination PDF to include the nominee's uploaded ID document as page 2, then let a candidate download a zip of every generated PDF they've submitted.

**Architecture:** `generateNominationPdf` (pdf-lib) grows two new inputs and appends one more page at the end of its existing draw sequence — image ID files are embedded exactly like the photo/signature already are; PDF ID files have their first page copied in via `copyPages`. `submit.ts` forwards bytes it already has in scope. Bulk export is a new Route Handler (`GET /agents/export`) that re-checks the candidate's session itself, downloads each of that candidate's `generated_pdf` storage objects, and streams a `jszip` archive back as the response — no job queue, matching the realistic per-candidate scale.

**Tech Stack:** Next.js 16 App Router (Route Handlers), pdf-lib, jszip (already a dependency), Supabase (service-role client + Storage).

**Spec:** `docs/superpowers/specs/2026-09-22-agent-nomination-bulk-export-design.md` — read this first; this plan implements it task-by-task. Also relevant: `docs/superpowers/specs/2026-09-18-agent-nomination-submission-flow-design.md` (PDF generation this modifies), `docs/superpowers/specs/2026-09-22-agent-nomination-candidate-dashboard-design.md` (dashboard this adds a link to).

## Global Constraints

- Candidate-only export; no admin-side export (spec Decision 1).
- Zip of existing generated PDFs, no CSV, no re-merging into one file (spec Decision 2).
- ID PDF uploads: first page only copied in, never all pages (spec Decision 3).
- Synchronous request/response, no background job (spec Decision 4).
- Export always covers every nomination the candidate has submitted, ignoring the list page's active search/duplicate filter (spec Decision 5).
- No PDF regeneration script — there are no pre-fix nominations to backfill (confirmed with user).
- Every database query in this feature starts from `.eq("candidate_id", <session id>)` — matches the isolation convention already established in `src/lib/agents/nominations.ts` and verified in Sub-project 3.

---

### Task 1: Append the ID document as page 2 of the generated PDF

**Files:**
- Modify: `src/lib/agents/pdf-generate.ts`
- Test: `verify-pdf-id-page-scratch.mjs` (scratchpad, not committed — see Step 5)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `generateNominationPdf(input: GeneratePdfInput)` now requires two additional fields on `input` — `idFileBytes: Uint8Array` and `idFileContentType: "image/jpeg" | "image/png" | "application/pdf"`. Task 2 (submit.ts) relies on this exact field naming and the exact three-value union type.

- [ ] **Step 1: Add the two new fields to `GeneratePdfInput`**

In `src/lib/agents/pdf-generate.ts`, extend the type:

```ts
export type GeneratePdfInput = {
  electionType: ElectionType;
  formNo: number;
  firstName: string;
  otherNames: string;
  surname: string;
  gender: "male" | "female";
  phone: string;
  email: string;
  meansOfId: string;
  state: string;
  lga: string;
  ward: number;
  pollingUnitCode: string;
  pollingUnitName: string;
  photoBytes: Uint8Array;
  signatureBytes: Uint8Array;
  idFileBytes: Uint8Array;
  idFileContentType: "image/jpeg" | "image/png" | "application/pdf";
  authorizedNominatorName: string;
  authorizedNominatorSignatureBytes: Uint8Array;
  submissionDate: Date;
};
```

- [ ] **Step 2: Append the ID page at the end of `generateNominationPdf`**

The function currently ends with:

```ts
  await image(input.photoBytes, PHOTO_BOX);
  await image(input.signatureBytes, SIGNATURE_BOXES.specimen);
  await image(input.signatureBytes, SIGNATURE_BOXES.attestation);
  await image(input.authorizedNominatorSignatureBytes, SIGNATURE_BOXES.authorisedNominator);

  return doc.save();
```

Change the ending to append the ID document as a new final page, immediately before `return doc.save();`:

```ts
  await image(input.photoBytes, PHOTO_BOX);
  await image(input.signatureBytes, SIGNATURE_BOXES.specimen);
  await image(input.signatureBytes, SIGNATURE_BOXES.attestation);
  await image(input.authorizedNominatorSignatureBytes, SIGNATURE_BOXES.authorisedNominator);

  await appendIdPage(doc, input.idFileBytes, input.idFileContentType);

  return doc.save();
```

Add the `appendIdPage` helper above `generateNominationPdf` (after the existing `formatDate` function, before `export async function generateNominationPdf`):

```ts
/**
 * Appends the nominee's uploaded means-of-ID document as a new final page.
 * Images are embedded and drawn full-page (same technique as the existing
 * photo/signature boxes). A PDF upload has only its first page copied in —
 * multi-page ID scans (e.g. front+back) are capped at page 1 by design.
 */
async function appendIdPage(
  doc: PDFDocument,
  bytes: Uint8Array,
  contentType: "image/jpeg" | "image/png" | "application/pdf",
): Promise<void> {
  if (contentType === "application/pdf") {
    const idDoc = await PDFDocument.load(bytes);
    const [copiedPage] = await doc.copyPages(idDoc, [0]);
    doc.addPage(copiedPage);
    return;
  }

  const embedded = contentType === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const page = doc.addPage([embedded.width, embedded.height]);
  page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: fails right now, because `submit.ts` (Task 2) doesn't yet pass the two new required fields — that's expected at this point. Confirm the *only* new errors are in `src/app/agents/actions/submit.ts` about the missing `idFileBytes`/`idFileContentType` properties, not inside `pdf-generate.ts` itself. If `pdf-generate.ts` itself has an error, fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/pdf-generate.ts
git commit -m "feat(agents): append ID document as page 2 of generated PDF

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verify with a scratch script (before moving to Task 2)**

This step can only run standalone after Task 2 also compiles (the type error from Step 3 must be gone), so come back to it once Task 2's Step 1 is done — or run it now by calling `generateNominationPdf`/`appendIdPage`-equivalent logic directly against a minimal fixture, whichever is easier at this point. Recommended: do this verification after Task 2 instead, against the real `generateNominationPdf`, to avoid duplicating template setup twice. Skip ahead to Task 2, then return to this exact step.

Create `verify-pdf-id-page-scratch.mjs` in the project root (this file is never committed — delete it at the end of Task 2):

```js
import { generateNominationPdf } from "./src/lib/agents/pdf-generate.ts";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";

// A 1x1 red PNG, valid enough for pdf-lib to embed.
const onePxPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const baseInput = {
  electionType: "house_of_assembly",
  formNo: 1,
  firstName: "Test",
  otherNames: "",
  surname: "Nominee",
  gender: "male",
  phone: "08000000000",
  email: "test@example.com",
  meansOfId: "PVC",
  state: "Oyo State",
  lga: "Ibadan North",
  ward: 1,
  pollingUnitCode: "PU001",
  pollingUnitName: "Test PU",
  photoBytes: onePxPng,
  signatureBytes: onePxPng,
  authorizedNominatorName: "Party Leader",
  authorizedNominatorSignatureBytes: onePxPng,
  submissionDate: new Date(),
};

// Case 1: image ID -> expect 2 pages total.
const imgResult = await generateNominationPdf({
  ...baseInput,
  idFileBytes: onePxPng,
  idFileContentType: "image/png",
});
const imgDoc = await PDFDocument.load(imgResult);
console.log("image ID pages (expect 2):", imgDoc.getPageCount());

// Case 2: single-page PDF ID -> expect 2 pages total.
const singlePagePdf = await PDFDocument.create();
singlePagePdf.addPage([200, 200]);
const singlePageBytes = await singlePagePdf.save();
const pdfResult = await generateNominationPdf({
  ...baseInput,
  idFileBytes: singlePageBytes,
  idFileContentType: "application/pdf",
});
const pdfDocResult = await PDFDocument.load(pdfResult);
console.log("single-page PDF ID pages (expect 2):", pdfDocResult.getPageCount());

// Case 3: multi-page PDF ID -> expect 2 pages total (capped at page 1 of the ID).
const multiPagePdf = await PDFDocument.create();
multiPagePdf.addPage([200, 200]);
multiPagePdf.addPage([200, 200]);
multiPagePdf.addPage([200, 200]);
const multiPageBytes = await multiPagePdf.save();
const multiResult = await generateNominationPdf({
  ...baseInput,
  idFileBytes: multiPageBytes,
  idFileContentType: "application/pdf",
});
const multiDocResult = await PDFDocument.load(multiResult);
console.log("multi-page PDF ID pages (expect 2, capped):", multiDocResult.getPageCount());
```

This imports a `"use server"`/`"server-only"` file directly, so it needs the same `node_modules/server-only` stub used in prior sub-projects if one isn't already present:

```bash
mkdir -p node_modules/server-only
cat > node_modules/server-only/package.json <<'EOF'
{ "name": "server-only", "main": "index.js" }
EOF
echo "" > node_modules/server-only/index.js
```

Run: `npx tsx verify-pdf-id-page-scratch.mjs`
Expected output: all three lines show `2` pages. If any shows `1` or `3`, the corresponding branch in `appendIdPage` has a bug — fix before continuing.

Delete the scratch script when done: `rm verify-pdf-id-page-scratch.mjs`. Leave the `node_modules/server-only` stub in place if other verification steps in this plan need it too (it's gitignored, never committed).

---

### Task 2: Forward the ID file into `generateNominationPdf` from `submit.ts`

**Files:**
- Modify: `src/app/agents/actions/submit.ts`

**Interfaces:**
- Consumes: `generateNominationPdf`'s new `idFileBytes`/`idFileContentType` fields (Task 1).
- Produces: nothing new consumed by later tasks — this closes out Part 1 of the spec.

- [ ] **Step 1: Pass the PVC/ID bytes and content type through**

`submit.ts` already computes `pvcBytes` (from `pvcFile.arrayBuffer()`) and has `pvcFile.type` in scope, both used earlier in the same function for the storage upload. In the existing `generateNominationPdf({...})` call inside the `try` block, add the two new fields:

```ts
    pdfBytes = await generateNominationPdf({
      electionType: candidate.election_type as ElectionType,
      formNo,
      firstName,
      otherNames,
      surname,
      gender: gender as "male" | "female",
      phone,
      email,
      meansOfId,
      state: CONSTITUENCY_STATE,
      lga,
      ward,
      pollingUnitCode,
      pollingUnitName,
      photoBytes,
      signatureBytes,
      idFileBytes: pvcBytes,
      idFileContentType: pvcFile.type as "image/jpeg" | "image/png" | "application/pdf",
      authorizedNominatorName: nominator.full_name,
      authorizedNominatorSignatureBytes: await downloadSignature(admin, nominator.signature_storage_path),
      submissionDate: new Date(),
    });
```

`pvcFile.type` is already validated earlier in this same function against `ALLOWED_PVC_TYPES` (`isValidFile(pvcFile, ALLOWED_PVC_TYPES)`, where `ALLOWED_PVC_TYPES = ["image/jpeg", "image/png", "application/pdf"]` in `src/lib/agents/validation.ts`) — exactly the three values the new type union accepts, so the cast is safe.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors — this resolves the errors left over from Task 1 Step 3.

- [ ] **Step 3: Lint**

Run: `npx eslint src/lib/agents/pdf-generate.ts src/app/agents/actions/submit.ts`
Expected: no errors.

- [ ] **Step 4: Now return to Task 1 Step 5 and run the scratch verification script**

Follow Task 1 Step 5 exactly (create the scratch script, run it, confirm all three cases print `2`, delete the script). Do this now, since `generateNominationPdf` now fully compiles standalone.

- [ ] **Step 5: Commit**

```bash
git add src/app/agents/actions/submit.ts
git commit -m "feat(agents): forward ID document bytes into PDF generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Bulk export route handler

**Files:**
- Create: `src/app/agents/export/route.ts`
- Test: `verify-export-isolation-scratch.mjs` (scratchpad, not committed — see Step 4)

**Interfaces:**
- Consumes: `requireCandidateSession()` (`src/lib/agents/session.ts`, returns `CandidateSession` with `.id`, `.slug`), `createAdminSupabase()` (`src/lib/supabase/admin.ts`).
- Produces: `GET /agents/export` (or, in local dev without the subdomain rewrite, `GET /agents/export` directly — this route is already under `src/app/agents/`, so it needs no `agentsPath()` prefixing itself; only links *to* it do). No exports consumed by other tasks.

- [ ] **Step 1: Write the route handler**

Create `src/app/agents/export/route.ts`:

```ts
import "server-only";
import JSZip from "jszip";
import { requireCandidateSession } from "@/lib/agents/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

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

Note: `requireCandidateSession()` calls `redirect("/agents/login")` on an unauthenticated request, which Next.js implements by throwing a special redirect signal — this works the same way inside a Route Handler as it does in a page/layout, so no extra handling is needed here.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/agents/export/route.ts`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/agents/export/route.ts
git commit -m "feat(agents): add bulk export route handler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Verify candidate isolation with a scratch script**

Same pattern as Sub-project 3's isolation check. Create `verify-export-isolation-scratch.mjs` in the project root:

```js
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import "dotenv/config";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function makeCandidate(email) {
  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123!",
    email_confirm: true,
  });
  if (userErr) throw userErr;
  const { error: candErr } = await admin.from("nomination_candidates").insert({
    id: userRes.user.id,
    email,
    full_name: "Test Candidate",
    office: "Test Office",
    election_type: "house_of_assembly",
    slug: `test-${randomUUID().slice(0, 8)}`,
    is_active: true,
  });
  if (candErr) throw candErr;
  return userRes.user.id;
}

async function makeNomination(candidateId) {
  const id = randomUUID();
  const { error } = await admin.from("agent_nominations").insert({
    id,
    candidate_id: candidateId,
    first_name: "Test",
    surname: "Nominee",
    gender: "male",
    phone: `0800000${Math.floor(Math.random() * 10000)}`,
    means_of_id: "PVC",
    lga: "Ibadan North",
    ward: 1,
    polling_unit_code: "PU001",
    polling_unit_name: "Test PU",
    reference_id: randomUUID().slice(0, 8).toUpperCase(),
    status: "submitted",
    is_possible_duplicate: false,
  });
  if (error) throw error;
  await admin.from("agent_nomination_files").insert({
    nomination_id: id,
    file_type: "generated_pdf",
    storage_path: `nominations/${id}/form.pdf`,
  });
  return id;
}

const candidateA = await makeCandidate(`export-test-a-${Date.now()}@example.com`);
const candidateB = await makeCandidate(`export-test-b-${Date.now()}@example.com`);
const nominationA = await makeNomination(candidateA);

// Simulate exactly what the route handler queries, scoped to candidate B.
const { data: bNominations } = await admin
  .from("agent_nominations")
  .select("id, reference_id, first_name, surname")
  .eq("candidate_id", candidateB);

console.log("candidate B's nominations (expect 0 rows):", bNominations.length);
if (bNominations.length !== 0) throw new Error("ISOLATION FAILURE: candidate B saw candidate A's nomination");

// Confirm candidate A's own query still finds it (sanity check the isolation
// isn't just "the query always returns nothing").
const { data: aNominations } = await admin
  .from("agent_nominations")
  .select("id")
  .eq("candidate_id", candidateA);
console.log("candidate A's own nominations (expect 1 row):", aNominations.length);
if (aNominations.length !== 1) throw new Error("SANITY FAILURE: candidate A did not see their own nomination");

console.log("isolation check passed");

// Clean up
await admin.from("agent_nomination_files").delete().eq("nomination_id", nominationA);
await admin.from("agent_nominations").delete().eq("id", nominationA);
await admin.from("nomination_candidates").delete().eq("id", candidateA);
await admin.from("nomination_candidates").delete().eq("id", candidateB);
await admin.auth.admin.deleteUser(candidateA);
await admin.auth.admin.deleteUser(candidateB);
console.log("cleanup done");
```

Run: `npx tsx verify-export-isolation-scratch.mjs`
Expected output: `candidate B's nominations (expect 0 rows): 0`, `candidate A's own nominations (expect 1 row): 1`, `isolation check passed`, `cleanup done`.

Delete the scratch script when done: `rm verify-export-isolation-scratch.mjs`.

---

### Task 4: Export link on the dashboard, full verification, and finish

**Files:**
- Modify: `src/lib/agents/nominations.ts`
- Modify: `src/app/agents/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `listCandidateNominations` (existing), `agentsPath` (`src/lib/agents/routes.ts`).
- Produces: `countCandidateNominations(candidateId: string): Promise<number>` — a new export from `nominations.ts`, unfiltered by search/duplicate, used only by the dashboard page to decide whether to show the export link (spec Decision 6: the link must reflect whether the candidate has *any* nominations at all, not just whether the current filtered view is non-empty).

- [ ] **Step 1: Add `countCandidateNominations` to `src/lib/agents/nominations.ts`**

Add this function at the end of the file:

```ts
/** True total of a candidate's nominations, ignoring any search/duplicate filter — used to decide whether to show export/bulk actions. */
export async function countCandidateNominations(candidateId: string): Promise<number> {
  const admin = createAdminSupabase();
  const { count } = await admin
    .from("agent_nominations")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId);
  return count ?? 0;
}
```

- [ ] **Step 2: Show the export link on the dashboard**

In `src/app/agents/(dashboard)/page.tsx`, import the new function and call it alongside the existing list query:

```ts
import { listCandidateNominations, countCandidateNominations } from "@/lib/agents/nominations";
```

Inside `AgentsDashboardPage`, after the existing `const { rows, total } = await listCandidateNominations(...)` call, add:

```ts
  const hasAnyNominations = (await countCandidateNominations(session.id)) > 0;
```

In the header block, add the export link next to the page title. The current header is:

```tsx
      <header className="border-b border-border/60 pb-6">
        <h1 className="font-heading text-2xl text-text">Nominations</h1>
        <p className="text-sm text-text-muted">Polling Unit Agents submitted under your candidacy.</p>
      </header>
```

Change it to:

```tsx
      <header className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-text">Nominations</h1>
          <p className="text-sm text-text-muted">Polling Unit Agents submitted under your candidacy.</p>
        </div>
        {hasAnyNominations && (
          <a
            href={agentsPath("/export")}
            className="shrink-0 rounded-brand border border-border px-3.5 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Export all as ZIP
          </a>
        )}
      </header>
```

This is a plain `<a>` tag (not `next/link`'s `<Link>`), since it must trigger a real browser navigation/download of a non-HTML response, not a client-side route transition.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/agents/nominations.ts src/app/agents/\(dashboard\)/page.tsx`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/nominations.ts "src/app/agents/(dashboard)/page.tsx"
git commit -m "feat(agents): add export link to candidate dashboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Full build**

Run: `npm run build`
Expected: PASS. If it fails on the intermittent Google Fonts fetch error seen in prior sub-projects (not a real code issue), retry with a short backoff loop until it either passes or fails on something else; if something else, fix it.

- [ ] **Step 6: Manual smoke test via dev server**

No browser automation is available in this environment — this is disclosed, not skipped. Start the dev server and check what's reachable without a browser:

```bash
npm run dev &
sleep 3
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/agents/export
```

Expected: `307` (or `302`) redirecting to `/agents/login` — confirms the route handler's `requireCandidateSession()` guard runs before any zip work happens for an unauthenticated request. Check the dev server's log output for unexpected errors, then stop it (`kill %1` or equivalent).

If a browser or authenticated session is available to the person running this, they should additionally confirm manually: log in as a candidate with at least one nomination, click "Export all as ZIP," and confirm the downloaded zip contains a correctly-named, 2-page PDF per nomination (form + ID page).

- [ ] **Step 7: Finish the branch**

Announce: "I'm using the finishing-a-development-branch skill to complete this work."

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch — verify the full test/build suite one more time, present the 3-option menu (merge locally / push+PR / keep as-is), and execute whichever the user picks.
