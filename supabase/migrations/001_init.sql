-- RutaDos: schema for couple shared trips (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id text primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  city jsonb not null,
  start_date date not null,
  end_date date not null,
  preferences jsonb not null default '{}'::jsonb,
  route_style jsonb not null default '{}'::jsonb,
  places jsonb not null default '[]'::jsonb,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_couple_id_idx on public.trips (couple_id);
create index if not exists profiles_couple_id_idx on public.profiles (couple_id);

alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.trips enable row level security;

-- Helper: current user's couple
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_couple_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and couple_id = cid
  );
$$;

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create couple + assign to caller; returns invite_code
create or replace function public.create_couple(p_display_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  insert into public.couples (invite_code) values (code) returning id into cid;

  insert into public.profiles (id, display_name, couple_id)
  values (auth.uid(), p_display_name, cid)
  on conflict (id) do update
    set couple_id = excluded.couple_id,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return code;
end;
$$;

-- Join existing couple by invite code
create or replace function public.join_couple(p_code text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into cid from public.couples where invite_code = upper(trim(p_code));
  if cid is null then
    raise exception 'Código inválido';
  end if;

  insert into public.profiles (id, display_name, couple_id)
  values (auth.uid(), p_display_name, cid)
  on conflict (id) do update
    set couple_id = excluded.couple_id,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return cid;
end;
$$;

-- RLS policies
drop policy if exists "profiles read own couple" on public.profiles;
create policy "profiles read own couple" on public.profiles
  for select to authenticated
  using (id = auth.uid() or couple_id = public.my_couple_id());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "couples read members" on public.couples;
create policy "couples read members" on public.couples
  for select to authenticated
  using (public.is_couple_member(id));

drop policy if exists "trips select couple" on public.trips;
create policy "trips select couple" on public.trips
  for select to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists "trips insert couple" on public.trips;
create policy "trips insert couple" on public.trips
  for insert to authenticated
  with check (public.is_couple_member(couple_id));

drop policy if exists "trips update couple" on public.trips;
create policy "trips update couple" on public.trips
  for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists "trips delete couple" on public.trips;
create policy "trips delete couple" on public.trips
  for delete to authenticated
  using (public.is_couple_member(couple_id));

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.trips;
exception
  when duplicate_object then null;
  when others then null;
end $$;
