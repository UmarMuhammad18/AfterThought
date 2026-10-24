import { describe, expect, it } from "vitest"
import {
  dropMicEcho,
  extensionFor,
  formatTimestamp,
  mergeAdjacentSpeakers,
  transcriptToText,
} from "@/lib/transcription"

describe("formatTimestamp", () => {
  it("formats minutes and hours", () => {
    expect(formatTimestamp(0)).toBe("00:00")
    expect(formatTimestamp(65.9)).toBe("01:05")
    expect(formatTimestamp(3725)).toBe("1:02:05")
    expect(formatTimestamp(-3)).toBe("00:00")
  })
})

describe("extensionFor", () => {
  it("maps common MIME types", () => {
    expect(extensionFor("audio/webm;codecs=opus")).toBe("webm")
    expect(extensionFor("audio/mp4")).toBe("m4a")
    expect(extensionFor("audio/mpeg")).toBe("mp3")
    expect(extensionFor("audio/ogg")).toBe("ogg")
    expect(extensionFor("application/octet-stream")).toBe("ogg")
  })
})

describe("mergeAdjacentSpeakers", () => {
  it("joins consecutive turns by the same speaker with short gaps", () => {
    const merged = mergeAdjacentSpeakers([
      { speaker: "You", text: "Hello", start: 0, end: 1 },
      { speaker: "You", text: "there", start: 1.5, end: 2 },
      { speaker: "Them", text: "Hi", start: 2.2, end: 3 },
      { speaker: "Them", text: "much later", start: 30, end: 31 },
    ])
    expect(merged.map((s) => s.text)).toEqual(["Hello there", "Hi", "much later"])
    expect(merged[0].end).toBe(2)
  })

  it("does not mutate its input", () => {
    const input = [
      { speaker: "A", text: "one", start: 0, end: 1 },
      { speaker: "A", text: "two", start: 1, end: 2 },
    ]
    mergeAdjacentSpeakers(input)
    expect(input[0].text).toBe("one")
  })
})

describe("dropMicEcho", () => {
  it("drops mic utterances that repeat the other side at the same time", () => {
    const kept = dropMicEcho([
      { channel: 1, start: 10, end: 13, transcript: "Can you hear me okay?" },
      { channel: 0, start: 10.2, end: 13.1, transcript: "can you hear me okay" },
      { channel: 0, start: 14, end: 15, transcript: "Yes, loud and clear." },
    ])
    expect(kept.map((u) => u.transcript)).toEqual(["Can you hear me okay?", "Yes, loud and clear."])
  })

  it("keeps the user's own words even when they overlap in time", () => {
    const kept = dropMicEcho([
      { channel: 1, start: 0, end: 5, transcript: "We should ship on Friday" },
      { channel: 0, start: 1, end: 3, transcript: "I disagree, Monday is safer" },
    ])
    expect(kept).toHaveLength(2)
  })

  it("handles non-Latin scripts", () => {
    const kept = dropMicEcho([
      { channel: 1, start: 0, end: 3, transcript: "مرحبا كيف حالك" },
      { channel: 0, start: 0.1, end: 3, transcript: "مرحبا كيف حالك" },
    ])
    expect(kept).toHaveLength(1)
  })
})

describe("transcriptToText", () => {
  it("renders timestamps and speakers", () => {
    expect(transcriptToText([{ speaker: "You", text: "Hi", timestamp: "00:01" }, { speaker: "Them", text: "Hey" }])).toBe(
      "[00:01] You: Hi\nThem: Hey",
    )
  })
})
