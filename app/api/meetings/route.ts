import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
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
