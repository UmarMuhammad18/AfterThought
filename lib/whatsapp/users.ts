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
