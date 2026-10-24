import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"
import { createApiKey, isApiKey, listApiKeys } from "@/lib/api-keys"

/** Keys can only be managed from a signed-in session, never with another key. */
async function sessionUser(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  if (isApiKey(token)) return null
  return getUserFromRequest(req)
}

// GET /api/keys -> the user's active API keys (prefixes only)
export async function GET(req: Request) {
  const user = await sessionUser(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json({ ok: true, keys: await listApiKeys(user.id) })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}

// POST /api/keys { name } -> create a key; the raw key is returned only here.
export async function POST(req: Request) {
  const user = await sessionUser(req)
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const body = ((await req.json().catch(() => ({}))) ?? {}) as { name?: unknown }
  const name = typeof body.name === "string" ? body.name.trim() : "API key"
  try {
    const { key, row } = await createApiKey(user.id, name)
    return NextResponse.json({ ok: true, key, row })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
