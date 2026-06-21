// Ported from Althair/afterthought-ai/models/schemas.py
// Type definitions and a normalizer/validator for the meeting-analysis payload.

export interface ActionItem {
  owner: string
  task: string
  deadline: string
}

export interface MeetingAnalysis {
  summary: string
  participants: string[]
  decisions: string[]
  action_items: ActionItem[]
  deadlines: string[]
  blockers: string[]
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

// Mirrors GeminiService._normalize_analysis: ensures every field is present
// even when the model omits it, then coerces to the MeetingAnalysis shape.
export function normalizeAnalysis(data: Record<string, unknown>): MeetingAnalysis {
  return {
    summary: typeof data.summary === "string" ? data.summary : "",
    participants: asStringArray(data.participants),
    decisions: asStringArray(data.decisions),
    action_items: asActionItems(data.action_items),
    deadlines: asStringArray(data.deadlines),
    blockers: asStringArray(data.blockers),
  }
}
