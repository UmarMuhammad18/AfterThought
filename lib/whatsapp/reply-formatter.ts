/**
 * Turns a processed meeting into a clean WhatsApp message.
 */

export type MeetingForReply = {
  id: string
  title?: string
  summary?: string | null
  action_items?: string[] | { text: string; owner?: string }[] | null
  scorecard?: { recommendation?: string; overall_score?: number; summary?: string } | null
}

const RECOMMENDATIONS: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  strong_no: "Strong no",
}

function appUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || null
}

export function formatMeetingReply(meeting: MeetingForReply): string {
  const title = meeting.title || "Meeting notes"
  const summary = meeting.summary?.trim() || "No summary available."

  let actions = ""
  if (meeting.action_items && meeting.action_items.length > 0) {
    actions =
      "\n\n✅ *Action items*\n" +
      meeting.action_items
        .map((item, i) => {
          if (typeof item === "string") return `${i + 1}. ${item}`
          const owner = item.owner ? ` (${item.owner})` : ""
          return `${i + 1}. ${item.text}${owner}`
        })
        .join("\n")
  }

  let scorecard = ""
  if (meeting.scorecard?.recommendation) {
    scorecard =
      `\n\n🎯 *Interview:* ${RECOMMENDATIONS[meeting.scorecard.recommendation] ?? meeting.scorecard.recommendation}` +
      (meeting.scorecard.overall_score ? ` (${meeting.scorecard.overall_score}/5)` : "")
  }

  const url = appUrl()
  const link = url ? `\n\n🔗 Full transcript & audio: ${url}/meeting/${meeting.id}` : ""

  return (
    `📝 *${title}*\n\n` +
    `${summary}` +
    scorecard +
    actions +
    link +
    `\n\nReply with any question about this conversation or past ones.`
  )
}

export function formatErrorReply(message: string): string {
  return `⚠️ ${message}`
}

export function formatHelpReply(): string {
  return (
    `👋 *AfterThought on WhatsApp*\n\n` +
    `Send me:\n` +
    `• A *voice note* → transcript, summary and action items\n` +
    `• A *call recording* (forward it, or share it from your phone's recorder)\n` +
    `• *Text notes* → structured notes\n` +
    `• A *question* about any past conversation\n` +
    `• *link 123456* → connect this number to your AfterThought account (get the code in Settings)`
  )
}
