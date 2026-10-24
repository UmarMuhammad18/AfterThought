import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import { createRecording, RECORDINGS_BUCKET } from "@/lib/pipeline"
import { parseRecordingOptions } from "@/lib/recording-options"
import { extensionFor } from "@/lib/transcription"

/** Imports go straight to Storage, so only Storage's own limits apply. */
const MAX_IMPORT_BYTES = 500 * 1024 * 1024

// POST /api/recordings/import
// Body: { filename, mimeType, size, ...recording options }
// Returns a signed URL; the client PUTs the file there, then calls
// POST /api/recordings/:id/finish with { path, mimeType, size }.
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const mimeType = typeof body.mimeType === "string" && body.mimeType ? body.mimeType : "audio/mpeg"
  const size = typeof body.size === "number" ? body.size : 0
  const filename = typeof body.filename === "string" ? body.filename : ""

  if (!/^(audio|video)\//.test(mimeType)) {
    return NextResponse.json({ ok: false, error: "Only audio or video files can be imported." }, { status: 400 })
  }
  if (size > MAX_IMPORT_BYTES) {
    return NextResponse.json({ ok: false, error: "Files up to 500 MB can be imported." }, { status: 413 })
  }

  const options = parseRecordingOptions({ ...body, source: "import" })
  const title = options.title || filename.replace(/\.[^.]+$/, "").slice(0, 120) || undefined

  try {
    const id = await createRecording({ userId: user.id, ...options, title })
    const path = `${user.id}/${id}/00000.${extensionFor(mimeType)}`

    const { data, error } = await supabaseAdmin()
      .storage.from(RECORDINGS_BUCKET)
      .createSignedUploadUrl(path)
    if (error || !data) throw new Error(error?.message || "Could not create upload URL")

    return NextResponse.json({ ok: true, id, path, uploadUrl: data.signedUrl })
  } catch (err) {
    console.error("[recordings/import] failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
