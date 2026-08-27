# Election Results Portal — Design Spec

**Date:** 2026-08-26
**Status:** Approved, implemented same session (user left the loop mid-build with explicit authorization to make remaining calls autonomously — see decision log at bottom).
**Sub-project 1 of 7** in the larger "atunluto-style team platform" — see conversation history for the full decomposition (leader directory, agent onboarding + coverage, full reward-state admin UI, hierarchical messaging, and bulk export are sub-projects 2–7 and are NOT part of this spec).

## Context

Reference implementation: `~/Developer/lanky/atunluto` — a Next.js + Supabase election-results portal for a wider race, with a 3-tier admin hierarchy (state/LGA/PU), Cloudinary-backed result-sheet photo uploads, checksum-verified submissions, and an audit log. This spec adapts that pattern, scoped to one federal constituency.

**Constituency:** Ibadan Northwest/Southwest Federal Constituency, Oyo State — 2 LGAs, 23 wards, 713 polling units (seeded from the client-provided PDFs in `docs/`).

## Decisions locked in with the user before build

1. **Same repo, same Supabase project** as this `campaign` site — not a separate sibling app. `portal.votelanky.com` is already attached to the same Vercel project. Routing is host-based middleware (`portal.votelanky.com` → rewrite to `/portal/*`), reusing this repo's existing Supabase env and Storage (no Cloudinary — the repo already uploads to Supabase Storage for blog images).
2. **4-tier hierarchy**, not atunluto's 3-tier: `constituency_admin` → `lga_coordinator` → `ward_agent` → `pu_agent`. Ward gets a real login (not just a data field), since ward-level accounts also matter for the later leader-directory/messaging sub-projects.
3. **Single race only** — House of Representatives, this constituency, Lanky vs. opponents. Not a multi-election collation tool.
4. **Submission = vote counts + result-sheet photo**, both required, checksummed like atunluto — protects against disputed numbers.
5. **Reward states: Pending → Approved → Sent**, plus a `rewards` table and an auto-created `pending` reward row on a PU agent's first successful submission per election ("claim on submission" from the original ask). The full manual-toggle admin *workflow* (batch operations, rejection, non-submission triggers) is sub-project 4 — but the table, the trigger, and a minimal Pending→Approved→Sent toggle in the constituency-admin dashboard are built now, since the user explicitly wanted the claim-on-submit loop closed in this pass.

## Data model (all in `public` schema, RLS enabled with no public policies — all access goes through server actions using the service-role client, same pattern as this repo's `donations` table)

- `constituency_geo` — `lga`, `ward` (int), `pu_code` (PK, e.g. `30-08-01-001`), `pu_name`, `status` (`EXISTING PU` / `NEW PU`). Seeded once, 713 rows, read-only reference data.
- `portal_accounts` — `id` (= `auth.users.id`), `email`, `full_name`, `phone`, `role` (`constituency_admin`/`lga_coordinator`/`ward_agent`/`pu_agent`), `lga`, `ward`, `polling_unit` (scoped per role — a `pu_agent` has all three, a `lga_coordinator` only `lga`), `is_active`, `must_change_password`, `parent_account_id`, `created_by`, `last_login`, `created_at`.
- `elections` — `id`, `name`, `status` (`draft`/`active`/`closed`), `created_at`.
- `candidates` — `id`, `election_id`, `name`, `party`, `is_incumbent`, `display_order`.
- `election_results` — one row per candidate per PU submission: `election_id`, `lga`, `ward`, `polling_unit`, `candidate_id`, `votes_cast`, `accredited_voters`, `registered_voters`, `result_image_path` (Supabase Storage path, private bucket `result-sheets`), `notes`, `checksum`, `submitted_by`, `status`, `created_at`. Unique on `(election_id, polling_unit, candidate_id)` — a correction requires an admin to delete and have the agent resubmit (no silent overwrite).
- `result_audit_log` — `action`, `table_name`, `record_id`, `performed_by`, `ip_address`, `user_agent`, `notes`, `created_at`. Every account-management action and every submission is logged.
- `rewards` — `recipient_id`, `trigger_type` (`result_submission`), `trigger_ref` (the election id), `status` (`pending`/`approved`/`sent`), `amount`, `note`, `created_by`, `approved_by`, `approved_at`, `sent_by`, `sent_at`, `created_at`.

## Auth & hierarchy

Portal accounts are Supabase Auth users in the same project as this site's `/admin`, but their session cookie is naturally host-scoped to `portal.votelanky.com` (via `@supabase/ssr`), so a portal login never leaks into `/admin` or vice versa — no custom session system needed.

Account creation cascades and is scope-checked server-side: `constituency_admin` creates `lga_coordinator` accounts → each creates `ward_agent` accounts for wards in their own LGA → each creates `pu_agent` accounts for polling units in their own ward. Auto-generated password, forced change on first login (`must_change_password`), mirroring atunluto's `createPUAdmin`.

## Submission flow

`pu_agent` opens their submit form (their PU is fixed by their account) → enters vote count per candidate + accredited/registered voters + uploads a photo of the result sheet to `result-sheets` (signed upload URL, service-role signed, private bucket) → server action validates the election is `active`, computes a checksum per candidate row (same formula shape as atunluto), inserts `election_results` rows, writes the audit log entry, and inserts one `pending` `rewards` row for that agent (only on their *first* submission for that election — the unique constraint on `election_results` also prevents a second submission from being accepted at all). The agent's dashboard then shows "Reward claimed — pending review."

`ward_agent` / `lga_coordinator` / `constituency_admin` get read-only roll-up views scoped to their branch (ward agent sees their PUs, LGA coordinator sees their wards, admin sees both LGAs).

## Rewards

`constituency_admin` gets a Rewards tab: a table of all reward rows with a manual action to advance `pending → approved` and `approved → sent` (no automation, no external payment API — exactly "a manual toggle that controls the different states rewards can be in until it is actually sent," as asked). Filling in `amount`/`note` happens at the Approve step.

## Testing

`npm run lint` and `npm run build` must pass. No browser automation tool is available in this environment, so UI flows are verified via the dev server + `curl` (redirect behavior, page rendering) rather than a real click-through — this is disclosed, not skipped silently.

## Decision log (made autonomously per explicit user authorization to proceed without further check-ins)

- Reused Supabase Storage over adding Cloudinary (repo precedent, one less service).
- Restricted reward Approve/Sent transitions to `constituency_admin` only for v1 (not delegated to LGA/Ward tiers) — keeps the money-adjacent action on the smallest surface.
- No email/SMS notifications on reward state changes in this pass — out of scope, agents check their own dashboard.
- `election_results` correction path is delete-and-resubmit by an admin, not an edit form — keeps the checksum/audit trail meaningful (an edited row would silently invalidate its own checksum).
