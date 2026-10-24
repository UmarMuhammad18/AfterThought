import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { buildIcs } from "@/lib/ics"

// GET /api/meeting/[id]/ics -> this meeting's dated action items as .ics
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
    .select("title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 })
  }

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, assignee, due_date")
    .eq("meeting_id", id)
    .eq("user_id", user.id)
    .not("due_date", "is", null)

  const origin = new URL(req.url).origin
  const ics = buildIcs(
    (events ?? []).map((e) => ({
      id: e.id,
      title: e.assignee ? `${e.title} (${e.assignee})` : e.title,
      due: new Date(e.due_date),
      description: `From: ${meeting.title}`,
      url: `${origin}/meeting/${id}`,
    })),
    meeting.title,
  )

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="afterthought-${id.slice(0, 8)}.ics"`,
    },
  })
}
