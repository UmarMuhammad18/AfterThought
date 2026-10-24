/**
 * Cross-meeting insights computed from real meetings (no sample data).
 */

import { isGenericSpeaker } from "@/lib/pipeline/side-effects"

export type InsightMeeting = {
  id: string
  title: string
  created_at: string
  duration_seconds: number | null
  kind: string | null
  action_items: string[] | null
  segments: { speaker: string; text: string }[] | null
  analysis: {
    topics?: string[]
    decisions?: string[]
    sentiment?: { positive: number; neutral: number; negative: number } | null
  } | null
}

const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves yeah yes okay ok like um uh gonna got get going know think really right well actually also one two thing things lot kind sort mean said say see go come want need make made way time just still even back much many something anything everything maybe sure good great cool thanks thank hello hi bye`.split(
    /\s+/,
  ),
)

function weekStart(iso: string): string {
  const d = new Date(iso)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function computeInsights(meetings: InsightMeeting[]) {
  const totals = {
    meetings: meetings.length,
    hours: Math.round((meetings.reduce((s, m) => s + (Number(m.duration_seconds) || 0), 0) / 3600) * 10) / 10,
    actionItems: meetings.reduce((s, m) => s + (m.action_items?.length ?? 0), 0),
    interviews: meetings.filter((m) => m.kind === "interview").length,
    decisions: meetings.reduce((s, m) => s + (m.analysis?.decisions?.length ?? 0), 0),
  }

  // Topics: how many meetings each theme came up in.
  const topicCounts = new Map<string, { label: string; count: number }>()
  for (const m of meetings) {
    for (const t of new Set((m.analysis?.topics ?? []).map((x) => x.trim()).filter(Boolean))) {
      const key = t.toLowerCase()
      const entry = topicCounts.get(key) ?? { label: t, count: 0 }
      entry.count++
      topicCounts.set(key, entry)
    }
  }
  const topTopics = [...topicCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8)

  // Keywords: frequent meaningful words across transcripts.
  const words = new Map<string, number>()
  for (const m of meetings) {
    for (const s of m.segments ?? []) {
      for (const w of s.text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]{3,}/gu) ?? []) {
        if (!STOPWORDS.has(w)) words.set(w, (words.get(w) ?? 0) + 1)
      }
    }
  }
  const topKeywords = [...words.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([label, count]) => ({ label, count }))

  // People: speaking turns by named speakers.
  const people = new Map<string, number>()
  for (const m of meetings) {
    for (const s of m.segments ?? []) {
      if (!isGenericSpeaker(s.speaker)) people.set(s.speaker, (people.get(s.speaker) ?? 0) + 1)
    }
  }
  const peopleMentions = [...people.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, turns]) => ({
      name,
      initials: name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      turns,
    }))

  // Decisions, newest first.
  const decisionTimeline = meetings
    .flatMap((m) =>
      (m.analysis?.decisions ?? []).map((title) => ({
        title,
        meetingId: m.id,
        meeting: m.title,
        date: m.created_at,
      })),
    )
    .slice(0, 12)

  // Average tone, weighted equally per meeting.
  const sentiments = meetings.map((m) => m.analysis?.sentiment).filter((s): s is NonNullable<typeof s> => !!s)
  const sentiment = sentiments.length
    ? {
        positive: Math.round(sentiments.reduce((a, s) => a + s.positive, 0) / sentiments.length),
        neutral: Math.round(sentiments.reduce((a, s) => a + s.neutral, 0) / sentiments.length),
        negative: Math.round(sentiments.reduce((a, s) => a + s.negative, 0) / sentiments.length),
      }
    : null

  // Activity: meetings per week, last 8 weeks (including empty weeks).
  const weeks: { week: string; meetings: number; hours: number }[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push({ week: weekStart(d.toISOString()), meetings: 0, hours: 0 })
  }
  const byWeek = new Map(weeks.map((w) => [w.week, w]))
  for (const m of meetings) {
    const w = byWeek.get(weekStart(m.created_at))
    if (w) {
      w.meetings++
      w.hours += (Number(m.duration_seconds) || 0) / 3600
    }
  }
  weeks.forEach((w) => (w.hours = Math.round(w.hours * 10) / 10))

  return { totals, topTopics, topKeywords, peopleMentions, decisionTimeline, sentiment, activity: weeks }
}

export type Insights = ReturnType<typeof computeInsights>
