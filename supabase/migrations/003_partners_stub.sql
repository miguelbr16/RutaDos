-- Stub for future B2B partners / listings (hotels, restaurants, agencies).
-- Not wired to the app UI yet; types already exist on GeoPlace/Stop/Trip.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('hotel', 'restaurant', 'experience', 'agency')),
  city_name text,
  website text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  place_name text not null,
  lat double precision not null,
  lng double precision not null,
  category text,
  blurb text,
  sponsored boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists listings_partner_id_idx on public.listings (partner_id);

alter table public.partners enable row level security;
alter table public.listings enable row level security;

-- Public read of active listings (marketplace later)
drop policy if exists "listings public read active" on public.listings;
create policy "listings public read active" on public.listings
  for select to anon, authenticated
  using (active = true);

drop policy if exists "partners public read active" on public.partners;
create policy "partners public read active" on public.partners
  for select to anon, authenticated
  using (active = true);
