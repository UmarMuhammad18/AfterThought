import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import type { TranscriptSegment } from "@/lib/transcription"

// GET /api/recordings/:id -> status plus the transcript so far.
// Recorders poll this to show a near-live transcript while recording.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, status, error")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Recording not found" }, { status: 404 })
  }

  const { data: rows } = await supabase
    .from("recording_segments")
    .select("seq, status, transcript")
    .eq("meeting_id", id)
    .order("seq")

  const segments = (rows ?? []) as { seq: number; status: string; transcript: TranscriptSegment[] | null }[]

  return NextResponse.json({
    ok: true,
    ...meeting,
    segmentsUploaded: segments.length,
    segmentsTranscribed: segments.filter((s) => s.status === "transcribed").length,
    transcript: segments.flatMap((s) => s.transcript ?? []),
  })
}
