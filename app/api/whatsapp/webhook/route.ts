import { NextResponse } from "next/server"

/**
 * Placeholder for the real Meta Cloud API webhook.
 * When you have credentials you will:
 * 1. Verify the hub.challenge on GET
 * 2. Parse the incoming messages / calls payload on POST
 * 3. Map them to IncomingMessage and call handleIncomingWhatsAppMessage
 *
 * For now this just returns 200 so the route exists.
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  // Later: compare token with process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === "subscribe" && challenge) {
    console.log("[WhatsApp webhook] verification challenge received")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ ok: true, message: "Webhook ready (Cloud API not connected yet)" })
}

export async function POST(req: Request) {
  // Later: parse the real Cloud API payload here
  const body = await req.json().catch(() => null)
  console.log("[WhatsApp webhook] POST received (ignored until Cloud API is wired)", body)

  return NextResponse.json({ ok: true })
}
