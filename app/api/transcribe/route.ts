import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  const supabase = supabaseAdmin()

  try {
    const audio = await req.arrayBuffer()

    if (!audio) {
      return NextResponse.json(
        { ok: false, error: "No audio received" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()

    // Temporary fake transcript
    const segments = [
      { speaker: "Speaker 1", text: "Welcome to the meeting." },
      { speaker: "Speaker 2", text: "Let's begin with the agenda." },
      { speaker: "Speaker 1", text: "We need to finalize the project timeline." }
    ]

    const summary = "This is a placeholder summary generated for the meeting."

    const actionItems = [
      "Follow up with the client",
      "Prepare the proposal",
      "Schedule next meeting"
    ]

    const { error } = await supabase
      .from("meetings")
      .insert({
        id,
        title: "New Recording",
        summary,
        action_items: actionItems,
        segments,
      })

    if (error) {
      console.error(error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error("Transcribe API error:", err)
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    )
  }
}
