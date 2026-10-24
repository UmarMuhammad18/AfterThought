import { supabaseAdmin } from "@/lib/supabase"
import type { MemoryMeeting } from "@/lib/ai/meeting-memory"

/**
 * Load a user's meetings in the shape the meeting-memory AI expects.
 * Shared by web search and the WhatsApp bot. Owner is a user id, or — for
 * WhatsApp numbers not yet linked to an account — a normalized phone number.
 */
export async function loadMemoryMeetings(
  owner: { userId: string } | { phone: string },
  limit = 200,
): Promise<MemoryMeeting[]> {
  try {
    let query = supabaseAdmin()
      .from("meetings")
      .select("id, title, summary, action_items, segments, created_at")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(limit)

    query =
      "userId" in owner
        ? query.eq("user_id", owner.userId)
        : query.eq("whatsapp_phone", owner.phone.replace(/\D/g, ""))

    const { data, error } = await query
    if (error) {
      console.warn("[meetings-repo] load failed:", error.message)
      return []
    }

    return (data || []).map((m: Record<string, any>) => ({
      id: m.id,
      title: m.title || "Untitled",
      summary: m.summary || "",
      action_items: m.action_items || [],
      segments: Array.isArray(m.segments) ? m.segments : [],
      created_at: m.created_at,
    }))
  } catch (err) {
    console.warn("[meetings-repo] load error:", err)
    return []
  }
}
