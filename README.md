# AfterThought

**Record any call, on any platform, on any device — and remember everything.**

AfterThought captures conversations wherever they happen: WhatsApp, Zoom, Google Meet, Teams, Slack, Discord, FaceTime, phone calls, or in person. It turns each one into a timestamped transcript (who said what), a summary, action items, and — for interviews — a rubric scorecard backed by quotes you can click to hear. Everything is searchable across all your calls.

> Built with Next.js 16 (App Router), Supabase (Auth, Postgres, Storage, pgvector), Tailwind CSS v4, Deepgram / OpenAI for speech-to-text, and an OpenRouter-compatible LLM for analysis.

---

## Where it records

| Where | How | What it hears |
| --- | --- | --- |
| **Desktop app** (Windows, macOS, Linux) | `Ctrl/Cmd + Shift + R` from anywhere, tray icon, or a prompt when an app starts using your mic (Windows) | System audio + mic → **any** app's call: WhatsApp Desktop, Zoom, Teams, Discord, FaceTime, Phone Link… |
| **Browser extension** (Chrome, Edge, Brave, Arc) | Toolbar button / `Alt + Shift + R` on the call tab | The tab's audio + your mic → Meet, Zoom web, Teams web, WhatsApp Web, Slack huddles… |
| **Web app** (`/record`, any browser) | "A call on this computer" (shares a tab or the whole screen's audio) or "Microphone only" | Desktop Chrome/Edge: tab or system audio + mic. Phones, tablets, Safari: microphone |
| **Installable app on phones** (PWA) | Add to home screen; share a call recording to AfterThought from any app (Android) | In-person / speakerphone via mic; imports from your phone's call recorder |
| **Import** | Upload any audio/video file up to 500 MB | Voice memos, phone call recordings, Zoom/Teams/Meet cloud recordings |
| **WhatsApp** | Send a voice note, forward a call recording, or ask a question to the AfterThought number | Anything you send; replies with notes in the chat |

**Honest limits:** iOS and Android don't let any app capture another app's call audio. On phones, record on speakerphone, use the phone's built-in call recorder and share/import the file, or route WhatsApp calls through the WhatsApp Business Calling API (planned).

## Features

- **Two-sided capture with reliable speaker labels.** Mic and call audio are recorded as separate stereo channels, so transcripts say *You* / *Them* without guessing. Echo from speakers is removed automatically.
- **Segmented, crash-safe uploads.** Audio uploads every two minutes while you talk; long calls have no size limit, a crash loses only the current segment, and a live transcript builds up during the call.
- **Multilingual.** Deepgram's `multi` mode handles speakers who switch languages mid-sentence.
- **Notes that link to the audio.** Click any transcript line, search result or scorecard quote to hear that moment.
- **Interview mode.** Add a rubric or job description; get a recommendation, per-criterion scores, quoted evidence, strengths, concerns and follow-up questions.
- **Semantic + keyword search** across every conversation (pgvector), with cited sources.
- **Action items → calendar** as a downloadable `.ics` that works with any calendar app.
- **AI follow-up email** drafts, opened in your own mail app.
- **Speaker profiles and cross-meeting insights** computed from your real data.
- **Consent first.** Every recorder asks you to confirm participants know they're being recorded.

## Project structure

```
app/
  (app)/record/            # Recorder + file import (works on every device)
  (app)/meeting/[id]/      # Notes, audio player, transcript, scorecard, email, .ics
  (app)/search|insights|calendar|speakers|settings/
  api/recordings/          # Universal ingest: create → PUT segments → finish; file import
  api/meeting/[id]/        # Read/rename/delete, audio URLs, .ics, email, reprocess
  api/whatsapp/            # Cloud API webhook, phone linking, local mock
  api/keys/                # Long-lived API keys for extension/desktop
lib/
  capture/                 # Framework-free recorder + importer (shared by web, extension, desktop)
  transcription/           # Deepgram / OpenAI speech-to-text, echo removal
  pipeline/                # Storage, per-segment transcription, analysis, indexing, side effects
  ai/                      # Long-transcript analysis, scorecards, embeddings, search
  whatsapp/                # Adapters, 24h window, webhook parsing, linking
extension/                 # MV3 extension (src/ is bundled into dist/)
desktop-app/               # Electron app: loopback capture, tray, hotkey, call detection
public/sw.js               # Service worker: installable PWA + share target
supabase/                  # SQL: schema.sql, whatsapp.sql, capture.sql
tests/                     # Vitest unit tests
```

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Only Supabase is required. Transcription, AI analysis, semantic search and WhatsApp switch on as you add their keys (see comments in `.env.example`).

### 3. Database

In the Supabase SQL editor, run in order:

1. [`supabase/schema.sql`](supabase/schema.sql) — meetings, speakers, calendar events, RLS
2. [`supabase/whatsapp.sql`](supabase/whatsapp.sql) — phone links, WhatsApp columns
3. [`supabase/capture.sql`](supabase/capture.sql) — recording segments, private `recordings` storage bucket, API keys, pgvector search, WhatsApp window + link codes

All are safe to re-run.

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000 and go to **Record**.

## Desktop app and browser extension

```bash
pnpm build:clients      # bundles extension/dist and desktop-app/dist
pnpm desktop            # build + launch the desktop app
```

- **Extension:** `chrome://extensions` → Developer mode → **Load unpacked** → `extension/`. Create an API key in **Settings → Devices & API keys** and paste it with your app URL into the popup.
- **Desktop:** open Settings in the app, paste your URL and API key. macOS asks for Screen Recording permission (needed to hear other apps); system-audio loopback on macOS requires a recent Electron and macOS 13+. On Linux, enable a "Monitor of …" input in your sound settings.

## WhatsApp

1. Create a WhatsApp Business app in Meta's developer dashboard and add a phone number.
2. Set the `WHATSAPP_*` variables. The webhook URL is `https://<your-app>/api/whatsapp/webhook`; subscribe to `messages` (and `calls` if you enable the Calling API).
3. Create a message template with one `{{1}}` body variable and set `WHATSAPP_TEMPLATE_NAME`; it's used when a reply would fall outside Meta's 24-hour window.
4. Users link their number from **Settings → WhatsApp** (they send `link 123456` to the bot).

Test locally without Meta credentials:

```bash
curl -X POST http://localhost:3000/api/whatsapp/mock \
  -H "Content-Type: application/json" \
  -d '{"from":"15551234567","type":"text","text":"help"}'
```

## Scripts

```bash
pnpm dev             # dev server
pnpm build           # production build
pnpm typecheck       # TypeScript
pnpm test            # unit tests (Vitest)
pnpm build:clients   # extension + desktop bundles
pnpm desktop         # run the desktop app
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests, and both builds on every push and PR.

## Security and privacy

- API routes validate a Supabase session token or an `at_…` API key (only its SHA-256 hash is stored) and scope every query to the user. RLS policies are a second line of defence.
- Audio lives in a private Storage bucket; playback uses signed URLs that expire after an hour.
- Deleting a conversation removes its transcript, notes, search index and audio.
- The WhatsApp webhook verifies Meta's `X-Hub-Signature-256` on every request.

## Deployment

Merges to `main` deploy to Vercel. Set the environment variables in the Vercel project and run the SQL files against the production database. Long-running work (transcription, analysis) runs after the response via `after()`, within each route's `maxDuration` (300 s).
