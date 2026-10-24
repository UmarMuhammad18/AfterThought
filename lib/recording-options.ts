import type { ChannelLayout } from "@/lib/transcription"
import type { MeetingKind, RecordingSource } from "@/lib/pipeline"
import type { InterviewDetails } from "@/lib/ai/analysis"

const SOURCES: RecordingSource[] = ["web", "extension", "desktop", "mobile", "import"]

/** Validate the options a client sends when starting a recording. */
export function parseRecordingOptions(body: Record<string, unknown>) {
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : undefined)

  const source = SOURCES.includes(body.source as RecordingSource)
    ? (body.source as RecordingSource)
    : "web"
  const layout: ChannelLayout = body.layout === "me-them" ? "me-them" : "mixed"
  const kind: MeetingKind = body.kind === "interview" ? "interview" : "meeting"

  const rawInterview = (body.interview ?? {}) as Record<string, unknown>
  const interview: InterviewDetails | undefined =
    kind === "interview"
      ? {
          candidate: str(rawInterview.candidate),
          role: str(rawInterview.role),
          rubric: str(rawInterview.rubric, 8000),
        }
      : undefined

  return {
    source,
    layout,
    kind,
    interview,
    title: str(body.title),
    platform: str(body.platform, 40),
    consentConfirmed: body.consentConfirmed === true,
  }
}
