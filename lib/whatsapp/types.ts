/**
 * Shared types for the WhatsApp channel.
 * These stay the same whether we use the mock adapter or the real Cloud API later.
 */

export type WhatsAppUser = {
  phone: string // E.164 without +, e.g. "15551234567"
  name?: string
  afterthoughtUserId?: string
}

export type IncomingMessage = {
  id: string
  from: string // phone number
  timestamp: number
  type: "text" | "audio" | "voice" | "call_recording"
  text?: string
  mediaId?: string
  mediaUrl?: string
  mediaMimeType?: string
  callId?: string
}

export type OutgoingMessage = {
  to: string
  type: "text" | "interactive"
  text?: string
  // Future: buttons, lists, etc.
}

export interface WhatsAppAdapter {
  sendMessage(msg: OutgoingMessage): Promise<void>
  downloadMedia(mediaIdOrUrl: string): Promise<Buffer>
}
