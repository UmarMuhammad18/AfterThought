// Ported from Althair/afterthought-ai/services/gemini_service.py
// Faithful TypeScript port of the OpenRouter-backed meeting AI service.
// Preserves the original env-var contract (OPENROUTER_API_KEY / GEMINI_API_KEY,
// OPENROUTER_MODEL) and the OpenRouter chat-completions endpoint.

import { ANALYSIS_PROMPT, QA_PROMPT } from "./prompts"
import { normalizeAnalysis, type MeetingAnalysis } from "./schemas"

const API_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "google/gemini-2.5-flash"

export class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GeminiServiceError"
  }
}

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || null
}

// True when an API key is configured. Callers use this to decide whether to
// run real analysis or fall back to existing placeholder behavior.
export function isAiConfigured(): boolean {
  return getApiKey() !== null
}

interface ChatCompletionOptions {
  systemMessage: string
  userMessage: string
  jsonResponse?: boolean
}

async function chatCompletion({
  systemMessage,
  userMessage,
  jsonResponse,
}: ChatCompletionOptions): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new GeminiServiceError(
      "OPENROUTER_API_KEY is missing. Add it to the project environment to enable AI analysis."
    )
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  }

  if (jsonResponse) {
    payload.response_format = { type: "json_object" }
  }

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://afterthought.app",
        "X-Title": "AfterThought AI",
      },
      body: JSON.stringify(payload),
    })
  } catch (exc) {
    throw new GeminiServiceError(`OpenRouter request failed: ${String(exc)}.`)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new GeminiServiceError(
      `OpenRouter request failed: ${response.status} ${response.statusText}. Response: ${detail}`
    )
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new GeminiServiceError(
      `OpenRouter returned an unexpected response: ${JSON.stringify(data)}`
    )
  }
  return content
}

function parseAnalysisResponse(text: string): MeetingAnalysis {
  const rawText = (text || "").trim()
  if (!rawText) {
    throw new GeminiServiceError("OpenRouter returned an empty analysis.")
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(rawText) as Record<string, unknown>
  } catch {
    throw new GeminiServiceError(
      "OpenRouter returned invalid JSON. Try again or simplify the transcript."
    )
  }

  return normalizeAnalysis(data)
}

// Equivalent to GeminiService.analyze_transcript.
export async function analyzeTranscript(transcript: string): Promise<MeetingAnalysis> {
  const prompt = ANALYSIS_PROMPT.replace("{transcript}", transcript)
  const text = await chatCompletion({
    systemMessage: "You return strict JSON for meeting analysis.",
    userMessage: prompt,
    jsonResponse: true,
  })
  return parseAnalysisResponse(text)
}

// Equivalent to GeminiService.answer_question.
export async function answerQuestion(transcript: string, question: string): Promise<string> {
  const prompt = QA_PROMPT.replace("{transcript}", transcript).replace("{question}", question)
  const answer = (
    await chatCompletion({
      systemMessage: "You answer questions about meeting transcripts.",
      userMessage: prompt,
    })
  ).trim()

  if (!answer) {
    throw new GeminiServiceError("OpenRouter returned an empty answer.")
  }
  return answer
}
