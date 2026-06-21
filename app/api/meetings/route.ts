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
    .select("*")
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
