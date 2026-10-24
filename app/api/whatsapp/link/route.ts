import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { createLinkCode, listLinkedPhones, unlinkPhone } from "@/lib/whatsapp/users"

function botNumber(): string | null {
  return process.env.WHATSAPP_DISPLAY_NUMBER?.replace(/\D/g, "") || null
}

// GET /api/whatsapp/link -> linked phones + the bot's number
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ ok: true, phones: await listLinkedPhones(user.id), botNumber: botNumber() })
}

// POST /api/whatsapp/link -> a one-time code to send to the bot
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const { code, expiresAt } = await createLinkCode(user.id)
    const number = botNumber()
    return NextResponse.json({
      ok: true,
      code,
      expiresAt,
      botNumber: number,
      waLink: number ? `https://wa.me/${number}?text=${encodeURIComponent(`link ${code}`)}` : null,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}

// DELETE /api/whatsapp/link { phone } -> unlink a number
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const body = ((await req.json().catch(() => ({}))) ?? {}) as { phone?: unknown }
  if (typeof body.phone !== "string") {
    return NextResponse.json({ ok: false, error: "phone is required" }, { status: 400 })
  }
  return NextResponse.json({ ok: await unlinkPhone(user.id, body.phone) })
}
