import { supabaseAdmin } from "@/lib/supabase"
import { embedText, isEmbeddingConfigured } from "./embeddings"
import { formatTimestamp } from "@/lib/transcription"
import type { EvidenceSnippet } from "./meeting-memory"

/**
 * Find transcript passages by meaning rather than exact words
 * ("budget" finds "pricing", "cost", "how much it'll be").
 * Returns [] when embeddings aren't configured, so callers can always merge.
 */
export async function semanticEvidence(
  question: string,
  userId: string,
  opts: { meetingId?: string; limit?: number; minSimilarity?: number } = {},
): Promise<EvidenceSnippet[]> {
  if (!isEmbeddingConfigured() || !question.trim()) return []

  try {
    const embedding = await embedText(question)
    if (!embedding) return []

    const supabase = supabaseAdmin()
    const { data, error } = await supabase.rpc("match_transcript_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_user_id: userId,
      match_count: opts.limit ?? 10,
      match_meeting_id: opts.meetingId ?? null,
    })
    if (error) {
      console.warn("[semantic-search] rpc failed:", error.message)
      return []
    }

    const rows = (data ?? []) as {
      meeting_id: string
      speaker: string | null
      start_seconds: number | null
      text: string
      similarity: number
    }[]
    const relevant = rows.filter((r) => r.similarity >= (opts.minSimilarity ?? 0.25))
    if (relevant.length === 0) return []

    const ids = [...new Set(relevant.map((r) => r.meeting_id))]
    const { data: meetings } = await supabase.from("meetings").select("id, title").in("id", ids)
    const titles = new Map((meetings ?? []).map((m) => [m.id, m.title as string]))

    return relevant.map((r) => ({
      text: r.text,
      speaker: r.speaker ?? undefined,
      start: r.start_seconds ?? undefined,
      timestamp: r.start_seconds != null ? formatTimestamp(Number(r.start_seconds)) : undefined,
      meetingId: r.meeting_id,
      meetingTitle: titles.get(r.meeting_id) ?? "Meeting",
      score: r.similarity,
    }))
  } catch (err) {
    console.warn("[semantic-search] failed:", err)
    return []
  }
}
