import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { isApiKey, revokeApiKey } from "@/lib/api-keys"

// DELETE /api/keys/:id -> revoke a key immediately.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  const user = isApiKey(token) ? null : await getUserFromRequest(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ok = await revokeApiKey(user.id, id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 })
}
