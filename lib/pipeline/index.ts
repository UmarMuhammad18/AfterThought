/**
 * The capture pipeline shared by every source.
 *
 *   createRecording()  -> meeting row in status "recording"
 *   storeSegment()     -> audio segment saved to Storage (a few minutes each)
 *   transcribeSegment()-> runs as soon as a segment lands (near-live transcript)
 *   finalizeRecording()-> merge transcripts, analyse, score, index; status "ready"
 *
 * Routes call the slow steps inside `after()` so requests return immediately.
 */

import { supabaseAdmin } from "@/lib/supabase"
import {
  activeTranscriptionProvider,
  extensionFor,
  mergeAdjacentSpeakers,
  transcribeAudio,
  transcriptToText,
  type ChannelLayout,
  type TranscriptSegment,
} from "@/lib/transcription"
import { analyzeLongTranscript, generateScorecard, type InterviewDetails } from "@/lib/ai/analysis"
import { isAiConfigured } from "@/app/api/summarize/ai/gemini-service"
import type { MeetingAnalysis } from "@/app/api/summarize/ai/schemas"
import { indexMeetingChunks } from "./indexing"
import { syncCalendarEvents, syncSpeakers } from "./side-effects"

export const RECORDINGS_BUCKET = "recordings"

export type RecordingSource =
  | "web"
  | "extension"
  | "desktop"
  | "mobile"
  | "import"
  | "whatsapp_voice"
  | "whatsapp_text"
  | "whatsapp_call"

export type MeetingKind = "meeting" | "interview"

export type CreateRecordingInput = {
  userId: string | null
  source: RecordingSource
  title?: string
  platform?: string
  layout?: ChannelLayout
  kind?: MeetingKind
  interview?: InterviewDetails
  consentConfirmed?: boolean
  whatsappPhone?: string
}

const SOURCE_TITLES: Record<RecordingSource, string> = {
  web: "Recording",
  extension: "Browser call",
  desktop: "Desktop call",
  mobile: "Phone recording",
  import: "Imported recording",
  whatsapp_voice: "WhatsApp voice note",
  whatsapp_text: "WhatsApp note",
  whatsapp_call: "WhatsApp call",
}

export async function createRecording(input: CreateRecordingInput): Promise<string> {
  const id = crypto.randomUUID()
  const { error } = await supabaseAdmin()
    .from("meetings")
    .insert({
      id,
      user_id: input.userId,
      title: input.title?.trim() || SOURCE_TITLES[input.source],
      status: "recording",
      source: input.source,
      platform: input.platform ?? null,
      channel_layout: input.layout ?? "mixed",
      kind: input.kind ?? "meeting",
      interview: input.kind === "interview" ? input.interview ?? {} : null,
      consent_confirmed: Boolean(input.consentConfirmed),
      whatsapp_phone: input.whatsappPhone ? input.whatsappPhone.replace(/\D/g, "") : null,
      summary: null,
      action_items: [],
      segments: [],
    })
  if (error) throw new Error(`Could not create recording: ${error.message}`)
  return id
}

export type MeetingOwner = { id: string; user_id: string | null; status: string; channel_layout: string | null }

/** Fetch a meeting only if it belongs to `userId`. */
export async function getOwnedMeeting(meetingId: string, userId: string): Promise<MeetingOwner | null> {
  const { data } = await supabaseAdmin()
    .from("meetings")
    .select("id, user_id, status, channel_layout")
    .eq("id", meetingId)
    .eq("user_id", userId)
    .maybeSingle()
  return (data as MeetingOwner) ?? null
}

export function segmentPath(ownerKey: string, meetingId: string, seq: number, mimeType: string) {
  return `${ownerKey}/${meetingId}/${String(seq).padStart(5, "0")}.${extensionFor(mimeType)}`
}

export type StoreSegmentInput = {
  meetingId: string
  userId: string | null
  seq: number
  audio: Buffer
  mimeType: string
  startSeconds: number
  durationSeconds?: number
}

export async function storeSegment(input: StoreSegmentInput): Promise<void> {
  const supabase = supabaseAdmin()
  const path = segmentPath(input.userId ?? "anonymous", input.meetingId, input.seq, input.mimeType)

  const { error: uploadError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, input.audio, { contentType: input.mimeType, upsert: true })
  if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`)

  await registerSegment({
    meetingId: input.meetingId,
    userId: input.userId,
    seq: input.seq,
    storagePath: path,
    mimeType: input.mimeType,
    startSeconds: input.startSeconds,
    durationSeconds: input.durationSeconds,
    sizeBytes: input.audio.length,
  })
}

/** Record a segment whose audio is already in Storage (e.g. a direct upload). */
export async function registerSegment(input: {
  meetingId: string
  userId: string | null
  seq: number
  storagePath: string
  mimeType: string
  startSeconds: number
  durationSeconds?: number
  sizeBytes?: number
}): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("recording_segments")
    .upsert(
      {
        meeting_id: input.meetingId,
        user_id: input.userId,
        seq: input.seq,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        start_seconds: input.startSeconds,
        duration_seconds: input.durationSeconds ?? null,
        size_bytes: input.sizeBytes ?? null,
        status: "uploaded",
        transcript: null,
        error: null,
      },
      { onConflict: "meeting_id,seq" },
    )
  if (error) throw new Error(`Could not save segment: ${error.message}`)
}

type SegmentRow = {
  id: string
  seq: number
  storage_path: string
  mime_type: string | null
  start_seconds: number
  duration_seconds: number | null
  status: string
  transcript: TranscriptSegment[] | null
}

/** Transcribe one stored segment. Safe to call more than once. */
export async function transcribeSegment(meetingId: string, seq: number): Promise<void> {
  const supabase = supabaseAdmin()
  const { data: meeting } = await supabase
    .from("meetings")
    .select("channel_layout")
    .eq("id", meetingId)
    .maybeSingle()
  const { data: row } = await supabase
    .from("recording_segments")
    .select("id, seq, storage_path, mime_type, start_seconds, duration_seconds, status, transcript")
    .eq("meeting_id", meetingId)
    .eq("seq", seq)
    .maybeSingle()
  if (!row) return
  const seg = row as SegmentRow
  if (seg.status === "transcribed") return

  await supabase.from("recording_segments").update({ status: "transcribing" }).eq("id", seg.id)

  try {
    const mimeType = seg.mime_type || "audio/webm"
    const layout = (meeting?.channel_layout as ChannelLayout) || "mixed"

    // Deepgram fetches large files itself; otherwise download the bytes.
    let audio: Buffer | undefined
    let url: string | undefined
    if (activeTranscriptionProvider() === "deepgram") {
      const { data: signed } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .createSignedUrl(seg.storage_path, 60 * 30)
      url = signed?.signedUrl
    }
    if (!url) {
      const { data: blob, error } = await supabase.storage.from(RECORDINGS_BUCKET).download(seg.storage_path)
      if (error || !blob) throw new Error(`Could not read audio: ${error?.message ?? "missing"}`)
      audio = Buffer.from(await blob.arrayBuffer())
    }

    const result = await transcribeAudio({
      audio,
      url,
      mimeType,
      layout,
      offsetSeconds: Number(seg.start_seconds) || 0,
    })

    await supabase
      .from("recording_segments")
      .update({
        status: "transcribed",
        transcript: result.segments,
        duration_seconds: seg.duration_seconds ?? result.durationSeconds ?? null,
        error: null,
      })
      .eq("id", seg.id)

    if (result.language) {
      await supabase.from("meetings").update({ language: result.language }).eq("id", meetingId).is("language", null)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] transcribe ${meetingId}#${seq} failed:`, message)
    await supabase.from("recording_segments").update({ status: "failed", error: message }).eq("id", seg.id)
  }
}

async function waitForInFlightSegments(meetingId: string, timeoutMs = 90_000): Promise<void> {
  const supabase = supabaseAdmin()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { count } = await supabase
      .from("recording_segments")
      .select("id", { count: "exact", head: true })
      .eq("meeting_id", meetingId)
      .eq("status", "transcribing")
    if (!count) return
    await new Promise((r) => setTimeout(r, 2000))
  }
}

/**
 * Turn a finished recording into a meeting: transcribe anything still pending,
 * merge segment transcripts, analyse, score interviews, and index for search.
 */
export async function finalizeRecording(meetingId: string): Promise<void> {
  const supabase = supabaseAdmin()
  await supabase
    .from("meetings")
    .update({ status: "processing", error: null, updated_at: new Date().toISOString() })
    .eq("id", meetingId)

  try {
    await waitForInFlightSegments(meetingId)

    const { data: pending } = await supabase
      .from("recording_segments")
      .select("seq")
      .eq("meeting_id", meetingId)
      .in("status", ["uploaded", "failed", "transcribing"])
      .order("seq")
    for (const p of pending ?? []) await transcribeSegment(meetingId, p.seq)

    const { data: rows } = await supabase
      .from("recording_segments")
      .select("seq, start_seconds, duration_seconds, status, transcript, error")
      .eq("meeting_id", meetingId)
      .order("seq")

    const segmentRows = (rows ?? []) as (SegmentRow & { error: string | null })[]

    // Text-only meetings (e.g. WhatsApp notes) have no audio: re-analyse the
    // transcript they already have.
    if (segmentRows.length === 0) {
      const { data: existing } = await supabase
        .from("meetings")
        .select("segments, duration_seconds")
        .eq("id", meetingId)
        .single()
      await completeMeeting(meetingId, (existing?.segments ?? []) as TranscriptSegment[], {
        durationSeconds: Number(existing?.duration_seconds) || 0,
      })
      return
    }

    const failed = segmentRows.filter((r) => r.status !== "transcribed")
    const segments = mergeAdjacentSpeakers(segmentRows.flatMap((r) => r.transcript ?? []))
    const duration = segmentRows.reduce(
      (max, r) => Math.max(max, Number(r.start_seconds) + Number(r.duration_seconds ?? 0)),
      segments.reduce((m, s) => Math.max(m, s.end ?? 0), 0),
    )

    if (segments.length === 0 && failed.length > 0) {
      throw new Error(failed[0].error || "Transcription failed")
    }

    await completeMeeting(meetingId, segments, { durationSeconds: duration })

    if (failed.length > 0) {
      await supabase
        .from("meetings")
        .update({ error: `${failed.length} audio segment(s) could not be transcribed.` })
        .eq("id", meetingId)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] finalize ${meetingId} failed:`, message)
    await supabase
      .from("meetings")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", meetingId)
  }
}

/**
 * Analyse a transcript and mark the meeting ready. Also used directly for
 * text-only sources (WhatsApp text notes) that have no audio.
 */
export async function completeMeeting(
  meetingId: string,
  segments: TranscriptSegment[],
  opts: { durationSeconds?: number } = {},
): Promise<{ title: string; summary: string; action_items: string[] }> {
  const supabase = supabaseAdmin()
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, title, kind, interview, source")
    .eq("id", meetingId)
    .single()
  if (!meeting) throw new Error("Meeting not found")

  const transcript = transcriptToText(segments)
  let analysis: MeetingAnalysis | null = null
  let scorecard = null

  if (isAiConfigured() && transcript.trim()) {
    try {
      analysis = await analyzeLongTranscript(transcript)
    } catch (err) {
      console.error("[pipeline] analysis failed:", err)
    }
    if (meeting.kind === "interview") {
      try {
        scorecard = await generateScorecard(transcript, (meeting.interview as InterviewDetails) ?? {})
      } catch (err) {
        console.error("[pipeline] scorecard failed:", err)
      }
    }
  }

  const actionItems = (analysis?.action_items ?? [])
    .filter((a) => a.task)
    .map((item) => {
      const meta = [item.owner, item.deadline].filter(Boolean).join(" — ")
      return meta ? `${item.task} (${meta})` : item.task
    })

  const isDefaultTitle = Object.values(SOURCE_TITLES).includes(meeting.title)
  const title = isDefaultTitle && analysis?.title ? analysis.title : meeting.title
  const summary =
    analysis?.summary ||
    (transcript ? transcript.slice(0, 280) : "No speech was detected in this recording.")

  const { error } = await supabase
    .from("meetings")
    .update({
      title,
      summary,
      action_items: actionItems,
      segments,
      analysis,
      scorecard,
      duration_seconds: opts.durationSeconds ?? 0,
      status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
  if (error) throw new Error(`Could not save meeting: ${error.message}`)

  // Search index + derived records. Failures here never fail the meeting.
  const sideEffects: Promise<unknown>[] = [indexMeetingChunks(meetingId, meeting.user_id, segments)]
  if (meeting.user_id && analysis) {
    sideEffects.push(syncSpeakers(meeting.user_id, meetingId, segments, analysis))
    sideEffects.push(syncCalendarEvents(meeting.user_id, meetingId, analysis))
  }
  const results = await Promise.allSettled(sideEffects)
  for (const r of results) {
    if (r.status === "rejected") console.error("[pipeline] side effect failed:", r.reason)
  }

  return { title, summary, action_items: actionItems }
}
