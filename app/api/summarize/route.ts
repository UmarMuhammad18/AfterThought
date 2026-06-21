import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import {
  analyzeTranscript,
  answerQuestion,
  isAiConfigured,
  GeminiServiceError,
} from "./ai/gemini-service"

// POST /api/summarize
//   { transcript }            -> structured MeetingAnalysis
//   { transcript, question }  -> transcript Q&A answer
// Wires the extracted AI pipeline (ported from Althair/afterthought-ai).
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI is not configured. Set OPENROUTER_API_KEY to enable summarization." },
      { status: 503 }
    )
  }

  let body: { transcript?: unknown; question?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : ""
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "A non-empty transcript is required." },
      { status: 400 }
    )
  }

  const question = typeof body.question === "string" ? body.question.trim() : ""

  try {
    if (question) {
      const answer = await answerQuestion(transcript, question)
      return NextResponse.json({ ok: true, answer })
    }

    const analysis = await analyzeTranscript(transcript)
    return NextResponse.json({ ok: true, analysis })
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 })
    }
    console.error("[v0] summarize API error:", err)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
