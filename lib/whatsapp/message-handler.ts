import { getWhatsAppAdapter } from "./adapter"
import type { IncomingMessage, WhatsAppAdapter } from "./types"
import { formatMeetingReply, formatErrorReply, formatHelpReply } from "./reply-formatter"
import { consumeLinkCode, getUserIdForPhone, normalizePhone } from "./users"
import { deliver } from "./window"
import { supabaseAdmin } from "@/lib/supabase"
import { askAcrossMeetings } from "@/lib/ai/meeting-memory"
import { semanticEvidence } from "@/lib/ai/semantic-search"
import { loadMemoryMeetings } from "@/lib/meetings-repo"
import {
  completeMeeting,
  createRecording,
  finalizeRecording,
  storeSegment,
  type RecordingSource,
} from "@/lib/pipeline"

/**
 * Detect whether a text message is a question about past meetings
 * rather than new notes to store.
 */
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.endsWith("?")) return true
  return /^(what|who|when|where|why|how|which|did|does|do|is|are|was|were|can|could|should|list|show|find|summarize|summary of|action items|decisions?|blockers?)\b/i.test(
    t,
  )
}

async function answerQuestion(adapter: WhatsAppAdapter, to: string, question: string) {
  const userId = await getUserIdForPhone(to)
  const meetings = await loadMemoryMeetings(userId ? { userId } : { phone: to })

  if (meetings.length === 0) {
    await deliver(
      adapter,
      to,
      formatErrorReply(
        "I don't have any conversations for this number yet. Send a voice note or forward a call recording first, or link your phone in AfterThought → Settings.",
      ),
    )
    return
  }

  await deliver(adapter, to, "🔍 Searching your conversations…")
  const semantic = userId ? await semanticEvidence(question, userId, { limit: 8 }) : []
  const { answer, evidence } = await askAcrossMeetings(question, meetings, semantic)

  let reply = answer
  if (evidence.length > 0) {
    const cites = evidence
      .slice(0, 3)
      .map((e) => {
        const snippet = e.text.replace(/\s+/g, " ")
        return `• ${e.meetingTitle}${e.timestamp ? ` (${e.timestamp})` : ""}: ${snippet.slice(0, 90)}${snippet.length > 90 ? "…" : ""}`
      })
      .join("\n")
    reply += `\n\n📎 Sources:\n${cites}`
  }
  await deliver(adapter, to, reply)
}

async function replyWithMeeting(adapter: WhatsAppAdapter, to: string, meetingId: string) {
  const { data: meeting } = await supabaseAdmin()
    .from("meetings")
    .select("id, title, summary, action_items, status, error, scorecard")
    .eq("id", meetingId)
    .single()

  if (!meeting || meeting.status === "failed") {
    await deliver(adapter, to, formatErrorReply(meeting?.error || "I couldn't process that recording."))
    return
  }
  await deliver(
    adapter,
    to,
    formatMeetingReply(meeting),
    `Your notes for "${meeting.title}" are ready in AfterThought.`,
  )
}

async function processAudio(
  adapter: WhatsAppAdapter,
  msg: IncomingMessage,
  source: RecordingSource,
) {
  const to = msg.from
  const mediaRef = msg.mediaId || msg.mediaUrl
  if (!mediaRef) {
    await deliver(adapter, to, formatErrorReply("I received audio but no media reference."))
    return
  }

  await deliver(
    adapter,
    to,
    source === "whatsapp_call"
      ? "📞 Call recording received — transcribing…"
      : "🎙️ Got it — transcribing and summarising…",
  )

  const audio = await adapter.downloadMedia(mediaRef)
  if (audio.length === 0) {
    await deliver(adapter, to, formatErrorReply("I couldn't download that audio. Please try sending it again."))
    return
  }

  const userId = await getUserIdForPhone(to)
  const title = msg.filename ? msg.filename.replace(/\.[^.]+$/, "").slice(0, 120) : undefined
  const meetingId = await createRecording({
    userId,
    source,
    title,
    platform: "WhatsApp",
    whatsappPhone: to,
  })
  await storeSegment({
    meetingId,
    userId,
    seq: 0,
    audio,
    mimeType: (msg.mediaMimeType || "audio/ogg").split(";")[0],
    startSeconds: 0,
  })
  await finalizeRecording(meetingId)
  await replyWithMeeting(adapter, to, meetingId)
}

async function processTextNote(adapter: WhatsAppAdapter, msg: IncomingMessage) {
  const userId = await getUserIdForPhone(msg.from)
  const meetingId = await createRecording({
    userId,
    source: "whatsapp_text",
    platform: "WhatsApp",
    whatsappPhone: msg.from,
  })
  await completeMeeting(meetingId, [{ speaker: msg.profileName || "Note", text: msg.text!.trim() }])
  await replyWithMeeting(adapter, msg.from, meetingId)
}

/**
 * Central handler for every inbound WhatsApp message. Callers should run it
 * in the background (after()) so the webhook acknowledges Meta immediately.
 */
export async function handleIncomingWhatsAppMessage(
  msg: IncomingMessage,
  adapter: WhatsAppAdapter = getWhatsAppAdapter(),
): Promise<void> {
  const to = normalizePhone(msg.from)
  msg = { ...msg, from: to }
  const text = msg.type === "text" ? msg.text?.trim() ?? "" : ""

  try {
    if (msg.type === "text" && /^(hi|hello|help|start|\/start|menu)$/i.test(text)) {
      await deliver(adapter, to, formatHelpReply())
      return
    }

    const link = text.match(/^link\s+(\d{6})$/i)
    if (link) {
      const ok = await consumeLinkCode(link[1], to)
      await deliver(
        adapter,
        to,
        ok
          ? "✅ This number is now linked to your AfterThought account. Everything you send here will appear in your dashboard."
          : formatErrorReply("That code is invalid or has expired. Create a new one in AfterThought → Settings."),
      )
      return
    }

    if (msg.type === "text" && text && looksLikeQuestion(text)) {
      await answerQuestion(adapter, to, text)
      return
    }

    if (msg.type === "text" && text) {
      await processTextNote(adapter, msg)
      return
    }

    if (msg.type === "audio" || msg.type === "voice") {
      await processAudio(adapter, msg, "whatsapp_voice")
      return
    }

    if (msg.type === "call_recording") {
      await processAudio(adapter, msg, "whatsapp_call")
      return
    }

    await deliver(adapter, to, formatHelpReply())
  } catch (err) {
    console.error("[WhatsApp] handleIncomingWhatsAppMessage error:", err)
    try {
      await deliver(adapter, to, formatErrorReply("Something went wrong while processing your message."))
    } catch {
      // swallow
    }
  }
}
