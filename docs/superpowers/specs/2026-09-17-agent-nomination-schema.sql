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
create policy "authority updates own row"
  on public.nomination_authorities for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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
create policy "authority updates own nominations"
  on public.agent_nominations for update to authenticated
  using (authority_id = auth.uid()) with check (authority_id = auth.uid());

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
