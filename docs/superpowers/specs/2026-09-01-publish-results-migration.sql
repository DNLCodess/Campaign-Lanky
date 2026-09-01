-- Run this once in the Supabase SQL editor (Database > SQL Editor) for the
-- campaign-lanky project. The Supabase MCP connection dropped mid-session and
-- needs interactive reauthorization, so this couldn't be applied automatically.
--
-- Adds the manual publish toggle for public results (independent of
-- election.status — publishing is a separate decision from active/closed).

alter table public.elections
  add column if not exists published boolean not null default false,
  add column if not exists results_published_at timestamptz;
