import { NextResponse } from "next/server"
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Meeting not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, ...data })
}
