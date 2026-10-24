/**
 * Higher-level analysis built on the OpenRouter chat service:
 * - long-transcript analysis (summarise in chunks, then combine)
 * - interview scorecards against a rubric
 * - follow-up email drafts
 */

import {
  analyzeTranscript,
  chatCompletion,
  parseJsonResponse,
} from "@/app/api/summarize/ai/gemini-service"
import type { MeetingAnalysis } from "@/app/api/summarize/ai/schemas"

/** Transcripts up to this size go to the model in one request. */
const SINGLE_PASS_CHARS = 60_000
/** Chunk size for the map step on longer transcripts. */
const CHUNK_CHARS = 30_000

export function splitTranscript(text: string, chunkChars = CHUNK_CHARS): string[] {
  const lines = text.split("\n")
  const chunks: string[] = []
  let current = ""
  for (const line of lines) {
    if (current && current.length + line.length + 1 > chunkChars) {
      chunks.push(current)
      current = ""
    }
    // A single enormous line still gets split so no chunk exceeds the limit.
    if (line.length > chunkChars) {
      for (let i = 0; i < line.length; i += chunkChars) chunks.push(line.slice(i, i + chunkChars))
      continue
    }
    current = current ? `${current}\n${line}` : line
  }
  if (current) chunks.push(current)
  return chunks
}

const CHUNK_NOTES_PROMPT = `
You are taking detailed notes on PART {part} of {total} of a long conversation transcript.
Write dense bullet-point notes that keep: every decision, action item (with owner and deadline),
date, number, open question, risk, and who said what. Keep [mm:ss] timestamps next to key points.
Do not summarise away specifics. No preamble.

Transcript part:
{transcript}
`

/**
 * Analyse a transcript of any length. Short transcripts go straight to the
 * model; long ones are turned into detailed notes chunk by chunk, and the
 * notes are analysed together so nothing at the end of a call is dropped.
 */
export async function analyzeLongTranscript(transcript: string): Promise<MeetingAnalysis> {
  if (transcript.length <= SINGLE_PASS_CHARS) {
    return analyzeTranscript(transcript)
  }

  const chunks = splitTranscript(transcript)
  const notes = await Promise.all(
    chunks.map((chunk, i) =>
      chatCompletion({
        systemMessage: "You write faithful, detailed meeting notes.",
        userMessage: CHUNK_NOTES_PROMPT.replace("{part}", String(i + 1))
          .replace("{total}", String(chunks.length))
          .replace("{transcript}", chunk),
        maxTokens: 3000,
      }),
    ),
  )

  const combined = notes.map((n, i) => `## Part ${i + 1}\n${n.trim()}`).join("\n\n")
  return analyzeTranscript(combined)
}

// ---------------------------------------------------------------------------
// Interview scorecards
// ---------------------------------------------------------------------------

export type InterviewDetails = {
  candidate?: string
  role?: string
  /** Free text: job description, criteria, or one criterion per line. */
  rubric?: string
}

export type ScorecardCriterion = {
  name: string
  score: number // 1–5
  evidence: { quote: string; timestamp?: string }[]
  notes: string
}

export type Scorecard = {
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no"
  overall_score: number // 1–5
  summary: string
  criteria: ScorecardCriterion[]
  strengths: string[]
  concerns: string[]
  follow_up_questions: string[]
}

const DEFAULT_RUBRIC = `Communication
Relevant experience
Problem solving
Motivation and fit`

const SCORECARD_PROMPT = `
You are a fair, evidence-driven interview assessor.

Role: {role}
Candidate: {candidate}
Rubric (one criterion per line, or a job description to derive criteria from):
{rubric}

Score the candidate ONLY on what the transcript shows. For every criterion, cite short
verbatim quotes with their [mm:ss] timestamp as evidence. If there is no evidence for a
criterion, score it 1 and say "No evidence in this interview".
Ignore anything unrelated to job performance (age, accent, gender, ethnicity, family,
religion, disability, appearance). Never infer protected characteristics.

Return ONLY JSON:
{
  "recommendation": "strong_yes|yes|maybe|no|strong_no",
  "overall_score": 1-5,
  "summary": "2-3 sentences",
  "criteria": [{ "name": "", "score": 1-5, "evidence": [{ "quote": "", "timestamp": "mm:ss" }], "notes": "" }],
  "strengths": [],
  "concerns": [],
  "follow_up_questions": []
}

Transcript:
{transcript}
`

const RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no", "strong_no"] as const

export function normalizeScorecard(data: Record<string, unknown>): Scorecard {
  const clampScore = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) : 1
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  const rec = RECOMMENDATIONS.includes(data.recommendation as Scorecard["recommendation"])
    ? (data.recommendation as Scorecard["recommendation"])
    : "maybe"

  const criteria = Array.isArray(data.criteria)
    ? data.criteria.map((raw) => {
        const c = (raw ?? {}) as Record<string, unknown>
        const evidence = Array.isArray(c.evidence)
          ? c.evidence
              .map((e) => (e ?? {}) as Record<string, unknown>)
              .filter((e) => typeof e.quote === "string" && e.quote)
              .map((e) => ({
                quote: e.quote as string,
                timestamp: typeof e.timestamp === "string" ? e.timestamp : undefined,
              }))
          : []
        return {
          name: typeof c.name === "string" ? c.name : "Criterion",
          score: clampScore(c.score),
          evidence,
          notes: typeof c.notes === "string" ? c.notes : "",
        }
      })
    : []

  return {
    recommendation: rec,
    overall_score: clampScore(data.overall_score),
    summary: typeof data.summary === "string" ? data.summary : "",
    criteria,
    strengths: strings(data.strengths),
    concerns: strings(data.concerns),
    follow_up_questions: strings(data.follow_up_questions),
  }
}

export async function generateScorecard(
  transcript: string,
  details: InterviewDetails,
): Promise<Scorecard> {
  // Interviews are rarely long enough to need chunking; cap defensively.
  const text = transcript.length > 120_000 ? transcript.slice(0, 120_000) : transcript
  const raw = await chatCompletion({
    systemMessage: "You return strict JSON interview scorecards.",
    userMessage: SCORECARD_PROMPT.replace("{role}", details.role || "Not specified")
      .replace("{candidate}", details.candidate || "The candidate")
      .replace("{rubric}", details.rubric?.trim() || DEFAULT_RUBRIC)
      .replace("{transcript}", text),
    jsonResponse: true,
    maxTokens: 4000,
  })
  return normalizeScorecard(parseJsonResponse(raw))
}

// ---------------------------------------------------------------------------
// Follow-up email
// ---------------------------------------------------------------------------

export async function draftFollowUpEmail(meeting: {
  title: string
  summary: string
  action_items: string[]
  decisions?: string[]
}): Promise<{ subject: string; body: string }> {
  const raw = await chatCompletion({
    systemMessage: "You write short, friendly, professional follow-up emails. Return strict JSON.",
    userMessage: `Write a follow-up email to the other participants of this conversation.
Thank them briefly, recap decisions, list action items with owners, and propose next steps.
Keep it under 200 words. Return ONLY JSON: { "subject": "", "body": "" } (body in plain text).

Title: ${meeting.title}
Summary: ${meeting.summary}
Decisions: ${(meeting.decisions ?? []).join("; ") || "none"}
Action items:
${meeting.action_items.map((a) => `- ${a}`).join("\n") || "none"}`,
    jsonResponse: true,
    maxTokens: 1200,
  })
  const data = parseJsonResponse(raw)
  return {
    subject: typeof data.subject === "string" ? data.subject : `Follow-up: ${meeting.title}`,
    body: typeof data.body === "string" ? data.body : "",
  }
}
