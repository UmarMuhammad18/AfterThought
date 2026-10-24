import { describe, expect, it } from "vitest"
import { normalizeScorecard, splitTranscript } from "@/lib/ai/analysis"
import { normalizeAnalysis } from "@/app/api/summarize/ai/schemas"
import { parseJsonResponse } from "@/app/api/summarize/ai/gemini-service"

describe("splitTranscript", () => {
  it("splits on line boundaries under the limit", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Speaker: line ${i} ${"x".repeat(20)}`).join("\n")
    const chunks = splitTranscript(text, 100)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.length <= 100)).toBe(true)
    expect(chunks.join("\n")).toBe(text)
  })

  it("hard-splits a single giant line", () => {
    const chunks = splitTranscript("a".repeat(250), 100)
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50])
  })
})

describe("normalizeAnalysis", () => {
  it("fills missing fields and normalises sentiment to percentages", () => {
    const a = normalizeAnalysis({ summary: "s", sentiment: { positive: 2, neutral: 1, negative: 1 }, topics: ["a", 3] })
    expect(a.title).toBe("")
    expect(a.decisions).toEqual([])
    expect(a.topics).toEqual(["a"])
    expect(a.sentiment).toEqual({ positive: 50, neutral: 25, negative: 25 })
  })

  it("treats empty sentiment as unknown", () => {
    expect(normalizeAnalysis({ sentiment: { positive: 0, neutral: 0, negative: 0 } }).sentiment).toBeNull()
  })
})

describe("normalizeScorecard", () => {
  it("clamps scores and defaults unknown recommendations", () => {
    const s = normalizeScorecard({
      recommendation: "definitely",
      overall_score: 9,
      criteria: [{ name: "Communication", score: 0, evidence: [{ quote: "I led the team", timestamp: "02:10" }, { foo: 1 }] }],
    })
    expect(s.recommendation).toBe("maybe")
    expect(s.overall_score).toBe(5)
    expect(s.criteria[0].score).toBe(1)
    expect(s.criteria[0].evidence).toEqual([{ quote: "I led the team", timestamp: "02:10" }])
  })
})

describe("parseJsonResponse", () => {
  it("accepts fenced JSON", () => {
    expect(parseJsonResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJsonResponse('{"b":2}')).toEqual({ b: 2 })
  })

  it("throws on invalid JSON", () => {
    expect(() => parseJsonResponse("not json")).toThrow()
  })
})
