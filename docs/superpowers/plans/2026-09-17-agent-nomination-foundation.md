# Party Agent Nomination Platform — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the database schema, storage, subdomain routing, and authority login for the Party Agent Nomination Platform (`agents.votelanky.com`), so Sub-projects 2–4 (nominee form, admin/countersign, bulk export) have a working foundation to build on.

**Architecture:** New tables in the existing Supabase project (no new project), a new private storage bucket, a host-based rewrite in `src/proxy.ts` mirroring the existing `portal.votelanky.com` pattern, and a `nomination_authorities` login flow that copies the already-proven `portal_accounts` auth pattern (Supabase Auth + service-role row lookup + RLS as a defense-in-depth backstop). A dev-only screen for creating authority accounts is added under the existing `/admin` dashboard, reusing `requireAdmin()` — no new admin auth mechanism.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres/Auth/Storage), Tailwind CSS, existing form primitives in `src/components/form`.

**Spec:** `docs/superpowers/specs/2026-09-17-agent-nomination-foundation-design.md`

## Global Constraints

- Supabase project id for every MCP tool call in this plan: `atavwpoistostnqxmeal`.
- Table names must not collide with the existing `candidates`/`elections`/`election_results` tables (unrelated election-results-tracking feature). New tables are prefixed `agent_nomination_*` or named `nomination_authorities` / `agent_login_attempts`.
- Nominee-facing writes (built in Sub-project 2, not this plan) will go through the service-role client only — this plan's RLS policies grant `authenticated` authorities read/update access scoped to their own rows, never `anon`/nominee direct table access.
- New npm dependencies for this platform: `pdf-lib`, `react-signature-canvas`, `@types/react-signature-canvas`, `jszip`. All four are installed now (Task 1) even though `jszip` isn't consumed until Sub-project 4, for a single dependency-install pass.
- No test framework exists in this repo (no jest/vitest). Verification is `npm run lint`, `npm run build`, direct SQL checks via the `mcp__supabase__execute_sql`/`get_advisors` tools, and dev-server smoke testing — this is this repo's established pattern (see `docs/superpowers/specs/2026-08-26-election-results-portal-design.md`, "Testing" section), not a shortcut taken here.
- Follow existing code style exactly: `"use server"` action files return `{ error? }`/`{ success? }` state objects for `useActionState`, service-role client is `createAdminSupabase()` from `@/lib/supabase/admin`, session-aware client is `createSupabaseServerClient()` from `@/lib/supabase/auth-server`.

---

## Task 1: Install new dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm, not hand-edited)

**Interfaces:**
- Produces: `pdf-lib`, `react-signature-canvas`, `jszip` importable from any file in later sub-projects.

- [ ] **Step 1: Install the packages**

Run:
```bash
npm install pdf-lib react-signature-canvas jszip
npm install --save-dev @types/react-signature-canvas
```

- [ ] **Step 2: Verify the install**

Run: `npm run build`
Expected: build succeeds (these packages aren't imported anywhere yet, so this just confirms `npm install` didn't break the lockfile/build).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdf-lib, react-signature-canvas, jszip for agent nomination platform"
```

---

## Task 2: Database schema migration

**Files:**
- Create (record of the migration, matches this repo's existing convention of saving applied SQL under specs): `docs/superpowers/specs/2026-09-17-agent-nomination-schema.sql`
- No other files — applied directly to Supabase via the `mcp__supabase__apply_migration` tool, not a local Next.js migration runner (this repo has none).

**Interfaces:**
- Produces: tables `nomination_authorities`, `agent_login_attempts`, `agent_nominations`, `agent_nomination_files`, `agent_nomination_audit_log` — exact columns below, consumed by every later task and sub-project.

- [ ] **Step 1: Write the migration SQL to the specs file**

```sql
-- nomination_authorities: login-having accounts, one per candidate/office.
-- Row creation is service-role only (dev-only admin UI) — no insert policy.
create table public.nomination_authorities (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  office text not null,
  election_type text not null check (
    election_type in ('presidential','governorship','senatorial','house_of_reps','house_of_assembly')
  ),
  slug text not null unique,
  signature_storage_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.nomination_authorities enable row level security;
create policy "authority reads own row"
  on public.nomination_authorities for select to authenticated
  using (id = auth.uid());
-- No UPDATE policy: nothing in this sub-project writes to this table via the
-- authenticated client. An unused grant would let an authority self-reactivate
-- after an admin deactivation, or edit their own slug/email, with no real
-- consumer to justify the exposure. Add a narrower, column-scoped policy in
-- Sub-project 3 if/when authorities need to self-edit anything.
-- (This was caught by post-commit security review during execution of this
-- plan and corrected in-branch — see commit "fix(db): remove unused authority
-- self-service UPDATE RLS policies" — this block reflects the corrected,
-- actually-applied schema, not the plan's original draft.)

-- agent_login_attempts: brute-force throttle for /agents/login, mirrors
-- the existing portal_login_attempts table exactly (service-role only,
-- no RLS policies = deny all to anon/authenticated).
create table public.agent_login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.agent_login_attempts enable row level security;
comment on table public.agent_login_attempts is
  'Brute-force throttle for /agents/login. Written/read only via the service-role client. No RLS policies = deny all to anon/authenticated, same as portal_login_attempts.';

-- agent_nominations: one row per Polling Unit Agent submission.
-- election_type / agent_for are inherited from the authority, not stored
-- per-row. No DB unique constraint on phone/email: duplicates are a soft
-- flag (is_possible_duplicate), set by application logic, not a rejected
-- insert.
create table public.agent_nominations (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references public.nomination_authorities(id) on delete cascade,
  form_no bigint generated always as identity,
  first_name text not null,
  other_names text,
  surname text not null,
  gender text not null check (gender in ('male','female')),
  phone text not null,
  email text,
  means_of_id text not null default 'PVC',
  lga text not null,
  ward integer not null check (ward > 0),
  polling_unit_code text not null references public.constituency_geo(pu_code),
  polling_unit_name text not null,
  reference_id text not null unique,
  status text not null default 'submitted' check (
    status in ('submitted','flagged','verified','countersigned','rejected')
  ),
  flag_reason text,
  is_possible_duplicate boolean not null default false,
  countersigned_at timestamptz,
  countersign_decision text check (countersign_decision in ('approved','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_nominations_authority_id_idx on public.agent_nominations (authority_id);
create index agent_nominations_authority_phone_idx on public.agent_nominations (authority_id, phone);
create index agent_nominations_authority_email_idx on public.agent_nominations (authority_id, email);
alter table public.agent_nominations enable row level security;
create policy "authority reads own nominations"
  on public.agent_nominations for select to authenticated
  using (authority_id = auth.uid());
-- No UPDATE policy: flag/verify/countersign actions aren't built until
-- Sub-project 3. A blanket row-scoped grant today would let an authority
-- forge status/countersign fields outside the real approval flow. Add the
-- specific, narrower policy in Sub-project 3 alongside its actual UI.

-- agent_nomination_files: pvc/photo/signature/generated_pdf storage refs.
create table public.agent_nomination_files (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.agent_nominations(id) on delete cascade,
  file_type text not null check (
    file_type in ('pvc_copy','passport_photo','specimen_signature','attestation_signature','generated_pdf')
  ),
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);
create index agent_nomination_files_nomination_id_idx on public.agent_nomination_files (nomination_id);
alter table public.agent_nomination_files enable row level security;
create policy "authority reads own nomination files"
  on public.agent_nomination_files for select to authenticated
  using (exists (
    select 1 from public.agent_nominations n
    where n.id = nomination_id and n.authority_id = auth.uid()
  ));

-- agent_nomination_audit_log: who did what to which nomination, and when.
create table public.agent_nomination_audit_log (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.agent_nominations(id) on delete cascade,
  actor uuid references public.nomination_authorities(id),
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index agent_nomination_audit_log_nomination_id_idx on public.agent_nomination_audit_log (nomination_id);
alter table public.agent_nomination_audit_log enable row level security;
create policy "authority reads own nomination audit log"
  on public.agent_nomination_audit_log for select to authenticated
  using (exists (
    select 1 from public.agent_nominations n
    where n.id = nomination_id and n.authority_id = auth.uid()
  ));
```

- [ ] **Step 2: Apply the migration**

Call `mcp__supabase__apply_migration` with `project_id: "atavwpoistostnqxmeal"`, `name: "agent_nomination_foundation_schema"`, and `query` set to the exact SQL block from Step 1.

- [ ] **Step 3: Verify the tables and policies exist**

Call `mcp__supabase__execute_sql` with `project_id: "atavwpoistostnqxmeal"` and:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
and table_name in (
  'nomination_authorities', 'agent_login_attempts', 'agent_nominations',
  'agent_nomination_files', 'agent_nomination_audit_log'
)
order by table_name;
```
Expected: all 5 table names returned.

Then:
```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public'
and tablename in (
  'nomination_authorities', 'agent_nominations',
  'agent_nomination_files', 'agent_nomination_audit_log'
)
order by tablename, policyname;
```
Expected: 4 rows total — 1 for `nomination_authorities` (select), 1 for `agent_nominations` (select), 1 for `agent_nomination_files` (select), 1 for `agent_nomination_audit_log` (select). `agent_login_attempts` has zero rows (no policies, by design). No `update` policies — see the UPDATE-policy notes inline above.

- [ ] **Step 4: Run the security advisor**

Call `mcp__supabase__get_advisors` with `project_id: "atavwpoistostnqxmeal"`, `type: "security"`.
Expected: no new high/critical findings for the 5 tables created in this task (an "RLS enabled, no policy for X role" info-level note is fine and matches the by-design service-role-only tables; a "RLS disabled" finding on any of the 5 new tables is a failure — fix by re-running the relevant `alter table ... enable row level security` statement).

- [ ] **Step 5: Commit the spec-file record**

```bash
git add docs/superpowers/specs/2026-09-17-agent-nomination-schema.sql
git commit -m "feat(db): add agent nomination platform schema (authorities, nominations, files, audit log)"
```

---

## Task 3: Storage bucket

**Files:**
- Create: `docs/superpowers/specs/2026-09-17-agent-nomination-storage.sql`

**Interfaces:**
- Consumes: nothing (independent of Task 2's tables).
- Produces: private bucket `agent-nominations`, referenced by `agent_nomination_files.storage_path` and `nomination_authorities.signature_storage_path` from Sub-project 2 onward.

- [ ] **Step 1: Write the bucket SQL**

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-nominations',
  'agent-nominations',
  false,
  10485760,
  array['image/jpeg','image/png','application/pdf']
);
```

No `storage.objects` RLS policies are added — this matches the existing `result-sheets` bucket exactly (private, zero object policies, all access via the service-role client and signed URLs from server code).

- [ ] **Step 2: Apply it**

Call `mcp__supabase__apply_migration` with `project_id: "atavwpoistostnqxmeal"`, `name: "agent_nomination_storage_bucket"`, `query` set to the SQL from Step 1.

- [ ] **Step 3: Verify**

Call `mcp__supabase__execute_sql` with `project_id: "atavwpoistostnqxmeal"`:
```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'agent-nominations';
```
Expected: one row, `public = false`, `file_size_limit = 10485760`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-17-agent-nomination-storage.sql
git commit -m "feat(storage): add private agent-nominations bucket"
```

---

## Task 4: Subdomain routing

**Files:**
- Modify: `src/proxy.ts`
- Create: `src/lib/agents/routes.ts`

**Interfaces:**
- Produces: `agentsPath(path: string): string` — prefixes a route with the configured base, exactly like `portalPath` in `src/lib/portal/routes.ts`. Consumed by every `/agents` page/link in later tasks and sub-projects.

- [ ] **Step 1: Add the agents host list to proxy.ts**

Read the current file first (`src/proxy.ts`), then apply this change — add a second host list and rewrite branch alongside the existing portal one:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Named `proxy` — Next.js 16 renamed the "middleware" file convention to
 * "proxy". The exported function must match. It must live in `src/`
 * (alongside `src/app`), not the project root, or it is silently never
 * invoked — see node_modules/next/dist/docs/.../proxy.md.
 *
 * Three independent responsibilities:
 * 1. Refresh the Supabase auth session cookie on /admin routes so server
 *    components always see a valid session. Page-level `requireAdmin()`
 *    still enforces access.
 * 2. Rewrite requests to portal.votelanky.com (the election results portal,
 *    same deployment as the public site) to /portal/*. Locally,
 *    `portal.localhost:3000` works the same way for dev/testing.
 * 3. Rewrite requests to agents.votelanky.com (the Party Agent Nomination
 *    Platform, same deployment) to /agents/*. Locally,
 *    `agents.localhost:3000` works the same way for dev/testing.
 */
const PORTAL_HOSTS = ["portal.votelanky.com", "portal.localhost"];
const AGENTS_HOSTS = ["agents.votelanky.com", "agents.localhost"];

export async function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];

  if (PORTAL_HOSTS.includes(hostname) && !request.nextUrl.pathname.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = `/portal${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (AGENTS_HOSTS.includes(hostname) && !request.nextUrl.pathname.startsWith("/agents")) {
    const url = request.nextUrl.clone();
    url.pathname = `/agents${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals —
     * broad enough to catch the portal-host and agents-host rewrites on any
     * path, while the session-refresh logic above still only touches /admin.
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon_io|brand|consituency).*)",
  ],
};
```

- [ ] **Step 2: Create the agents routes helper**

```ts
/**
 * Base path for every in-app agents-platform link.
 *
 * Production: served from `agents.votelanky.com`, where the proxy
 * (`src/proxy.ts`) rewrites `/*` -> `/agents/*` transparently. Links stay
 * bare (`/login`, `/dev`, ...) and the URL bar shows the short form. So the
 * default here is `""`.
 *
 * Local dev on plain `http://localhost:3000` has no agents subdomain and no
 * rewrite, so bare `/login` would resolve to the wrong route. Setting
 * `NEXT_PUBLIC_AGENTS_BASE=/agents` in `.env.local` makes every agents link
 * point at the real route, so the platform is fully usable without the
 * subdomain.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this works in both server
 * and client components. Leave it unset in Vercel to keep production
 * behaviour.
 */
export const AGENTS_BASE = process.env.NEXT_PUBLIC_AGENTS_BASE ?? "";

/** Prefixes an agents-platform route with the configured base. */
export function agentsPath(path: string): string {
  return `${AGENTS_BASE}${path}`;
}
```

- [ ] **Step 3: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts src/lib/agents/routes.ts
git commit -m "feat(agents): add agents.votelanky.com subdomain routing"
```

---

## Task 5: Agents lib — constants, rate limiting, session

**Files:**
- Create: `src/lib/agents/constants.ts`
- Create: `src/lib/agents/rate-limit.ts`
- Create: `src/lib/agents/session.ts`

**Interfaces:**
- Consumes: `agentsPath` from Task 4's `src/lib/agents/routes.ts`; `createAdminSupabase` from `@/lib/supabase/admin`; `createSupabaseServerClient` from `@/lib/supabase/auth-server`.
- Produces: `ELECTION_TYPES: readonly string[]`, `ELECTION_TYPE_LABELS: Record<ElectionType, string>` (constants.ts); `getClientIp(): Promise<string>`, `isLoginRateLimited(ip: string, email: string): Promise<boolean>`, `recordLoginAttempt(ip: string, email: string, succeeded: boolean): Promise<void>` (rate-limit.ts); `type AuthoritySession`, `getAuthoritySession(): Promise<AuthoritySession | null>`, `requireAuthoritySession(): Promise<AuthoritySession>`, `logAgentAudit(entry): Promise<void>` (session.ts). All consumed by Task 6's login flow and by Sub-projects 2–3.

- [ ] **Step 1: Write constants.ts**

```ts
export const ELECTION_TYPES = [
  "presidential",
  "governorship",
  "senatorial",
  "house_of_reps",
  "house_of_assembly",
] as const;
export type ElectionType = (typeof ELECTION_TYPES)[number];

export const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senatorial: "Senatorial",
  house_of_reps: "House of Representatives",
  house_of_assembly: "House of Assembly",
};
```

- [ ] **Step 2: Write rate-limit.ts** (copy of `src/lib/portal/rate-limit.ts`, retargeted at the new table)

```ts
import "server-only";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IP = 10;
const MAX_FAILURES_PER_EMAIL = 5;
const CLEANUP_AFTER_MINUTES = 60;

/**
 * Client IP for throttling. In production the app runs behind Vercel's proxy,
 * which sets `x-vercel-forwarded-for` / `x-real-ip` to the real connecting
 * address and does NOT let a client forge them — so those are trusted first.
 * The leftmost `x-forwarded-for` entry is client-controlled and only used as a
 * last resort (local dev / a non-Vercel host); treat it as advisory.
 */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const trusted = hdrs.get("x-vercel-forwarded-for") || hdrs.get("x-real-ip");
  if (trusted) return trusted.trim();
  const fwd = hdrs.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

function emailKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}
function ipKey(ip: string): string {
  return `ip:${ip}`;
}

/**
 * True if either this IP or this email address has had too many failed
 * agents-platform logins in the window. Fail-open: if the check itself
 * errors we allow the attempt rather than lock every authority out on a
 * transient DB problem — Supabase Auth's own server-side per-IP rate
 * limiting on signInWithPassword is the backstop when this layer is
 * unavailable.
 */
export async function isLoginRateLimited(ip: string, email: string): Promise<boolean> {
  const identifiers = [emailKey(email)];
  if (ip !== "unknown") identifiers.push(ipKey(ip));

  const admin = createAdminSupabase();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from("agent_login_attempts")
    .select("identifier")
    .in("identifier", identifiers)
    .eq("succeeded", false)
    .gte("created_at", since);
  if (error) {
    console.error("[agents] login rate-limit check failed, allowing attempt", error);
    return false;
  }

  let ipFails = 0;
  let emailFails = 0;
  for (const row of data ?? []) {
    if (row.identifier === ipKey(ip)) ipFails++;
    else emailFails++;
  }
  return ipFails >= MAX_FAILURES_PER_IP || emailFails >= MAX_FAILURES_PER_EMAIL;
}

/**
 * Record a login attempt against both the IP and the email key. On success,
 * clears the failure history for those same keys.
 */
export async function recordLoginAttempt(ip: string, email: string, succeeded: boolean): Promise<void> {
  const admin = createAdminSupabase();
  const rows = [{ identifier: emailKey(email), succeeded }];
  if (ip !== "unknown") rows.push({ identifier: ipKey(ip), succeeded });
  await admin.from("agent_login_attempts").insert(rows);

  if (succeeded) {
    await admin
      .from("agent_login_attempts")
      .delete()
      .in("identifier", rows.map((r) => r.identifier))
      .eq("succeeded", false);
    return;
  }

  // Opportunistic cleanup so the table doesn't grow unbounded.
  const cutoff = new Date(Date.now() - CLEANUP_AFTER_MINUTES * 60_000).toISOString();
  await admin.from("agent_login_attempts").delete().lt("created_at", cutoff);
}
```

- [ ] **Step 3: Write session.ts**

```ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { ElectionType } from "@/lib/agents/constants";

export type AuthoritySession = {
  id: string;
  email: string;
  full_name: string;
  office: string;
  election_type: ElectionType;
  slug: string;
  is_active: boolean;
};

async function getVerifiedUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/**
 * Returns the signed-in nomination authority for this request, or null.
 * Wrapped in React `cache()` so the layout guard and the page guard in the
 * same render share one `auth.getUser()` round trip + one
 * `nomination_authorities` lookup.
 */
export const getAuthoritySession = cache(async (): Promise<AuthoritySession | null> => {
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, email, full_name, office, election_type, slug, is_active")
    .eq("id", user.id)
    .single();

  if (!authority || !authority.is_active) return null;
  return authority as AuthoritySession;
});

/** Guard for an authority-only page — redirects to login if not signed in. */
export async function requireAuthoritySession(): Promise<AuthoritySession> {
  const session = await getAuthoritySession();
  if (!session) redirect("/agents/login");
  return session;
}

export async function logAgentAudit(entry: {
  nominationId: string;
  actor: string | null;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  const admin = createAdminSupabase();
  await admin.from("agent_nomination_audit_log").insert({
    nomination_id: entry.nominationId,
    actor: entry.actor,
    action: entry.action,
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
  });
}
```

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors. (`logAgentAudit` and `getAuthoritySession` are unused until Task 6/7 — Next.js/TS won't error on unused exports, only unused local variables, so this is expected to pass.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/constants.ts src/lib/agents/rate-limit.ts src/lib/agents/session.ts
git commit -m "feat(agents): add constants, rate limiting, and session helpers"
```

---

## Task 6: Authority login flow

**Files:**
- Create: `src/app/agents/layout.tsx`
- Create: `src/app/agents/actions/auth.ts`
- Create: `src/app/agents/login/page.tsx`

**Interfaces:**
- Consumes: `getClientIp`, `isLoginRateLimited`, `recordLoginAttempt` from Task 5's `rate-limit.ts`; `AuthoritySession` shape from `session.ts`; `agentsPath` from Task 4; form primitives `TextField`, `PasswordField`, `FormBanner`, `SubmitButton` from `@/components/form`.
- Produces: `loginAuthority(prev, formData): Promise<AgentActionState>`, `logoutAuthority(): Promise<void>` — consumed by the login page now and by every authenticated `/agents` page added in later sub-projects.

- [ ] **Step 1: Write the layout**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Party Agent Nominations",
  robots: { index: false, follow: false },
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
```

- [ ] **Step 2: Write the auth action**

```ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp, isLoginRateLimited, recordLoginAttempt } from "@/lib/agents/rate-limit";
import { agentsPath } from "@/lib/agents/routes";

export type AgentActionState = { error?: string };

export async function loginAuthority(
  _prev: AgentActionState,
  formData: FormData,
): Promise<AgentActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await getClientIp();
  if (await isLoginRateLimited(ip, email)) {
    return { error: "Too many failed attempts. Wait a few minutes and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    await recordLoginAttempt(ip, email, false);
    return { error: "Invalid email or password." };
  }

  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, is_active")
    .eq("id", authData.user.id)
    .single();

  if (!authority || !authority.is_active) {
    await supabase.auth.signOut();
    await recordLoginAttempt(ip, email, false);
    return { error: "This account is not authorised for the nomination platform." };
  }

  await recordLoginAttempt(ip, email, true);
  redirect(agentsPath("/"));
}

export async function logoutAuthority(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(agentsPath("/login"));
}
```

- [ ] **Step 3: Write the login page**

```tsx
"use client";

import { useActionState, useRef } from "react";
import { loginAuthority, type AgentActionState } from "@/app/agents/actions/auth";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: AgentActionState = {};

export default function AgentsLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAuthority, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => {
    if (!isPending) formRef.current?.requestSubmit();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/70 p-8 shadow-2xl shadow-black/40">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Party Agent Nominations
        </p>
        <h1 className="mt-2 font-heading text-2xl text-text">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">
          Review and countersign nominations submitted under your candidacy.
        </p>

        <form ref={formRef} action={formAction} className="mt-6 space-y-4">
          {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
          <TextField
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            autoFocus
            onEnter={submit}
          />
          <PasswordField
            name="password"
            label="Password"
            autoComplete="current-password"
            onEnter={submit}
          />
          <SubmitButton pending={isPending} pendingLabel="Signing in…" fullWidth>
            Sign in
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds. `agentsPath("/")` in the redirect will 404 until a home page exists — that's expected and fixed by Sub-project 2/3, not this plan; the login *mechanism* (auth check, rate limit, redirect target resolution) is what this task verifies.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, then in a browser visit `http://localhost:3000/agents/login` (no subdomain needed locally since `AGENTS_BASE` defaults to `""` and the page is already under `/agents`).
Expected: the login form renders. Submitting empty fields shows "Enter your email and password." Submitting a nonexistent email/password shows "Invalid email or password." (A real login can't be smoke-tested until Task 7 creates the first authority account — do that check as part of Task 7's smoke test instead.)

- [ ] **Step 6: Commit**

```bash
git add src/app/agents/layout.tsx src/app/agents/actions/auth.ts src/app/agents/login/page.tsx
git commit -m "feat(agents): add nomination authority login flow"
```

---

## Task 7: Dev-only admin UI for creating nomination authorities

**Files:**
- Create: `src/app/admin/(dashboard)/agent-nominations/authorities/page.tsx`
- Create: `src/app/admin/(dashboard)/agent-nominations/authorities/actions.ts`
- Create: `src/app/admin/(dashboard)/agent-nominations/authorities/authority-form.tsx`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/admin-auth`; `createAdminSupabase` from `@/lib/supabase/admin`; `generateSecurePassword` from `@/lib/portal/password` (reused as-is — it's generic, not portal-specific); `ELECTION_TYPES`, `ELECTION_TYPE_LABELS` from `@/lib/agents/constants`; form primitives `FieldSection`, `TextField`, `SelectField`, `FileField`, `FormBanner`, `SubmitButton`, `CredentialHandoff` from `@/components/form`.
- Produces: a working screen at `/admin/agent-nominations/authorities` to create authority accounts with a signature PNG upload. Not linked from `AdminSidebar` (intentionally unlisted — direct URL only, per the spec).

- [ ] **Step 1: Write the create-authority action**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSecurePassword } from "@/lib/portal/password";
import { ELECTION_TYPES, type ElectionType } from "@/lib/agents/constants";

export type AuthorityActionState = { error?: string; success?: string; plainPassword?: string };

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_SIGNATURE_TYPES = ["image/png"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createAuthority(
  _prev: AuthorityActionState,
  formData: FormData,
): Promise<AuthorityActionState> {
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const office = String(formData.get("office") ?? "").trim();
  const electionType = String(formData.get("election_type") ?? "");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const signature = formData.get("signature");

  if (!fullName) return { error: "Full name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!office) return { error: "Office is required." };
  if (!ELECTION_TYPES.includes(electionType as ElectionType)) {
    return { error: "Select a valid election type." };
  }
  if (!(signature instanceof File) || signature.size === 0) {
    return { error: "A signature PNG is required." };
  }
  if (signature.size > MAX_SIGNATURE_SIZE) return { error: "Signature file must be under 2MB." };
  if (!ALLOWED_SIGNATURE_TYPES.includes(signature.type)) {
    return { error: "Signature must be a PNG file." };
  }

  const slug = slugInput ? slugify(slugInput) : slugify(fullName);
  if (!slug) return { error: "Could not derive a slug from the name — set one explicitly." };

  const admin = createAdminSupabase();

  const { data: existingSlug } = await admin
    .from("nomination_authorities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) return { error: `Slug "${slug}" is already in use.` };

  const plainPassword = generateSecurePassword(12);
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: plainPassword,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    if (authError?.message?.includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Failed to create account. Please try again." };
  }

  const signaturePath = `signatures/${authUser.user.id}.png`;
  const { error: uploadError } = await admin.storage
    .from("agent-nominations")
    .upload(signaturePath, signature, { contentType: "image/png", upsert: false });
  if (uploadError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to upload signature. Please try again." };
  }

  const { error: insertError } = await admin.from("nomination_authorities").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    office,
    election_type: electionType,
    slug,
    signature_storage_path: signaturePath,
  });
  if (insertError) {
    await admin.storage.from("agent-nominations").remove([signaturePath]);
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to create authority record. Please try again." };
  }

  revalidatePath("/admin/agent-nominations/authorities");
  return { success: `Authority account created for ${fullName}.`, plainPassword };
}

export async function listAuthorities() {
  await requireAdmin();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_authorities")
    .select("id, full_name, email, office, election_type, slug, is_active, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
```

- [ ] **Step 2: Write the form component**

```tsx
"use client";

import { useActionState, useState } from "react";
import { createAuthority, type AuthorityActionState } from "@/app/admin/(dashboard)/agent-nominations/authorities/actions";
import { ELECTION_TYPES, ELECTION_TYPE_LABELS } from "@/lib/agents/constants";
import {
  FieldSection,
  TextField,
  SelectField,
  FileField,
  FormBanner,
  SubmitButton,
  CredentialHandoff,
} from "@/components/form";

const initial: AuthorityActionState = {};

const ELECTION_TYPE_OPTIONS = ELECTION_TYPES.map((value) => ({
  value,
  label: ELECTION_TYPE_LABELS[value],
}));

export function AuthorityForm() {
  const [instance, setInstance] = useState(0);
  return <Form key={instance} onCreated={() => setInstance((n) => n + 1)} />;
}

function Form({ onCreated }: { onCreated: () => void }) {
  const [state, formAction, isPending] = useActionState(createAuthority, initial);

  if (state.success && state.plainPassword) {
    return (
      <div className="space-y-4">
        <FormBanner tone="info">{state.success}</FormBanner>
        <CredentialHandoff password={state.plainPassword} />
        <button
          type="button"
          onClick={onCreated}
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Add another authority
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <FieldSection title="Authority details">
        <TextField name="full_name" label="Full name" autoComplete="name" />
        <TextField name="email" label="Email address" type="email" autoComplete="email" />
        <TextField name="office" label="Office" placeholder="e.g. House of Representatives – Ibadan NW/SW" />
        <SelectField name="election_type" label="Election type" options={ELECTION_TYPE_OPTIONS} />
        <TextField
          name="slug"
          label="Link slug (optional)"
          placeholder="Auto-generated from name if left blank"
        />
      </FieldSection>
      <FieldSection title="Signature">
        <FileField name="signature" label="Signature PNG" accept="image/png" />
      </FieldSection>
      <SubmitButton pending={isPending} pendingLabel="Creating…">
        Create authority
      </SubmitButton>
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listAuthorities } from "@/app/admin/(dashboard)/agent-nominations/authorities/actions";
import { AuthorityForm } from "@/app/admin/(dashboard)/agent-nominations/authorities/authority-form";
import { ELECTION_TYPE_LABELS } from "@/lib/agents/constants";

export const dynamic = "force-dynamic";

export default async function AgentNominationAuthoritiesPage() {
  await requireAdmin();
  const authorities = await listAuthorities();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Nomination authorities</h1>
          <p className="text-sm text-text-muted">
            Dev-only. Create a login for each candidate reviewing their own
            Polling Unit Agent nominations.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          ← Dashboard
        </Link>
      </header>

      <section className="mt-8 rounded-brand border border-border bg-surface/40 p-6">
        <h2 className="font-heading text-lg text-text">Add an authority</h2>
        <div className="mt-5">
          <AuthorityForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">
          Existing authorities ({authorities.length})
        </h2>
        <div className="mt-3 space-y-3">
          {authorities.map((a) => (
            <div key={a.id} className="rounded-brand border border-border bg-surface/40 p-4">
              <p className="font-medium text-text">{a.full_name}</p>
              <p className="text-sm text-text-muted">{a.email}</p>
              <p className="mt-1 text-sm text-text-muted">
                {a.office} — {ELECTION_TYPE_LABELS[a.election_type as keyof typeof ELECTION_TYPE_LABELS]}
              </p>
              <p className="mt-1 font-mono text-xs text-text-muted">
                /agents/submit/{a.slug}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Manual smoke test — end-to-end**

Run: `npm run dev`, sign in to `http://localhost:3000/admin`, navigate to `http://localhost:3000/admin/agent-nominations/authorities`, and:
1. Submit the form with a test name, a real-format email, an office string, an election type, and any small PNG file.
2. Expected: success banner + a one-time password shown via `CredentialHandoff`; the new authority appears in the "Existing authorities" list below with the expected `/agents/submit/<slug>` line.
3. Go to `http://localhost:3000/agents/login`, sign in with that email + the shown password.
4. Expected: login succeeds (no error banner) — confirms Task 6's `loginAuthority` correctly finds the `nomination_authorities` row created here. (The subsequent redirect 404s since there's no `/agents` home page yet — expected, not a failure of this task.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(dashboard)/agent-nominations"
git commit -m "feat(admin): add dev-only nomination authority creation UI"
```

---

## Task 8: PDF template asset + coordinate mapping

**Files:**
- Create: `src/lib/agents/pdf-template/party-agent-nomination-form.pdf`
- Create: `src/lib/agents/pdf-template/form-template.ts`
- Create (throwaway, not committed): a scratch `.mjs` verification script

**Interfaces:**
- Produces: `FORM_PAGE: { widthPt: number; heightPt: number }`, `CHECKBOXES`, `TEXT_FIELDS`, `PHOTO_BOX`, `SIGNATURE_BOXES`, `DATE_FIELDS` — the exact field-position constants Sub-project 2's `pdf-lib` overlay code will import and draw against. No overlay/generation code is written in this task — only the template asset and the coordinate data.

This task locks in the "one-time calibration" the spec commits to. The official form is page 7 of `docs/NOTICE FOR PARTY AGENTS NOMINATION 2027 GENERAL ELECTIONS AND NATIONAL ADMINISTRATIVE DIRECTIVE ON PARTY AGENTS NOMINATION PROCESS.pdf`, an A4 page (595.3 × 841.9 pt). Coordinates below were measured by rendering that page at 150 DPI (scale factor 72/150 = 0.48 pt/px) and reading pixel bounding boxes off the rendered image; they are a verified first pass, not hand-wavy placeholders — Step 3 below visually confirms every one against the real template before commit. Sub-project 2 may still nudge individual values once real overlay text/photos are rendered (this is normal PDF calibration work, not a defect in this task).

- [ ] **Step 1: Extract page 7 as a standalone single-page PDF**

Run:
```bash
mkdir -p src/lib/agents/pdf-template
pdfseparate -f 7 -l 7 "docs/NOTICE FOR PARTY AGENTS NOMINATION 2027 GENERAL ELECTIONS AND NATIONAL ADMINISTRATIVE DIRECTIVE ON PARTY AGENTS NOMINATION PROCESS.pdf" /tmp/agent-form-extract-%d.pdf
mv /tmp/agent-form-extract-7.pdf src/lib/agents/pdf-template/party-agent-nomination-form.pdf
pdfinfo src/lib/agents/pdf-template/party-agent-nomination-form.pdf | grep "Page.*size"
```
Expected output: `Page size:       595.3 x 841.9 pts (A4)`. (Requires `poppler` — `brew install poppler` if `pdfseparate`/`pdfinfo` aren't found; it's already installed in this environment.)

- [ ] **Step 2: Write the coordinate mapping**

All coordinates are in PDF points, origin bottom-left (pdf-lib convention), against the 595.3 × 841.9 pt page from Step 1. `TEXT_FIELDS` values are the point at which to start `drawText` (inside the box, near its bottom-left, with a small margin already baked in). `CHECKBOXES`/`DATE_FIELDS` values are the point at which to draw a small "X"/text mark. Boxes (`PHOTO_BOX`, `SIGNATURE_BOXES`) give the full rectangle to `drawImage` into, scaled to fit.

```ts
export const FORM_PAGE = { widthPt: 595.3, heightPt: 841.9 };

export const CHECKBOXES = {
  electionType: {
    presidential: { x: 196.3, y: 655.7 },
    governorship: { x: 275.0, y: 655.7 },
    senatorial: { x: 343.2, y: 655.7 },
    houseOfReps: { x: 433.9, y: 655.7 },
    houseOfAssembly: { x: 546.2, y: 655.7 },
  },
  agentFor: {
    pollingUnit: { x: 196.3, y: 638.9 },
    wardCollation: { x: 277.9, y: 638.9 },
    lgaCollation: { x: 353.3, y: 638.9 },
    stateCollation: { x: 438.7, y: 638.9 },
    nationalCollation: { x: 541.9, y: 638.9 },
    stateConstCollation: { x: 265.0, y: 624.0 },
    fedConstCollation: { x: 406.1, y: 624.0 },
    senDistCollation: { x: 541.4, y: 624.0 },
  },
  gender: {
    male: { x: 257.8, y: 501.1 },
    female: { x: 361.0, y: 501.1 },
  },
} as const;

export const TEXT_FIELDS = {
  formNo: { x: 487.8, y: 601.1 },
  firstName: { x: 150.4, y: 568.5 },
  otherNames: { x: 150.4, y: 544.5 },
  surname: { x: 150.4, y: 520.5 },
  phoneNumber: { x: 150.4, y: 462.9 },
  emailAddress: { x: 150.4, y: 438.9 },
  meansOfId: { x: 152.8, y: 406.3 },
  state: { x: 104.4, y: 308.3 },
  lga: { x: 319.4, y: 308.3 },
  registrationArea: { x: 176.8, y: 285.3 },
  pollingUnitCode: { x: 176.8, y: 260.3 },
  pollingUnitName: { x: 176.8, y: 237.3 },
  attestationName: { x: 103.4, y: 153.3 },
  attestationDate: { x: 415.4, y: 128.3 },
  authorisedNominatorName: { x: 103.4, y: 57.3 },
  authorisedNominatorDate: { x: 415.4, y: 32.3 },
} as const;

export const PHOTO_BOX = { x: 459.8, y: 484.3, width: 93.1, height: 100.8 } as const;

export const SIGNATURE_BOXES = {
  specimen: { x: 147.8, y: 364.3, width: 281.8, height: 27.4 },
  attestation: { x: 98.4, y: 111.3, width: 223.2, height: 25.9 },
  authorisedNominator: { x: 98.4, y: 15.3, width: 223.2, height: 25.9 },
} as const;
```

- [ ] **Step 3: Visually verify every coordinate against the real template**

Write a throwaway script at `/tmp/verify-form-template.mjs` (not committed — this is a one-off visual check, not a permanent test):

```js
import { PDFDocument, rgb } from "pdf-lib";
import { readFile, writeFile } from "node:fs/promises";
import {
  CHECKBOXES, TEXT_FIELDS, PHOTO_BOX, SIGNATURE_BOXES,
} from "../src/lib/agents/pdf-template/form-template.ts";
// Note: run this with a loader that handles the .ts import (e.g. `npx tsx /tmp/verify-form-template.mjs`),
// or inline the three objects' values directly into this script instead of importing them.

const bytes = await readFile("src/lib/agents/pdf-template/party-agent-nomination-form.pdf");
const doc = await PDFDocument.load(bytes);
const page = doc.getPages()[0];

function dot(x, y) {
  page.drawCircle({ x, y, size: 3, color: rgb(1, 0, 0) });
}
function box(b) {
  page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: b.height, borderColor: rgb(1, 0, 0), borderWidth: 1 });
}

for (const group of Object.values(CHECKBOXES)) {
  for (const pt of Object.values(group)) dot(pt.x, pt.y);
}
for (const pt of Object.values(TEXT_FIELDS)) dot(pt.x, pt.y);
box(PHOTO_BOX);
for (const b of Object.values(SIGNATURE_BOXES)) box(b);

await writeFile("/tmp/form-template-debug.pdf", await doc.save());
```

Run:
```bash
npx tsx /tmp/verify-form-template.mjs
pdftoppm -png -r 150 /tmp/form-template-debug.pdf /tmp/form-template-debug
```
(If `tsx` isn't available, run `npm install --no-save tsx` first — it's a dev-time-only verification tool, not added to `package.json`.)

Then view `/tmp/form-template-debug-1.png`. Expected: every red dot sits inside its labeled field's box or checkbox, and every red rectangle traces the photo box / signature boxes exactly. If any dot or box is visibly off, correct the affected value(s) in `form-template.ts` (re-measure from `/tmp/agent-form-calib/form-7-grid.png`-style output if needed — render page 7 at 150 DPI, overlay a pixel grid, read the box off it, convert with `pt = px * 0.48` and `y_from_bottom = 841.9 - (py * 0.48)`) and re-run this step until every marker is visually correct.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/pdf-template/party-agent-nomination-form.pdf src/lib/agents/pdf-template/form-template.ts
git commit -m "feat(agents): add PDF template asset and field coordinate mapping"
```

---

## Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Full security advisor sweep**

Call `mcp__supabase__get_advisors` with `project_id: "atavwpoistostnqxmeal"`, `type: "security"`.
Expected: no new findings attributable to this plan's tables/bucket beyond what was already accepted in Task 2 Step 4.

- [ ] **Step 4: Confirm RLS actually isolates authorities from each other**

Call `mcp__supabase__execute_sql` with `project_id: "atavwpoistostnqxmeal"`:
```sql
select count(*) as authority_count from public.nomination_authorities;
select count(*) as nomination_count from public.agent_nominations;
```
This confirms the tables are reachable via the service-role path used by the app (the actual cross-authority isolation is enforced in application code via `.eq("authority_id", session.id)`, matching the portal pattern, with RLS as a backstop against a leaked anon/authenticated key — there is no anonymous public read path to test against here since nominee submissions aren't built until Sub-project 2).

- [ ] **Step 5: Confirm no stray uncommitted changes**

Run: `git status`
Expected: clean tree (everything from Tasks 1–8 already committed).
