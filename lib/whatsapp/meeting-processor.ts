import { supabaseAdmin } from "@/lib/supabase"
import {
  analyzeTranscript,
  isAiConfigured,
} from "@/app/api/summarize/ai/gemini-service"
import { getUserIdForPhone } from "./users"
import type { TranscriptSegment } from "./transcription"

export type ProcessMeetingInput = {
  /** WhatsApp phone (will be normalized). */
  phone: string
  /** Full transcript text. */
  transcriptText: string
  /** Optional diarized segments. */
  segments?: TranscriptSegment[]
  /** Optional title override. */
  title?: string
  /** Source tag. */
  source?: "whatsapp_text" | "whatsapp_voice" | "whatsapp_call"
}

export type ProcessedMeeting = {
  id: string
  title: string
  summary: string
  action_items: string[]
  segments: TranscriptSegment[]
  user_id: string | null
  whatsapp_phone: string
  source: string
}

/**
 * Takes transcript text (+ optional segments), runs AI analysis,
 * stores the meeting, and returns a structure ready for WhatsApp reply.
 */
export async function processMeetingFromTranscript(
  input: ProcessMeetingInput,
): Promise<ProcessedMeeting> {
  const phone = input.phone.replace(/\D/g, "")
  const id = crypto.randomUUID()
  const source = input.source || "whatsapp_voice"

  const segments: TranscriptSegment[] =
    input.segments && input.segments.length > 0
      ? input.segments
      : input.transcriptText
        ? [{ speaker: "Speaker", text: input.transcriptText }]
        : []

  let summary =
    input.transcriptText?.slice(0, 280) ||
    "No transcript content available."
  let actionItems: string[] = []

  if (isAiConfigured() && input.transcriptText.trim()) {
    try {
      const analysis = await analyzeTranscript(input.transcriptText)
      if (analysis.summary) summary = analysis.summary
      if (analysis.action_items.length > 0) {
        actionItems = analysis.action_items.map((item) => {
          const meta = [item.owner, item.deadline].filter(Boolean).join(" — ")
          return meta ? `${item.task} (${meta})` : item.task
        })
      }
    } catch (err) {
      console.error("[meeting-processor] AI analysis failed:", err)
    }
  }

  const title =
    input.title ||
    (source === "whatsapp_call"
      ? "WhatsApp call"
      : source === "whatsapp_text"
        ? "WhatsApp note"
        : "WhatsApp voice note")

  const userId = await getUserIdForPhone(phone)

  const meeting: ProcessedMeeting = {
    id,
    title,
    summary,
    action_items: actionItems,
    segments,
    user_id: userId,
    whatsapp_phone: phone,
    source,
  }

  // Persist when we have a linked user, or always store with service role
  // (schema allows null user_id after running whatsapp.sql).
  try {
    const supabase = supabaseAdmin()
    const row: Record<string, unknown> = {
      id,
      title,
      summary,
      action_items: actionItems,
      segments,
      whatsapp_phone: phone,
      source,
    }
    if (userId) {
      row.user_id = userId
    }

    const { error } = await supabase.from("meetings").insert(row)
    if (error) {
      // If columns don't exist yet, try minimal insert
      console.warn(
        "[meeting-processor] insert with extra columns failed, trying minimal:",
        error.message,
      )
      if (userId) {
        const { error: err2 } = await supabase.from("meetings").insert({
          id,
          user_id: userId,
          title,
          summary,
          action_items: actionItems,
          segments,
        })
        if (err2) {
          console.error("[meeting-processor] minimal insert failed:", err2.message)
        }
      }
    }
  } catch (err) {
    console.error("[meeting-processor] storage error:", err)
  }

  return meeting
}
