-- AfterThought — Supabase schema, ownership columns, and Row Level Security.
-- Run this in the Supabase SQL editor (or `supabase db` migration).
--
-- It is safe to re-run: it uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- ---------------------------------------------------------------------------
-- 1. Meetings
-- ---------------------------------------------------------------------------
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null default 'New Recording',
  summary      text,
  action_items jsonb default '[]'::jsonb,
  segments     jsonb default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- If the table already existed without user_id, add it.
alter table public.meetings
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists meetings_user_id_idx on public.meetings (user_id);

alter table public.meetings enable row level security;

-- Users may only read their own meetings.
drop policy if exists "meetings_select_own" on public.meetings;
create policy "meetings_select_own"
  on public.meetings for select
  using (auth.uid() = user_id);

-- Users may only insert meetings owned by themselves.
drop policy if exists "meetings_insert_own" on public.meetings;
create policy "meetings_insert_own"
  on public.meetings for insert
  with check (auth.uid() = user_id);

-- Users may only update their own meetings.
drop policy if exists "meetings_update_own" on public.meetings;
create policy "meetings_update_own"
  on public.meetings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users may only delete their own meetings.
drop policy if exists "meetings_delete_own" on public.meetings;
create policy "meetings_delete_own"
  on public.meetings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Speakers (scaffolding)
-- ---------------------------------------------------------------------------
create table if not exists public.speakers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  meetings     jsonb default '[]'::jsonb,
  mentions     jsonb default '{}'::jsonb,
  action_items jsonb default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists speakers_user_id_idx on public.speakers (user_id);

alter table public.speakers enable row level security;

drop policy if exists "speakers_select_own" on public.speakers;
create policy "speakers_select_own"
  on public.speakers for select using (auth.uid() = user_id);

drop policy if exists "speakers_insert_own" on public.speakers;
create policy "speakers_insert_own"
  on public.speakers for insert with check (auth.uid() = user_id);

drop policy if exists "speakers_update_own" on public.speakers;
create policy "speakers_update_own"
  on public.speakers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "speakers_delete_own" on public.speakers;
create policy "speakers_delete_own"
  on public.speakers for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Calendar events (scaffolding)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete cascade,
  title      text not null,
  due_date   timestamptz,
  assignee   text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_select_own" on public.calendar_events;
create policy "calendar_select_own"
  on public.calendar_events for select using (auth.uid() = user_id);

drop policy if exists "calendar_insert_own" on public.calendar_events;
create policy "calendar_insert_own"
  on public.calendar_events for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_update_own" on public.calendar_events;
create policy "calendar_update_own"
  on public.calendar_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_delete_own" on public.calendar_events;
create policy "calendar_delete_own"
  on public.calendar_events for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
-- The API routes use the service-role key, which bypasses RLS. They enforce
-- ownership in application code by validating the caller's Supabase access
-- token and filtering every query by `user_id`. RLS above provides a second,
-- database-level guarantee for any client that uses the anon key directly.
