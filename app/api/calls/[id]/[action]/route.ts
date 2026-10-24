import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { acceptCall, attachMeeting, rejectCall, terminateCall } from "@/lib/whatsapp/calls"
import { callErrorResponse } from "@/lib/whatsapp/call-responses"

// POST /api/calls/:id/accept    { sdp }        answer an incoming call
// POST /api/calls/:id/reject
// POST /api/calls/:id/terminate                hang up
// POST /api/calls/:id/meeting   { meetingId }  link the browser's recording
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const { id, action } = await params
  const callId = decodeURIComponent(id)
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  try {
    switch (action) {
      case "accept":
        if (typeof body.sdp !== "string") {
          return NextResponse.json({ ok: false, error: "sdp is required" }, { status: 400 })
        }
        await acceptCall(callId, user.id, body.sdp)
        break
      case "reject":
        await rejectCall(callId, user.id)
        break
      case "terminate":
        await terminateCall(callId, user.id)
        break
      case "meeting":
        if (typeof body.meetingId !== "string") {
          return NextResponse.json({ ok: false, error: "meetingId is required" }, { status: 400 })
        }
        await attachMeeting(callId, user.id, body.meetingId)
        break
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return callErrorResponse(err)
  }
}
