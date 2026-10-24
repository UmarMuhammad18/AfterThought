-- Interviews over WhatsApp: async voice-note interviews and live WhatsApp
-- calls answered from the browser (WhatsApp Business Calling API).
-- Run AFTER capture.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Interview invites. One row per candidate invitation.
--    mode = 'async'  -> the bot asks questions, candidate answers by voice note
--    mode = 'call'   -> the candidate calls (or is called on) WhatsApp and the
--                       recruiter answers in the browser
-- ---------------------------------------------------------------------------
create table if not exists public.interview_invites (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  code             text not null unique,            -- short code the candidate sends: "interview K7Q2PX"
  mode             text not null default 'async',   -- async | call
  candidate_name   text,
  candidate_phone  text,                            -- digits only; filled when the candidate messages
  role             text,
  rubric           text,
  questions        jsonb not null default '[]'::jsonb, -- string[] (async mode)
  answers          jsonb not null default '[]'::jsonb, -- per question: { segments, duration, skipped }
  status           text not null default 'invited', -- invited | awaiting_consent | in_progress | completed | cancelled
  current_index    integer not null default 0,
  meeting_id       uuid references public.meetings (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists interview_invites_user_idx on public.interview_invites (user_id, created_at desc);
create index if not exists interview_invites_phone_idx on public.interview_invites (candidate_phone);

alter table public.interview_invites enable row level security;

drop policy if exists "interview_invites_select_own" on public.interview_invites;
create policy "interview_invites_select_own"
  on public.interview_invites for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. WhatsApp calls (signalling state between Meta's webhooks and the browser)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_calls (
  id            text primary key,                   -- Meta call id (wacid...)
  user_id       uuid references auth.users (id) on delete cascade,
  invite_id     uuid references public.interview_invites (id) on delete set null,
  direction     text not null,                      -- USER_INITIATED | BUSINESS_INITIATED
  peer_phone    text,
  peer_name     text,
  status        text not null default 'ringing',    -- ringing | accepting | connected | ended | missed | failed | rejected
  offer_sdp     text,
  answer_sdp    text,
  meeting_id    uuid references public.meetings (id) on delete set null,
  error         text,
  duration_seconds numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists whatsapp_calls_user_status_idx on public.whatsapp_calls (user_id, status);

alter table public.whatsapp_calls enable row level security;

drop policy if exists "whatsapp_calls_select_own" on public.whatsapp_calls;
create policy "whatsapp_calls_select_own"
  on public.whatsapp_calls for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Call permissions granted by WhatsApp users (needed to call them)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_call_permissions (
  phone         text primary key,
  status        text not null,                      -- accept | reject
  is_permanent  boolean not null default false,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.whatsapp_call_permissions enable row level security;
-- No policies: only the service role touches this table.

-- Columns added after the first version of this file.
alter table public.interview_invites add column if not exists answers jsonb not null default '[]'::jsonb;
