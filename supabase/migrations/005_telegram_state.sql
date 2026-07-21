-- Extra state for Telegram bot (location + picked places)
alter table public.telegram_chats
  add column if not exists last_lat double precision,
  add column if not exists last_lng double precision,
  add column if not exists last_nearby jsonb default '[]'::jsonb,
  add column if not exists picks jsonb default '[]'::jsonb;

-- Allow chats without a trip yet (solo orientación por zona)
alter table public.telegram_chats
  alter column trip_id drop not null;
