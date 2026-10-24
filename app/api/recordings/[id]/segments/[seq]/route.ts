import { NextResponse, after } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { getOwnedMeeting, storeSegment, transcribeSegment } from "@/lib/pipeline"

export const maxDuration = 300

/**
 * Hosting platforms cap request bodies (4.5 MB on Vercel), so clients rotate
 * segments every couple of minutes. Each segment must be a complete,
 * independently playable audio file.
 */
const MAX_SEGMENT_BYTES = 4 * 1024 * 1024

// PUT /api/recordings/:id/segments/:seq
// Body: raw audio. Headers: Content-Type, X-Start-Seconds, X-Duration-Seconds.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; seq: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id, seq: seqParam } = await params
  const seq = Number(seqParam)
  if (!Number.isInteger(seq) || seq < 0 || seq > 100_000) {
    return NextResponse.json({ ok: false, error: "Invalid segment number" }, { status: 400 })
  }

  const meeting = await getOwnedMeeting(id, user.id)
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Recording not found" }, { status: 404 })
  }
  if (meeting.status !== "recording") {
    return NextResponse.json({ ok: false, error: "This recording is already finished" }, { status: 409 })
  }

  const audio = Buffer.from(await req.arrayBuffer())
  if (audio.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty segment" }, { status: 400 })
  }
  if (audio.length > MAX_SEGMENT_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Segment too large — record shorter segments." },
      { status: 413 },
    )
  }

  const num = (v: string | null) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }
  const mimeType = (req.headers.get("content-type") || "audio/webm").split(";")[0]

  try {
    await storeSegment({
      meetingId: id,
      userId: user.id,
      seq,
      audio,
      mimeType,
      startSeconds: num(req.headers.get("x-start-seconds")) ?? 0,
      durationSeconds: num(req.headers.get("x-duration-seconds")),
    })
  } catch (err) {
    console.error("[recordings] segment upload failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    )
  }

  // Transcribe in the background so the transcript builds up while recording.
  after(() => transcribeSegment(id, seq))

  return NextResponse.json({ ok: true, seq })
}
