/**
 * Meeting memory AI — improved from Rayene-B/AfterThought's meeting-ai.ts
 * and merged with the structured analysis already in this repo.
 *
 * - Single-meeting Q&A grounded in the transcript
 * - Multi-meeting search with ranked evidence snippets
 * - Lightweight related-results for UI / WhatsApp citations
 */

import {
  answerQuestion as baseAnswerQuestion,
  analyzeTranscript,
  isAiConfigured,
  GeminiServiceError,
} from "@/app/api/summarize/ai/gemini-service"
import type { MeetingAnalysis } from "@/app/api/summarize/ai/schemas"

export type MeetingSegment = {
  speaker: string
  text: string
  timestamp?: string
  start?: number
}

export type MemoryMeeting = {
  id: string
  title: string
  summary?: string
  action_items?: string[] | { task?: string; text?: string; owner?: string }[]
  segments: MeetingSegment[]
  created_at?: string
}

export type EvidenceSnippet = {
  text: string
  speaker?: string
  timestamp?: string
  /** Seconds into the recording, for jump-to-moment links. */
  start?: number
  meetingId: string
  meetingTitle: string
  score: number
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    // Unicode-aware so Arabic, Hindi, Cyrillic, etc. transcripts are searchable.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

export function transcriptFromMeeting(meeting: MemoryMeeting): string {
  return meeting.segments
    .map((s) => `${s.speaker}: ${s.text}`)
    .join("\n")
}

/**
 * Rank transcript segments across one or many meetings by keyword overlap.
 * Used for evidence cards and WhatsApp citations.
 */
export function relatedResults(
  question: string,
  meetings: MemoryMeeting[],
  limit = 8,
): EvidenceSnippet[] {
  const terms = tokenize(question)
  if (terms.length === 0) return []

  return meetings
    .flatMap((meeting) =>
      meeting.segments.map((segment, index) => {
        const source = `${segment.speaker}: ${segment.text}`.toLowerCase()
        const score = terms.reduce(
          (total, term) => total + (source.includes(term) ? 1 : 0),
          0,
        )
        return {
          score,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          speaker: segment.speaker,
          text: segment.text,
          start: segment.start,
          timestamp:
            segment.timestamp ??
            `${String(Math.floor(index / 2)).padStart(2, "0")}:${String((index % 2) * 30).padStart(2, "0")}`,
        }
      }),
    )
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Combine evidence lists, dropping duplicates of the same passage. */
export function mergeEvidence(
  primary: EvidenceSnippet[],
  secondary: EvidenceSnippet[],
  limit = 12,
): EvidenceSnippet[] {
  const seen = new Set<string>()
  const out: EvidenceSnippet[] = []
  for (const e of [...primary, ...secondary]) {
    const key = `${e.meetingId}:${e.text.slice(0, 80)}`
    if (seen.has(key)) continue
    // Semantic chunks contain several lines; skip keyword hits already inside one.
    if (out.some((o) => o.meetingId === e.meetingId && o.text.includes(e.text.slice(0, 60)))) continue
    seen.add(key)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Ask a question about a single meeting. Grounded in the transcript only.
 */
export async function askMeetingAI(
  question: string,
  meeting: MemoryMeeting,
): Promise<string> {
  if (!isAiConfigured()) {
    return "AI is not configured. Add OPENROUTER_API_KEY (or GEMINI_API_KEY) to enable answers."
  }

  const transcript = transcriptFromMeeting(meeting)
  if (!transcript.trim()) {
    return "This meeting has no transcript yet."
  }

  try {
    return await baseAnswerQuestion(transcript, question)
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return `AI request failed: ${err.message}`
    }
    return `AI request failed: ${String(err)}`
  }
}

/**
 * Ask across multiple meetings. Builds a compact context from the top
 * related segments + meeting titles, then asks the model.
 */
export async function askAcrossMeetings(
  question: string,
  meetings: MemoryMeeting[],
  /** Extra evidence, e.g. from semantic (embedding) search, ranked first. */
  extraEvidence: EvidenceSnippet[] = [],
): Promise<{ answer: string; evidence: EvidenceSnippet[] }> {
  const evidence = mergeEvidence(extraEvidence, relatedResults(question, meetings, 10), 12)

  if (!isAiConfigured()) {
    return {
      answer:
        "AI is not configured. Add OPENROUTER_API_KEY to enable cross-meeting answers.",
      evidence,
    }
  }

  if (meetings.length === 0) {
    return {
      answer: "No meetings found to search.",
      evidence: [],
    }
  }

  // Build a focused context from the highest-scoring snippets
  const contextBlocks =
    evidence.length > 0
      ? evidence.map(
          (e) =>
            `[${e.meetingTitle} | ${e.timestamp ?? "?"} | ${e.speaker ?? "?"}]\n${e.text}`,
        )
      : meetings.slice(0, 5).map((m) => {
          const t = transcriptFromMeeting(m).slice(0, 1200)
          return `[${m.title}]\n${t}`
        })

  const context = contextBlocks.join("\n\n---\n\n")

  try {
    const answer = await baseAnswerQuestion(
      context,
      `${question}\n\n(Answer using only the meeting excerpts above. Cite meeting titles when useful.)`,
    )
    return { answer, evidence }
  } catch (err) {
    const message =
      err instanceof GeminiServiceError ? err.message : String(err)
    return {
      answer: `AI request failed: ${message}`,
      evidence,
    }
  }
}

/**
 * Full structured analysis of a transcript (re-export for convenience).
 */
export async function analyzeMeetingTranscript(
  transcript: string,
): Promise<MeetingAnalysis | null> {
  if (!isAiConfigured() || !transcript.trim()) return null
  try {
    return await analyzeTranscript(transcript)
  } catch (err) {
    console.error("[meeting-memory] analyze failed:", err)
    return null
  }
}
