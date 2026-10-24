import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { draftFollowUpEmail } from "@/lib/ai/analysis"
import { isAiConfigured, GeminiServiceError } from "@/app/api/summarize/ai/gemini-service"

// POST /api/meeting/[id]/email -> AI-drafted follow-up email { subject, body }.
// Sending is left to the user's own mail app (mailto / copy) so nothing is
// sent on their behalf without review.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI is not configured. Set OPENROUTER_API_KEY." },
      { status: 503 },
    )
  }

  const { id } = await params
  const { data: meeting } = await supabaseAdmin()
    .from("meetings")
    .select("title, summary, action_items, analysis")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 })
  }

  try {
    const email = await draftFollowUpEmail({
      title: meeting.title,
      summary: meeting.summary ?? "",
      action_items: Array.isArray(meeting.action_items) ? meeting.action_items : [],
      decisions: meeting.analysis?.decisions ?? [],
    })
    return NextResponse.json({ ok: true, ...email })
  } catch (err) {
    const message = err instanceof GeminiServiceError ? err.message : "Could not draft email"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
