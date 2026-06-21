'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, Brain, FlaskConical } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { DEMO_PASSWORD, DEMO_USER_EMAIL } from '@/lib/demo'

export default function SignInPage() {
  const { signIn, signInWithMagicLink, signInDemo, demoEnabled, user, configured } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Demo login (dev only) — prefilled, self-contained credentials.
  const [demoEmail, setDemoEmail] = useState(DEMO_USER_EMAIL)
  const [demoPassword, setDemoPassword] = useState(DEMO_PASSWORD)
  const [demoSubmitting, setDemoSubmitting] = useState(false)

  async function handleDemoSignIn() {
    setError(null)
    setNotice(null)
    setDemoSubmitting(true)
    const { error } = await signInDemo()
    setDemoSubmitting(false)
    if (error) setError(error)
    else router.replace('/dashboard')
  }

  useEffect(() => {
    if (user) router.replace('/success')
  }, [user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)

    if (mode === 'magic') {
      const { error } = await signInWithMagicLink(email)
      setSubmitting(false)
      if (error) setError(error)
      else setNotice('Check your email for a magic sign-in link.')
      return
    }

    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error)
    else router.replace('/success')
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Link href="/" className="mx-auto flex items-center gap-2 text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Brain className="size-4" />
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">AfterThought</span>
      </Link>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-glass-border bg-primary/10 text-primary">
          <Brain className="size-6" />
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Welcome back to AfterThought
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your meeting memory.
        </p>
      </div>

      {!configured && (
        <div className="glass rounded-2xl border border-amber-500/30 p-4 text-sm text-muted-foreground">
          Supabase is not configured yet. Add your Supabase environment variables to enable
          authentication.
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass flex flex-col gap-4 rounded-2xl p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Email</span>
          <span className="flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3">
            <Mail className="size-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </span>
        </label>

        {mode === 'password' && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Password</span>
            <span className="flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3">
              <Lock className="size-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-primary">{notice}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {mode === 'magic' ? 'Send magic link' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'password' ? 'magic' : 'password'))
            setError(null)
            setNotice(null)
          }}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === 'password' ? 'Sign in with a magic link instead' : 'Use email and password instead'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <Link href="/sign-up" className="text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  )
}
