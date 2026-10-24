/**
 * Speech-to-text shared by every capture source (web, extension, desktop,
 * mobile, imports, WhatsApp).
 *
 * Providers, in order of preference:
 * - Deepgram (DEEPGRAM_API_KEY): speaker diarization, multichannel "me / them"
 *   separation, multilingual code-switching, and large files by URL.
 * - OpenAI (OPENAI_API_KEY): Whisper-style transcription, 25 MB per request.
 * - Placeholder: keeps the pipeline testable without keys.
 */

export type TranscriptSegment = {
  speaker: string
  text: string
  /** mm:ss label kept for older UI / WhatsApp formatting. */
  timestamp?: string
  /** Seconds from the start of the whole recording. */
  start?: number
  end?: number
}

export type TranscriptionProvider = "deepgram" | "openai" | "placeholder"

export type TranscriptionResult = {
  text: string
  segments: TranscriptSegment[]
  provider: TranscriptionProvider
  language?: string
  durationSeconds?: number
}

/**
 * "mixed": one track containing everyone (mic only, or a phone recording).
 * "me-them": stereo, left channel = the user's mic, right = the other side.
 */
export type ChannelLayout = "mixed" | "me-them"

export type TranscribeInput = {
  /** Raw audio bytes. Provide this or `url`. */
  audio?: Buffer
  /** Signed URL to the audio (lets Deepgram fetch large files directly). */
  url?: string
  mimeType?: string
  layout?: ChannelLayout
  /** Offset added to every timestamp (for segment N of a long recording). */
  offsetSeconds?: number
}

/** OpenAI's hard per-request upload limit. */
export const OPENAI_MAX_BYTES = 25 * 1024 * 1024

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TranscriptionError"
  }
}

export function activeTranscriptionProvider(): TranscriptionProvider {
  if (process.env.DEEPGRAM_API_KEY) return "deepgram"
  if (process.env.OPENAI_API_KEY) return "openai"
  return "placeholder"
}

export async function transcribeAudio(input: TranscribeInput): Promise<TranscriptionResult> {
  const provider = activeTranscriptionProvider()
  if (provider === "deepgram") return transcribeWithDeepgram(input)
  if (provider === "openai") return transcribeWithOpenAI(input)

  const text =
    "(Placeholder transcript — set DEEPGRAM_API_KEY or OPENAI_API_KEY to enable real transcription.)"
  const start = input.offsetSeconds ?? 0
  return {
    text,
    segments: [{ speaker: "Speaker", text, start, timestamp: formatTimestamp(start) }],
    provider: "placeholder",
  }
}

// ---------------------------------------------------------------------------
// Deepgram
// ---------------------------------------------------------------------------

type DeepgramUtterance = {
  start: number
  end: number
  transcript: string
  speaker?: number
  channel?: number
}

type DeepgramResponse = {
  metadata?: { duration?: number }
  results?: {
    channels?: { detected_language?: string; alternatives?: { transcript?: string }[] }[]
    utterances?: DeepgramUtterance[]
  }
}

async function transcribeWithDeepgram(input: TranscribeInput): Promise<TranscriptionResult> {
  const layout = input.layout ?? "mixed"
  const offset = input.offsetSeconds ?? 0

  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL || "nova-3",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
    diarize: "true",
    // "multi" handles speakers switching languages mid-sentence.
    language: process.env.DEEPGRAM_LANGUAGE || "multi",
  })
  if (layout === "me-them") params.set("multichannel", "true")

  let body: BodyInit
  const headers: Record<string, string> = {
    Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
  }
  if (input.audio) {
    body = new Uint8Array(input.audio)
    headers["Content-Type"] = input.mimeType || "audio/webm"
  } else if (input.url) {
    body = JSON.stringify({ url: input.url })
    headers["Content-Type"] = "application/json"
  } else {
    throw new TranscriptionError("No audio or URL provided.")
  }

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers,
    body,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new TranscriptionError(`Deepgram ${res.status}: ${detail.slice(0, 500)}`)
  }

  const data = (await res.json()) as DeepgramResponse
  let utterances = data.results?.utterances ?? []
  if (layout === "me-them") utterances = dropMicEcho(utterances)

  const segments: TranscriptSegment[] = utterances
    .filter((u) => u.transcript?.trim())
    .sort((a, b) => a.start - b.start)
    .map((u) => {
      const start = offset + u.start
      return {
        speaker: speakerLabel(layout, u.channel ?? 0, u.speaker ?? 0),
        text: u.transcript.trim(),
        start,
        end: offset + u.end,
        timestamp: formatTimestamp(start),
      }
    })

  return {
    text: segments.map((s) => s.text).join(" "),
    segments: mergeAdjacentSpeakers(segments),
    provider: "deepgram",
    language: data.results?.channels?.[0]?.detected_language,
    durationSeconds: data.metadata?.duration,
  }
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean),
  )
}

/**
 * Without headphones the mic (channel 0) also hears the other side, so their
 * words show up twice. Drop mic utterances that overlap in time with, and
 * mostly repeat, an utterance on the call-audio channel.
 */
export function dropMicEcho<T extends { start: number; end: number; transcript: string; channel?: number }>(
  utterances: T[],
  threshold = 0.6,
): T[] {
  const remote = utterances.filter((u) => (u.channel ?? 0) === 1).map((u) => ({ u, words: tokens(u.transcript) }))
  if (remote.length === 0) return utterances

  return utterances.filter((u) => {
    if ((u.channel ?? 0) !== 0) return true
    const words = tokens(u.transcript)
    if (words.size === 0) return false
    return !remote.some(({ u: r, words: rw }) => {
      const overlaps = u.start < r.end + 1 && r.start < u.end + 1
      if (!overlaps) return false
      let shared = 0
      for (const w of words) if (rw.has(w)) shared++
      return shared / words.size >= threshold
    })
  })
}

function speakerLabel(layout: ChannelLayout, channel: number, speaker: number): string {
  if (layout === "me-them") {
    if (channel === 0) return "You"
    return speaker === 0 ? "Them" : `Them ${speaker + 1}`
  }
  return `Speaker ${speaker + 1}`
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

type OpenAIVerbose = {
  text?: string
  language?: string
  duration?: number
  segments?: { start?: number; end?: number; text?: string }[]
}

async function transcribeWithOpenAI(input: TranscribeInput): Promise<TranscriptionResult> {
  let audio = input.audio
  if (!audio && input.url) {
    const res = await fetch(input.url)
    if (!res.ok) throw new TranscriptionError(`Could not download audio (${res.status}).`)
    audio = Buffer.from(await res.arrayBuffer())
  }
  if (!audio) throw new TranscriptionError("No audio or URL provided.")

  if (audio.length > OPENAI_MAX_BYTES) {
    throw new TranscriptionError(
      "This file is larger than 25 MB, OpenAI's per-file limit. Set DEEPGRAM_API_KEY to transcribe large files, or record with AfterThought (which uploads in small segments).",
    )
  }

  const mimeType = input.mimeType || "audio/webm"
  const offset = input.offsetSeconds ?? 0

  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `audio.${extensionFor(mimeType)}`)
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1")
  form.append("response_format", "verbose_json")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new TranscriptionError(`OpenAI ${res.status}: ${detail.slice(0, 500)}`)
  }

  const data = (await res.json()) as OpenAIVerbose
  const fullText = (data.text || "").trim()
  const segments: TranscriptSegment[] =
    data.segments && data.segments.length > 0
      ? data.segments
          .filter((s) => s.text?.trim())
          .map((s) => {
            const start = offset + (s.start ?? 0)
            return {
              speaker: "Speaker",
              text: (s.text || "").trim(),
              start,
              end: offset + (s.end ?? s.start ?? 0),
              timestamp: formatTimestamp(start),
            }
          })
      : fullText
        ? [{ speaker: "Speaker", text: fullText, start: offset, timestamp: formatTimestamp(offset) }]
        : []

  return {
    text: fullText,
    segments: mergeAdjacentSpeakers(segments),
    provider: "openai",
    language: data.language,
    durationSeconds: data.duration,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function extensionFor(mimeType: string): string {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
  if (mimeType.includes("wav")) return "wav"
  if (mimeType.includes("webm")) return "webm"
  if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac")) return "m4a"
  if (mimeType.includes("flac")) return "flac"
  return "ogg"
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

/**
 * Join consecutive segments from the same speaker into one block, as long as
 * the gap between them is short. Keeps transcripts readable.
 */
export function mergeAdjacentSpeakers(
  segments: TranscriptSegment[],
  maxGapSeconds = 2,
  maxChars = 1200,
): TranscriptSegment[] {
  const out: TranscriptSegment[] = []
  for (const seg of segments) {
    const prev = out[out.length - 1]
    const gap =
      prev?.end !== undefined && seg.start !== undefined ? seg.start - prev.end : 0
    if (
      prev &&
      prev.speaker === seg.speaker &&
      gap <= maxGapSeconds &&
      prev.text.length + seg.text.length < maxChars
    ) {
      prev.text = `${prev.text} ${seg.text}`
      if (seg.end !== undefined) prev.end = seg.end
    } else {
      out.push({ ...seg })
    }
  }
  return out
}

export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `${s.timestamp ? `[${s.timestamp}] ` : ""}${s.speaker}: ${s.text}`)
    .join("\n")
}
