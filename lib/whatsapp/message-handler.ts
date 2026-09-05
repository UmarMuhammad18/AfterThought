import { getWhatsAppAdapter } from "./adapter"
import type { IncomingMessage } from "./types"
import {
  formatMeetingReply,
  formatErrorReply,
  formatHelpReply,
} from "./reply-formatter"

/**
 * Central handler for every inbound WhatsApp message.
 * Right now it only does text + voice-note paths.
 * Call-recording path will be added once Cloud API is connected.
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

    // Text notes → treat as a simple meeting note for now
    if (msg.type === "text" && msg.text?.trim()) {
      // TODO: call your existing meeting-processor / AI pipeline here
      // For now we just echo a structured reply so the flow is testable.
      const fakeMeeting = {
        id: msg.id,
        title: "Quick note from WhatsApp",
        summary: msg.text.trim(),
        action_items: [] as string[],
      }

      await adapter.sendMessage({
        to,
        type: "text",
        text: formatMeetingReply(fakeMeeting),
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
          text: formatErrorReply("I received a voice note but no media reference."),
        })
        return
      }

      // Download (mock will return sample or empty buffer)
      const audioBuffer = await adapter.downloadMedia(mediaRef)

      if (audioBuffer.length === 0) {
        await adapter.sendMessage({
          to,
          type: "text",
          text: formatErrorReply(
            "Could not download the voice note (or no sample file in /samples).",
          ),
        })
        return
      }

      // TODO: pipe audioBuffer into real STT + your existing /api/transcribe logic
      // For now return a placeholder so the end-to-end path works.
      const placeholderMeeting = {
        id: msg.id,
        title: "Voice note from WhatsApp",
        summary:
          "(Placeholder) Transcription + AI summary will appear here once the STT pipeline is wired.",
        action_items: ["Wire real transcription", "Store meeting under this phone number"],
      }

      await adapter.sendMessage({
        to,
        type: "text",
        text: formatMeetingReply(placeholderMeeting),
      })
      return
    }

    // Future: call_recording type
    if (msg.type === "call_recording") {
      await adapter.sendMessage({
        to,
        type: "text",
        text: "Call recording received. Processing will be enabled once Cloud API is connected.",
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
        text: formatErrorReply("Something went wrong while processing your message."),
      })
    } catch {
      // swallow
    }
  }
}
