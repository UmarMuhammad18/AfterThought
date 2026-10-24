'use client'

import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  AlertTriangle,
  CalendarPlus,
  Mail,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Send,
  Users,
  Briefcase,
  Pencil,
} from 'lucide-react'
import { authFetch } from '@/lib/api-client'
import { AudioPlayer, type AudioPlayerHandle } from '@/components/meeting/audio-player'
import { Scorecard, type ScorecardData } from '@/components/meeting/scorecard'
import { cn } from '@/lib/utils'

type Segment = { speaker: string; text: string; timestamp?: string; start?: number; end?: number }

type MeetingData = {
  id: string
  title: string
  summary: string | null
  action_items: string[]
  segments: Segment[]
  created_at: string
  status: 'recording' | 'processing' | 'ready' | 'failed'
  error: string | null
  source: string | null
  platform: string | null
  language: string | null
  kind: 'meeting' | 'interview'
  interview: { candidate?: string; role?: string; rubric?: string } | null
  duration_seconds: number | null
  analysis: {
    decisions?: string[]
    blockers?: string[]
    deadlines?: string[]
    topics?: string[]
    participants?: string[]
  } | null
  scorecard: ScorecardData | null
}

export default function MeetingPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <MeetingDetailPage params={params} />
    </Suspense>
  )
}

function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerRef = useRef<AudioPlayerHandle>(null)

  const [data, setData] = useState<MeetingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentTime, setCurrentTime] = useState(-1)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/meeting/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        setNotFound(true)
        return
      }
      setData(await res.json())
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Poll while the recording is being processed.
  useEffect(() => {
    if (!data || (data.status !== 'processing' && data.status !== 'recording')) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [data, load])

  // Deep links from search results: /meeting/:id?t=123
  const initialSeek = searchParams.get('t')
  useEffect(() => {
    if (!initialSeek || data?.status !== 'ready') return
    const t = Number(initialSeek)
    const timer = setTimeout(() => playerRef.current?.seek(t), 800)
    return () => clearTimeout(timer)
  }, [initialSeek, data?.status])

  const speakers = useMemo(
    () => [...new Set((data?.segments ?? []).map((s) => s.speaker))],
    [data?.segments],
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }
  if (notFound || !data) {
    return <div className="mt-20 text-center text-destructive">Meeting not found.</div>
  }

  const ready = data.status === 'ready'
  const a = data.analysis ?? {}

  async function downloadIcs() {
    const res = await authFetch(`/api/meeting/${id}/ics`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `afterthought-${id.slice(0, 8)}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function remove() {
    if (!confirm('Delete this meeting, its transcript and its audio? This cannot be undone.')) return
    const res = await authFetch(`/api/meeting/${id}`, { method: 'DELETE' })
    if (res.ok) router.replace('/dashboard')
    else setNotice('Could not delete the meeting.')
  }

  async function reprocess(body: object = {}) {
    const res = await authFetch(`/api/meeting/${id}/reprocess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) setNotice(json.error || 'Could not reprocess')
    await load()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <EditableTitle
          title={data.title}
          onSave={async (title) => {
            await authFetch(`/api/meeting/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title }),
            })
            await load()
          }}
        />
        <p className="text-sm text-muted-foreground">
          {[
            new Date(data.created_at).toLocaleString(),
            data.duration_seconds ? `${Math.max(1, Math.round(data.duration_seconds / 60))} min` : null,
            data.platform,
            data.language ? data.language.toUpperCase() : null,
            data.kind === 'interview' ? 'Interview' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {ready && (
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={CalendarPlus} onClick={downloadIcs}>Add to calendar</ActionButton>
            <CopyNotesButton data={data} />
            <ActionButton icon={RefreshCw} onClick={() => reprocess()}>Re-analyse</ActionButton>
            <ActionButton icon={Trash2} onClick={remove} danger>Delete</ActionButton>
          </div>
        )}
      </header>

      {notice && <p className="text-sm text-destructive">{notice}</p>}

      {(data.status === 'processing' || data.status === 'recording') && (
        <div className="glass flex items-center gap-3 rounded-2xl p-5 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          {data.status === 'recording'
            ? 'Recording in progress…'
            : 'Transcribing and analysing — this usually takes under a minute per 10 minutes of audio.'}
        </div>
      )}

      {data.status === 'failed' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-foreground">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-destructive" /> Processing failed
          </span>
          <span className="text-muted-foreground">{data.error}</span>
          <button type="button" onClick={() => reprocess()} className="w-fit rounded-xl bg-primary px-4 py-2 text-primary-foreground">
            Try again
          </button>
        </div>
      )}

      {ready && data.error && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5" /> {data.error}
        </p>
      )}

      {ready && (
        <>
          <section className="glass rounded-2xl p-4">
            <AudioPlayer
              ref={playerRef}
              meetingId={id}
              totalSeconds={data.duration_seconds ?? undefined}
              onTime={setCurrentTime}
            />
          </section>

          {data.scorecard && (
            <Scorecard data={data.scorecard} onSeekTimestamp={(t) => playerRef.current?.seek(t)} />
          )}

          <Card title="Summary">
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {data.summary || 'No summary available.'}
            </p>
            {a.topics && a.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {a.topics.map((t) => (
                  <span key={t} className="rounded-full border border-glass-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <ListCard title="Action items" items={data.action_items} empty="No action items detected." />
          {a.decisions && a.decisions.length > 0 && <ListCard title="Decisions" items={a.decisions} />}
          {a.blockers && a.blockers.length > 0 && <ListCard title="Risks & open questions" items={a.blockers} />}

          <AskBox meetingId={id} />
          <FollowUpEmail meetingId={id} />

          {data.kind !== 'interview' && <InterviewConverter onConvert={(interview) => reprocess({ kind: 'interview', interview })} />}

          <Card title="Transcript">
            {speakers.length > 0 && (
              <SpeakerRenamer
                speakers={speakers}
                onSave={async (map) => {
                  await authFetch(`/api/meeting/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speakers: map }),
                  })
                  await load()
                }}
              />
            )}
            {data.segments?.length ? (
              <div className="flex flex-col gap-1">
                {data.segments.map((seg, i) => {
                  const active =
                    seg.start !== undefined &&
                    currentTime >= seg.start &&
                    currentTime < (seg.end ?? data.segments[i + 1]?.start ?? Infinity)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3 rounded-xl p-2.5 transition-colors',
                        active ? 'bg-primary/10' : 'hover:bg-secondary/60',
                      )}
                    >
                      {seg.start !== undefined ? (
                        <button
                          type="button"
                          onClick={() => playerRef.current?.seek(seg.start!)}
                          className="w-14 shrink-0 pt-0.5 text-left text-xs tabular-nums text-primary hover:underline"
                          aria-label={`Play from ${seg.timestamp}`}
                        >
                          {seg.timestamp}
                        </button>
                      ) : (
                        <span className="w-14 shrink-0 pt-0.5 text-xs text-muted-foreground">{seg.timestamp}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{seg.speaker}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{seg.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">Transcript not available.</p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <Card title={title}>
      {items?.length ? (
        <ul className="flex flex-col gap-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </Card>
  )
}

function ActionButton({
  icon: Icon,
  onClick,
  children,
  danger,
}: {
  icon: typeof Mail
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors',
        danger ? 'hover:text-destructive' : 'hover:text-primary',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function EditableTitle({ title, onSave }: { title: string; onSave: (t: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  useEffect(() => setValue(title), [title])

  if (!editing) {
    return (
      <h1 className="group flex items-start gap-2 font-heading text-3xl font-bold tracking-tight text-foreground">
        {title}
        <button type="button" onClick={() => setEditing(true)} aria-label="Rename" className="mt-2 text-muted-foreground opacity-60 hover:text-primary group-hover:opacity-100">
          <Pencil className="size-4" />
        </button>
      </h1>
    )
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await onSave(value)
        setEditing(false)
      }}
      className="flex gap-2"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-xl border border-glass-border bg-secondary px-3 py-2 font-heading text-2xl font-bold text-foreground outline-none focus:border-primary"
      />
      <button type="submit" className="rounded-xl bg-primary px-4 text-sm text-primary-foreground">Save</button>
    </form>
  )
}

function CopyNotesButton({ data }: { data: MeetingData }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const lines = [
      `# ${data.title}`,
      '',
      data.summary ?? '',
      '',
      '## Action items',
      ...(data.action_items.length ? data.action_items.map((i) => `- ${i}`) : ['- None']),
    ]
    if (data.analysis?.decisions?.length) lines.push('', '## Decisions', ...data.analysis.decisions.map((d) => `- ${d}`))
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <ActionButton icon={copied ? Check : Copy} onClick={copy}>
      {copied ? 'Copied' : 'Copy notes'}
    </ActionButton>
  )
}

function AskBox({ meetingId }: { meetingId: string }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      const res = await authFetch(`/api/meeting/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const json = await res.json()
      setAnswer(json.answer || json.error || 'No answer.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Ask about this conversation">
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What did they say about the budget?"
          className="flex-1 rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" disabled={busy} className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60" aria-label="Ask">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      {answer && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{answer}</p>}
    </Card>
  )
}

function FollowUpEmail({ meetingId }: { meetingId: string }) {
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function draft() {
    setBusy(true)
    setError(null)
    try {
      const res = await authFetch(`/api/meeting/${meetingId}/email`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setEmail({ subject: json.subject, body: json.body })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft email')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Follow-up email">
      {!email ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={draft} disabled={busy} className="flex w-fit items-center gap-2 rounded-xl border border-glass-border bg-secondary px-4 py-2 text-sm text-foreground hover:text-primary disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Draft a follow-up
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className="rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground" />
          <textarea value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} rows={8} className="rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground" />
          <a
            href={`mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}
            className="flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Send className="size-4" /> Open in mail app
          </a>
        </div>
      )}
    </Card>
  )
}

function SpeakerRenamer({ speakers, onSave }: { speakers: string[]; onSave: (map: Record<string, string>) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-3 flex items-center gap-2 text-sm text-primary hover:underline">
        <Users className="size-4" /> Name the speakers
      </button>
    )
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await onSave(names)
        setOpen(false)
        setNames({})
      }}
      className="mb-4 flex flex-col gap-2 rounded-xl border border-glass-border bg-secondary/50 p-3"
    >
      {speakers.map((s) => (
        <label key={s} className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="w-24 shrink-0 truncate">{s}</span>
          <input
            value={names[s] ?? ''}
            onChange={(e) => setNames({ ...names, [s]: e.target.value })}
            placeholder="Real name"
            className="flex-1 rounded-lg border border-glass-border bg-secondary px-3 py-1.5 text-sm text-foreground"
          />
        </label>
      ))}
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Save names</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
      </div>
    </form>
  )
}

function InterviewConverter({ onConvert }: { onConvert: (i: { candidate: string; role: string; rubric: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [role, setRole] = useState('')
  const [rubric, setRubric] = useState('')
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-fit items-center gap-2 text-sm text-primary hover:underline">
        <Briefcase className="size-4" /> Was this an interview? Score it against a rubric
      </button>
    )
  }
  const input = 'rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground'
  return (
    <Card title="Score as an interview">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={candidate} onChange={(e) => setCandidate(e.target.value)} placeholder="Candidate" className={input} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className={input} />
        <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={4} placeholder="Rubric or job description (one criterion per line)" className={cn(input, 'sm:col-span-2')} />
      </div>
      <button type="button" onClick={() => onConvert({ candidate, role, rubric })} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">
        Generate scorecard
      </button>
    </Card>
  )
}
