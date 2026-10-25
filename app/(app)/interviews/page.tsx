'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Copy, Check, Plus, Phone, MessageCircle, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { authFetch } from '@/lib/api-client'
import { CallConsole, type CallConsoleHandle, type InterviewContext } from '@/components/interviews/call-console'
import { cn } from '@/lib/utils'

type Invite = {
  id: string
  code: string
  mode: 'async' | 'call'
  candidate_name: string | null
  candidate_phone: string | null
  role: string | null
  rubric: string | null
  questions: string[]
  status: 'invited' | 'awaiting_consent' | 'in_progress' | 'completed' | 'cancelled'
  current_index: number
  meeting_id: string | null
  created_at: string
  link: string | null
}

const STATUS: Record<Invite['status'], string> = {
  invited: 'Waiting for candidate',
  awaiting_consent: 'Candidate opened it',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const input =
  'w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary'

export default function InterviewsPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [botNumber, setBotNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const consoleRef = useRef<CallConsoleHandle>(null)

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/interviews', { cache: 'no-store' })
      const data = await res.json()
      if (data.ok) {
        setInvites(data.invites)
        setBotNumber(data.botNumber)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined)
    }
  }, [])

  const contextFor = useCallback(
    (inviteId: string | null): InterviewContext => {
      const i = invites.find((x) => x.id === inviteId)
      return i
        ? { inviteId: i.id, candidate: i.candidate_name ?? undefined, role: i.role ?? undefined, rubric: i.rubric ?? undefined }
        : {}
    },
    [invites],
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight text-foreground">
          <Briefcase className="size-7 text-primary" /> Interviews
        </h1>
        <p className="text-muted-foreground">
          Screen candidates on WhatsApp — by voice notes they answer in their own time, or a live call you take in the
          browser. Every interview is transcribed and scored against your rubric.
        </p>
      </header>

      <CallConsole ref={consoleRef} contextFor={contextFor} />

      <NewInvite botNumber={botNumber} onCreated={load} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">Invites</h2>
        {loading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        ) : (
          invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} consoleRef={consoleRef} onChange={load} />
          ))
        )}
      </section>
    </div>
  )
}

function NewInvite({ botNumber, onCreated }: { botNumber: string | null; onCreated: () => void }) {
  const [mode, setMode] = useState<'async' | 'call'>('async')
  const [candidateName, setCandidateName] = useState('')
  const [role, setRole] = useState('')
  const [rubric, setRubric] = useState('')
  const [questions, setQuestions] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Invite | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await authFetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, candidateName, role, rubric, questions }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setCreated(data.invite)
      setCandidateName('')
      setQuestions('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invite')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
        <Plus className="size-4 text-primary" /> Invite a candidate
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ['async', MessageCircle, 'Voice-note interview', 'The bot asks your questions; they reply with voice notes whenever suits them.'],
            ['call', Phone, 'WhatsApp call', 'They call your WhatsApp number (or you call them) and you take it here.'],
          ] as const
        ).map(([value, Icon, title, body]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors',
              mode === value ? 'border-primary bg-primary/10' : 'border-glass-border bg-secondary hover:border-primary/50',
            )}
          >
            <Icon className="size-5 text-primary" />
            <span className="text-sm font-medium text-foreground">{title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
          </button>
        ))}
      </div>

      <form onSubmit={create} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Candidate name (optional)" className={input} />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, e.g. Frontend engineer" className={input} />
        </div>
        <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={3} placeholder="Rubric or job description — used for scoring (and to write questions)" className={input} />
        {mode === 'async' && (
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            rows={4}
            placeholder="Questions, one per line — leave empty and AfterThought writes them from the role and rubric"
            className={input}
          />
        )}
        <button type="submit" disabled={busy} className="flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create invite
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {created && <ShareInvite invite={created} botNumber={botNumber} />}
    </section>
  )
}

function shareMessage(invite: Invite, botNumber: string | null) {
  const intro =
    invite.mode === 'async'
      ? `You're invited to a short interview${invite.role ? ` for ${invite.role}` : ''} on WhatsApp — you'll answer a few questions with voice notes, whenever suits you.`
      : `You're invited to a WhatsApp call interview${invite.role ? ` for ${invite.role}` : ''}.`
  const how = invite.link
    ? `Tap to start: ${invite.link}`
    : `Send "interview ${invite.code}" on WhatsApp to ${botNumber ? `+${botNumber}` : 'our number'}.`
  return `${intro}\n\n${how}`
}

function ShareInvite({ invite, botNumber }: { invite: Invite; botNumber: string | null }) {
  const [copied, setCopied] = useState(false)
  const text = shareMessage(invite, botNumber)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm text-foreground">
        Code <code className="rounded bg-secondary px-1.5 py-0.5 font-semibold">{invite.code}</code> — send the candidate:
      </p>
      <pre className="whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs text-foreground">{text}</pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="flex w-fit items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground hover:text-primary"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy message'}
      </button>
    </div>
  )
}

function InviteRow({
  invite,
  consoleRef,
  onChange,
}: {
  invite: Invite
  consoleRef: React.RefObject<CallConsoleHandle | null>
  onChange: () => void
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function call() {
    if (!invite.candidate_phone) return
    setBusy(true)
    setNotice(null)
    try {
      const perm = await authFetch(`/api/calls/permission?phone=${invite.candidate_phone}`).then((r) => r.json())
      if (!perm.granted) {
        const res = await authFetch('/api/calls/permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: invite.candidate_phone, reason: `We'd like to call you for your interview${invite.role ? ` (${invite.role})` : ''}.` }),
        })
        const data = await res.json()
        setNotice(data.ok ? 'Call permission requested — try again once they accept.' : data.error)
        return
      }
      await consoleRef.current?.call(invite.candidate_phone, {
        inviteId: invite.id,
        candidate: invite.candidate_name ?? undefined,
        role: invite.role ?? undefined,
        rubric: invite.rubric ?? undefined,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not start the call')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    await authFetch(`/api/interviews/${invite.id}`, { method: 'DELETE' })
    onChange()
  }

  const progress =
    invite.mode === 'async' && invite.status === 'in_progress'
      ? ` · question ${Math.min(invite.current_index + 1, invite.questions.length)} of ${invite.questions.length}`
      : ''

  return (
    <article className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {invite.mode === 'call' ? <Phone className="size-4 text-primary" /> : <MessageCircle className="size-4 text-primary" />}
            <span className="truncate">{invite.candidate_name || (invite.candidate_phone ? `+${invite.candidate_phone}` : 'New candidate')}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {[invite.role, `code ${invite.code}`, new Date(invite.created_at).toLocaleDateString()].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs', invite.status === 'completed' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
          {STATUS[invite.status]}
          {progress}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {invite.meeting_id && (
          <Link href={`/meeting/${invite.meeting_id}`} className="pressable flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            {invite.status === 'completed' ? 'View scorecard' : 'View so far'} <ArrowRight className="size-3.5" />
          </Link>
        )}
        {invite.mode === 'call' && invite.candidate_phone && invite.status !== 'cancelled' && (
          <button type="button" onClick={call} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-secondary px-3 py-1.5 text-sm text-foreground hover:text-primary disabled:opacity-60">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />} Call
          </button>
        )}
        {(invite.status === 'invited' || invite.status === 'awaiting_consent') && (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(shareMessage(invite, null))
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-secondary px-3 py-1.5 text-sm text-foreground hover:text-primary"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy invite
          </button>
        )}
        {invite.status !== 'completed' && invite.status !== 'cancelled' && (
          <button type="button" onClick={cancel} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3.5" /> Cancel
          </button>
        )}
      </div>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </article>
  )
}
