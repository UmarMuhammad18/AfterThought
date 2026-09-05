/**
 * Turns a processed meeting into a clean WhatsApp message.
 */

export type MeetingForReply = {
  id: string
  title?: string
  summary?: string
  action_items?: string[] | { text: string; owner?: string }[]
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

  return (
    `📝 *${title}*\n\n` +
    `${summary}` +
    actions +
    `\n\nReply with any question about this meeting or past ones.`
  )
}

export function formatErrorReply(message: string): string {
  return `⚠️ ${message}\n\nTry sending a voice note or text again.`
}

export function formatHelpReply(): string {
  return (
    `👋 *AfterThought on WhatsApp*\n\n` +
    `Send me:\n` +
    `• A *voice note* of a meeting → I will transcribe + summarize it\n` +
    `• Text notes → I will structure them\n` +
    `• A question about a past meeting\n\n` +
    `Coming soon: call the number and I will record + note the call automatically.`
  )
}
