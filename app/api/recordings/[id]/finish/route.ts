import { NextResponse, after } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { finalizeRecording, getOwnedMeeting, registerSegment } from "@/lib/pipeline"

export const maxDuration = 300

// POST /api/recordings/:id/finish
// Optional body for direct file imports: { path, mimeType, size, durationSeconds }
// (the file was uploaded straight to Storage via /api/recordings/import).
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
    return NextResponse.json({ ok: false, error: "Recording not found" }, { status: 404 })
  }
  if (meeting.status === "processing") {
    return NextResponse.json({ ok: true, id, status: "processing" })
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  if (typeof body.path === "string") {
    // Only accept paths inside this user's folder for this meeting.
    if (!body.path.startsWith(`${user.id}/${id}/`)) {
      return NextResponse.json({ ok: false, error: "Invalid upload path" }, { status: 400 })
    }
    await registerSegment({
      meetingId: id,
      userId: user.id,
      seq: 0,
      storagePath: body.path,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "audio/mpeg",
      startSeconds: 0,
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : undefined,
      sizeBytes: typeof body.size === "number" ? body.size : undefined,
    })
  }

  const { count } = await supabaseAdmin()
    .from("recording_segments")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", id)
  if (!count) {
    await supabaseAdmin()
      .from("meetings")
      .update({ status: "failed", error: "No audio was recorded." })
      .eq("id", id)
    return NextResponse.json({ ok: false, error: "No audio was recorded." }, { status: 400 })
  }

  await supabaseAdmin().from("meetings").update({ status: "processing" }).eq("id", id)
  after(() => finalizeRecording(id))

  return NextResponse.json({ ok: true, id, status: "processing" })
}
