-- Gallery: entries (outings/singles) and their media items.
-- Reads/writes go through the service-role client; RLS on + no policy = deny all,
-- same as every other portal table.
-- Reuses public.update_updated_at_column() (already present, search_path hardened).

create table if not exists public.gallery_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('outing','single')),
  title text not null default '',
  body text,
  place text,
  taken_on date not null default current_date,
  slug text unique not null,
  status text not null default 'draft' check (status in ('draft','published')),
  cover_item_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.gallery_entries(id) on delete cascade,
  position int not null default 0,
  media_type text not null check (media_type in ('image','video','youtube')),
  storage_path text,
  variants jsonb,
  poster_path text,
  blur text,
  width int not null default 0,
  height int not null default 0,
  duration_s numeric,
  youtube_id text,
  youtube_short boolean not null default false,
  caption text,
  hidden boolean not null default false,
  processing text not null default 'pending' check (processing in ('pending','ready','failed')),
  error text
);

alter table public.gallery_entries
  add constraint gallery_entries_cover_item_id_fkey
  foreign key (cover_item_id) references public.gallery_items(id) on delete set null;

create index if not exists gallery_entries_feed_idx
  on public.gallery_entries (status, taken_on desc, published_at desc, id desc);
create index if not exists gallery_items_entry_position_idx
  on public.gallery_items (entry_id, position);
create index if not exists gallery_entries_cover_item_idx
  on public.gallery_entries (cover_item_id);

create trigger gallery_entries_updated_at
  before update on public.gallery_entries
  for each row execute function public.update_updated_at_column();

alter table public.gallery_entries enable row level security;
alter table public.gallery_items enable row level security;
