'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Puzzle, Copy, Check, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react'
import { InsightCard } from '@/components/insight-card'
import { useAuth } from '@/components/auth-provider'

export default function ExtensionAccessPage() {
  const { getAccessToken, configured, user } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reveal() {
    setLoading(true)
    setError(null)
    try {
      const t = await getAccessToken()
      if (!t) {
        setError('No active session token found. Try signing out and back in.')
        return
      }
      setToken(t)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    const t = token ?? (await getAccessToken())
    if (!t) {
      setError('No active session token found. Try signing out and back in.')
      return
    }
    setToken(t)
    try {
      await navigator.clipboard.writeText(t)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Clipboard unavailable — select the token above and copy it manually.')
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
          Extension access
        </h1>
        <p className="text-muted-foreground">
          Connect the AfterThought browser extension to your account using a secure access token.
        </p>
      </div>

      <InsightCard icon={KeyRound} title="Your access token">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This token is your Supabase session JWT. The browser extension attaches it to every
            upload as an{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
              Authorization: Bearer
            </code>{' '}
            header so recordings are saved to your account. Keep it private — anyone with this token
            can upload on your behalf.
          </p>

          {!configured || !user ? (
            <p className="rounded-xl border border-glass-border bg-secondary p-4 text-sm text-muted-foreground">
              Sign in with Supabase configured to generate an access token.
            </p>
          ) : (
            <>
              {token && (
                <code className="block max-h-32 overflow-auto rounded-xl border border-glass-border bg-secondary p-3 text-xs leading-relaxed break-all text-foreground scroll-slim">
                  {token}
                </code>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={reveal}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-4 py-2.5 text-sm text-foreground transition-colors hover:text-primary disabled:opacity-60"
                >
                  <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading…' : token ? 'Refresh token' : 'Reveal token'}
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy token'}
                </button>
              </div>
            </>
          )}
        </div>
      </InsightCard>

      <InsightCard icon={Puzzle} title="How to connect the extension">
        <ol className="flex flex-col gap-3">
          {[
            'Copy your access token using the button above.',
            'Open the AfterThought extension popup from your browser toolbar.',
            'Paste the token into the “Access token” field and click “Save token”.',
            'Press “Start recording” — uploads will now be linked to your account.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-glass-border bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </InsightCard>

      <InsightCard icon={ShieldCheck} title="Security">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tokens expire automatically with your session. If uploads start failing with an
          authorization error, return here, refresh the token, and save it again in the extension.
        </p>
      </InsightCard>
    </div>
  )
}
