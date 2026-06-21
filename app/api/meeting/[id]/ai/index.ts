// AI logic used by the meeting route for transcript Q&A. The canonical
// implementation lives in app/api/summarize/ai (ported from
// Althair/afterthought-ai); we re-expose the Q&A entry point here so the route
// imports from its own folder.

export {
  answerQuestion,
  isAiConfigured,
  GeminiServiceError,
} from "@/app/api/summarize/ai/gemini-service"
