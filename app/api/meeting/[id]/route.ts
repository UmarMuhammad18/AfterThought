import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"
import { answerQuestion, isAiConfigured, GeminiServiceError } from "./ai"

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
