import type { WhatsAppAdapter } from "./types"
import { CloudWhatsAppAdapter, isCloudApiConfigured } from "./cloud-adapter"

/**
 * Global adapter holder. The real Cloud API adapter is used automatically
 * when its env vars are set; the mock route installs MockWhatsAppAdapter.
 */
let currentAdapter: WhatsAppAdapter | null = null

export function setWhatsAppAdapter(adapter: WhatsAppAdapter) {
  currentAdapter = adapter
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (!currentAdapter && isCloudApiConfigured()) {
    currentAdapter = new CloudWhatsAppAdapter()
  }
  if (!currentAdapter) {
    throw new Error(
      "WhatsApp adapter not set. Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID, or use MockWhatsAppAdapter in development.",
    )
  }
  return currentAdapter
}
