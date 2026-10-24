import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"

// GET /api/speakers/:id -> a speaker's profile plus the meetings they were in.
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
  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, meetings, mentions, action_items")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!speaker) {
    return NextResponse.json({ ok: false, error: "Speaker not found" }, { status: 404 })
  }

  const ids: string[] = Array.isArray(speaker.meetings) ? speaker.meetings : []
  const { data: meetings } = ids.length
    ? await supabase
        .from("meetings")
        .select("id, title, created_at, kind")
        .in("id", ids)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] }

  return NextResponse.json({ ok: true, speaker, meetings: meetings ?? [] })
}
