import type { OutgoingMessage, WhatsAppAdapter } from "./types"

/**
 * Meta WhatsApp Cloud API adapter.
 *
 * Env:
 *   WHATSAPP_ACCESS_TOKEN     permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID  the business phone number's id
 *   WHATSAPP_GRAPH_VERSION    optional, defaults to v21.0
 */

/** WhatsApp rejects text bodies longer than 4096 characters. */
const MAX_TEXT = 4000

export function isCloudApiConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

function graphUrl(path: string) {
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v21.0"
  return `https://graph.facebook.com/${version}/${path}`
}

/** Split long text on paragraph / line boundaries so each part fits. */
export function splitForWhatsApp(text: string, max = MAX_TEXT): string[] {
  if (text.length <= max) return [text]
  const parts: string[] = []
  let rest = text
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max)
    if (cut < max / 2) cut = rest.lastIndexOf("\n", max)
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max)
    if (cut <= 0) cut = max
    parts.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }
  if (rest) parts.push(rest)
  return parts
}

/** POST to the Calling API: <PHONE_NUMBER_ID>/calls */
export async function callsApi(body: Record<string, unknown>): Promise<Record<string, any>> {
  const res = await fetch(graphUrl(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/calls`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, any>
  if (!res.ok) {
    const message = data?.error?.message || `Calling API error ${res.status}`
    const err = new Error(message) as Error & { code?: number }
    err.code = data?.error?.code
    throw err
  }
  return data
}

export class CloudWhatsAppAdapter implements WhatsAppAdapter {
  private token = process.env.WHATSAPP_ACCESS_TOKEN!
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!

  private async post(payload: Record<string, unknown>) {
    await this.postRaw(payload)
  }

  /** Send any Cloud API message payload (interactive, call permission requests, ...). */
  async postRaw(payload: Record<string, unknown>) {
    const res = await fetch(graphUrl(`${this.phoneNumberId}/messages`), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`WhatsApp send failed ${res.status}: ${detail.slice(0, 300)}`)
    }
  }

  async sendMessage(msg: OutgoingMessage): Promise<void> {
    if (msg.type === "template" && msg.template) {
      await this.post({
        to: msg.to,
        type: "template",
        template: {
          name: msg.template.name,
          language: { code: msg.template.language },
          components: msg.template.bodyParams?.length
            ? [
                {
                  type: "body",
                  parameters: msg.template.bodyParams.map((text) => ({ type: "text", text: text.slice(0, 1000) })),
                },
              ]
            : undefined,
        },
      })
      return
    }

    for (const part of splitForWhatsApp(msg.text ?? "")) {
      await this.post({ to: msg.to, type: "text", text: { body: part, preview_url: true } })
    }
  }

  /** Media ids resolve to a short-lived URL that also needs the token. */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const meta = await fetch(graphUrl(mediaId), { headers: { Authorization: `Bearer ${this.token}` } })
    if (!meta.ok) throw new Error(`WhatsApp media lookup failed (${meta.status})`)
    const { url } = (await meta.json()) as { url?: string }
    if (!url) throw new Error("WhatsApp media has no URL")

    const file = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } })
    if (!file.ok) throw new Error(`WhatsApp media download failed (${file.status})`)
    return Buffer.from(await file.arrayBuffer())
  }
}
