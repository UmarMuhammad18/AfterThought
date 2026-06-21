import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Whether the public Supabase environment variables are configured.
 * When false, the app runs in a degraded "demo" mode without auth so that
 * local development and builds still succeed.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let browserClient: SupabaseClient | null = null

/**
 * Browser-side Supabase client using the public anon key.
 * Sessions are persisted client-side (localStorage) by default, which keeps
 * the user signed in across reloads.
 *
 * Returns null when Supabase is not configured so callers can degrade
 * gracefully instead of throwing at module load.
 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!browserClient) {
    browserClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return browserClient
}
