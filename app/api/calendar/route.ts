import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

// Scaffolding route for Calendar Events.
// Returns the authenticated user's calendar events. AI-driven creation of
// events is intentionally left as scaffolding (see lib/calendar.ts).
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
