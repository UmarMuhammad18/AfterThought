import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    // Transcripts are excluded: the list view doesn't need them and they're large.
    .select("id, title, summary, action_items, created_at, status, source, platform, kind, duration_seconds, error")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch meetings:", error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, meetings: data ?? [] })
}
