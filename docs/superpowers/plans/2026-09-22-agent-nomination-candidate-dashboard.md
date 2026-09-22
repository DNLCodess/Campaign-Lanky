# Party Agent Nomination Platform — Candidate Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the candidate-facing dashboard at `/agents` — a searchable, paginated list of the Polling Unit Agents submitted under one candidate's own candidacy, plus a detail page per nomination showing every field and signed-URL links to the uploaded files and generated PDF.

**Architecture:** A new route group `src/app/agents/(dashboard)/` guarded by the already-built `requireCandidateSession()`, so the public `/agents/login` and `/agents/submit/[slug]` routes are untouched. All data access goes through a small shared query module (`src/lib/agents/nominations.ts`) using the service-role client with an explicit `candidate_id` filter — never trusting RLS alone to scope the query, matching this codebase's established convention. Read-only: no status-changing actions exist in this sub-project.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres/Storage via service-role client).

**Spec:** `docs/superpowers/specs/2026-09-22-agent-nomination-candidate-dashboard-design.md`

## Global Constraints

- No status-changing actions anywhere in this plan (confirmed with the user: a nomination is final at submission). Do not add verify/flag/countersign/reject buttons.
- Every internal `<Link href>` and redirect target inside `/agents/*` pages must be wrapped in `agentsPath(...)` from `@/lib/agents/routes` — this repo's established convention (see every `portalPath(...)`-wrapped link under `src/app/portal/**`) for making routes work both on the `agents.votelanky.com` subdomain (production) and bare `localhost:3000` (local dev, where `NEXT_PUBLIC_AGENTS_BASE` may be unset).
- Every query in `src/lib/agents/nominations.ts` starts from `.eq("candidate_id", candidateId)` — a candidate must never be able to see another candidate's rows, including by guessing a nomination's UUID in the detail-page URL.
- No test framework in this repo. Verification is `npm run lint`, `npm run build` (falling back to `tsc --noEmit` + `eslint` if this environment's intermittent Google Fonts fetch failure recurs, with the full build retried before the work is considered done), a scripted database check, and disclosed manual dev-server testing (no browser automation available).
- Follow existing code style: service-role client is `createAdminSupabase()`; signed URLs use `createSignedUrl(path, 3600)` (1 hour), matching `getAuthorizedNominator` in `src/app/admin/(dashboard)/agent-nominations/authorized-nominator/actions.ts`.

---

## Task 1: Shared candidate-scoped query helpers

**Files:**
- Create: `src/lib/agents/nominations.ts`

**Interfaces:**
- Consumes: `createAdminSupabase` from `@/lib/supabase/admin`; `sanitizeSearch` from `@/lib/admin-tables` (generic, reused as-is — not `searchExpression`, which is typed to that file's own `AdminTableKey` union and doesn't include `agent_nominations`).
- Produces: `type NominationListItem`, `type NominationDetail`, `type NominationFile`, `listCandidateNominations(candidateId: string, options: { q?: string; duplicatesOnly?: boolean; page: number; pageSize: number }): Promise<{ rows: NominationListItem[]; total: number }>`, `getCandidateNomination(candidateId: string, nominationId: string): Promise<NominationDetail | null>`, `getNominationFiles(candidateId: string, nominationId: string): Promise<NominationFile[]>` — consumed by Task 3's detail page. Takes `candidateId` and re-verifies ownership itself rather than trusting the caller already checked (a post-commit security review during execution of this plan caught the original `nominationId`-only signature as an IDOR-shaped gap — the one call site was safe in practice, but the function wasn't safe to call on its own; this block reflects the corrected signature, not the plan's original draft).

- [ ] **Step 1: Write nominations.ts**

```ts
import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/admin-tables";

export type NominationListItem = {
  id: string;
  form_no: number;
  reference_id: string;
  first_name: string;
  other_names: string | null;
  surname: string;
  phone: string;
  polling_unit_code: string;
  polling_unit_name: string;
  is_possible_duplicate: boolean;
  created_at: string;
};

export type NominationDetail = {
  id: string;
  candidate_id: string;
  form_no: number;
  reference_id: string;
  first_name: string;
  other_names: string | null;
  surname: string;
  gender: "male" | "female";
  phone: string;
  email: string | null;
  means_of_id: string;
  lga: string;
  ward: number;
  polling_unit_code: string;
  polling_unit_name: string;
  status: string;
  is_possible_duplicate: boolean;
  created_at: string;
};

export type NominationFile = {
  file_type: string;
  url: string | null;
};

const SEARCH_COLUMNS = ["first_name", "other_names", "surname", "phone", "email", "reference_id"];

/** Paginated, searchable list of one candidate's own nominations, newest first. */
export async function listCandidateNominations(
  candidateId: string,
  options: { q?: string; duplicatesOnly?: boolean; page: number; pageSize: number },
): Promise<{ rows: NominationListItem[]; total: number }> {
  const admin = createAdminSupabase();
  let query = admin
    .from("agent_nominations")
    .select(
      "id, form_no, reference_id, first_name, other_names, surname, phone, polling_unit_code, polling_unit_name, is_possible_duplicate, created_at",
      { count: "exact" },
    )
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1);

  const q = sanitizeSearch(options.q ?? "");
  if (q) {
    const expr = SEARCH_COLUMNS.map((c) => `${c}.ilike.%${q}%`).join(",");
    query = query.or(expr);
  }
  if (options.duplicatesOnly) {
    query = query.eq("is_possible_duplicate", true);
  }

  const { data, count } = await query;
  return { rows: (data ?? []) as NominationListItem[], total: count ?? 0 };
}

/** A single nomination, re-scoped to candidateId in the query itself — never fetched then trusted. */
export async function getCandidateNomination(
  candidateId: string,
  nominationId: string,
): Promise<NominationDetail | null> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nominations")
    .select(
      "id, candidate_id, form_no, reference_id, first_name, other_names, surname, gender, phone, email, means_of_id, lga, ward, polling_unit_code, polling_unit_name, status, is_possible_duplicate, created_at",
    )
    .eq("id", nominationId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  return (data as NominationDetail) ?? null;
}

/**
 * Signed URLs (1 hour) for every file on record for a nomination.
 * Takes candidateId and re-verifies ownership itself (not just trusting the
 * caller already checked) — this function must be safe to call on its own,
 * not only safe because the one current call site happens to check first.
 */
export async function getNominationFiles(
  candidateId: string,
  nominationId: string,
): Promise<NominationFile[]> {
  const admin = createAdminSupabase();
  const { data: owned } = await admin
    .from("agent_nominations")
    .select("id")
    .eq("id", nominationId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (!owned) return [];

  const { data: files } = await admin
    .from("agent_nomination_files")
    .select("file_type, storage_path")
    .eq("nomination_id", nominationId);
  if (!files || files.length === 0) return [];

  return Promise.all(
    files.map(async (f) => {
      const { data: signed } = await admin.storage
        .from("agent-nominations")
        .createSignedUrl(f.storage_path, 3600);
      return { file_type: f.file_type as string, url: signed?.signedUrl ?? null };
    }),
  );
}
```

- [ ] **Step 2: Verify with a type check**

Run: `npx tsc --noEmit`
Expected: no errors. (Nothing imports this module yet, so this only confirms it compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/nominations.ts
git commit -m "feat(agents): add candidate-scoped nomination query helpers"
```

---

## Task 2: Dashboard layout and nomination list page

**Files:**
- Create: `src/app/agents/(dashboard)/layout.tsx`
- Create: `src/app/agents/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `requireCandidateSession` from `@/lib/agents/session`; `logoutCandidate` from `@/app/agents/actions/auth`; `agentsPath` from `@/lib/agents/routes`; `listCandidateNominations`/`NominationListItem` from Task 1's `@/lib/agents/nominations`.
- Produces: the `/agents` route rendering a working list (this is `loginCandidate`'s existing redirect target, currently a 404).

- [ ] **Step 1: Write the dashboard layout**

```tsx
import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { logoutCandidate } from "@/app/agents/actions/auth";
import { agentsPath } from "@/lib/agents/routes";

export default async function AgentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCandidateSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-surface/40 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={agentsPath("/")} className="font-heading text-lg text-text">
              {session.full_name}
            </Link>
            <p className="text-xs text-text-muted">{session.office}</p>
          </div>
          <form action={logoutCandidate}>
            <button
              type="submit"
              className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Write the list page**

```tsx
import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { listCandidateNominations } from "@/lib/agents/nominations";
import { agentsPath } from "@/lib/agents/routes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function buildUrl(page: number, q: string, duplicatesOnly: boolean): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  if (duplicatesOnly) params.set("duplicates", "1");
  const qs = params.toString();
  return agentsPath(qs ? `/?${qs}` : "/");
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

const fullNameOf = (r: { first_name: string; other_names: string | null; surname: string }) =>
  [r.first_name, r.other_names, r.surname].filter(Boolean).join(" ");

export default async function AgentsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; duplicates?: string; page?: string }>;
}) {
  const session = await requireCandidateSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").toString();
  const duplicatesOnly = sp.duplicates === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listCandidateNominations(session.id, {
    q,
    duplicatesOnly,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="border-b border-border/60 pb-6">
        <h1 className="font-heading text-2xl text-text">Nominations</h1>
        <p className="text-sm text-text-muted">Polling Unit Agents submitted under your candidacy.</p>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email, reference…"
            className="w-full rounded-brand border border-border bg-bg px-4 py-2 text-sm text-text focus:border-accent focus:outline-none sm:w-64"
          />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              name="duplicates"
              value="1"
              defaultChecked={duplicatesOnly}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Possible duplicates only
          </label>
          <button
            type="submit"
            className="shrink-0 rounded-brand border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Search
          </button>
          {(q || duplicatesOnly) && (
            <Link href={agentsPath("/")} className="shrink-0 text-sm text-text-muted hover:text-text">
              Clear
            </Link>
          )}
        </form>
      </div>

      {rows.length === 0 && (
        <div className="mt-4 rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
          {q || duplicatesOnly ? "No matching nominations." : "No nominations submitted yet."}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-brand border border-border md:block">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Polling Unit</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="text-text-muted">
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-4 py-3 align-top text-text">
                    {fullNameOf(r)}
                    {r.is_possible_duplicate && (
                      <span className="ml-2 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                        Possible duplicate
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">{r.phone}</td>
                  <td className="px-4 py-3 align-top">
                    {r.polling_unit_code} — {r.polling_unit_name}
                  </td>
                  <td className="px-4 py-3 align-top">{when(r.created_at)}</td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link
                      href={agentsPath(`/nominations/${r.id}`)}
                      className="text-accent underline underline-offset-2 hover:text-text"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3 md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={agentsPath(`/nominations/${r.id}`)}
              className="block rounded-brand border border-border bg-surface/40 p-4"
            >
              <p className="font-medium text-text">{fullNameOf(r)}</p>
              {r.is_possible_duplicate && (
                <span className="mt-1 inline-block rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                  Possible duplicate
                </span>
              )}
              <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-xs text-text-muted">
                <p>{r.phone}</p>
                <p>
                  {r.polling_unit_code} — {r.polling_unit_name}
                </p>
                <p>{when(r.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-text-muted sm:flex-row">
        <span>
          {total === 0
            ? "0 nominations"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <PageLink disabled={page <= 1} href={buildUrl(page - 1, q, duplicatesOnly)}>
            ← Prev
          </PageLink>
          <span className="px-2 py-1.5">
            {page} / {totalPages}
          </span>
          <PageLink disabled={page >= totalPages} href={buildUrl(page + 1, q, duplicatesOnly)}>
            Next →
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-brand border border-border/40 px-3 py-1.5 opacity-40">{children}</span>;
  }
  return (
    <Link
      href={href}
      className="rounded-brand border border-border px-3 py-1.5 transition-colors hover:border-accent hover:text-text"
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 3: Verify with a build**

Run: `npm run build` (or `npx tsc --noEmit` + `npx eslint src/app/agents src/lib/agents` if the Google Fonts fetch flakes — retry the full build before moving on regardless)
Expected: succeeds. Confirm the route list includes `/agents` (previously a 404 target):
```bash
npm run build 2>&1 | grep -E "^\s*[○ƒ]\s+/agents\s*$"
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/agents/(dashboard)/layout.tsx" "src/app/agents/(dashboard)/page.tsx"
git commit -m "feat(agents): add candidate dashboard layout and nomination list"
```

---

## Task 3: Nomination detail page

**Files:**
- Create: `src/app/agents/(dashboard)/nominations/[id]/page.tsx`

**Interfaces:**
- Consumes: `requireCandidateSession` (`@/lib/agents/session`); `getCandidateNomination`/`getNominationFiles`/`NominationDetail`/`NominationFile` (Task 1's `@/lib/agents/nominations`); `agentsPath` (`@/lib/agents/routes`).

- [ ] **Step 1: Write the detail page**

```tsx
import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { getCandidateNomination, getNominationFiles } from "@/lib/agents/nominations";
import { agentsPath } from "@/lib/agents/routes";

export const dynamic = "force-dynamic";

const FILE_LABELS: Record<string, string> = {
  pvc_copy: "PVC copy",
  passport_photo: "Passport photo",
  specimen_signature: "Signature",
  generated_pdf: "Generated form (PDF)",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function NominationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCandidateSession();
  const { id } = await params;
  const nomination = await getCandidateNomination(session.id, id);

  if (!nomination) {
    return (
      <div className="rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
        Nomination not found.
        <div className="mt-3">
          <Link href={agentsPath("/")} className="text-accent underline underline-offset-2">
            ← Back to nominations
          </Link>
        </div>
      </div>
    );
  }

  const files = await getNominationFiles(session.id, nomination.id);
  const fullName = [nomination.first_name, nomination.other_names, nomination.surname]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <Link href={agentsPath("/")} className="text-sm text-text-muted hover:text-text">
        ← Back to nominations
      </Link>

      <header className="mt-4 border-b border-border/60 pb-6">
        <h1 className="font-heading text-2xl text-text">{fullName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Form No. {nomination.form_no} · Reference {nomination.reference_id} · Submitted{" "}
          {when(nomination.created_at)}
        </p>
        {nomination.is_possible_duplicate && (
          <span className="mt-2 inline-block rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs text-yellow-300">
            Possible duplicate — matches an existing phone or email under this candidacy
          </span>
        )}
      </header>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Field label="Gender" value={nomination.gender === "male" ? "Male" : "Female"} />
        <Field label="Phone" value={nomination.phone} />
        <Field label="Email" value={nomination.email ?? "—"} />
        <Field label="Means of ID" value={nomination.means_of_id} />
        <Field label="LGA" value={nomination.lga} />
        <Field label="Ward" value={String(nomination.ward)} />
        <Field
          label="Polling Unit"
          value={`${nomination.polling_unit_code} — ${nomination.polling_unit_name}`}
        />
      </dl>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">Uploaded files</h2>
        <div className="mt-3 space-y-2">
          {files.length === 0 && <p className="text-sm text-text-muted">No files on record.</p>}
          {files.map((f) => (
            <div
              key={f.file_type}
              className="flex items-center justify-between rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm"
            >
              <span className="text-text">{FILE_LABELS[f.file_type] ?? f.file_type}</span>
              {f.url ? (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-text"
                >
                  View
                </a>
              ) : (
                <span className="text-text-muted">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted/70">{label}</dt>
      <dd className="mt-0.5 text-text">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build` (same fallback note as Task 2 Step 3 if the font fetch flakes)
Expected: succeeds. Confirm the dynamic route appears:
```bash
npm run build 2>&1 | grep "nominations/\[id\]"
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/agents/(dashboard)/nominations"
git commit -m "feat(agents): add nomination detail page"
```

---

## Task 4: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no new errors attributable to files created in this plan (this repo has pre-existing unrelated lint errors in `blog-editor.tsx`/`donate-form.tsx`/admin dashboard `page.tsx`, unchanged since Foundation — confirm no `src/app/agents/**` or `src/lib/agents/**` file appears in the output).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Scripted cross-candidate isolation check**

This is the one property that must be verified against the real database, not just read off the code: that `getCandidateNomination`'s and `getNominationFiles`'s `.eq("candidate_id", candidateId)` scoping actually excludes another candidate's row and files, not just that the UI happens to link correctly.

`src/lib/agents/nominations.ts` has `import "server-only"` at the top, which throws under plain Node/`tsx` (it's a Next.js build-time virtual module, not a real package — this bit Sub-project 2 the same way). Before running the script below, create a local no-op stub so the import resolves (never committed — `node_modules` is gitignored):

```bash
mkdir -p node_modules/server-only
echo '{"name": "server-only", "version": "0.0.1-local-stub", "main": "index.js"}' > node_modules/server-only/package.json
echo 'module.exports = {};' > node_modules/server-only/index.js
```

Then write `verify-candidate-isolation-scratch.mjs` **in the project root** (not `/tmp` — it needs `./src/...` relative imports to resolve, and `tsx`'s `@/` alias resolution needs to run from the project directory) and run with `npx tsx --env-file=.env.local verify-candidate-isolation-scratch.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { getCandidateNomination, getNominationFiles } from "./src/lib/agents/nominations.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Create two candidates and one nomination under candidate A only.
const emailA = `verify-iso-a-${Date.now()}@example.com`;
const emailB = `verify-iso-b-${Date.now()}@example.com`;
const { data: userA } = await admin.auth.admin.createUser({ email: emailA, password: "Sm0keTest!Pass123", email_confirm: true });
const { data: userB } = await admin.auth.admin.createUser({ email: emailB, password: "Sm0keTest!Pass123", email_confirm: true });
await admin.from("nomination_candidates").insert({ id: userA.user.id, email: emailA, full_name: "Isolation A", office: "Office A", election_type: "house_of_reps", slug: `iso-a-${Date.now()}` });
await admin.from("nomination_candidates").insert({ id: userB.user.id, email: emailB, full_name: "Isolation B", office: "Office B", election_type: "house_of_reps", slug: `iso-b-${Date.now()}` });

const { data: pu } = await admin.from("constituency_geo").select("pu_code, pu_name, lga, ward").limit(1).single();
const { data: nomination } = await admin
  .from("agent_nominations")
  .insert({
    candidate_id: userA.user.id,
    first_name: "Iso",
    surname: "Test",
    gender: "male",
    phone: "08000000001",
    means_of_id: "PVC",
    lga: pu.lga,
    ward: pu.ward,
    polling_unit_code: pu.pu_code,
    polling_unit_name: pu.pu_name,
    reference_id: `ISOTEST${Date.now()}`,
  })
  .select("id")
  .single();
await admin.from("agent_nomination_files").insert({
  nomination_id: nomination.id,
  file_type: "pvc_copy",
  storage_path: `nominations/${nomination.id}/pvc.jpg`,
});

const asOwner = await getCandidateNomination(userA.user.id, nomination.id);
const asOther = await getCandidateNomination(userB.user.id, nomination.id);
console.log("nomination as owner (expect non-null):", asOwner ? "FOUND" : "NULL");
console.log("nomination as other candidate (expect NULL):", asOther ? "FOUND — BUG" : "NULL — correct");

const filesAsOwner = await getNominationFiles(userA.user.id, nomination.id);
const filesAsOther = await getNominationFiles(userB.user.id, nomination.id);
console.log("files as owner (expect 1 row):", filesAsOwner.length);
console.log("files as other candidate (expect 0 rows):", filesAsOther.length, filesAsOther.length > 0 ? "— BUG" : "— correct");

// Cleanup
await admin.from("agent_nomination_files").delete().eq("nomination_id", nomination.id);
await admin.from("agent_nominations").delete().eq("id", nomination.id);
await admin.from("nomination_candidates").delete().in("id", [userA.user.id, userB.user.id]);
await admin.auth.admin.deleteUser(userA.user.id);
await admin.auth.admin.deleteUser(userB.user.id);
```

Run: `npx tsx --env-file=.env.local verify-candidate-isolation-scratch.mjs`, then delete the scratch file (`rm verify-candidate-isolation-scratch.mjs`) — it's a one-off check, not permanent test code.
Expected output: `nomination as owner (expect non-null): FOUND`, `nomination as other candidate (expect NULL): NULL — correct`, `files as owner (expect 1 row): 1`, and `files as other candidate (expect 0 rows): 0 — correct`. If either "other candidate" line reports a find, stop — that's a real cross-candidate data leak, not a test artifact to explain away. (This script already includes the fix for a real IDOR a post-commit security review caught during execution of this plan: `getNominationFiles` originally took only `nominationId`, with no ownership check of its own — see the note on its signature above.)

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Using a real (or freshly created, via `/admin/agent-nominations/candidates`) candidate account with at least one nomination submitted under it:

1. Sign in at `/agents/login`.
2. Confirm the list page loads at `/agents`, showing that candidate's nominations and no one else's.
3. Search by a substring of a nominee's name, then by phone, then by the reference ID shown on their confirmation screen — confirm each narrows correctly.
4. Toggle "Possible duplicates only" — confirm it filters as expected (submit two nominations with the same phone under the same candidate first if none exist yet, to have something to filter for).
5. Click into a nomination's detail page — confirm every field matches what was submitted, and that each file link (PVC, photo, signature, generated PDF) opens and shows the right content.
6. Manually visit another candidate's nomination ID (or an unrelated UUID) while signed in as this candidate — confirm the "Nomination not found" message, not their data.
7. Sign out — confirm it redirects to `/agents/login` and that visiting `/agents` again redirects back to login (not showing stale content).

- [ ] **Step 5: Confirm no stray uncommitted changes**

Run: `git status`
Expected: clean tree.
