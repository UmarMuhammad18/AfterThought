import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { createRecording } from "@/lib/pipeline"
import { parseRecordingOptions } from "@/lib/recording-options"

// POST /api/recordings -> start a recording from any client.
// Body: { source, title?, platform?, layout?, kind?, interview?, consentConfirmed? }
// The client then PUTs audio segments and finally POSTs /finish.
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const options = parseRecordingOptions(body)

  try {
    const id = await createRecording({ userId: user.id, ...options })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error("[recordings] create failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
