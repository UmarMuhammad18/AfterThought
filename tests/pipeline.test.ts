import { describe, expect, it } from "vitest"
import { isGenericSpeaker, parseDeadline } from "@/lib/pipeline/side-effects"
import { chunkSegments } from "@/lib/pipeline/indexing"
import { buildIcs } from "@/lib/ics"
import { parseRecordingOptions } from "@/lib/recording-options"
import { generateApiKey, hashApiKey, isApiKey } from "@/lib/api-keys"
import { computeInsights } from "@/lib/insights"

// Wednesday 2026-10-21, 10:00 local time
const WED = new Date(2026, 9, 21, 10, 0, 0)

describe("parseDeadline", () => {
  it("understands relative phrases", () => {
    expect(parseDeadline("tomorrow", WED)?.getDate()).toBe(22)
    expect(parseDeadline("Friday", WED)?.getDate()).toBe(23)
    expect(parseDeadline("by end of week", WED)?.getDate()).toBe(23)
    expect(parseDeadline("next week", WED)?.getDate()).toBe(26) // Monday
    expect(parseDeadline("end of month", WED)?.getDate()).toBe(31)
    expect(parseDeadline("in 3 days", WED)?.getDate()).toBe(24)
  })

  it("rolls same-weekday references a week forward", () => {
    expect(parseDeadline("Wednesday", WED)?.getDate()).toBe(28)
  })

  it("parses explicit dates and rejects nonsense", () => {
    expect(parseDeadline("2026-11-03", WED)?.getUTCMonth()).toBe(10)
    expect(parseDeadline("whenever", WED)).toBeNull()
    expect(parseDeadline("", WED)).toBeNull()
  })
})

describe("isGenericSpeaker", () => {
  it("distinguishes diarization labels from names", () => {
    expect(isGenericSpeaker("Speaker 2")).toBe(true)
    expect(isGenericSpeaker("You")).toBe(true)
    expect(isGenericSpeaker("Them 3")).toBe(true)
    expect(isGenericSpeaker("Sara")).toBe(false)
  })
})

describe("chunkSegments", () => {
  it("groups segments into citeable chunks with time ranges", () => {
    const segs = Array.from({ length: 6 }, (_, i) => ({
      speaker: i % 2 ? "Them" : "You",
      text: "word ".repeat(40).trim(),
      start: i * 10,
      end: i * 10 + 9,
    }))
    const chunks = chunkSegments(segs, 500)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].start_seconds).toBe(0)
    expect(chunks[0].speaker).toBe("Multiple")
    expect(chunks.map((c) => c.seq)).toEqual(chunks.map((_, i) => i))
  })
})

describe("buildIcs", () => {
  it("escapes text and folds long lines", () => {
    const ics = buildIcs([
      { id: "1", title: "Send deck, notes; and budget " + "x".repeat(100), due: new Date(Date.UTC(2026, 10, 3, 17)) },
    ])
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("DTSTART:20261103T170000Z")
    expect(ics).toContain("Send deck\\, notes\\; and budget")
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true)
  })
})

describe("parseRecordingOptions", () => {
  it("whitelists sources and only keeps interview details for interviews", () => {
    const o = parseRecordingOptions({ source: "evil", layout: "me-them", kind: "meeting", interview: { candidate: "x" } })
    expect(o.source).toBe("web")
    expect(o.layout).toBe("me-them")
    expect(o.interview).toBeUndefined()
    const i = parseRecordingOptions({ source: "desktop", kind: "interview", interview: { candidate: "Sara", role: 5 } })
    expect(i.interview).toEqual({ candidate: "Sara", role: undefined, rubric: undefined })
  })
})

describe("api keys", () => {
  it("generates prefixed keys with stable hashes", () => {
    const key = generateApiKey()
    expect(isApiKey(key)).toBe(true)
    expect(key).toMatch(/^at_[0-9a-f]{40}$/)
    expect(hashApiKey(key)).toBe(hashApiKey(key))
    expect(hashApiKey(key)).not.toBe(hashApiKey(generateApiKey()))
    expect(isApiKey("eyJhbGciOi...")).toBe(false)
  })
})

describe("computeInsights", () => {
  it("aggregates real meetings", () => {
    const now = new Date().toISOString()
    const insights = computeInsights([
      {
        id: "m1",
        title: "Roadmap",
        created_at: now,
        duration_seconds: 1800,
        kind: "meeting",
        action_items: ["a", "b"],
        segments: [
          { speaker: "Sara", text: "pricing pricing roadmap" },
          { speaker: "Speaker 1", text: "pricing" },
        ],
        analysis: { topics: ["Pricing"], decisions: ["Ship Friday"], sentiment: { positive: 60, neutral: 30, negative: 10 } },
      },
      {
        id: "m2",
        title: "Interview",
        created_at: now,
        duration_seconds: 1800,
        kind: "interview",
        action_items: [],
        segments: [],
        analysis: { topics: ["pricing", "Hiring"] },
      },
    ])
    expect(insights.totals).toMatchObject({ meetings: 2, hours: 1, actionItems: 2, interviews: 1 })
    expect(insights.topTopics[0]).toEqual({ label: "Pricing", count: 2 })
    expect(insights.peopleMentions.map((p) => p.name)).toEqual(["Sara"])
    expect(insights.topKeywords[0].label).toBe("pricing")
    expect(insights.activity.at(-1)?.meetings).toBe(2)
  })
})
