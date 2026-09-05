import { getWhatsAppAdapter } from "./adapter"
import type { IncomingMessage } from "./types"
import {
  formatMeetingReply,
  formatErrorReply,
  formatHelpReply,
} from "./reply-formatter"
import { transcribeAudio } from "./transcription"
import { processMeetingFromTranscript } from "./meeting-processor"
import { supabaseAdmin } from "@/lib/supabase"
import { getUserIdForPhone } from "./users"
import {
  askMeetingAI,
  askAcrossMeetings,
  type MemoryMeeting,
} from "@/lib/ai/meeting-memory"

/**
 * Detect whether a text message is a question about past meetings
 * rather than new notes to store.
 */
function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.endsWith("?")) return true
  return /^(what|who|when|where|why|how|which|did|does|do|is|are|was|were|can|could|should|list|show|find|summarize|summary of|action items|decisions?|blockers?)\b/i.test(
    t,
  )
}

async function loadMeetingsForPhone(phone: string): Promise<MemoryMeeting[]> {
  const userId = await getUserIdForPhone(phone)
  const normalized = phone.replace(/\D/g, "")

  try {
    const supabase = supabaseAdmin()
    let query = supabase
      .from("meetings")
      .select("id, title, summary, action_items, segments, created_at, whatsapp_phone, user_id")
      .order("created_at", { ascending: false })
      .limit(30)

    if (userId) {
      query = query.eq("user_id", userId)
    } else if (normalized) {
      query = query.eq("whatsapp_phone", normalized)
    } else {
      return []
    }

    const { data, error } = await query
    if (error) {
      console.warn("[WhatsApp] load meetings failed:", error.message)
      return []
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      title: m.title || "Untitled",
      summary: m.summary || "",
      action_items: m.action_items || [],
      segments: Array.isArray(m.segments) ? m.segments : [],
      created_at: m.created_at,
    }))
  } catch (err) {
    console.warn("[WhatsApp] load meetings error:", err)
    return []
  }
}

/**
 * Central handler for every inbound WhatsApp message.
 */
export async function handleIncomingWhatsAppMessage(
  msg: IncomingMessage,
): Promise<void> {
  const adapter = getWhatsAppAdapter()
  const to = msg.from

  try {
    // Help / start
    if (
      msg.type === "text" &&
      msg.text &&
      /^(hi|hello|help|start|\/start)$/i.test(msg.text.trim())
    ) {
      await adapter.sendMessage({ to, type: "text", text: formatHelpReply() })
      return
    }

    // Text that looks like a question → search memory
    if (msg.type === "text" && msg.text?.trim() && looksLikeQuestion(msg.text)) {
      const meetings = await loadMeetingsForPhone(msg.from)

      if (meetings.length === 0) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply(
            "I don't have any meetings linked to this number yet. Send a voice note or text notes first, or link your phone in the AfterThought app.",
          ),
        })
        return
      }

      await adapter.sendMessage({
        to,
        type: "text",
        text: "🔍 Searching your meeting memory…",
      })

      const { answer, evidence } = await askAcrossMeetings(msg.text.trim(), meetings)

      let reply = answer
      if (evidence.length > 0) {
        const cites = evidence
          .slice(0, 3)
          .map(
            (e) =>
              `• ${e.meetingTitle}${e.timestamp ? ` (${e.timestamp})` : ""}: ${e.text.slice(0, 80)}${e.text.length > 80 ? "…" : ""}`,
          )
          .join("\n")
        reply += `\n\n📎 Evidence:\n${cites}`
      }

      await adapter.sendMessage({ to, type: "text", text: reply })
      return
    }

    // Text notes → process as a new meeting note
    if (msg.type === "text" && msg.text?.trim()) {
      const meeting = await processMeetingFromTranscript({
        phone: msg.from,
        transcriptText: msg.text.trim(),
        title: "WhatsApp note",
        source: "whatsapp_text",
      })

      await adapter.sendMessage({
        to,
        type: "text",
        text: formatMeetingReply(meeting),
      })
      return
    }

    // Voice note / audio
    if (msg.type === "audio" || msg.type === "voice") {
      const mediaRef = msg.mediaId || msg.mediaUrl
      if (!mediaRef) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply(
            "I received a voice note but no media reference.",
          ),
        })
        return
      }

      await adapter.sendMessage({
        to,
        type: "text",
        text: "🎙️ Got your voice note — transcribing and summarizing…",
      })

      const audioBuffer = await adapter.downloadMedia(mediaRef)
      if (audioBuffer.length === 0) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply(
            "Could not download the voice note. For local testing, put a sample-voice-note.ogg in /samples.",
          ),
        })
        return
      }

      const transcription = await transcribeAudio(
        audioBuffer,
        msg.mediaMimeType || "audio/ogg",
      )

      if (!transcription.text.trim()) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply("Transcription came back empty."),
        })
        return
      }

      const meeting = await processMeetingFromTranscript({
        phone: msg.from,
        transcriptText: transcription.text,
        segments: transcription.segments,
        title: "WhatsApp voice note",
        source: "whatsapp_voice",
      })

      await adapter.sendMessage({
        to,
        type: "text",
        text: formatMeetingReply(meeting),
      })
      return
    }

    // Call recording (Cloud API later)
    if (msg.type === "call_recording") {
      const mediaRef = msg.mediaId || msg.mediaUrl
      if (!mediaRef) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply("Call recording received but no media ID."),
        })
        return
      }

      await adapter.sendMessage({
        to,
        type: "text",
        text: "📞 Call recording received — processing notes…",
      })

      const audioBuffer = await adapter.downloadMedia(mediaRef)
      const transcription = await transcribeAudio(
        audioBuffer,
        msg.mediaMimeType || "audio/ogg",
      )

      const meeting = await processMeetingFromTranscript({
        phone: msg.from,
        transcriptText: transcription.text,
        segments: transcription.segments,
        title: "WhatsApp call",
        source: "whatsapp_call",
      })

      await adapter.sendMessage({
        to,
        type: "text",
        text: formatMeetingReply(meeting),
      })
      return
    }

    await adapter.sendMessage({
      to,
      type: "text",
      text: formatHelpReply(),
    })
  } catch (err) {
    console.error("[WhatsApp] handleIncomingWhatsAppMessage error:", err)
    try {
      await adapter.sendMessage({
        to,
        type: "text",
        text: formatErrorReply(
          "Something went wrong while processing your message.",
        ),
      })
    } catch {
      // swallow
    }
  }
}
