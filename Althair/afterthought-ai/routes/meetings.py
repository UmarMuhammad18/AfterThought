from fastapi import APIRouter, HTTPException

from models.schemas import (
    AnalyzeRequest,
    AskRequest,
    MeetingAnalysis,
    QuestionAnswer,
)
from services.gemini_service import GeminiService, GeminiServiceError


router = APIRouter(tags=["meetings"])


def get_gemini_service() -> GeminiService:
    return GeminiService()


@router.post("/analyze", response_model=MeetingAnalysis)
def analyze_transcript(payload: AnalyzeRequest):
    try:
        gemini_service = get_gemini_service()
        return gemini_service.analyze_transcript(payload.transcript)
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/ask", response_model=QuestionAnswer)
def ask_question(payload: AskRequest):
    try:
        gemini_service = get_gemini_service()
        answer = gemini_service.answer_question(
            transcript=payload.transcript,
            question=payload.question,
        )
        return QuestionAnswer(answer=answer)
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
