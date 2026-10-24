/**
 * Minimal iCalendar (.ics) generation so action items can be added to any
 * calendar app (Google, Outlook, Apple, Proton, ...) without OAuth.
 */

export type IcsEvent = {
  id: string
  title: string
  due: Date
  description?: string
  url?: string
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

function formatDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** Fold lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = " " + rest.slice(74)
  }
  out.push(rest)
  return out.join("\r\n")
}

export function buildIcs(events: IcsEvent[], calendarName = "AfterThought"): string {
  const stamp = formatDate(new Date())
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AfterThought//Action items//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]
  for (const e of events) {
    const end = new Date(e.due.getTime() + 30 * 60 * 1000)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@afterthought`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatDate(e.due)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
    )
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    if (e.url) lines.push(`URL:${e.url}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}
