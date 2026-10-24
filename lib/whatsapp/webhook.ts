import { createHmac, timingSafeEqual } from "crypto"
import type { IncomingMessage } from "./types"

/**
 * Verify Meta's X-Hub-Signature-256 header: an HMAC-SHA256 of the raw
 * request body, keyed with the app secret.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")
  const given = header.slice("sha256=".length)
  if (given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"))
}

type CloudMessage = {
  id: string
  from: string
  timestamp?: string
  type: string
  text?: { body?: string }
  audio?: { id: string; mime_type?: string; voice?: boolean }
  video?: { id: string; mime_type?: string }
  document?: { id: string; mime_type?: string; filename?: string }
  button?: { text?: string }
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
}

type CloudCall = {
  id?: string
  from?: string
  to?: string
  event?: string
  status?: string
  timestamp?: string
  recording?: { id?: string; mime_type?: string }
}

type CloudChange = {
  field?: string
  value?: {
    contacts?: { wa_id?: string; profile?: { name?: string } }[]
    messages?: CloudMessage[]
    calls?: CloudCall[]
  }
}

type CloudPayload = { object?: string; entry?: { changes?: CloudChange[] }[] }

function isTranscribable(mime?: string) {
  return !!mime && /^(audio|video)\//.test(mime)
}

/**
 * Convert a Cloud API webhook payload into our IncomingMessage shape.
 * Delivery/read receipts and unsupported types are ignored.
 */
export function parseWebhookPayload(payload: unknown): IncomingMessage[] {
  const body = payload as CloudPayload
  if (body?.object !== "whatsapp_business_account") return []
  const out: IncomingMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {}
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]))

      for (const m of value.messages ?? []) {
        const base = {
          id: m.id,
          from: m.from,
          timestamp: m.timestamp ? Number(m.timestamp) * 1000 : Date.now(),
          profileName: names.get(m.from) ?? undefined,
        }
        if (m.type === "text" && m.text?.body) {
          out.push({ ...base, type: "text", text: m.text.body })
        } else if (m.type === "button" && m.button?.text) {
          out.push({ ...base, type: "text", text: m.button.text })
        } else if (m.type === "interactive") {
          const t = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
          if (t) out.push({ ...base, type: "text", text: t })
        } else if (m.type === "audio" && m.audio) {
          out.push({
            ...base,
            type: m.audio.voice ? "voice" : "audio",
            mediaId: m.audio.id,
            mediaMimeType: m.audio.mime_type,
          })
        } else if (m.type === "video" && m.video) {
          out.push({ ...base, type: "audio", mediaId: m.video.id, mediaMimeType: m.video.mime_type })
        } else if (m.type === "document" && m.document && isTranscribable(m.document.mime_type)) {
          // Call recordings forwarded from a phone's recorder usually arrive as documents.
          out.push({
            ...base,
            type: "call_recording",
            mediaId: m.document.id,
            mediaMimeType: m.document.mime_type,
            filename: m.document.filename,
          })
        }
      }

      // WhatsApp Business Calling API: a recorded call delivers a media id
      // once it ends. Field names follow Meta's call-recording docs; verify
      // against the current webhook reference when enabling calling.
      if (change.field === "calls") {
        for (const c of value.calls ?? []) {
          if (!c.recording?.id || !c.from) continue
          out.push({
            id: c.id ?? c.recording.id,
            from: c.from,
            timestamp: c.timestamp ? Number(c.timestamp) * 1000 : Date.now(),
            type: "call_recording",
            mediaId: c.recording.id,
            mediaMimeType: c.recording.mime_type,
            callId: c.id,
          })
        }
      }
    }
  }
  return out
}
