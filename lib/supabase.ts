import { createClient } from "@supabase/supabase-js"

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
