import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

// Scaffolding route for Speaker Profiles.
// Returns the authenticated user's speakers. AI-driven population of this
// table is intentionally left as scaffolding (see lib/speakers.ts).
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  if (error) {
    // Table may not exist yet during scaffolding — degrade to an empty list.
    console.error("Failed to fetch speakers:", error.message)
    return NextResponse.json({ ok: true, speakers: [] })
  }

  return NextResponse.json({ ok: true, speakers: data ?? [] })
}
