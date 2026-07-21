-- Public share links for trips (read-only by token)
-- Run in Supabase SQL editor after 001_init.sql

create table if not exists public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips (id) on delete cascade,
  token text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  can_edit boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trip_shares_token_idx on public.trip_shares (token);
create index if not exists trip_shares_trip_id_idx on public.trip_shares (trip_id);

alter table public.trip_shares enable row level security;

drop policy if exists "shares select own couple" on public.trip_shares;
create policy "shares select own couple" on public.trip_shares
  for select to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and public.is_couple_member(t.couple_id)
    )
  );

drop policy if exists "shares insert own couple" on public.trip_shares;
create policy "shares insert own couple" on public.trip_shares
  for insert to authenticated
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and public.is_couple_member(t.couple_id)
    )
  );

drop policy if exists "shares delete own couple" on public.trip_shares;
create policy "shares delete own couple" on public.trip_shares
  for delete to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and public.is_couple_member(t.couple_id)
    )
  );

-- Public read by token (security definer)
create or replace function public.get_trip_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select to_jsonb(t.*) into result
  from public.trips t
  join public.trip_shares s on s.trip_id = t.id
  where s.token = upper(trim(p_token))
    and (s.expires_at is null or s.expires_at > now())
  limit 1;

  return result;
end;
$$;

grant execute on function public.get_trip_by_share_token(text) to anon, authenticated;

create or replace function public.create_trip_share(p_trip_id text, p_can_edit boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tok text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.trips t
    where t.id = p_trip_id and public.is_couple_member(t.couple_id)
  ) then
    raise exception 'Trip not found or not allowed';
  end if;

  tok := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 12));
  insert into public.trip_shares (trip_id, token, created_by, can_edit)
  values (p_trip_id, tok, auth.uid(), coalesce(p_can_edit, false));

  return tok;
end;
$$;

grant execute on function public.create_trip_share(text, boolean) to authenticated;
