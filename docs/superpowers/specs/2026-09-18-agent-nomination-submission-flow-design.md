# Party Agent Nomination Platform — Nominee Submission Flow Design Spec

**Date:** 2026-09-18
**Status:** Approved by user, pending self-review + user sign-off on this file before an implementation plan is written.
**Sub-project 2 of 4** in the larger Party Agent Nomination Platform (see `Party Agent Nomination Platform — PRD.pdf` for full context, and `docs/superpowers/specs/2026-09-17-agent-nomination-foundation-design.md` for the schema/routing/PDF-template groundwork this builds on). Admin dashboard + countersign and Bulk export are sub-projects 3–4 and are NOT part of this spec.

## Context

Foundation (Sub-project 1) shipped the schema (`nomination_authorities`, `agent_nominations`, `agent_nomination_files`, `agent_nomination_audit_log`), the private `agent-nominations` storage bucket, `agents.votelanky.com` routing, the authority login flow, a dev-only screen to create authority accounts, and a coordinate-mapped `pdf-lib` template (`src/lib/agents/pdf-template/form-template.ts`) for the official form.

This sub-project builds the actual public-facing form: the one thing the ~713 Polling Unit Agents interact with. Nothing here requires schema changes — it fills in the write path (nominee submission) that Foundation deliberately left for the service-role client to handle.

## Decisions locked in with the user before this spec

1. **No self-service edit/status-check in this pass.** The PRD's "nominee can view/edit their own submission" is explicitly deferred — v1 is one-shot submission only. A nominee who makes a mistake contacts their authority. (This also means no reference-ID lookup route is built now.)
2. **One signature, not two.** The real form has a "specimen signature" box (Identification Data) and a separate attestation signature. The nominee draws once on a single `react-signature-canvas` pad; that one PNG is stamped into *both* boxes at PDF-generation time. Only one file is uploaded and one `agent_nomination_files` row is written, with `file_type: 'specimen_signature'`. The `attestation_signature` enum value from the Foundation schema remains valid but goes unused in practice — not worth a migration to remove it.
3. **Authorised Nominator box is fully automatic**, as Foundation already established: the authority's pre-supplied `full_name` + `signature_storage_path`, plus a date auto-set to the submission's `created_at` (formatted as a date, not a timestamp). The nominee never sees or interacts with this box.
4. **Live preview is an HTML mirror, not a rendered PDF.** Fast, works on slow mobile connections, and is explicitly what the PRD recommends (§5.4, §7.4) — "a lower-fidelity HTML mirror for speed" during editing. The real, pixel-exact PDF (using Foundation's `form-template.ts` coordinates) is generated exactly once, server-side, at final submit — never client-rendered, never regenerated per keystroke.
5. **Multi-step wizard**, not a single scrolling page. One client component holds all field state and a step index; "Next" does client-side validation of the current step before advancing (server-side validation at submit is still the source of truth — the client check is UX only, not trust). Matches the PRD's own flowchart (§4.1) and suits the mobile-first target audience better than one long page.
6. **Autosave is `localStorage`-only, text fields only.** Debounced writes keyed by the authority's slug (`agent-nomination-draft:<slug>`) restore bio/contact/location field values on reload. Files and the signature can't survive a reload (the File/Blob objects aren't serializable) — accepted as a known limitation, not solved here. A restored draft is silently pre-filled; no separate "restore draft?" prompt.
7. **Location dropdowns reuse Foundation's existing helpers.** `src/lib/portal/geo.ts` (`listWards`, `listPollingUnits`, `getPollingUnit`) already does exactly this against `constituency_geo` for the portal's own forms — this sub-project imports those functions directly rather than forking a copy under `agents`. State is not a field at all: Foundation's `agent_nominations` table has no `state` column, since every submission in this build is Oyo State by construction. `"Oyo State"` is a hardcoded constant (`src/lib/agents/constants.ts`) shown as read-only text in the wizard and written directly into the generated PDF's State field — never entered by the nominee, never stored per-row.
8. **Duplicate detection is silent to the nominee.** A `(authority_id, phone)` or `(authority_id, email)` match sets `is_possible_duplicate = true` and `status = 'flagged'` on insert, but the submission still succeeds and the nominee sees the normal confirmation screen. Surfacing it is an authority-dashboard concern (Sub-project 3), per the PRD ("surfaces potential impersonation for admin review").

## Route & page structure

- `src/app/agents/submit/[slug]/page.tsx` — server component. Looks up `nomination_authorities` by `slug` (service-role read, since this is a public route with no session). If not found or `is_active = false`, renders a small "this link isn't valid" message instead of the form — not a hard 404, since a deactivated-but-previously-shared link is a real, expected case, not a broken URL. On success, passes the authority's public fields (`full_name`, `office`, `election_type`) as read-only display context into the wizard, along with the constituency's fixed `state` value.
- `src/app/agents/submit/[slug]/nomination-wizard.tsx` — client component. Owns all step state, the step index, autosave, and final submission.
- `src/app/agents/submit/[slug]/steps/bio-step.tsx`, `contact-step.tsx`, `identification-step.tsx`, `photo-step.tsx`, `location-step.tsx`, `signature-step.tsx`, `preview-step.tsx` — one file per wizard step, each a focused presentational component receiving its slice of state + an `onChange`/`onNext` pair. Kept separate (not one giant file) since each has distinct concerns (file upload UI, canvas-based signature capture, cascading dropdowns are each non-trivial on their own).
- `src/app/agents/submit/[slug]/confirmation.tsx` — final-state component shown after a successful submit, displaying the `reference_id`.

## Wizard steps (in order)

1. **Bio** — First Name*, Other Name(s), Surname*, Gender* (male/female).
2. **Contact** — Phone Number* (Nigerian format), Email Address (optional, validated if present).
3. **Identification** — Means of ID* (text, defaults to "PVC"), PVC copy upload (image or PDF, max 5MB).
4. **Photo** — passport photo upload with a semi-transparent red-silhouette guide overlay shown during positioning; client-side canvas resize/compress before upload; a soft, non-blocking warning ("background does not appear red") from corner-pixel color sampling — never a hard block, since automated detection isn't reliable (PRD §5.3, §9).
5. **Location** — LGA*, Ward* (= Registration Area), Polling Unit* — cascading dropdowns sourced from `constituency_geo` via the reused `geo.ts` helpers (guarantees valid, correctly-formatted codes; no free-text polling-unit-code regex needed, since the value is chosen from real data, not typed). Polling Unit Name auto-fills from the selected polling unit.
6. **Signature** — one `react-signature-canvas` pad, touch-enabled, with a "Clear" button; must be non-empty to advance.
7. **Preview** — HTML mirror of the completed form (see below) plus the attestation checkbox ("I hereby attest that the information provided on this form is true, complete and accurate...") and the explicit "Confirm & Submit" action, separate from just viewing. Going back from here re-opens step 1 with all prior state intact.

## Live preview (HTML mirror)

A read-only component laying out the same fields visually close to the official form: ticked boxes for the authority's `election_type` and the fixed "Polling Unit" agent-for box, the bio/contact/location fields as text, the uploaded photo scaled into a photo-box-shaped placeholder, and the captured signature image. This is explicitly *not* required to be pixel-exact — it exists so the nominee can sanity-check their entries before the one real PDF gets generated.

## Server action: `submitNomination`

`src/app/agents/actions/submit.ts`, `"use server"`, no identity accepted as a parameter — the authority is re-resolved server-side from the `slug` passed in the form data, matching this repo's "derive identity inside the server action" convention.

1. Re-validate every field (required-ness, phone format, file types/sizes, non-empty signature) — the client's step-by-step validation is UX only; this is the real gate, matching Foundation's "do not trust the client-rendered preview as source of truth."
2. Re-fetch the authority by slug; reject if missing/inactive (link could have been deactivated between page load and submit).
3. Duplicate check against existing `agent_nominations` for this `authority_id` (see Decision 8).
4. Generate a `reference_id` (short random token, `crypto.randomInt`-backed). `agent_nominations.reference_id` already has a `unique` constraint from Foundation, so a collision surfaces as an insert error at Step 8 — on that specific error, regenerate the token and retry the insert once rather than failing the whole submission over a statistically rare clash.
5. Upload PVC copy, photo, and signature PNG to the `agent-nominations` bucket under `nominations/<uuid>/{pvc,photo,signature}.<ext>`.
6. Generate the PDF server-side (`src/lib/agents/pdf-generate.ts`, using `pdf-lib` + `form-template.ts` coordinates): overlay text fields, tick the election-type and agent-for checkboxes, place the photo and the (single, reused-twice) signature image, place the Authorised Nominator's fixed name/signature/auto-date.
7. Upload the generated PDF to the same bucket.
8. Insert the `agent_nominations` row and the `agent_nomination_files` rows (pvc_copy, passport_photo, specimen_signature, generated_pdf — four rows, not five, per Decision 2).
9. Return the `reference_id` to the client, which renders the confirmation step.

## Validation rules

- Phone: `+234` or `0`-prefixed, 11 digits — enforced both client-side (step gate) and server-side (real gate).
- Email: optional; standard format check only if provided.
- PVC file: image (`image/jpeg`, `image/png`) or `application/pdf`, max 5MB.
- Photo file: `image/jpeg`/`image/png`, max 5MB before compression (compressed further client-side before upload).
- Polling Unit Code: guaranteed correct by construction (chosen from `constituency_geo`, not typed) — no regex needed.
- Signature: non-empty canvas required to advance past the signature step and to submit.

## File structure (new files, beyond what's listed under Route & page structure above)

- `src/app/agents/actions/submit.ts` — the server action described above.
- `src/lib/agents/pdf-generate.ts` — `pdf-lib` overlay logic, consumes `form-template.ts`.
- `src/lib/agents/validation.ts` — shared phone/email/file validators, imported by both the client step components (UX gate) and `submit.ts` (real gate) so the rules are defined once.
- `src/lib/agents/draft-storage.ts` — small `localStorage` read/write/clear helpers for the autosave described in Decision 6.
- `src/app/agents/submit/[slug]/signature-pad.tsx` — thin wrapper around `react-signature-canvas` with the "Clear" button and PNG export.
- `src/app/agents/submit/[slug]/photo-upload.tsx` — file input + guide overlay + client-side compression + soft red-background check.

## Testing

Same approach as Foundation: `npm run lint` / `npm run build`, direct SQL checks for anything DB-adjacent (duplicate-flag behavior, file rows), and dev-server + disclosed manual smoke testing (no browser automation available in this environment). The PDF-generation step gets an extra visual-verification pass — generate a real submission through the flow, render the resulting PDF to an image, and visually confirm text/photo/signature/checkboxes land correctly, the same technique Foundation used to calibrate `form-template.ts` in the first place.

## Out of scope for this spec (deferred to later sub-projects)

- Reference-ID lookup/edit flow for nominees (Decision 1).
- Admin dashboard, flag/verify/countersign UI, audit log display (Sub-project 3).
- Bulk merged-PDF export, CSV export (Sub-project 4).
- Any Ward/LGA/State Desk Officer or separate National Admin role — still not planned for v1, per the Foundation spec's scope cut.
