-- Optional: link Telegram chats to a shared trip (bot webhook).
-- Telegram Bot API is free; WhatsApp Cloud API is not free for production bots.

create table if not exists public.telegram_chats (
  chat_id bigint primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  share_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_chats_trip_id_idx on public.telegram_chats (trip_id);

alter table public.telegram_chats enable row level security;

-- Only service role / edge function (security definer RPCs) should write.
-- Authenticated users can read their couple's links.
drop policy if exists "telegram chats select couple" on public.telegram_chats;
create policy "telegram chats select couple" on public.telegram_chats
  for select to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and public.is_couple_member(t.couple_id)
    )
  );

create or replace function public.link_telegram_chat(p_chat_id bigint, p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tid text;
begin
  select s.trip_id into tid
  from public.trip_shares s
  where s.token = upper(trim(p_token))
    and (s.expires_at is null or s.expires_at > now())
  limit 1;

  if tid is null then
    raise exception 'Invalid or expired share token';
  end if;

  insert into public.telegram_chats (chat_id, trip_id, share_token, updated_at)
  values (p_chat_id, tid, upper(trim(p_token)), now())
  on conflict (chat_id) do update
    set trip_id = excluded.trip_id,
        share_token = excluded.share_token,
        updated_at = now();

  return tid;
end;
$$;

grant execute on function public.link_telegram_chat(bigint, text) to anon, authenticated, service_role;
