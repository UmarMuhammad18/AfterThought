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

type AuthResult = { error: string | null }

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when Supabase env vars are present and auth is active. */
  configured: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Returns the current access token, or null. */
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  const signOut = useCallback(async () => {
    const supabase = supabaseBrowser()
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = supabaseBrowser()
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signInWithMagicLink,
      signOut,
      getAccessToken,
    }),
    [user, session, loading, signIn, signUp, signInWithMagicLink, signOut, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
