/**
 * Speech-to-text for WhatsApp voice notes / call recordings.
 * Uses OpenAI Whisper when OPENAI_API_KEY is set.
 * Falls back to a clear placeholder so the rest of the pipeline still works.
 */

export type TranscriptSegment = {
  speaker: string
  text: string
  timestamp?: string
}

export type TranscriptionResult = {
  text: string
  segments: TranscriptSegment[]
  provider: "openai-whisper" | "placeholder"
}

function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Transcribe an audio buffer.
 * @param audio Buffer of the audio file (ogg/mp3/wav/webm/m4a)
 * @param mimeType optional MIME type hint
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType = "audio/ogg",
): Promise<TranscriptionResult> {
  if (audio.length === 0) {
    return {
      text: "",
      segments: [],
      provider: "placeholder",
    }
  }

  if (isOpenAiConfigured()) {
    try {
      return await transcribeWithWhisper(audio, mimeType)
    } catch (err) {
      console.error("[transcription] Whisper failed, falling back:", err)
    }
  }

  // Placeholder so the pipeline is testable without keys
  const placeholder =
    "(Placeholder transcript — set OPENAI_API_KEY to enable real Whisper transcription.)"
  return {
    text: placeholder,
    segments: [{ speaker: "Speaker", text: placeholder }],
    provider: "placeholder",
  }
}

async function transcribeWithWhisper(
  audio: Buffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const form = new FormData()
  const ext = mimeType.includes("mpeg") || mimeType.includes("mp3")
    ? "mp3"
    : mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("mp4") || mimeType.includes("m4a")
          ? "m4a"
          : "ogg"

  const blob = new Blob([audio], { type: mimeType })
  form.append("file", blob, `audio.${ext}`)
  form.append("model", "whisper-1")
  form.append("response_format", "verbose_json")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Whisper API ${res.status}: ${detail}`)
  }

  const data = (await res.json()) as {
    text?: string
    segments?: { start?: number; text?: string }[]
  }

  const fullText = (data.text || "").trim()
  const segments: TranscriptSegment[] =
    data.segments && data.segments.length > 0
      ? data.segments.map((s, i) => ({
          speaker: "Speaker",
          text: (s.text || "").trim(),
          timestamp: formatTimestamp(s.start ?? i * 5),
        }))
      : fullText
        ? [{ speaker: "Speaker", text: fullText }]
        : []

  return {
    text: fullText,
    segments,
    provider: "openai-whisper",
  }
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
