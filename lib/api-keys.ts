import { createHash, randomBytes } from "crypto"
import type { User } from "@supabase/supabase-js"
import { supabaseAdmin } from "./supabase"

/**
 * Long-lived API keys for the extension, desktop app, and other clients.
 * Keys look like `at_<40 hex chars>`; only a SHA-256 hash is stored.
 */

export const API_KEY_PREFIX = "at_"

export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX)
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(20).toString("hex")
}

export type ApiKeyRow = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/** Create a key for a user. Returns the raw key, which is shown only once. */
export async function createApiKey(
  userId: string,
  name: string,
): Promise<{ key: string; row: ApiKeyRow }> {
  const key = generateApiKey()
  const { data, error } = await supabaseAdmin()
    .from("api_keys")
    .insert({
      user_id: userId,
      name: name.slice(0, 80) || "API key",
      prefix: key.slice(0, 10),
      key_hash: hashApiKey(key),
    })
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Could not create API key")
  return { key, row: data as ApiKeyRow }
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ApiKeyRow[]
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
  return !error
}

/** Resolve an API key to its user, or null if unknown / revoked. */
export async function getUserFromApiKey(key: string): Promise<User | null> {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", hashApiKey(key))
    .is("revoked_at", null)
    .maybeSingle()
  if (error || !data) return null

  // Best effort; never block auth on bookkeeping.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined)

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id)
  if (userError || !userData?.user) return null
  return userData.user
}
