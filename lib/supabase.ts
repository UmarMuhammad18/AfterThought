import { createClient, type User } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server-side Supabase client using the service-role key.
 * Use this in API routes only — never expose the service key to the browser.
 */
export function supabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Validate a Supabase access token and return the associated user, or null.
 * Never throws — returns null if Supabase is unconfigured or the token is invalid.
 */
export async function getUserFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token) return null
  try {
    const { data, error } = await supabaseAdmin().auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch (err) {
    console.error("Failed to validate Supabase token:", err)
    return null
  }
}

/**
 * Extract and validate the bearer token from an incoming request's
 * Authorization header. Returns the authenticated user or null.
 */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  return getUserFromToken(token)
}
