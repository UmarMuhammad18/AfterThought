// Ported from Althair/afterthought-ai/models/schemas.py
// Type definitions and a normalizer/validator for the meeting-analysis payload.

export interface ActionItem {
  owner: string
  task: string
  deadline: string
}

export interface Sentiment {
  positive: number
  neutral: number
  negative: number
}

export interface MeetingAnalysis {
  title: string
  summary: string
  participants: string[]
  decisions: string[]
  action_items: ActionItem[]
  deadlines: string[]
  blockers: string[]
  topics: string[]
  sentiment: Sentiment | null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function asActionItems(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>
    return {
      owner: typeof item.owner === "string" ? item.owner : "",
      task: typeof item.task === "string" ? item.task : "",
      deadline: typeof item.deadline === "string" ? item.deadline : "",
    }
  })
}

function asSentiment(value: unknown): Sentiment | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, x) : 0)
  const positive = num(v.positive)
  const neutral = num(v.neutral)
  const negative = num(v.negative)
  const total = positive + neutral + negative
  if (total <= 0) return null
  // Normalize to percentages that add up to 100.
  return {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
  }
}

// Mirrors GeminiService._normalize_analysis: ensures every field is present
// even when the model omits it, then coerces to the MeetingAnalysis shape.
export function normalizeAnalysis(data: Record<string, unknown>): MeetingAnalysis {
  return {
    title: typeof data.title === "string" ? data.title.trim() : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    participants: asStringArray(data.participants),
    decisions: asStringArray(data.decisions),
    action_items: asActionItems(data.action_items),
    deadlines: asStringArray(data.deadlines),
    blockers: asStringArray(data.blockers),
    topics: asStringArray(data.topics).slice(0, 8),
    sentiment: asSentiment(data.sentiment),
  }
}
