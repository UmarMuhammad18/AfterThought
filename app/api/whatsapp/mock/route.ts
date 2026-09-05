import { NextResponse } from "next/server"
import { setWhatsAppAdapter } from "@/lib/whatsapp/adapter"
import { MockWhatsAppAdapter } from "@/lib/whatsapp/mock-adapter"
import { handleIncomingWhatsAppMessage } from "@/lib/whatsapp/message-handler"
import type { IncomingMessage } from "@/lib/whatsapp/types"

/**
 * Local test endpoint.
 * POST a fake WhatsApp event and the full pipeline runs against the mock adapter.
 *
 * Example:
 * curl -X POST http://localhost:3000/api/whatsapp/mock \
 *   -H "Content-Type: application/json" \
 *   -d '{"from":"15551234567","type":"text","text":"Help"}'
 */
export async function POST(req: Request) {
  try {
    // Always use the mock while we do not have Cloud API credentials
    setWhatsAppAdapter(new MockWhatsAppAdapter())

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
      callId: body.callId,
    }

    await handleIncomingWhatsAppMessage(msg)

    return NextResponse.json({
      ok: true,
      message: "Processed. Check server logs for the mock outgoing reply.",
    })
  } catch (err) {
    console.error("[WhatsApp mock] error:", err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    )
  }
}
