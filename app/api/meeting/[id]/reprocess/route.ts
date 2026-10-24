import { NextResponse, after } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { finalizeRecording, getOwnedMeeting } from "@/lib/pipeline"

export const maxDuration = 300

// POST /api/meeting/[id]/reprocess
// Body (optional): { kind?: "meeting" | "interview", interview?: {...} }
// Re-runs transcription of failed segments, analysis, and scorecards — e.g.
// after a failure, or after turning a call into an interview with a rubric.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const meeting = await getOwnedMeeting(id, user.id)
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 })
  }
  if (meeting.status === "processing" || meeting.status === "recording") {
    return NextResponse.json({ ok: false, error: `Meeting is still ${meeting.status}` }, { status: 409 })
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, any>
  const update: Record<string, unknown> = { status: "processing", error: null }
  if (body.kind === "interview" || body.kind === "meeting") update.kind = body.kind
  if (body.interview && typeof body.interview === "object") {
    const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined)
    update.interview = {
      candidate: str(body.interview.candidate),
      role: str(body.interview.role),
      rubric: str(body.interview.rubric, 8000),
    }
  }
  await supabaseAdmin().from("meetings").update(update).eq("id", id)

  after(() => finalizeRecording(id))
  return NextResponse.json({ ok: true, status: "processing" })
}
