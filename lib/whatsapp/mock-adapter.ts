import type { WhatsAppAdapter, OutgoingMessage } from "./types"
import fs from "fs/promises"
import path from "path"

/**
 * Local mock so we can develop and test the full WhatsApp flow
 * without any Meta Cloud API credentials.
 */
export class MockWhatsAppAdapter implements WhatsAppAdapter {
  async sendMessage(msg: OutgoingMessage): Promise<void> {
    console.log("\n=== MOCK WhatsApp OUTGOING ===")
    console.log(`To: ${msg.to}`)
    console.log(msg.text ?? "(no text)")
    console.log("==============================\n")
  }

  async downloadMedia(mediaIdOrUrl: string): Promise<Buffer> {
    // Drop a sample .ogg / .mp3 / .wav into /samples for local testing
    const candidates = [
      path.join(process.cwd(), "samples", "sample-voice-note.ogg"),
      path.join(process.cwd(), "samples", "sample-voice-note.mp3"),
      path.join(process.cwd(), "samples", "sample-voice-note.wav"),
    ]

    for (const file of candidates) {
      try {
        return await fs.readFile(file)
      } catch {
        // try next
      }
    }

    console.warn(
      `[MockWhatsAppAdapter] No sample audio found for ${mediaIdOrUrl}. Returning empty buffer.`,
    )
    return Buffer.from([])
  }
}
