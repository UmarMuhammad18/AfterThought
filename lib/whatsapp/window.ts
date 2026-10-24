import { supabaseAdmin } from "@/lib/supabase"
import type { WhatsAppAdapter } from "./types"

/**
 * Meta's customer-service window: free-form messages may only be sent within
 * 24 hours of the user's last message. Outside it, only pre-approved
 * templates are allowed (WHATSAPP_TEMPLATE_NAME, with one {{1}} body param).
 */

const WINDOW_MS = 24 * 60 * 60 * 1000
/** Leave a margin so a reply sent just before expiry isn't rejected. */
const SAFETY_MS = 5 * 60 * 1000

export function isInsideWindow(lastInboundAt: Date | null, now = new Date()): boolean {
  if (!lastInboundAt) return false
  return now.getTime() - lastInboundAt.getTime() < WINDOW_MS - SAFETY_MS
}

export async function recordInbound(phone: string, at = new Date()): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("whatsapp_contacts")
    .upsert(
      { phone: phone.replace(/\D/g, ""), last_inbound_at: at.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "phone" },
    )
  if (error) console.warn("[whatsapp/window] could not record inbound:", error.message)
}

async function lastInbound(phone: string): Promise<Date | null> {
  const { data } = await supabaseAdmin()
    .from("whatsapp_contacts")
    .select("last_inbound_at")
    .eq("phone", phone.replace(/\D/g, ""))
    .maybeSingle()
  return data?.last_inbound_at ? new Date(data.last_inbound_at) : null
}

/**
 * Send a reply, respecting the 24-hour window. Inside it: the full text.
 * Outside it: the approved template with a short notice (if configured),
 * otherwise nothing (Meta would reject the message anyway).
 */
export async function deliver(
  adapter: WhatsAppAdapter,
  to: string,
  text: string,
  templateNotice?: string,
): Promise<void> {
  // The mock adapter has no window; only enforce it against the real API.
  if (adapter.isMock || isInsideWindow(await lastInbound(to))) {
    await adapter.sendMessage({ to, type: "text", text })
    return
  }

  const template = process.env.WHATSAPP_TEMPLATE_NAME
  if (!template) {
    console.warn(`[whatsapp] 24h window closed for ${to} and no WHATSAPP_TEMPLATE_NAME set; reply not sent.`)
    return
  }
  await adapter.sendMessage({
    to,
    type: "template",
    template: {
      name: template,
      language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
      bodyParams: [templateNotice ?? text.slice(0, 900)],
    },
  })
}
