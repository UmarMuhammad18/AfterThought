-- Universal capture pipeline for AfterThought.
-- Run in the Supabase SQL editor AFTER schema.sql (and whatsapp.sql if used).
-- Safe to re-run: IF NOT EXISTS / DROP ... IF EXISTS guards throughout.

-- ---------------------------------------------------------------------------
-- 1. Meetings: lifecycle, source, analysis, interview fields
-- ---------------------------------------------------------------------------
alter table public.meetings add column if not exists status text not null default 'ready';
  -- recording | processing | ready | failed
alter table public.meetings add column if not exists source text default 'web';
  -- web | extension | desktop | mobile | import | whatsapp_voice | whatsapp_text | whatsapp_call
alter table public.meetings add column if not exists platform text;
  -- free-form hint: zoom, meet, teams, whatsapp, phone, in-person, ...
alter table public.meetings add column if not exists channel_layout text default 'mixed';
  -- mixed (one mic / one mixed track) | me-them (stereo: L = me, R = them)
alter table public.meetings add column if not exists duration_seconds numeric default 0;
alter table public.meetings add column if not exists language text;
alter table public.meetings add column if not exists error text;
alter table public.meetings add column if not exists analysis jsonb;
  -- full MeetingAnalysis (participants, decisions, deadlines, blockers, ...)
alter table public.meetings add column if not exists kind text not null default 'meeting';
  -- meeting | interview
alter table public.meetings add column if not exists interview jsonb;
  -- { candidate, role, rubric }
alter table public.meetings add column if not exists scorecard jsonb;
alter table public.meetings add column if not exists consent_confirmed boolean default false;
alter table public.meetings add column if not exists updated_at timestamptz default now();

create index if not exists meetings_status_idx on public.meetings (status);

-- ---------------------------------------------------------------------------
-- 2. Recording segments: every client uploads audio in small, self-contained
--    files (a few minutes each) so long calls never hit request-size or
--    transcription-size limits, and a crash only loses the current segment.
-- ---------------------------------------------------------------------------
create table if not exists public.recording_segments (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete cascade,
  seq           integer not null,
  storage_path  text not null,
  mime_type     text,
  start_seconds numeric not null default 0,
  duration_seconds numeric,
  size_bytes    bigint,
  status        text not null default 'uploaded', -- uploaded | transcribing | transcribed | failed
  transcript    jsonb,                            -- TranscriptSegment[]
  error         text,
  created_at    timestamptz not null default now(),
  unique (meeting_id, seq)
);

create index if not exists recording_segments_meeting_idx
  on public.recording_segments (meeting_id, seq);

alter table public.recording_segments enable row level security;

drop policy if exists "recording_segments_select_own" on public.recording_segments;
create policy "recording_segments_select_own"
  on public.recording_segments for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Private storage bucket for audio
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Long-lived API keys for the extension, desktop app and other clients.
--    Only a SHA-256 hash is stored; the raw key is shown to the user once.
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null default 'API key',
  prefix       text not null,
  key_hash     text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
  on public.api_keys for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Semantic search: transcript chunks with embeddings (pgvector)
-- ---------------------------------------------------------------------------
create extension if not exists vector;

create table if not exists public.transcript_chunks (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete cascade,
  seq           integer not null,
  speaker       text,
  start_seconds numeric,
  end_seconds   numeric,
  text          text not null,
  embedding     vector(1536),
  created_at    timestamptz not null default now()
);

create index if not exists transcript_chunks_meeting_idx on public.transcript_chunks (meeting_id);
create index if not exists transcript_chunks_user_idx on public.transcript_chunks (user_id);
create index if not exists transcript_chunks_embedding_idx
  on public.transcript_chunks using hnsw (embedding vector_cosine_ops);

alter table public.transcript_chunks enable row level security;

drop policy if exists "transcript_chunks_select_own" on public.transcript_chunks;
create policy "transcript_chunks_select_own"
  on public.transcript_chunks for select using (auth.uid() = user_id);

create or replace function public.match_transcript_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 12,
  match_meeting_id uuid default null
)
returns table (
  id uuid,
  meeting_id uuid,
  speaker text,
  start_seconds numeric,
  end_seconds numeric,
  text text,
  similarity float
)
language sql stable
as $$
  select c.id, c.meeting_id, c.speaker, c.start_seconds, c.end_seconds, c.text,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.transcript_chunks c
  where c.user_id = match_user_id
    and c.embedding is not null
    and (match_meeting_id is null or c.meeting_id = match_meeting_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- 6. WhatsApp: 24h customer-service window + phone linking codes
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_contacts (
  phone            text primary key,
  last_inbound_at  timestamptz,
  updated_at       timestamptz not null default now()
);

alter table public.whatsapp_contacts enable row level security;
-- No policies: only the service role (bot) touches this table.

create table if not exists public.whatsapp_link_codes (
  code        text primary key,           -- 6 digits
  user_id     uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

alter table public.whatsapp_link_codes enable row level security;
-- No policies: codes are created and consumed through API routes (service role).
