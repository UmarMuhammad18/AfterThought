import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { computeInsights, type InsightMeeting } from "@/lib/insights"

// GET /api/insights -> cross-meeting insights computed from the user's meetings.
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin()
    .from("meetings")
    .select("id, title, created_at, duration_seconds, kind, action_items, segments, analysis")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...computeInsights((data ?? []) as InsightMeeting[]) })
}
