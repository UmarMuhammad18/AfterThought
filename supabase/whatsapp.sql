-- WhatsApp channel extras for AfterThought
-- Run this in the Supabase SQL editor after the main schema.sql.

-- ---------------------------------------------------------------------------
-- 1. Link WhatsApp phone numbers to AfterThought users
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_links (
  phone      text primary key,          -- digits only, e.g. 15551234567
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_links_user_id_idx
  on public.whatsapp_links (user_id);

alter table public.whatsapp_links enable row level security;

-- Users can see / manage their own links (service role bypasses RLS for the bot).
drop policy if exists "whatsapp_links_select_own" on public.whatsapp_links;
create policy "whatsapp_links_select_own"
  on public.whatsapp_links for select
  using (auth.uid() = user_id);

drop policy if exists "whatsapp_links_insert_own" on public.whatsapp_links;
create policy "whatsapp_links_insert_own"
  on public.whatsapp_links for insert
  with check (auth.uid() = user_id);

drop policy if exists "whatsapp_links_delete_own" on public.whatsapp_links;
create policy "whatsapp_links_delete_own"
  on public.whatsapp_links for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Extra columns on meetings for WhatsApp-originated content
-- ---------------------------------------------------------------------------
alter table public.meetings
  add column if not exists whatsapp_phone text;

alter table public.meetings
  add column if not exists source text default 'extension';

-- Allow meetings that arrive via WhatsApp before the phone is linked
-- (user_id can be null until linkPhoneToUser is called).
alter table public.meetings
  alter column user_id drop not null;

create index if not exists meetings_whatsapp_phone_idx
  on public.meetings (whatsapp_phone);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
-- The WhatsApp bot uses the service-role key, so it can insert meetings
-- and read/write whatsapp_links without being an authenticated end-user.
-- Once a user links their phone (from Settings in the app), future meetings
-- from that number are automatically owned by them.
