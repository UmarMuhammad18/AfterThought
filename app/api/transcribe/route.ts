import { NextResponse, after } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { createRecording, finalizeRecording, storeSegment } from "@/lib/pipeline"

export const maxDuration = 300

// POST /api/transcribe — one-shot upload of a short, complete recording.
// Kept for older clients; new clients use /api/recordings (segmented upload),
// which has no length limit. Returns immediately; processing runs in the
// background and the meeting page shows progress.
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const audio = Buffer.from(await req.arrayBuffer())
    if (audio.length === 0) {
      return NextResponse.json({ ok: false, error: "No audio received" }, { status: 400 })
    }

    const mimeType = (req.headers.get("content-type") || "audio/webm").split(";")[0]
    const id = await createRecording({ userId: user.id, source: "extension" })
    await storeSegment({ meetingId: id, userId: user.id, seq: 0, audio, mimeType, startSeconds: 0 })

    after(() => finalizeRecording(id))

    return NextResponse.json({ ok: true, id, status: "processing" })
  } catch (err) {
    console.error("Transcribe API error:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
