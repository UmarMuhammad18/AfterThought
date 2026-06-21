'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase-browser'
import {
  DEMO_SESSION_KEY,
  DEMO_TOKEN,
  getDemoUser,
  isDemoLoginEnabled,
} from '@/lib/demo'

type AuthResult = { error: string | null }

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when Supabase env vars are present and auth is active. */
  configured: boolean
  /** True when temporary demo login mode is enabled via env flag. */
  demoEnabled: boolean
  /** True when the current session is the temporary demo session. */
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  /** Start a temporary in-memory demo session (no Supabase call). */
  signInDemo: () => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Returns the current access token, or null. */
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    // Demo login mode: restore a previously started demo session first. This
    // works regardless of whether Supabase is configured, so the dashboard is
    // reachable even when real signup/login is failing.
    if (
      isDemoLoginEnabled() &&
      typeof window !== 'undefined' &&
      window.localStorage.getItem(DEMO_SESSION_KEY) === 'active'
    ) {
      setUser(getDemoUser())
      setIsDemo(true)
      setLoading(false)
      return
    }

    const supabase = supabaseBrowser()
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = supabaseBrowser()
    if (!supabase) return { error: 'Authentication is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = supabaseBrowser()
    if (!supabase) return { error: 'Authentication is not configured.' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const supabase = supabaseBrowser()
    if (!supabase) return { error: 'Authentication is not configured.' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signInDemo = useCallback(async (): Promise<AuthResult> => {
    if (!isDemoLoginEnabled()) return { error: 'Demo login is not enabled.' }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEMO_SESSION_KEY, 'active')
    }
    setUser(getDemoUser())
    setSession(null)
    setIsDemo(true)
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    // Always clear any demo session marker first.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DEMO_SESSION_KEY)
    }
    setIsDemo(false)

    const supabase = supabaseBrowser()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // In demo mode, hand back the hardcoded demo token the backend accepts.
    if (isDemo) return DEMO_TOKEN
    const supabase = supabaseBrowser()
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [isDemo])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,
      demoEnabled: isDemoLoginEnabled(),
      isDemo,
      signIn,
      signUp,
      signInWithMagicLink,
      signInDemo,
      signOut,
      getAccessToken,
    }),
    [
      user,
      session,
      loading,
      isDemo,
      signIn,
      signUp,
      signInWithMagicLink,
      signInDemo,
      signOut,
      getAccessToken,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
