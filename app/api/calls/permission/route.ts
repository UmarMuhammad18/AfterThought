import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { hasCallPermission, requestCallPermission } from "@/lib/whatsapp/calls"
import { callErrorResponse } from "@/lib/whatsapp/call-responses"

// GET /api/calls/permission?phone=... -> can we call this number?
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const phone = new URL(req.url).searchParams.get("phone") ?? ""
  return NextResponse.json({ ok: true, granted: phone ? await hasCallPermission(phone) : false })
}

// POST /api/calls/permission { phone, reason? } -> send a call permission request
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  if (typeof body.phone !== "string") {
    return NextResponse.json({ ok: false, error: "phone is required" }, { status: 400 })
  }
  try {
    const reason = typeof body.reason === "string" ? body.reason : "We would like to call you about your interview."
    await requestCallPermission(body.phone, reason)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return callErrorResponse(err)
  }
}
