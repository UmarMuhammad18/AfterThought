import type { User } from "@supabase/supabase-js"

/**
 * Temporary "demo login mode".
 *
 * This entire module is gated behind the DEMO_LOGIN_ENABLED flag and must
 * NEVER affect production users. When the flag is off, every helper here is
 * inert: isDemoLoginEnabled() returns false and no demo token is ever accepted.
 *
 * Flag resolution:
 * - Server (API routes): reads DEMO_LOGIN_ENABLED.
 * - Client (login page, auth provider): only NEXT_PUBLIC_* vars are inlined
 *   into the browser bundle, so we also check NEXT_PUBLIC_DEMO_LOGIN_ENABLED.
 *
 * Set BOTH to "true" to fully enable demo mode across server and client.
 */

/** Hardcoded bearer token the extension/app sends in demo mode. */
export const DEMO_TOKEN = "DEMO_TOKEN"

/** Stable identity used for all demo data ownership. */
export const DEMO_USER_ID = "demo-user-123"
export const DEMO_USER_EMAIL = "demo@afterthought.dev"

/** Prefilled demo credentials shown on the login page. */
export const DEMO_PASSWORD = "demo1234"

/** localStorage key marking an active client-side demo session. */
export const DEMO_SESSION_KEY = "afterthought_demo_session"

/** True only when demo login is explicitly enabled via env flag. */
export function isDemoLoginEnabled(): boolean {
  return (
    process.env.DEMO_LOGIN_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true"
  )
}

/**
 * A minimal object shaped like a Supabase User, used to represent the demo
 * account on both the client and server. Cast because we intentionally omit
 * fields that the app never reads for the demo user.
 */
export function getDemoUser(): User {
  return {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "demo" },
    user_metadata: { full_name: "Demo User" },
    created_at: new Date(0).toISOString(),
  } as unknown as User
}
