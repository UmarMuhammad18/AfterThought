import { createHmac } from "crypto"
import { describe, expect, it } from "vitest"
import { parseWebhookPayload, verifySignature } from "@/lib/whatsapp/webhook"
import { splitForWhatsApp } from "@/lib/whatsapp/cloud-adapter"
import { isInsideWindow } from "@/lib/whatsapp/window"
import { looksLikeQuestion } from "@/lib/whatsapp/message-handler"
import { mergeEvidence, relatedResults } from "@/lib/ai/meeting-memory"

describe("verifySignature", () => {
  const secret = "s3cret"
  const body = '{"object":"whatsapp_business_account"}'
  const good = "sha256=" + createHmac("sha256", secret).update(body).digest("hex")

  it("accepts a valid signature", () => {
    expect(verifySignature(body, good, secret)).toBe(true)
  })

  it("rejects tampered bodies, wrong secrets and missing headers", () => {
    expect(verifySignature(body + " ", good, secret)).toBe(false)
    expect(verifySignature(body, good, "other")).toBe(false)
    expect(verifySignature(body, null, secret)).toBe(false)
    expect(verifySignature(body, "sha256=abc", secret)).toBe(false)
  })
})

describe("parseWebhookPayload", () => {
  const wrap = (value: unknown, field = "messages") => ({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field, value }] }],
  })

  it("maps text, voice notes and forwarded recordings", () => {
    const { messages } = parseWebhookPayload(
      wrap({
        contacts: [{ wa_id: "15551234567", profile: { name: "Sara" } }],
        messages: [
          { id: "1", from: "15551234567", timestamp: "1700000000", type: "text", text: { body: "Hi" } },
          { id: "2", from: "15551234567", type: "audio", audio: { id: "m2", mime_type: "audio/ogg", voice: true } },
          { id: "3", from: "15551234567", type: "document", document: { id: "m3", mime_type: "audio/mp4", filename: "Call with Ali.m4a" } },
          { id: "4", from: "15551234567", type: "document", document: { id: "m4", mime_type: "application/pdf" } },
          { id: "5", from: "15551234567", type: "sticker" },
        ],
      }),
    )
    expect(messages.map((m) => m.type)).toEqual(["text", "voice", "call_recording"])
    expect(messages[0]).toMatchObject({ text: "Hi", profileName: "Sara", timestamp: 1700000000000 })
    expect(messages[2]).toMatchObject({ mediaId: "m3", filename: "Call with Ali.m4a" })
  })

  it("parses Calling API connect, terminate and recording events", () => {
    const { callEvents } = parseWebhookPayload(
      wrap(
        {
          contacts: [{ wa_id: "15550001111", profile: { name: "Ali" } }],
          calls: [
            {
              id: "wacid.1",
              from: "15550001111",
              to: "15559990000",
              event: "connect",
              direction: "USER_INITIATED",
              session: { sdp_type: "offer", sdp: "v=0..." },
            },
            { id: "wacid.1", event: "terminate", status: "COMPLETED", duration: 312 },
            {
              id: "wacid.1",
              from: "15550001111",
              event: "call_recording_available",
              call_recording: { type: "audio", audio: { id: "media9", mime_type: "audio/ogg; codecs=opus", url: "https://x" } },
            },
          ],
        },
        "calls",
      ),
    )
    expect(callEvents).toEqual([
      expect.objectContaining({ kind: "connect", callId: "wacid.1", sdpType: "offer", peerName: "Ali", direction: "USER_INITIATED" }),
      { kind: "terminate", callId: "wacid.1", status: "COMPLETED", durationSeconds: 312 },
      expect.objectContaining({ kind: "recording", mediaId: "media9", url: "https://x" }),
    ])
  })

  it("parses call permission replies", () => {
    const { messages, callEvents } = parseWebhookPayload(
      wrap({
        messages: [
          {
            id: "p1",
            from: "15550001111",
            type: "interactive",
            interactive: {
              type: "call_permission_reply",
              call_permission_reply: { response: "accept", is_permanent: false, expiration_timestamp: 1800000000 },
            },
          },
        ],
      }),
    )
    expect(messages).toEqual([])
    expect(callEvents).toEqual([
      { kind: "permission", phone: "15550001111", response: "accept", isPermanent: false, expiresAt: 1800000000 },
    ])
  })

  it("ignores status updates and other objects", () => {
    expect(parseWebhookPayload(wrap({ statuses: [{ id: "x" }] }))).toEqual({ messages: [], callEvents: [] })
    expect(parseWebhookPayload({ object: "page" })).toEqual({ messages: [], callEvents: [] })
  })
})

describe("splitForWhatsApp", () => {
  it("splits long text on boundaries under the limit", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ${"word ".repeat(20)}`).join("\n\n")
    const parts = splitForWhatsApp(text, 500)
    expect(parts.every((p) => p.length <= 500)).toBe(true)
    expect(parts.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "))
  })
})

describe("isInsideWindow", () => {
  const now = new Date("2026-10-24T12:00:00Z")
  it("respects Meta's 24h window with a safety margin", () => {
    expect(isInsideWindow(new Date("2026-10-24T00:00:00Z"), now)).toBe(true)
    expect(isInsideWindow(new Date("2026-10-23T12:02:00Z"), now)).toBe(false)
    expect(isInsideWindow(null, now)).toBe(false)
  })
})

describe("looksLikeQuestion", () => {
  it("separates questions from notes", () => {
    expect(looksLikeQuestion("What did Sara say about pricing")).toBe(true)
    expect(looksLikeQuestion("pricing?")).toBe(true)
    expect(looksLikeQuestion("Met Sara, agreed on Friday launch")).toBe(false)
  })
})

describe("meeting memory search", () => {
  const meetings = [
    {
      id: "m1",
      title: "اجتماع",
      segments: [
        { speaker: "A", text: "الميزانية ستكون جاهزة يوم الجمعة", start: 12 },
        { speaker: "B", text: "Budget approved for Q3", start: 40 },
      ],
    },
  ]

  it("finds keyword matches in non-Latin transcripts and keeps their timestamps", () => {
    const hits = relatedResults("الميزانية", meetings)
    expect(hits).toHaveLength(1)
    expect(hits[0].start).toBe(12)
  })

  it("dedupes keyword hits already covered by semantic chunks", () => {
    const semantic = [{ text: "B: Budget approved for Q3\nA: great", meetingId: "m1", meetingTitle: "x", score: 0.9 }]
    const keyword = relatedResults("budget approved", meetings)
    expect(mergeEvidence(semantic, keyword)).toHaveLength(1)
  })
})

describe("async interview transcript", () => {
  it("interleaves questions with answers and marks skips", async () => {
    const { buildInterviewTranscript, generateInviteCode } = await import("@/lib/whatsapp/interviews")
    const t = buildInterviewTranscript({
      questions: ["Q1?", "Q2?", "Q3?"],
      answers: [
        { segments: [{ speaker: "Sara", text: "A1", start: 0 }], duration: 30 },
        { segments: [], duration: 0, skipped: true },
        { segments: [{ speaker: "Sara", text: "A3", start: 30 }], duration: 20 },
      ],
    })
    expect(t.map((s) => `${s.speaker}:${s.text}`)).toEqual([
      "Interviewer:Q1?",
      "Sara:A1",
      "Interviewer:Q2?",
      "Note:(Question skipped)",
      "Interviewer:Q3?",
      "Sara:A3",
    ])
    expect(t[4].start).toBe(30)
    expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
  })
})
