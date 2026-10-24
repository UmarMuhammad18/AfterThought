import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { RECORDINGS_BUCKET } from "@/lib/pipeline"

// GET /api/meeting/[id]/audio -> short-lived signed URLs for each audio
// segment, with its offset, so the player can seek across the whole call.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = supabaseAdmin()
  const { data: rows, error } = await supabase
    .from("recording_segments")
    .select("seq, storage_path, mime_type, start_seconds, duration_seconds")
    .eq("meeting_id", id)
    .eq("user_id", user.id)
    .order("seq")
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, parts: [] })
  }

  const { data: signed } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60)

  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  const parts = rows
    .map((r) => ({
      seq: r.seq,
      url: urlByPath.get(r.storage_path) ?? null,
      mimeType: r.mime_type,
      start: Number(r.start_seconds) || 0,
      duration: r.duration_seconds == null ? null : Number(r.duration_seconds),
    }))
    .filter((p) => p.url)

  return NextResponse.json({ ok: true, parts })
}
