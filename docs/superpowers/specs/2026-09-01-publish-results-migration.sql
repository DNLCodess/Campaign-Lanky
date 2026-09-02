-- APPLIED 2026-09-02 via the Supabase MCP once the connection was
-- reauthorized (it had dropped mid-session on 2026-09-01, blocking DDL —
-- kept here as a record of what ran, not as a pending step).
--
-- Adds the manual publish toggle for public results (independent of
-- election.status — publishing is a separate decision from active/closed).

alter table public.elections
  add column if not exists published boolean not null default false,
  add column if not exists results_published_at timestamptz;
