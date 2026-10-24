import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { buildIcs } from "@/lib/ics"

// GET /api/calendar/ics -> every dated action item as one .ics file
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { data: events } = await supabaseAdmin()
    .from("calendar_events")
    .select("id, title, assignee, due_date, meeting_id")
    .eq("user_id", user.id)
    .not("due_date", "is", null)
    .order("due_date")

  const origin = new URL(req.url).origin
  const ics = buildIcs(
    (events ?? []).map((e) => ({
      id: e.id,
      title: e.assignee ? `${e.title} (${e.assignee})` : e.title,
      due: new Date(e.due_date),
      url: e.meeting_id ? `${origin}/meeting/${e.meeting_id}` : undefined,
    })),
    "AfterThought action items",
  )

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="afterthought-action-items.ics"',
    },
  })
}
