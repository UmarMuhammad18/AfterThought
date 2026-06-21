# AfterThought

AfterThought is an AI meeting companion. Capture audio from a browser extension, get an automatic transcript, summary, action items, and speaker insights, then explore everything in a polished dashboard — and ask follow-up questions about any meeting.

> Built with [Next.js 16](https://nextjs.org) (App Router), Supabase Auth, Tailwind CSS v4, Framer Motion, and an LLM analysis pipeline. This repository is linked to a [v0](https://v0.app) project and auto-deploys to Vercel on every merge to `main`.

[Continue working on v0 →](https://v0.app/chat/projects/prj_awdQZaPcN5yaYYo76Xjya8A9lCDu)

---

## Features

- **Marketing landing page** at `/` with hero, features, how-it-works, tech stack, screenshots, and team sections.
- **Authenticated dashboard** at `/dashboard` for browsing meetings, summaries, and action items.
- **AI analysis pipeline** that turns a transcript into a summary, action items (with owners and deadlines), participants, decisions, and blockers.
- **Meeting Q&A** — ask natural-language questions about any meeting's transcript.
- **Browser extension** that records audio and uploads it to the app for processing.
- **Supabase Auth** with email + password, magic link, per-user data ownership, and Row Level Security.
- **Demo login mode** (dev-only, flag-gated) to explore the app without setting up auth.

## Tech Stack

| Area        | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                            |
| UI          | React 19, Tailwind CSS v4, Framer Motion, lucide-react        |
| Auth & DB   | Supabase (Auth + Postgres with Row Level Security)            |
| AI          | LLM analysis via OpenRouter-compatible API                    |
| Extension   | Chrome/Edge MV3 extension (`/extension`)                      |
| Hosting     | Vercel                                                        |

## Project Structure

```
app/
  page.tsx                     # Marketing landing page (/)
  sign-in/  sign-up/           # Auth pages
  auth/callback/               # Magic-link callback
  success/                     # Post-sign-in confirmation
  (app)/                       # Authenticated app shell (TopNav + AuthGate)
    dashboard/                 # Meeting dashboard
    meeting/[id]/              # Meeting detail
    recording/[id]/            # Live recording view
    speakers/  calendar/       # Insights & scheduling
    insights/  templates/  search/
    settings/                  # Settings + extension-access (token) page
  api/                         # Route handlers (transcribe, summarize, meetings, etc.)
components/                    # UI + marketing components, auth provider/gate
lib/                           # supabase, api-client, demo, data helpers
extension/                     # MV3 browser extension
supabase/schema.sql            # Tables, ownership columns, and RLS policies
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create `.env.local` with the following:

```bash
# Supabase (required for real auth + data)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI analysis (required for transcripts to be summarized)
OPENROUTER_API_KEY=your-openrouter-key

# Demo login (optional, dev-only — set BOTH to enable)
DEMO_LOGIN_ENABLED=true
NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true
```

> Without Supabase keys the app runs in an open "demo/preview" state. Without an AI key, transcribe falls back to placeholder summaries.

### 3. Set up the database

Open the Supabase SQL editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `meetings`, `speakers`, and `calendar_events` tables, adds per-user ownership columns, and enables Row Level Security. It is safe to re-run.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authentication

- Email + password and magic-link sign-in are handled by Supabase Auth.
- API routes use the **service-role key** and enforce ownership in application code by validating the caller's access token and filtering every query by `user_id`. The RLS policies in `schema.sql` are a second, database-level guarantee.

### Demo login (development only)

When `DEMO_LOGIN_ENABLED` and `NEXT_PUBLIC_DEMO_LOGIN_ENABLED` are both `true`, a "Demo login" card appears on `/sign-in`:

- Email: `demo@afterthought.dev`
- Password: `demo1234`

It starts an in-memory session and sends a hardcoded demo token that the backend accepts. When the flags are off, demo mode is completely inert and does not affect real auth.

## Browser Extension

The extension lives in [`/extension`](extension) and uses Manifest V3.

1. Open `chrome://extensions`, enable **Developer mode**, and **Load unpacked** → select the `extension/` folder.
2. In the app, go to **Settings → Extension access** to copy your access token.
3. Paste the token into the extension popup and click **Save token**.
4. Start recording — audio is uploaded to `/api/transcribe`, analyzed, and saved to your account.

## API Routes

| Route                    | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `POST /api/transcribe`   | Receive audio, create a meeting, run AI analysis |
| `POST /api/summarize`    | Analyze a transcript / answer questions          |
| `GET  /api/meetings`     | List the signed-in user's meetings               |
| `GET  /api/meeting/[id]` | Fetch one meeting                                |
| `POST /api/meeting/[id]` | Ask a question about a meeting's transcript      |
| `GET  /api/speakers`     | Speaker insights                                 |
| `GET  /api/calendar`     | Action items / scheduling                        |

All routes validate the Supabase access token and scope data to the authenticated user.

## Scripts

```bash
pnpm dev            # Start the dev server
pnpm build          # Production build
pnpm start          # Run the production build
pnpm lint           # Lint
pnpm build:desktop  # Build the optional Electron desktop shell
```

## Deployment

The project is linked to v0 and Vercel. Merges to `main` deploy automatically. Set the environment variables above in your Vercel project settings, and run `supabase/schema.sql` against your production Supabase database.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [v0 Documentation](https://v0.app/docs)
