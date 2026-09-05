import type { WhatsAppAdapter } from "./types"

/**
 * Global adapter holder.
 * In development we set the MockWhatsAppAdapter.
 * When you have Cloud API credentials, swap in the real implementation.
 */
let currentAdapter: WhatsAppAdapter | null = null

export function setWhatsAppAdapter(adapter: WhatsAppAdapter) {
  currentAdapter = adapter
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (!currentAdapter) {
    throw new Error(
      "WhatsApp adapter not set. Call setWhatsAppAdapter() first (use MockWhatsAppAdapter in development).",
    )
  }
  return currentAdapter
}
