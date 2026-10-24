/**
 * Shared types for the WhatsApp channel.
 * These stay the same whether we use the mock adapter or the real Cloud API.
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
  /** Original filename for forwarded recordings sent as documents. */
  filename?: string
  callId?: string
  /** Sender's WhatsApp profile name, when provided. */
  profileName?: string
}

export type OutgoingMessage = {
  to: string
  type: "text" | "template"
  text?: string
  /** Pre-approved template, required outside Meta's 24-hour service window. */
  template?: { name: string; language: string; bodyParams?: string[] }
}

export interface WhatsAppAdapter {
  /** True for the local mock (no 24h window, no real delivery). */
  readonly isMock?: boolean
  sendMessage(msg: OutgoingMessage): Promise<void>
  downloadMedia(mediaIdOrUrl: string): Promise<Buffer>
}
