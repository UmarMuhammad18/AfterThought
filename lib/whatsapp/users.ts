import { supabaseAdmin } from "@/lib/supabase"

/**
 * Maps a WhatsApp phone number to an AfterThought user_id.
 *
 * Table: whatsapp_links (phone text PK, user_id uuid, created_at)
 * Run the SQL in supabase/whatsapp.sql to create it.
 */

export type WhatsAppLink = {
  phone: string
  user_id: string
  created_at?: string
}

/** Normalize to digits only (E.164 without +). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

/** Look up the linked AfterThought user for a WhatsApp phone. */
export async function getUserIdForPhone(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone)
  if (!normalized) return null

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from("whatsapp_links")
      .select("user_id")
      .eq("phone", normalized)
      .maybeSingle()

    if (error) {
      // Table may not exist yet — treat as unlinked
      console.warn("[whatsapp/users] lookup failed:", error.message)
      return null
    }
    return data?.user_id ?? null
  } catch (err) {
    console.warn("[whatsapp/users] lookup error:", err)
    return null
  }
}

/** Link a phone number to a user (upsert). */
export async function linkPhoneToUser(
  phone: string,
  userId: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone)
  if (!normalized || !userId) return false

  try {
    const supabase = supabaseAdmin()
    const { error } = await supabase.from("whatsapp_links").upsert(
      {
        phone: normalized,
        user_id: userId,
      },
      { onConflict: "phone" },
    )
    if (error) {
      console.error("[whatsapp/users] link failed:", error.message)
      return false
    }
    return true
  } catch (err) {
    console.error("[whatsapp/users] link error:", err)
    return false
  }
}

/** Phones linked to a user (for the settings page). */
export async function listLinkedPhones(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("whatsapp_links")
    .select("phone")
    .eq("user_id", userId)
  return (data ?? []).map((r) => r.phone)
}

export async function unlinkPhone(userId: string, phone: string): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from("whatsapp_links")
    .delete()
    .eq("user_id", userId)
    .eq("phone", normalizePhone(phone))
  return !error
}

const LINK_CODE_TTL_MS = 15 * 60 * 1000

/**
 * Start linking: the signed-in user gets a 6-digit code and sends
 * "link <code>" to the bot from their phone. Proving control of the number
 * this way needs no outbound OTP template.
 */
export async function createLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  const supabase = supabaseAdmin()
  await supabase.from("whatsapp_link_codes").delete().eq("user_id", userId)

  const { randomInt } = await import("crypto")
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString()
    const { error } = await supabase
      .from("whatsapp_link_codes")
      .insert({ code, user_id: userId, expires_at: expiresAt })
    if (!error) return { code, expiresAt }
  }
  throw new Error("Could not create a link code, please try again.")
}

/**
 * Finish linking from WhatsApp. Also claims any meetings this number sent
 * before it was linked.
 */
export async function consumeLinkCode(code: string, phone: string): Promise<boolean> {
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from("whatsapp_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", code)
    .maybeSingle()
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return false

  await supabase.from("whatsapp_link_codes").delete().eq("code", code)
  const ok = await linkPhoneToUser(phone, data.user_id)
  if (ok) {
    const { data: claimed } = await supabase
      .from("meetings")
      .update({ user_id: data.user_id })
      .eq("whatsapp_phone", normalizePhone(phone))
      .is("user_id", null)
      .select("id")
    const ids = (claimed ?? []).map((m) => m.id)
    if (ids.length > 0) {
      // Audio playback and semantic search are scoped by these rows' owner too.
      await supabase.from("recording_segments").update({ user_id: data.user_id }).in("meeting_id", ids)
      await supabase.from("transcript_chunks").update({ user_id: data.user_id }).in("meeting_id", ids)
    }
  }
  return ok
}
