import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Meeting not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, ...data })
}
