'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Shield, LogOut, KeyRound, MessageCircle, ArrowRight, Trash2, Loader2 } from 'lucide-react'
import { InsightCard } from '@/components/insight-card'
import { useAuth } from '@/components/auth-provider'
import { authFetch } from '@/lib/api-client'

function WhatsAppCard() {
  const { configured, user } = useAuth()
  const [phones, setPhones] = useState<string[]>([])
  const [code, setCode] = useState<{ code: string; waLink: string | null; botNumber: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await authFetch('/api/whatsapp/link')
    const data = await res.json().catch(() => ({}))
    if (data.ok) setPhones(data.phones)
  }, [])

  useEffect(() => {
    if (configured && user) load()
  }, [configured, user, load])

  // While a code is showing, check for the link to complete.
  useEffect(() => {
    if (!code) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [code, load])

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const res = await authFetch('/api/whatsapp/link', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setCode(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a code')
    } finally {
      setBusy(false)
    }
  }

  async function unlink(phone: string) {
    await authFetch('/api/whatsapp/link', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    await load()
  }

  return (
    <InsightCard icon={MessageCircle} title="WhatsApp">
      <p className="text-sm text-muted-foreground">
        Send voice notes, forwarded call recordings or questions to the AfterThought WhatsApp number. Link your number
        so everything lands in your dashboard.
      </p>
      {!configured || !user ? (
        <p className="text-sm text-muted-foreground">Sign in to link WhatsApp.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {phones.map((p) => (
            <div key={p} className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm">
              <span className="text-foreground">+{p}</span>
              <button type="button" onClick={() => unlink(p)} aria-label={`Unlink +${p}`} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {code ? (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
              <span className="text-foreground">
                Send <code className="rounded bg-secondary px-1.5 py-0.5 font-semibold">link {code.code}</code> to{' '}
                {code.botNumber ? `+${code.botNumber}` : 'the AfterThought WhatsApp number'} within 15 minutes.
              </span>
              {code.waLink && (
                <a href={code.waLink} target="_blank" rel="noreferrer" className="w-fit rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground">
                  Open WhatsApp
                </a>
              )}
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Waiting for your message…
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="w-fit rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {phones.length ? 'Link another number' : 'Link my WhatsApp'}
            </button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </InsightCard>
  )
}

export default function SettingsPage() {
  const { user, configured, signOut } = useAuth()
  const router = useRouter()

  const email = user?.email ?? 'Not signed in'
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
  const initials = displayName.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await signOut()
    router.replace('/sign-in')
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Your account, connected devices and channels.</p>
      </div>

      <InsightCard icon={User} title="Profile">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full border border-glass-border bg-secondary text-base font-semibold text-secondary-foreground">
              {initials}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{displayName}</span>
              <span className="truncate text-sm text-muted-foreground">{email}</span>
            </div>
          </div>
          {configured && user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:text-primary"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          )}
        </div>
      </InsightCard>

      <InsightCard icon={KeyRound} title="Devices & API keys">
        <p className="text-sm text-muted-foreground">
          Connect the browser extension and the desktop app (record any app&apos;s calls with one shortcut).
        </p>
        <Link href="/settings/extension-access" className="flex w-fit items-center gap-2 text-sm text-primary hover:underline">
          Manage keys and downloads <ArrowRight className="size-4" />
        </Link>
      </InsightCard>

      <WhatsAppCard />

      <InsightCard icon={Shield} title="Privacy">
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>• Audio is stored in a private bucket; playback links expire after an hour.</li>
          <li>• Delete any conversation from its page — the transcript, notes and audio are removed together.</li>
          <li>• Recordings are only sent to the transcription and AI providers you configure, never used to train our own models.</li>
          <li>• Always tell participants when you record. Many places require everyone&apos;s consent.</li>
        </ul>
      </InsightCard>
    </div>
  )
}
