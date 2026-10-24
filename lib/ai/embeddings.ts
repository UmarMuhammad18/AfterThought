/**
 * Text embeddings for semantic search over transcripts.
 * Uses OpenAI's embeddings API when OPENAI_API_KEY is set; otherwise search
 * falls back to keyword ranking only.
 */

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
/** Must match the vector(...) size in supabase/capture.sql. */
export const EMBEDDING_DIMENSIONS = 1536

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!isEmbeddingConfigured() || texts.length === 0) return []

  const out: number[][] = []
  // Stay well under the API's per-request input limits.
  for (let i = 0; i < texts.length; i += 96) {
    const batch = texts.slice(i, i + 96).map((t) => t.slice(0, 8000))
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`Embeddings API ${res.status}: ${detail.slice(0, 300)}`)
    }
    const data = (await res.json()) as { data: { embedding: number[]; index: number }[] }
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    out.push(...sorted.map((d) => d.embedding))
  }
  return out
}

export async function embedText(text: string): Promise<number[] | null> {
  const [vec] = await embedTexts([text])
  return vec ?? null
}
