import { getWhatsAppAdapter } from "./adapter"
import type { IncomingMessage } from "./types"
import {
  formatMeetingReply,
  formatErrorReply,
  formatHelpReply,
} from "./reply-formatter"
import { transcribeAudio } from "./transcription"
import { processMeetingFromTranscript } from "./meeting-processor"

/**
 * Central handler for every inbound WhatsApp message.
 * Text notes, voice notes, and (later) call recordings all go through here.
 */
export async function handleIncomingWhatsAppMessage(
  msg: IncomingMessage,
): Promise<void> {
  const adapter = getWhatsAppAdapter()
  const to = msg.from

  try {
    // Help / start commands
    if (
      msg.type === "text" &&
      msg.text &&
      /^(hi|hello|help|start|\/start)$/i.test(msg.text.trim())
    ) {
      await adapter.sendMessage({ to, type: "text", text: formatHelpReply() })
      return
    }

    // Text notes → process as a meeting note
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

    // Future: call_recording type (Cloud API will deliver the recording media)
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

    // Fallback
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
