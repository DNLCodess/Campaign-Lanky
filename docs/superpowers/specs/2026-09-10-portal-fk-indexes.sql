-- Category 3 of the data-layer review: cover the foreign keys flagged by the
-- Supabase performance advisor (15 unindexed FKs) plus the audit-log sort key
-- and one partial index for the hottest coverage filter.
--
-- All portal tables are small (< 1k rows) so plain CREATE INDEX locks for only
-- a few ms; no need for CONCURRENTLY (which also can't run inside a migration
-- transaction).

-- Queried on every getElectionAggregate call.
create index if not exists candidates_election_id_idx on public.candidates (election_id);

-- FK joins in listResults(); cascade checks.
create index if not exists election_results_candidate_id_idx on public.election_results (candidate_id);
create index if not exists election_results_submitted_by_idx on public.election_results (submitted_by);
create index if not exists election_results_polling_unit_idx on public.election_results (polling_unit);

-- Audit page: ORDER BY created_at DESC LIMIT 200. Fastest-growing table.
create index if not exists result_audit_log_created_at_idx on public.result_audit_log (created_at desc);
create index if not exists result_audit_log_performed_by_idx on public.result_audit_log (performed_by);

-- Account hierarchy traversal (listChildAccounts, coverage).
create index if not exists portal_accounts_parent_account_id_idx on public.portal_accounts (parent_account_id);
create index if not exists portal_accounts_created_by_idx on public.portal_accounts (created_by);
create index if not exists portal_accounts_polling_unit_idx on public.portal_accounts (polling_unit);

-- Rewards dashboard + FK cascades.
create index if not exists rewards_recipient_id_idx on public.rewards (recipient_id);
create index if not exists rewards_team_leader_id_idx on public.rewards (team_leader_id);
create index if not exists rewards_status_idx on public.rewards (status);
create index if not exists rewards_created_by_idx on public.rewards (created_by);
create index if not exists rewards_approved_by_idx on public.rewards (approved_by);
create index if not exists rewards_sent_by_idx on public.rewards (sent_by);

-- team_leaders + leader_messages FK cascades.
create index if not exists team_leaders_polling_unit_idx on public.team_leaders (polling_unit);
create index if not exists team_leaders_portal_account_id_idx on public.team_leaders (portal_account_id);
create index if not exists leader_messages_sent_by_idx on public.leader_messages (sent_by);

-- Hottest coverage filter: "which PUs have an active agent?" — activePuAgentCodes().
create index if not exists portal_accounts_active_pu_agent_idx
  on public.portal_accounts (polling_unit)
  where role = 'pu_agent' and is_active;

-- Applied 2026-09-10 via mcp__supabase__apply_migration (name: portal_fk_indexes).
-- ANALYZE was run separately afterward to refresh planner stats. A manual
-- `VACUUM` was skipped (can't run in a migration transaction; dead-tuple counts
-- are trivial and autovacuum will handle them) — run it by hand before election
-- day if desired:
--   vacuum analyze public.election_results, public.portal_accounts,
--     public.rewards, public.result_audit_log;
--
-- The performance advisor's "unindexed foreign keys" finding is now clear; the
-- new indexes show as "unused" only because no queries have hit them yet.
