-- Statewide polling-unit geography for Party Agent nominations, and per-candidate
-- constituency scoping. Run once in the Supabase SQL editor, then run
-- `node --env-file=.env.local scripts/seed-oyo-polling-units.mjs` to load the rows
-- and compute the outside-area flags.
--
-- Why a new table instead of growing constituency_geo: constituency_geo is the
-- campaign's own Reps constituency (Ibadan NW + SW) and drives the portal's
-- coverage, results and team-leader views. Nominations serve candidates across
-- all of Oyo, so they get their own table.
--
-- Source: INEC IREV, 2023 Oyo governorship election (every PU in the state):
-- 33 LGAs, 351 wards, 6,390 PUs. Raw export: docs/oyo-polling-units-inec-2023.csv.
-- The constituency ids are INEC's own, so a PU's state constituency / federal
-- constituency / senatorial district come straight from INEC, not from us.

create table public.oyo_polling_units (
  pu_code text primary key,                       -- "30-20-01-001" (hyphenated, as stored elsewhere)
  lga text not null,                              -- display name, e.g. "Lagelu", "Ibadan North-West"
  lga_code text not null,                         -- INEC 2-digit LGA code
  ward integer not null check (ward > 0),         -- INEC registration-area number
  ward_name text not null,
  pu_name text not null,
  state_constituency_id integer not null,         -- INEC id, House of Assembly seat
  federal_constituency_id integer not null,       -- INEC id, House of Reps seat
  senatorial_district_id integer not null         -- INEC id, Senate seat
);
create index oyo_polling_units_state_constituency_idx on public.oyo_polling_units (state_constituency_id);
create index oyo_polling_units_federal_constituency_idx on public.oyo_polling_units (federal_constituency_id);
create index oyo_polling_units_senatorial_district_idx on public.oyo_polling_units (senatorial_district_id);
alter table public.oyo_polling_units enable row level security;
comment on table public.oyo_polling_units is
  'Every Oyo State polling unit (INEC IREV, 2023). Read only via the service-role client. No RLS policies = deny all to anon/authenticated.';

-- Which constituency a candidate's agents come from. Meaning depends on
-- election_type: house_of_assembly -> state_constituency_id, house_of_reps ->
-- federal_constituency_id, senatorial -> senatorial_district_id. Ignored for
-- governorship/presidential (all of Oyo).
alter table public.nomination_candidates add column constituency_id integer;

-- Soft flag, like is_possible_duplicate: the nomination's polling unit is not
-- in the candidate's constituency. Always derived (refresh_outside_area_flags),
-- never hand-set, so correcting a candidate's constituency corrects the flags.
alter table public.agent_nominations
  add column is_outside_area boolean not null default false;

-- Point polling_unit_code at the statewide table. NOT VALID so this runs before
-- the seed script loads rows; new inserts are still checked. Every existing
-- code was verified to exist in the INEC data. After seeding you may run:
--   alter table public.agent_nominations validate constraint agent_nominations_polling_unit_code_fkey;
alter table public.agent_nominations
  drop constraint if exists agent_nominations_polling_unit_code_fkey;
alter table public.agent_nominations
  add constraint agent_nominations_polling_unit_code_fkey
  foreign key (polling_unit_code) references public.oyo_polling_units (pu_code) not valid;

-- Existing candidates. Constituency 1 = wards 1-6, Constituency 2 = wards 7-12
-- (confirmed by the campaign, 2026-11-11). Change any of these later from the
-- admin candidates screen; flags recompute on save.
update public.nomination_candidates set constituency_id = 299 where slug = 'olanrewaju-okesooto';        -- Reps: Ibadan NW/SW
update public.nomination_candidates set constituency_id = 300 where slug = 'ayobami-michael-oloyade';    -- Reps: Ibadan North
update public.nomination_candidates set constituency_id = 810 where slug = 'olayinka-ismaila-yahaya';    -- HoA: Ibadan North 1 (wards 1-6)
update public.nomination_candidates set constituency_id = 811 where slug = 'abidemi-oluwaseyi-adebayo';  -- HoA: Ibadan North 2 (wards 7-12)
update public.nomination_candidates set constituency_id = 817 where slug = 'femi-emmanuel-adetutu';      -- HoA: Ibadan South-West 2 (wards 7-12)
update public.nomination_candidates set constituency_id = 826 where slug = 'akinsola-akeem-afolabi';     -- HoA: Lagelu

-- Recompute is_outside_area for one candidate (or all, when null). Returns how
-- many of the touched nominations are now flagged. A candidate whose
-- constituency isn't set yet gets no flags (unknown != wrong).
-- Mirrors isInCandidateArea() in src/lib/agents/geo.ts; keep the two in step.
create or replace function public.refresh_outside_area_flags(p_candidate_id uuid default null)
returns integer
language sql
security definer
set search_path = public
as $$
  with c as (
    select id, election_type, constituency_id
    from nomination_candidates
    where p_candidate_id is null or id = p_candidate_id
  ),
  upd as (
    update agent_nominations n
    set is_outside_area = not exists (
      select 1 from oyo_polling_units p
      where p.pu_code = n.polling_unit_code
        and (
          c.election_type in ('presidential', 'governorship')
          or c.constituency_id is null
          or (c.election_type = 'house_of_assembly' and p.state_constituency_id = c.constituency_id)
          or (c.election_type = 'house_of_reps' and p.federal_constituency_id = c.constituency_id)
          or (c.election_type = 'senatorial' and p.senatorial_district_id = c.constituency_id)
        )
    )
    from c
    where n.candidate_id = c.id
    returning n.is_outside_area
  )
  select count(*) filter (where is_outside_area)::integer from upd;
$$;
revoke execute on function public.refresh_outside_area_flags(uuid) from public, anon, authenticated;
