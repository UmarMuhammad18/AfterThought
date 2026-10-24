import { NextResponse } from "next/server"
import { MockWhatsAppAdapter } from "@/lib/whatsapp/mock-adapter"
import { handleIncomingWhatsAppMessage } from "@/lib/whatsapp/message-handler"
import type { IncomingMessage } from "@/lib/whatsapp/types"

export const maxDuration = 300

/**
 * Local test endpoint (disabled in production unless WHATSAPP_MOCK_ENABLED=true).
 * POST a fake WhatsApp event and the full pipeline runs against the mock adapter.
 *
 * Example:
 * curl -X POST http://localhost:3000/api/whatsapp/mock \
 *   -H "Content-Type: application/json" \
 *   -d '{"from":"15551234567","type":"text","text":"Help"}'
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && process.env.WHATSAPP_MOCK_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }

  try {
    const body = await req.json()

    const msg: IncomingMessage = {
      id: body.id || crypto.randomUUID(),
      from: body.from || "15550000000",
      timestamp: body.timestamp || Date.now(),
      type: body.type || "text",
      text: body.text,
      mediaId: body.mediaId,
      mediaUrl: body.mediaUrl,
      mediaMimeType: body.mediaMimeType,
      filename: body.filename,
      callId: body.callId,
    }

    await handleIncomingWhatsAppMessage(msg, new MockWhatsAppAdapter())

    return NextResponse.json({
      ok: true,
      message: "Processed. Check server logs for the mock outgoing reply.",
    })
  } catch (err) {
    console.error("[WhatsApp mock] error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
