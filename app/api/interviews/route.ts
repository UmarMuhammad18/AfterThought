import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { createInvite, inviteLink, type InviteMode } from "@/lib/whatsapp/interviews"

// GET /api/interviews -> the user's interview invites, newest first
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from("interview_invites")
    .select("id, code, mode, candidate_name, candidate_phone, role, rubric, questions, status, current_index, meeting_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    invites: (data ?? []).map((i) => ({ ...i, link: inviteLink(i.code) })),
    botNumber: process.env.WHATSAPP_DISPLAY_NUMBER?.replace(/\D/g, "") || null,
  })
}

// POST /api/interviews { mode, candidateName?, role?, rubric?, questions? }
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : undefined)
  const mode: InviteMode = body.mode === "call" ? "call" : "async"
  const questions = Array.isArray(body.questions)
    ? body.questions.filter((q): q is string => typeof q === "string")
    : typeof body.questions === "string"
      ? body.questions.split("\n")
      : undefined

  try {
    const invite = await createInvite(user.id, {
      mode,
      candidateName: str(body.candidateName),
      role: str(body.role),
      rubric: str(body.rubric),
      questions,
    })
    return NextResponse.json({ ok: true, invite: { ...invite, link: inviteLink(invite.code) } })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
