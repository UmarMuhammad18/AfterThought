import { supabaseBrowser } from "@/lib/supabase-browser"

/**
 * fetch wrapper that automatically attaches the current Supabase access token
 * as a Bearer Authorization header so API routes can enforce ownership.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)

  const supabase = supabaseBrowser()
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(input, { ...init, headers })
}
