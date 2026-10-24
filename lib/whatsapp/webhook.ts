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
  interactive?: {
    type?: string
    button_reply?: { title?: string }
    list_reply?: { title?: string }
    call_permission_reply?: CallPermissionReply
  }
  call_permission_reply?: CallPermissionReply
}

type CallPermissionReply = {
  response?: string
  is_permanent?: boolean
  expiration_timestamp?: number | string
  response_source?: string
}

type CloudCall = {
  id?: string
  from?: string
  to?: string
  event?: string
  direction?: string
  status?: string
  timestamp?: string
  duration?: number | string
  session?: { sdp_type?: string; sdp?: string }
  call_recording?: { type?: string; audio?: { id?: string; mime_type?: string; url?: string; sha256?: string } }
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

/** Events from the WhatsApp Business Calling API and call permissions. */
export type CallEvent =
  | {
      kind: "connect"
      callId: string
      direction: "USER_INITIATED" | "BUSINESS_INITIATED"
      from?: string
      to?: string
      peerName?: string
      sdpType: "offer" | "answer"
      sdp: string
    }
  | { kind: "terminate"; callId: string; status: string; durationSeconds?: number }
  | { kind: "recording"; callId: string; from?: string; mediaId: string; mimeType?: string; url?: string; sha256?: string }
  | { kind: "permission"; phone: string; response: "accept" | "reject"; isPermanent: boolean; expiresAt?: number }

function isTranscribable(mime?: string) {
  return !!mime && /^(audio|video)\//.test(mime)
}

/**
 * Convert a Cloud API webhook payload into incoming messages and call events.
 * Delivery/read receipts and unsupported types are ignored.
 */
export function parseWebhookPayload(payload: unknown): { messages: IncomingMessage[]; callEvents: CallEvent[] } {
  const body = payload as CloudPayload
  const messages: IncomingMessage[] = []
  const callEvents: CallEvent[] = []
  if (body?.object !== "whatsapp_business_account") return { messages, callEvents }

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
        const permission = m.call_permission_reply ?? m.interactive?.call_permission_reply
        if (m.type === "call_permission_reply" || permission) {
          if (permission?.response === "accept" || permission?.response === "reject") {
            callEvents.push({
              kind: "permission",
              phone: m.from,
              response: permission.response,
              isPermanent: Boolean(permission.is_permanent),
              expiresAt: permission.expiration_timestamp ? Number(permission.expiration_timestamp) : undefined,
            })
          }
        } else if (m.type === "text" && m.text?.body) {
          messages.push({ ...base, type: "text", text: m.text.body })
        } else if (m.type === "button" && m.button?.text) {
          messages.push({ ...base, type: "text", text: m.button.text })
        } else if (m.type === "interactive") {
          const t = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
          if (t) messages.push({ ...base, type: "text", text: t })
        } else if (m.type === "audio" && m.audio) {
          messages.push({
            ...base,
            type: m.audio.voice ? "voice" : "audio",
            mediaId: m.audio.id,
            mediaMimeType: m.audio.mime_type,
          })
        } else if (m.type === "video" && m.video) {
          messages.push({ ...base, type: "audio", mediaId: m.video.id, mediaMimeType: m.video.mime_type })
        } else if (m.type === "document" && m.document && isTranscribable(m.document.mime_type)) {
          // Call recordings forwarded from a phone's recorder usually arrive as documents.
          messages.push({
            ...base,
            type: "call_recording",
            mediaId: m.document.id,
            mediaMimeType: m.document.mime_type,
            filename: m.document.filename,
          })
        }
      }

      if (change.field === "calls") {
        for (const c of value.calls ?? []) {
          if (!c.id) continue
          if (c.event === "connect" && c.session?.sdp) {
            callEvents.push({
              kind: "connect",
              callId: c.id,
              direction: c.direction === "BUSINESS_INITIATED" ? "BUSINESS_INITIATED" : "USER_INITIATED",
              from: c.from,
              to: c.to,
              peerName: c.from ? names.get(c.from) ?? undefined : undefined,
              sdpType: c.session.sdp_type === "answer" ? "answer" : "offer",
              sdp: c.session.sdp,
            })
          } else if (c.event === "terminate") {
            callEvents.push({
              kind: "terminate",
              callId: c.id,
              status: c.status ?? "COMPLETED",
              durationSeconds: c.duration != null ? Number(c.duration) : undefined,
            })
          } else if (c.event === "call_recording_available" && c.call_recording?.audio?.id) {
            const a = c.call_recording.audio
            callEvents.push({
              kind: "recording",
              callId: c.id,
              from: c.from,
              mediaId: a.id!,
              mimeType: a.mime_type,
              url: a.url,
              sha256: a.sha256,
            })
          }
        }
      }
    }
  }
  return { messages, callEvents }
}
