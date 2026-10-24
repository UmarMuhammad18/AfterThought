'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Puzzle, Copy, Check, KeyRound, ShieldCheck, Trash2, Monitor, Plus } from 'lucide-react'
import { InsightCard } from '@/components/insight-card'
import { useAuth } from '@/components/auth-provider'
import { authFetch } from '@/lib/api-client'

type ApiKeyRow = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
}

export default function ExtensionAccessPage() {
  const { configured, user } = useAuth()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [name, setName] = useState('Browser extension')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/keys')
      const data = await res.json()
      if (data.ok) setKeys(data.keys)
      else setError(data.error || 'Could not load keys')
    } catch {
      setError('Could not load keys')
    }
  }, [])

  useEffect(() => {
    if (configured && user) load()
  }, [configured, user, load])

  async function create() {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setNewKey(data.key)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create key')
    } finally {
      setLoading(false)
    }
  }

  async function revoke(id: string) {
    await authFetch(`/api/keys/${id}`, { method: 'DELETE' })
    await load()
  }

  async function copy() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Clipboard unavailable — select the key and copy it manually.')
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to settings
        </Link>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Devices &amp; API keys
        </h1>
        <p className="text-muted-foreground">
          Connect the browser extension, the desktop app, or your own tools to your account.
          Keys don&apos;t expire until you revoke them.
        </p>
      </div>

      <InsightCard icon={KeyRound} title="Create a key">
        {!configured || !user ? (
          <p className="rounded-xl border border-glass-border bg-secondary p-4 text-sm text-muted-foreground">
            Sign in to create API keys.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name, e.g. Work laptop"
                className="flex-1 rounded-xl border border-glass-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={create}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="size-4" />
                {loading ? 'Creating…' : 'Create key'}
              </button>
            </div>

            {newKey && (
              <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
                <p className="text-sm text-foreground">
                  Copy this key now — it won&apos;t be shown again.
                </p>
                <code className="block break-all rounded-lg bg-secondary p-3 text-xs text-foreground">
                  {newKey}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="flex w-fit items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground hover:text-primary"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy key'}
                </button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {keys.length > 0 && (
              <ul className="flex flex-col divide-y divide-glass-border rounded-xl border border-glass-border">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {k.prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                        {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(k.id)}
                      aria-label={`Revoke ${k.name}`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </InsightCard>

      <InsightCard icon={Puzzle} title="Browser extension (Chrome, Edge, Brave, Arc)">
        <Steps
          steps={[
            'Create a key above and copy it.',
            'Open the AfterThought extension popup and paste the key and this site’s address.',
            'Open your call tab (Meet, Zoom web, Teams web, WhatsApp Web, …) and press “Record this tab”.',
            'Both sides of the call are captured: the tab audio and your microphone.',
          ]}
        />
      </InsightCard>

      <InsightCard icon={Monitor} title="Desktop app (Windows, macOS, Linux)">
        <Steps
          steps={[
            'Create a key named after the computer.',
            'Open the desktop app, paste the key and this site’s address.',
            'Press Ctrl/Cmd + Shift + R anywhere to record system audio + mic from any app — WhatsApp, Zoom, Teams, Discord, Slack, FaceTime, phone links.',
          ]}
        />
      </InsightCard>

      <InsightCard icon={ShieldCheck} title="Security">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Only a hash of each key is stored. Revoke a key here if a device is lost; it stops
          working immediately.
        </p>
      </InsightCard>
    </div>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-glass-border bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  )
}
