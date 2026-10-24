import { NextResponse, after } from "next/server"
import { parseWebhookPayload, verifySignature } from "@/lib/whatsapp/webhook"
import { handleIncomingWhatsAppMessage } from "@/lib/whatsapp/message-handler"
import { recordInbound } from "@/lib/whatsapp/window"
import { handleCallEvent } from "@/lib/whatsapp/calls"

export const maxDuration = 300

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * Env: WHATSAPP_VERIFY_TOKEN (any string you also enter in Meta's dashboard),
 *      WHATSAPP_APP_SECRET (App settings → Basic → App secret).
 */

// GET: the subscription handshake.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === "subscribe" && challenge && expected && token === expected) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 403 })
}

// POST: messages and call events. Acknowledge immediately (Meta retries slow
// webhooks) and do the transcription / AI work in the background.
export async function POST(req: Request) {
  const raw = await req.text()

  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.error("[WhatsApp webhook] WHATSAPP_APP_SECRET is not set; rejecting unsigned payloads.")
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { messages, callEvents } = parseWebhookPayload(payload)

  // Call signalling is time-critical (the caller is ringing): handle it first.
  if (callEvents.length > 0) {
    after(async () => {
      for (const event of callEvents) {
        try {
          await handleCallEvent(event)
        } catch (err) {
          console.error("[WhatsApp webhook] call event failed:", event.kind, err)
        }
      }
    })
  }
  if (messages.length > 0) {
    after(async () => {
      for (const msg of messages) {
        await recordInbound(msg.from, new Date(msg.timestamp))
        await handleIncomingWhatsAppMessage(msg)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
