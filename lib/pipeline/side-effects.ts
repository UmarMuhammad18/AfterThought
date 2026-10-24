import { supabaseAdmin } from "@/lib/supabase"
import type { MeetingAnalysis } from "@/app/api/summarize/ai/schemas"
import type { TranscriptSegment } from "@/lib/transcription"

/** Labels produced by diarization rather than real names. */
export function isGenericSpeaker(name: string): boolean {
  return /^(speaker( \d+)?|you|them( \d+)?|multiple|unknown)$/i.test(name.trim())
}

/**
 * Keep speaker profiles up to date: one row per named person, with the
 * meetings they appeared in, how often they spoke, and their action items.
 */
export async function syncSpeakers(
  userId: string,
  meetingId: string,
  segments: TranscriptSegment[],
  analysis: MeetingAnalysis,
): Promise<void> {
  const supabase = supabaseAdmin()

  const turns = new Map<string, number>()
  for (const s of segments) {
    if (!isGenericSpeaker(s.speaker)) turns.set(s.speaker, (turns.get(s.speaker) ?? 0) + 1)
  }
  for (const p of analysis.participants) {
    if (p && !isGenericSpeaker(p) && !turns.has(p)) turns.set(p, 0)
  }
  if (turns.size === 0) return

  const { data: existing } = await supabase
    .from("speakers")
    .select("id, name, meetings, mentions, action_items")
    .eq("user_id", userId)
    .in("name", [...turns.keys()])

  const byName = new Map((existing ?? []).map((row) => [row.name.toLowerCase(), row]))

  for (const [name, count] of turns) {
    const items = analysis.action_items
      .filter((a) => a.task && a.owner && a.owner.toLowerCase() === name.toLowerCase())
      .map((a) => (a.deadline ? `${a.task} (${a.deadline})` : a.task))
    const row = byName.get(name.toLowerCase())

    if (row) {
      const meetings: string[] = Array.isArray(row.meetings) ? row.meetings : []
      if (meetings.includes(meetingId)) continue // already counted (reprocessing)
      await supabase
        .from("speakers")
        .update({
          meetings: [...meetings, meetingId],
          mentions: (typeof row.mentions === "number" ? row.mentions : 0) + count,
          action_items: [...(Array.isArray(row.action_items) ? row.action_items : []), ...items],
        })
        .eq("id", row.id)
    } else {
      await supabase.from("speakers").insert({
        user_id: userId,
        name,
        meetings: [meetingId],
        mentions: count,
        action_items: items,
      })
    }
  }
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

/**
 * Best-effort conversion of a spoken deadline ("Friday", "tomorrow",
 * "2026-11-03", "end of month") into a date relative to `from`.
 */
export function parseDeadline(text: string, from = new Date()): Date | null {
  const t = text.trim().toLowerCase()
  if (!t) return null

  const base = new Date(from)
  base.setHours(17, 0, 0, 0) // default to end of the working day

  if (/\btoday\b|\beod\b|end of (the )?day/.test(t)) return base
  if (/\btomorrow\b/.test(t)) {
    base.setDate(base.getDate() + 1)
    return base
  }
  if (/end of (the )?week|\beow\b/.test(t)) {
    base.setDate(base.getDate() + ((5 - base.getDay() + 7) % 7))
    return base
  }
  if (/next week/.test(t)) {
    base.setDate(base.getDate() + ((1 - base.getDay() + 7) % 7 || 7))
    return base
  }
  if (/end of (the )?month|\beom\b/.test(t)) {
    return new Date(base.getFullYear(), base.getMonth() + 1, 0, 17)
  }
  const inDays = t.match(/in (\d+) days?/)
  if (inDays) {
    base.setDate(base.getDate() + Number(inDays[1]))
    return base
  }
  const weekday = WEEKDAYS.findIndex((d) => t.includes(d))
  if (weekday >= 0) {
    const delta = (weekday - base.getDay() + 7) % 7 || 7
    base.setDate(base.getDate() + delta + (/\bnext\b/.test(t) && delta < 7 ? 7 : 0))
    return base
  }

  const parsed = Date.parse(text)
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed)
    // Dates without a year parse as 2001 in V8; roll them forward.
    if (d.getFullYear() < from.getFullYear() - 1) d.setFullYear(from.getFullYear())
    return d
  }
  return null
}

/** Turn action items into calendar events (exportable as .ics). */
export async function syncCalendarEvents(
  userId: string,
  meetingId: string,
  analysis: MeetingAnalysis,
): Promise<void> {
  const supabase = supabaseAdmin()
  await supabase.from("calendar_events").delete().eq("meeting_id", meetingId)

  const rows = analysis.action_items
    .filter((a) => a.task)
    .map((a) => ({
      user_id: userId,
      meeting_id: meetingId,
      title: a.task,
      assignee: a.owner || null,
      due_date: a.deadline ? parseDeadline(a.deadline)?.toISOString() ?? null : null,
    }))
  if (rows.length === 0) return

  const { error } = await supabase.from("calendar_events").insert(rows)
  if (error) throw new Error(`Calendar sync failed: ${error.message}`)
}
