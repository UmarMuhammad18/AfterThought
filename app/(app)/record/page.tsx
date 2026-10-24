'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Mic,
  MonitorSpeaker,
  Pause,
  Play,
  Square,
  Upload,
  Loader2,
  ShieldCheck,
  Briefcase,
  Smartphone,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { authFetch } from '@/lib/api-client'
import {
  SegmentedRecorder,
  canCaptureSystemAudio,
  isMobileDevice,
  type CaptureMode,
  type RecorderState,
} from '@/lib/capture/recorder'
import { importRecordingFile } from '@/lib/capture/importer'
import { IdbSegmentStore, resumePendingUploads, type SegmentStore } from '@/lib/capture/segment-store'
import { cn } from '@/lib/utils'

type LiveLine = { speaker: string; text: string; timestamp?: string }

const PLATFORMS = ['', 'WhatsApp', 'Zoom', 'Google Meet', 'Microsoft Teams', 'Phone call', 'In person', 'Slack', 'Discord', 'FaceTime', 'Other']

/** Cache written by the service worker when a file is shared to the app. */
const SHARE_CACHE = 'afterthought-share'

function formatClock(seconds: number) {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mmss = `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return h ? `${h}:${mmss}` : mmss
}

// useSearchParams needs a Suspense boundary for static rendering.
export default function RecordPageWrapper() {
  return (
    <Suspense>
      <RecordPage />
    </Suspense>
  )
}

function RecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getAccessToken } = useAuth()

  const [systemSupported, setSystemSupported] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [mode, setMode] = useState<CaptureMode>('mic')
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('')
  const [interview, setInterview] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [role, setRole] = useState('')
  const [rubric, setRubric] = useState('')
  const [consent, setConsent] = useState(false)

  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState({ mic: 0, system: 0 })
  const [pending, setPending] = useState(0)
  const [live, setLive] = useState<LiveLine[]>([])
  const [importProgress, setImportProgress] = useState<number | null>(null)

  const recorderRef = useRef<SegmentedRecorder | null>(null)
  const storeRef = useRef<SegmentStore | null>(null)
  const [recovered, setRecovered] = useState<string[]>([])

  // Finish recordings a previous visit couldn't (closed tab, crash, offline).
  useEffect(() => {
    if (!IdbSegmentStore.available()) return
    try {
      storeRef.current = new IdbSegmentStore()
    } catch {
      return
    }
    const activeId = recorderRef.current?.id
    resumePendingUploads(storeRef.current, getAccessToken, activeId ? [activeId] : [])
      .then(setRecovered)
      .catch((err) => console.warn('Could not resume pending uploads', err))
  }, [getAccessToken])

  useEffect(() => {
    const supported = canCaptureSystemAudio()
    setSystemSupported(supported)
    setMobile(isMobileDevice())
    if (supported) setMode('both')
  }, [])

  const meta = useCallback(
    () => ({
      title: title || undefined,
      platform: platform || undefined,
      kind: interview ? ('interview' as const) : ('meeting' as const),
      interview: interview ? { candidate, role, rubric } : undefined,
      consentConfirmed: consent,
    }),
    [title, platform, interview, candidate, role, rubric, consent],
  )

  const importFile = useCallback(
    async (file: File) => {
      setError(null)
      setImportProgress(0)
      try {
        const id = await importRecordingFile(file, {
          apiBase: window.location.origin,
          getToken: getAccessToken,
          meta: meta(),
          onProgress: setImportProgress,
        })
        router.push(`/meeting/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
        setImportProgress(null)
      }
    },
    [getAccessToken, meta, router],
  )

  // A file shared to the installed app (Android share sheet → AfterThought).
  useEffect(() => {
    if (searchParams.get('shared') !== '1' || typeof caches === 'undefined') return
    ;(async () => {
      const cache = await caches.open(SHARE_CACHE)
      const res = await cache.match('/shared-file')
      if (!res) return
      const blob = await res.blob()
      const name = decodeURIComponent(res.headers.get('x-filename') || 'shared-recording')
      await cache.delete('/shared-file')
      await importFile(new File([blob], name, { type: blob.type }))
    })().catch((err) => setError(err instanceof Error ? err.message : 'Could not read the shared file'))
  }, [searchParams, importFile])

  // Clock + live transcript while recording.
  useEffect(() => {
    if (state !== 'recording' && state !== 'paused') return
    const tick = setInterval(() => setElapsed(recorderRef.current?.elapsedSeconds ?? 0), 500)
    const poll = setInterval(async () => {
      const id = recorderRef.current?.id
      if (!id) return
      try {
        const res = await authFetch(`/api/recordings/${id}`)
        const data = await res.json()
        if (data.ok) setLive(data.transcript ?? [])
      } catch {
        /* keep recording even if polling fails */
      }
    }, 8000)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [state])

  // Warn before closing the tab mid-recording.
  useEffect(() => {
    if (state !== 'recording' && state !== 'paused' && state !== 'finishing') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state])

  async function start() {
    setError(null)
    setLive([])
    const recorder = new SegmentedRecorder({
      apiBase: window.location.origin,
      getToken: getAccessToken,
      mode,
      meta: { source: mobile ? 'mobile' : 'web', ...meta() },
      onState: setState,
      onError: setError,
      onLevels: setLevels,
      onUpload: ({ pending }) => setPending(pending),
      store: storeRef.current ?? undefined,
    })
    recorderRef.current = recorder
    try {
      await recorder.start()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording')
    }
  }

  async function stop() {
    const id = await recorderRef.current?.stop()
    if (id) router.push(`/meeting/${id}`)
  }

  const active = state === 'recording' || state === 'paused'
  const busy = state === 'starting' || state === 'finishing'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Record</h1>
        <p className="text-muted-foreground">
          Capture any conversation — a call on this computer, an in-person meeting, or a phone call on speaker.
        </p>
      </header>

      {recovered.length > 0 && (
        <div className="glass flex flex-col gap-2 rounded-2xl p-4 text-sm text-foreground">
          Recovered {recovered.length} recording{recovered.length === 1 ? '' : 's'} that didn&apos;t finish uploading last time:
          {recovered.map((id) => (
            <Link key={id} href={`/meeting/${id}`} className="text-primary hover:underline">
              Open recovered recording
            </Link>
          ))}
        </div>
      )}

      {!active && !busy && (
        <>
          <section className="glass flex flex-col gap-4 rounded-2xl p-5">
            <h2 className="font-heading text-sm font-semibold text-foreground">What are you recording?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ModeButton
                active={mode === 'both'}
                disabled={!systemSupported}
                onClick={() => setMode('both')}
                icon={MonitorSpeaker}
                title="A call on this computer"
                body={
                  systemSupported
                    ? 'Any call in a browser tab or app — both sides, labelled You / Them.'
                    : 'Needs Chrome, Edge, Brave or Arc on a computer. Use the desktop app for full system audio.'
                }
              />
              <ModeButton
                active={mode === 'mic'}
                onClick={() => setMode('mic')}
                icon={Mic}
                title="Microphone only"
                body="In-person meetings, or a phone call on speakerphone."
              />
            </div>
            {mode === 'both' && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                You&apos;ll be asked what to share: pick the call&apos;s tab and tick “Share tab audio”, or pick
                “Entire screen” and tick “Share system audio” to capture desktop apps like WhatsApp, Zoom or Teams
                (Windows / ChromeOS). Headphones give the cleanest transcript.
              </p>
            )}
            {mobile && (
              <div className="flex gap-3 rounded-xl border border-glass-border bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
                <Smartphone className="size-4 shrink-0 text-primary" />
                <span>
                  Phones don&apos;t let apps hear other apps&apos; calls. Put the call on speaker and record here, or
                  record with your phone&apos;s built-in call recorder and import or share the file below. WhatsApp calls
                  can also go through the AfterThought WhatsApp number.
                </span>
              </div>
            )}
          </section>

          <section className="glass flex flex-col gap-4 rounded-2xl p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Title (optional)">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-generated if empty" className={inputClass} />
              </Field>
              <Field label="Platform (optional)">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p || 'Not specified'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground">
              <input type="checkbox" checked={interview} onChange={(e) => setInterview(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              <Briefcase className="size-4 text-primary" />
              This is an interview — score it against a rubric
            </label>

            {interview && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Candidate">
                  <input value={candidate} onChange={(e) => setCandidate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Role">
                  <input value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Rubric or job description" className="sm:col-span-2">
                  <textarea
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                    rows={4}
                    placeholder={'One criterion per line, e.g.\nCommunication\nReact experience\nOwnership'}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            <label className="flex items-start gap-3 rounded-xl border border-glass-border bg-secondary p-3 text-sm text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-primary" /> Everyone knows this is being recorded
                </span>
                <span className="text-xs text-muted-foreground">
                  Many places require consent from every participant. Say something like: “I&apos;m recording this so I
                  can take notes — is that OK?”
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={start}
              disabled={!consent}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="size-2.5 rounded-full bg-pink" /> Start recording
            </button>
          </section>

          <section className="glass flex flex-col gap-3 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <Upload className="size-4 text-primary" /> Import a recording
            </h2>
            <p className="text-xs text-muted-foreground">
              Call recordings from your phone, voice memos, or Zoom / Teams / Meet cloud recordings — up to 500 MB.
            </p>
            <input
              type="file"
              accept="audio/*,video/*,.m4a,.amr,.3gp,.opus"
              disabled={importProgress !== null}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importFile(f)
              }}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground"
            />
            {importProgress !== null && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Uploading… {Math.round(importProgress * 100)}%
              </div>
            )}
          </section>
        </>
      )}

      {(active || busy) && (
        <section className="glass flex flex-col items-center gap-5 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className={cn('size-3 rounded-full', state === 'recording' ? 'animate-pulse bg-pink' : 'bg-muted-foreground')} />
            <span className="font-heading text-4xl font-bold tabular-nums text-foreground">{formatClock(elapsed)}</span>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2">
            {mode !== 'system' && <Meter label="You" value={levels.mic} />}
            {mode !== 'mic' && <Meter label="Them" value={levels.system} />}
          </div>

          {state === 'finishing' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Uploading the last segment…
            </p>
          ) : state === 'starting' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Starting…
            </p>
          ) : (
            <div className="flex gap-3">
              {state === 'recording' ? (
                <button type="button" onClick={() => recorderRef.current?.pause()} className={secondaryButton}>
                  <Pause className="size-4" /> Pause
                </button>
              ) : (
                <button type="button" onClick={() => recorderRef.current?.resume()} className={secondaryButton}>
                  <Play className="size-4" /> Resume
                </button>
              )}
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Square className="size-4" /> Stop &amp; summarise
              </button>
            </div>
          )}

          {pending > 0 && <p className="text-xs text-muted-foreground">{pending} segment(s) waiting to upload…</p>}

          <div className="w-full">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live transcript</h3>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">Appears every couple of minutes as segments are transcribed.</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto scroll-slim">
                {live.map((l, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    <span className="mr-2 text-xs tabular-nums">{l.timestamp}</span>
                    <span className="font-medium text-foreground">{l.speaker}:</span> {l.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          {error}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Want to record calls from any app with one shortcut? Get the{' '}
        <Link href="/settings/extension-access" className="text-primary hover:underline">
          desktop app or browser extension
        </Link>
        .
      </p>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary'
const secondaryButton =
  'flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-4 py-2.5 text-sm text-foreground hover:text-primary'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-xs text-muted-foreground', className)}>
      {label}
      {children}
    </label>
  )
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  body,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: typeof Mic
  title: string
  body: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-primary bg-primary/10' : 'border-glass-border bg-secondary hover:border-primary/50',
      )}
    >
      <Icon className="size-5 text-primary" />
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="w-10">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  )
}
