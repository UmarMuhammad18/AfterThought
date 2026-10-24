import { supabaseAdmin } from "@/lib/supabase"
import { embedTexts, isEmbeddingConfigured } from "@/lib/ai/embeddings"
import type { TranscriptSegment } from "@/lib/transcription"

/** Target size of a search chunk: big enough for context, small enough to cite. */
const CHUNK_CHARS = 700

export type TranscriptChunk = {
  seq: number
  speaker: string
  start_seconds: number | null
  end_seconds: number | null
  text: string
}

/** Group transcript segments into citeable chunks of a few sentences each. */
export function chunkSegments(segments: TranscriptSegment[], chunkChars = CHUNK_CHARS): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = []
  let current: TranscriptChunk | null = null

  for (const seg of segments) {
    const line = `${seg.speaker}: ${seg.text}`
    if (current && current.text.length + line.length + 1 <= chunkChars) {
      current.text += `\n${line}`
      if (seg.end !== undefined) current.end_seconds = seg.end
      if (current.speaker !== seg.speaker) current.speaker = "Multiple"
      continue
    }
    if (current) chunks.push(current)
    current = {
      seq: chunks.length,
      speaker: seg.speaker,
      start_seconds: seg.start ?? null,
      end_seconds: seg.end ?? seg.start ?? null,
      text: line,
    }
  }
  if (current) chunks.push(current)
  return chunks.map((c, i) => ({ ...c, seq: i }))
}

/**
 * Replace the search index for a meeting. Embeddings are added when an
 * embedding provider is configured; otherwise chunks are still stored so
 * keyword search can cite them.
 */
export async function indexMeetingChunks(
  meetingId: string,
  userId: string | null,
  segments: TranscriptSegment[],
): Promise<void> {
  const supabase = supabaseAdmin()
  const chunks = chunkSegments(segments)

  await supabase.from("transcript_chunks").delete().eq("meeting_id", meetingId)
  if (chunks.length === 0) return

  let embeddings: number[][] = []
  if (isEmbeddingConfigured()) {
    try {
      embeddings = await embedTexts(chunks.map((c) => c.text))
    } catch (err) {
      console.error("[indexing] embeddings failed; storing chunks without vectors:", err)
    }
  }

  const rows = chunks.map((c, i) => ({
    meeting_id: meetingId,
    user_id: userId,
    seq: c.seq,
    speaker: c.speaker,
    start_seconds: c.start_seconds,
    end_seconds: c.end_seconds,
    text: c.text,
    // pgvector accepts the JSON array text form.
    embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
  }))

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("transcript_chunks").insert(rows.slice(i, i + 200))
    if (error) throw new Error(`Indexing failed: ${error.message}`)
  }
}
