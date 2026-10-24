import { NextResponse, after } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"
import { answerQuestion, isAiConfigured, GeminiServiceError } from "./ai"
import { RECORDINGS_BUCKET } from "@/lib/pipeline"
import { indexMeetingChunks } from "@/lib/pipeline/indexing"
import type { TranscriptSegment } from "@/lib/transcription"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Meeting not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, ...data })
}

// POST /api/meeting/[id] -> ask a question about this meeting's transcript.
// Uses the extracted AI Q&A pipeline (ported from Althair/afterthought-ai).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI is not configured. Set OPENROUTER_API_KEY to enable Q&A." },
      { status: 503 }
    )
  }

  let body: { question?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question) {
    return NextResponse.json({ ok: false, error: "A question is required." }, { status: 400 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("segments")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 })
  }

  const segments = (data.segments ?? []) as { speaker?: string; text?: string }[]
  const transcript = segments
    .map((s) => `${s.speaker ?? "Speaker"}: ${s.text ?? ""}`)
    .join("\n")
    .trim()

  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "This meeting has no transcript to query." },
      { status: 400 }
    )
  }

  try {
    const answer = await answerQuestion(transcript, question)
    return NextResponse.json({ ok: true, answer })
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 })
    }
    console.error("[v0] meeting Q&A error:", err)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}

// PATCH /api/meeting/[id]
// Body: { title?, speakers?: { "Speaker 1": "Sara", ... } }
// Renaming speakers rewrites the transcript and re-indexes it for search.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as {
    title?: unknown
    speakers?: Record<string, unknown>
  }
  const { id } = await params
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("segments")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim().slice(0, 200)
  }

  let renamed: TranscriptSegment[] | null = null
  if (body.speakers && typeof body.speakers === "object") {
    const map = new Map(
      Object.entries(body.speakers)
        .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim() !== "")
        .map(([from, to]) => [from, to.trim().slice(0, 80)]),
    )
    renamed = ((data.segments ?? []) as TranscriptSegment[]).map((s) =>
      map.has(s.speaker) ? { ...s, speaker: map.get(s.speaker)! } : s,
    )
    update.segments = renamed
  }

  const { error: updateError } = await supabase.from("meetings").update(update).eq("id", id)
  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }

  if (renamed) {
    const segments = renamed
    after(() => indexMeetingChunks(id, user.id, segments))
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/meeting/[id] -> delete the meeting, its transcript, and its audio.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()

  const { data: segments } = await supabase
    .from("recording_segments")
    .select("storage_path")
    .eq("meeting_id", id)
    .eq("user_id", user.id)
  const paths = (segments ?? []).map((s) => s.storage_path)
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(RECORDINGS_BUCKET).remove(paths)
    if (storageError) console.error("[meeting] audio delete failed:", storageError.message)
  }

  const { error } = await supabase.from("meetings").delete().eq("id", id).eq("user_id", user.id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
