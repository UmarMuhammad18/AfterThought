import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"
import { sendFollowUpEmail } from "@/lib/email"
import { createCalendarEvent } from "@/lib/calendar"
import { updateSpeakerProfile } from "@/lib/speakers"

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

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

    // --- SCAFFOLDING PLACEHOLDERS ---
    
    // 1. Automatic follow-up email
    // await sendFollowUpEmail(id, summary, actionItems, "user@example.com");

    // 2. Calendar integration
    // for (const item of actionItems) {
    //   await createCalendarEvent(item, id);
    // }

    // 3. Speaker profiles
    // const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker)));
    // for (const speaker of uniqueSpeakers) {
    //   // Pass empty objects/arrays as placeholders for mentions and individual action items
    //   await updateSpeakerProfile(speaker, id, {}, []);
    // }

    // --------------------------------

    const { error } = await supabase
      .from("meetings")
      .insert({
        id,
        user_id: user.id,
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
