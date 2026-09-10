-- Category 6 of the data-layer review: correctness / security gaps.
-- Applied 2026-09-10 via mcp__supabase__apply_migration.

-- 1. Function search_path (security advisor 0011). The trigger only calls
--    now() (pg_catalog), so an empty search_path is safe.
--    migration: harden_function_search_path
alter function public.update_updated_at_column() set search_path = '';

-- 2. Brute-force throttle for /portal/login (see src/lib/portal/rate-limit.ts).
--    Read/written only by the service-role client; RLS on + no policy = deny all,
--    same as every other portal table.
--    migration: portal_login_attempts
create table if not exists public.portal_login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists portal_login_attempts_identifier_idx
  on public.portal_login_attempts (identifier, created_at desc);
alter table public.portal_login_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- STILL MANUAL (no SQL / MCP path):
--
-- 3. Enable leaked-password protection (security advisor 0015).
--    Supabase dashboard -> Authentication -> Policies / Password settings ->
--    "Prevent use of leaked passwords" (HaveIBeenPwned check). The
--    constituency_admin password should also be rotated to something not in
--    breach corpuses.
--
-- 4. result_audit_log retention: fine for a single election cycle. If the
--    portal runs across multiple cycles, add a scheduled prune (needs the
--    pg_cron extension, not currently installed) or a monthly manual delete
--    of rows older than ~1 year.
-- ---------------------------------------------------------------------------
