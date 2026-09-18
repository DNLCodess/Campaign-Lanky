-- Split "who logs in to manage their own polling unit agents" (candidate)
-- from "whose name+signature is stamped as Authorised Nominator on every
-- generated PDF" (a single top party leader, universal across candidates).
-- Previously conflated under nomination_authorities.signature_storage_path.

alter table public.nomination_authorities rename to nomination_candidates;
alter table public.nomination_candidates drop column signature_storage_path;

alter table public.agent_nominations rename column authority_id to candidate_id;

alter index agent_nominations_authority_id_idx rename to agent_nominations_candidate_id_idx;
alter index agent_nominations_authority_phone_idx rename to agent_nominations_candidate_phone_idx;
alter index agent_nominations_authority_email_idx rename to agent_nominations_candidate_email_idx;

alter policy "authority reads own row" on public.nomination_candidates rename to "candidate reads own row";
alter policy "authority reads own nominations" on public.agent_nominations rename to "candidate reads own nominations";

-- authorized_nominator: exactly one row (enforced by the boolean PK trick) —
-- the single Authorised Nominator whose name+signature is stamped on every
-- generated nomination PDF, regardless of which candidate the nominee
-- submitted under. Written/read only via the service-role client.
create table public.authorized_nominator (
  id boolean primary key default true,
  full_name text not null,
  signature_storage_path text not null,
  updated_at timestamptz not null default now(),
  constraint authorized_nominator_singleton check (id)
);
alter table public.authorized_nominator enable row level security;
comment on table public.authorized_nominator is
  'Exactly one row (boolean PK trick enforces this) — the single Authorised Nominator whose name+signature is stamped on every generated nomination PDF. Service-role only, no anon/authenticated policies.';
