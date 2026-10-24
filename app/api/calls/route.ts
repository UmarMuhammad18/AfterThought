import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { startCall } from "@/lib/whatsapp/calls"
import { isCloudApiConfigured } from "@/lib/whatsapp/cloud-adapter"
import { callErrorResponse, iceServers } from "@/lib/whatsapp/call-responses"

// GET /api/calls -> live and recent WhatsApp calls for the signed-in user.
// The interview console polls this to ring the browser and pick up answers.
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from("whatsapp_calls")
    .select("id, invite_id, direction, peer_phone, peer_name, status, offer_sdp, answer_sdp, meeting_id, error, duration_seconds, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    enabled: isCloudApiConfigured(),
    iceServers: iceServers(),
    calls: data ?? [],
  })
}

// POST /api/calls { to, sdp, inviteId?, peerName? } -> call a WhatsApp user
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  if (typeof body.to !== "string" || typeof body.sdp !== "string") {
    return NextResponse.json({ ok: false, error: "to and sdp are required" }, { status: 400 })
  }
  try {
    const id = await startCall({
      userId: user.id,
      to: body.to,
      offerSdp: body.sdp,
      inviteId: typeof body.inviteId === "string" ? body.inviteId : null,
      peerName: typeof body.peerName === "string" ? body.peerName : null,
    })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return callErrorResponse(err)
  }
}
