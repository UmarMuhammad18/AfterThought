// AI logic used by the transcribe route. The canonical implementation lives in
// app/api/summarize/ai (ported from Althair/afterthought-ai); we re-expose the
// transcript-analysis entry point here so the route imports from its own folder.

export {
  analyzeTranscript,
  isAiConfigured,
  GeminiServiceError,
} from "@/app/api/summarize/ai/gemini-service"

export type { MeetingAnalysis, ActionItem } from "@/app/api/summarize/ai/schemas"
