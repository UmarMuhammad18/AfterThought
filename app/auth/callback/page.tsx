'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = supabaseBrowser()
    if (!supabase) {
      router.replace('/sign-in')
      return
    }

    // detectSessionInUrl handles the magic-link / OAuth hash automatically.
    // Wait for the session to be established, then redirect home.
    let cancelled = false

    async function finish() {
      const { data } = await supabase!.auth.getSession()
      if (cancelled) return
      if (data.session) {
        router.replace('/dashboard')
      } else {
        // Give the URL detection a brief moment, then re-check.
        setTimeout(async () => {
          const { data: retry } = await supabase!.auth.getSession()
          if (cancelled) return
          if (retry.session) router.replace('/dashboard')
          else {
            setError('Could not complete sign-in. The link may have expired.')
            setTimeout(() => router.replace('/sign-in'), 2500)
          }
        }, 1200)
      }
    }

    finish()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="flex h-[60svh] flex-col items-center justify-center gap-4 text-center">
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        </>
      )}
    </div>
  )
}
