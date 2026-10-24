import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

// GET /api/speakers -> the user's speaker profiles (populated by the
// pipeline from named speakers; see lib/pipeline/side-effects.ts).
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
