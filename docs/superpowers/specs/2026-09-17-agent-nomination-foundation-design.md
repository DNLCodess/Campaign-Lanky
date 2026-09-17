# Party Agent Nomination Platform — Foundation Design Spec

**Date:** 2026-09-17
**Status:** Approved by user, pending self-review + user sign-off on this file before an implementation plan is written.
**Sub-project 1 of 4** in the larger Party Agent Nomination Platform (see `Party Agent Nomination Platform — PRD.pdf` for full context) — Nominee submission flow, Admin dashboard + countersign, and Bulk export are sub-projects 2–4 and are NOT part of this spec.

## Context

Labour Party's National Secretariat requires nomination of Polling Unit Agents ahead of the 14 October 2026 INEC deadline (see `docs/NOTICE FOR PARTY AGENTS NOMINATION...pdf`). The official form (Notice, page 7) is the source of truth for every field this platform must collect.

This build deviates from the PRD's role model in one significant way, confirmed with the user: **only two actor types exist**, not the PRD's five (Nominee, Ward/LGA Desk Officer, State Desk Officer, National Admin, Authorized Nominating Authority).

1. **Polling Unit Agent (nominee)** — no login. Fills the form via a link shared per candidate.
2. **Nomination Authority** ("the people running for a particular post") — has an email+password login, sees and manages only the nominees submitted under their own candidacy. Multiple authorities exist (multi-candidate), each scoped to their own submissions. The "countersign" signature is **not** drawn live by the authority — the user supplies a fixed signature PNG + name per authority up front, and the system stamps that onto approved forms. The authority's action is effectively approve/reject, not sign.

No Ward/LGA/State Desk Officer tier and no separate National Admin role are being built in v1.

## Decisions locked in with the user before this spec

1. **Same repo, same Supabase project** as this `campaign` site — not a separate app. New Vercel host `agents.votelanky.com` on the same deployment, following the exact pattern `portal.votelanky.com` already uses.
2. **Table names avoid `candidates`/`elections`** — those names are already taken by the unrelated election-results-tracking feature (`public.candidates`, `public.elections`, tied to `election_results`). The nomination authority is a different concept and gets its own table, `nomination_authorities`.
3. **Nominees never log in.** Submission happens through a server action using the service-role client, identified by the `slug` in the URL (`/agents/submit/<slug>`) — not by a Supabase Auth session. This follows the same "derive identity inside the server action" convention already used elsewhere in this repo (see: server actions must not accept identity as a function param).
4. **One shared link per authority**, not a personalized token per nominee. Simpler to distribute (WhatsApp/SMS) and matches the "one person nominates many agents" shape of the real process. A nominee who submits gets a `reference_id` back to look up/edit their own submission later.
5. **Geography is scoped to this campaign's constituency.** State/LGA/Registration Area/Polling Unit fields reuse the existing `constituency_geo` table (713 rows, Ibadan Northwest/Southwest) for cascading dropdowns and validation — not a nationwide reference table. Every nomination authority built in v1 is a Labour Party candidate within this same constituency.
6. **`election_type`/`agent_for` are properties of the authority, not re-entered by the nominee.** Each authority is running for one specific office; a nominee submitting via that authority's link is implicitly nominating for that race. `agent_for` is fixed to `polling_unit` (Collation Agents are out of scope, per the PRD).
7. **Countersign is a stamp, not a live signature capture.** No `countersigns` table — the decision (approve/reject), reason, and timestamp live directly on the nomination row, and PDF generation overlays the authority's pre-supplied signature image.
8. **Dev-only admin UI** for creating authority accounts and uploading their name + signature PNG. Not part of the public-facing app; unlisted route, accessible only to the site owner.

## Data model (all in `public` schema, RLS enabled, no public policies for nominee-facing writes — all nominee submissions go through the service-role client, same pattern as this repo's `donations` and portal tables)

- **`nomination_authorities`** — `id` (FK to `auth.users`, mirrors the existing `portal_accounts` pattern), `email` (unique), `full_name`, `office` (text, e.g. "House of Representatives – Ibadan NW/SW Federal Constituency"), `election_type` (enum: presidential/governorship/senatorial/house_of_reps/house_of_assembly), `slug` (unique, url-safe, powers the shared submission link), `signature_storage_path`, `is_active`, `created_at`.
- **`agent_nominations`** — one row per Polling Unit Agent submission: `id`, `authority_id` (FK), `form_no` (auto sequential, unique), `first_name`, `other_names`, `surname`, `gender` (male/female), `phone`, `email` (nullable), `means_of_id` (defaults to "PVC"), `lga`, `ward` (int, = Registration Area), `polling_unit_code` (FK → `constituency_geo.pu_code`), `polling_unit_name`, `reference_id` (unique, shown to nominee for status lookup/edit), `status` (enum: submitted/flagged/verified/countersigned/rejected), `flag_reason` (nullable), `is_possible_duplicate` (boolean, default false), `countersigned_at`, `countersign_decision` (nullable enum: approved/rejected), `rejection_reason` (nullable), `created_at`, `updated_at`. **No DB unique constraint** on phone/email — per the PRD, a repeat phone/email under the same authority is a soft flag surfaced for human review, not a rejected insert. The submission server action queries for an existing `(authority_id, phone)` or `(authority_id, email)` match before inserting and sets `is_possible_duplicate = true` (and `status = 'flagged'`) on the new row when found, rather than blocking the write.
- **`agent_nomination_files`** — `id`, `nomination_id` (FK), `file_type` (enum: pvc_copy/passport_photo/specimen_signature/attestation_signature/generated_pdf), `storage_path`, `uploaded_at`.
- **`agent_nomination_audit_log`** — `id`, `nomination_id` (FK), `actor` (nullable uuid — null means the nominee/system, not an authenticated authority), `action`, `previous_value` (jsonb, nullable), `new_value` (jsonb, nullable), `created_at`.

Note the real form (Notice page 7) has **three** signature-shaped fields, not one: a "specimen signature" under Identification Data, an attestation signature + date, and the Authorised Nominator's name/signature/date. `file_type` covers the two nominee-drawn ones (`specimen_signature`, `attestation_signature`); the Authorised Nominator's signature is not stored per-file since it's the same fixed PNG referenced from `nomination_authorities.signature_storage_path` for every one of that authority's approved forms.

## Storage

One new private Supabase Storage bucket (e.g. `agent-nominations`), signed-URL access only, mirroring how this repo already handles `result-sheets` and blog images — never a public bucket, since PVC copies and signatures are sensitive PII.

## Auth & RLS

- `nomination_authorities`: an authority can `SELECT` only their own row (`id = auth.uid()`). Row creation is service-role only (via the dev-only admin UI). No `UPDATE` policy in Sub-project 1 — nothing writes to this table via the authenticated client yet, and a self-service grant with no consumer would let an authority undo an admin's `is_active = false` deactivation or edit their own `slug`/`email`. Added when a real consumer needs it.
- `agent_nominations`, `agent_nomination_files`, `agent_nomination_audit_log`: no policies for `anon`/nominee writes — those always go through the service-role client. Authenticated authorities get `SELECT` scoped to `authority_id = auth.uid()` directly, or via an `EXISTS` subquery to `agent_nominations` for the files/audit tables. This mirrors the existing portal's RLS-scoping-by-ownership pattern. No `UPDATE` policy yet either — the flag/verify/countersign actions that would need one aren't built until Sub-project 3, which adds the specific, narrower policy alongside its real UI rather than this sub-project granting a blanket one in advance.

## Subdomain routing

Extend `src/proxy.ts`'s `PORTAL_HOSTS` pattern with a second host list, `AGENTS_HOSTS = ["agents.votelanky.com", "agents.localhost"]`, rewriting to `/agents/*` exactly as the existing rule does for `/portal/*`. New route tree at `src/app/agents/`, with its own `routes.ts` helper mirroring `src/lib/portal/routes.ts` (`NEXT_PUBLIC_AGENTS_BASE` for local dev without the subdomain).

## PDF coordinate-mapping template

The official form (`docs/NOTICE FOR PARTY AGENTS NOMINATION...pdf`, page 7) becomes the fixed `pdf-lib` background template for Sub-project 2's PDF generation. This spec's scope is limited to identifying and locking the template asset and doing the one-time coordinate calibration (field positions for every checkbox, text field, the photo box, and all three signature-shaped areas) — actual overlay/generation code is built in Sub-project 2, which consumes this mapping.

New dependencies required (not yet in `package.json`): `pdf-lib`, `react-signature-canvas`, `jszip` (the last one used by Sub-project 4, added now for a single dependency-install pass).

## Testing

`npm run lint` and `npm run build` must pass. Schema/RLS changes are verified via `mcp__supabase__get_advisors` (security + performance) after migration, plus direct `execute_sql` checks that RLS actually denies cross-authority reads. No browser automation available in this environment; UI-adjacent pieces in this sub-project (the dev-only admin screen) are smoke-tested via the dev server, disclosed rather than skipped silently.

## Out of scope for this spec (deferred to later sub-projects)

- The nominee-facing form UI, signature pad, photo upload + red-background guidance, live preview (Sub-project 2).
- Server-side PDF generation/overlay code, admin dashboard, flag/verify/countersign UI (Sub-projects 2–3).
- Bulk merged-PDF export, CSV export, background job (Sub-project 4).
- Any Ward/LGA/State Desk Officer or separate National Admin role — not planned for v1 at all, per the user's explicit scope cut.
