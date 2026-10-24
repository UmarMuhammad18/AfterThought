import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

// GET /api/calendar -> dated action items extracted by the pipeline
// (see lib/pipeline/side-effects.ts). Export with /api/calendar/ics.
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true })

  if (error) {
    // Table may not exist yet during scaffolding — degrade to an empty list.
    console.error("Failed to fetch calendar events:", error.message)
    return NextResponse.json({ ok: true, events: [] })
  }

  return NextResponse.json({ ok: true, events: data ?? [] })
}
