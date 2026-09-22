# Party Agent Nomination Platform — Candidate Dashboard Design Spec

**Date:** 2026-09-22
**Status:** Approved by user, pending self-review + user sign-off on this file before an implementation plan is written.
**Sub-project 3 of 4** in the larger Party Agent Nomination Platform (see `docs/superpowers/specs/2026-09-17-agent-nomination-foundation-design.md` for schema/auth, `docs/superpowers/specs/2026-09-18-agent-nomination-submission-flow-design.md` for the nominee wizard this reads from). Bulk export is sub-project 4 and NOT part of this spec.

## Context

Foundation already built `getCandidateSession`/`requireCandidateSession` (`src/lib/agents/session.ts`) and the login flow (`loginCandidate` redirects to `agentsPath("/")`), but nothing exists at that route yet — candidates who log in currently hit a 404. This sub-project builds that landing page and lets a candidate see the Polling Unit Agents submitted under their own candidacy.

A significant scope correction happened during this sub-project's brainstorming, worth recording since it changes what the PRD originally asked for: the PRD's "Authority reviews → flags/verifies → digitally countersigns" workflow assumed the Authorised Nominator's signature gets applied only after human review. In this build it doesn't — `submitNomination` (Sub-project 2) already generates the final, pixel-exact PDF with the (single, universal) Authorised Nominator's signature stamped at submission time, before any candidate sees it. Given that, and confirmed directly with the user, **a nomination is final the moment the nominee submits it** — there is no approve/reject/flag/verify/countersign action for a candidate to take. The candidate dashboard is read-only: view, search, and inspect.

## Decisions locked in with the user before this spec

1. **No status-changing actions.** Confirmed explicitly: "once they submit thats all." The candidate dashboard has no buttons that mutate `agent_nominations.status`, `countersign_decision`, `rejection_reason`, etc. Those columns (added in Foundation, anticipating the PRD's original workflow) stay in the schema unused for now — not dropped, since removing them is an unrelated schema change this spec doesn't need to make, and a future pass may still want them.
2. **`is_possible_duplicate` is still surfaced**, even though nothing about it is actionable yet — a candidate should be able to see and filter for it, since it's information the PRD explicitly wants visible ("surfaces potential impersonation for admin review"), even if "review" today just means "look at it."
3. **List + separate detail page**, not inline expand — matches the existing `/admin/submissions` pattern already in this codebase (table on desktop, cards on mobile, `searchParams`-driven search/pagination), which this sub-project follows closely rather than inventing a new list UI pattern.
4. **No audit-log UI.** `agent_nomination_audit_log` has no writers yet (nothing in Sub-project 2's `submitNomination` calls `logAgentAudit`, and there are no actions in this sub-project that would). Building a display for an always-empty table is out of scope; revisit once something actually writes to it.
5. **Data access follows the established codebase convention**: service-role client (`createAdminSupabase`) with an explicit `.eq("candidate_id", session.id)` filter, not the session-aware client relying on RLS to scope the query. RLS's `SELECT` policy on `agent_nominations` stays as the defense-in-depth backstop it was designed to be (Foundation spec), not the mechanism the app's own queries depend on — matching how the portal's admin pages already work.

## Route structure

- `src/app/agents/(dashboard)/layout.tsx` — new route group, guarded by `requireCandidateSession()`. Scoped to this group only, so it doesn't wrap the public `/agents/login` or `/agents/submit/[slug]` routes (route groups don't affect the URL — the list page is still bare `/agents`). Renders a minimal header (candidate's `full_name`/`office`, a "Sign out" link calling the already-built `logoutCandidate`) around whatever page it wraps.
- `src/app/agents/(dashboard)/page.tsx` — the list.
- `src/app/agents/(dashboard)/nominations/[id]/page.tsx` — the detail view.

## List page

Server component, `searchParams: Promise<{ q?: string; duplicates?: string; page?: string }>`, mirroring `/admin/submissions/page.tsx`'s exact shape:

- `q` — free-text search against `first_name`, `other_names`, `surname`, `phone`, `email`, `reference_id`, built as a `.or()` filter expression using `sanitizeSearch` from `src/lib/admin-tables.ts` (generic, reused as-is) plus a locally-built column list — the same `.ilike` technique `searchExpression` in that file uses for the admin submissions page, not reused directly since `searchExpression` is typed to that file's own `AdminTableKey` union and doesn't include `agent_nominations`.
- `duplicates=1` — when set, adds `.eq("is_possible_duplicate", true)`.
- `page` — 20 rows per page (`PAGE_SIZE = 20`, matching `/admin/submissions`), with a `count: "exact"` query for the pager.

Every query starts from `.eq("candidate_id", session.id)` — a candidate can only ever see their own rows, enforced in the query itself, not just hidden in the UI.

Columns shown (table view) / fields shown (mobile card): name, phone, polling unit (code + name), submitted date, a "Possible duplicate" badge when set. Each row links to its detail page.

## Detail page

`src/app/agents/(dashboard)/nominations/[id]/page.tsx` — looks up the nomination by `id`, and critically re-checks `candidate_id = session.id` in the same query (not just fetched-then-trusted), so a candidate can't view another candidate's nomination by guessing/incrementing a UUID in the URL. Not found or not owned → same "not found" treatment (no distinction that would let someone probe for valid IDs belonging to other candidates).

Shows every submitted field (bio, contact, means of ID, location, reference ID, form number, submission timestamp), the possible-duplicate badge if set, and four links/previews backed by signed URLs generated server-side at request time (private bucket, matching Foundation's "signed-URL access, never public" decision):

- PVC copy
- Passport photo
- Signature
- Generated PDF

Signed URLs are short-lived (1 hour, matching the pattern already used in `getAuthorizedNominator`) and never stored — regenerated on every page load.

## File structure (new files)

- `src/app/agents/(dashboard)/layout.tsx`
- `src/app/agents/(dashboard)/page.tsx`
- `src/app/agents/(dashboard)/nominations/[id]/page.tsx`
- `src/lib/agents/nominations.ts` — the shared list/detail query functions (`listCandidateNominations`, `getCandidateNomination`), kept out of the page files since both the list and a future Sub-project 4 export are likely to need the same candidate-scoped query shape.

## Testing

Same approach as the prior two sub-projects: `npm run lint` / `npm run build` (working around this environment's intermittent Google Fonts fetch failure the same way, if it recurs — `tsc --noEmit` + `eslint` as the network-independent substitute, full build retried before considering the work done), a scripted check against the real database confirming candidate-scoping actually excludes another candidate's rows (not just that the UI happens to filter correctly), and disclosed manual dev-server testing (no browser automation available).

## Out of scope for this spec (deferred)

- Any status/approve/reject/flag/verify/countersign action (Decision 1).
- Audit log display (Decision 4).
- Bulk export, CSV export (Sub-project 4).
- Any Ward/LGA/State Desk Officer or separate National Admin role — still not planned, per the Foundation spec's original scope cut.
