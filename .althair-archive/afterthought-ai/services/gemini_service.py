import json
import os
from typing import Any

import requests
from dotenv import load_dotenv
from pydantic import ValidationError

from models.schemas import MeetingAnalysis
from prompts.meeting_prompts import ANALYSIS_PROMPT, QA_PROMPT


load_dotenv()


class GeminiServiceError(Exception):
    """Raised when Gemini cannot produce a usable response."""


class GeminiService:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise GeminiServiceError(
                "OPENROUTER_API_KEY is missing. Add it to a .env file in afterthought-ai/."
            )

        self.api_key = api_key
        self.model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    def analyze_transcript(self, transcript: str) -> MeetingAnalysis:
        prompt = ANALYSIS_PROMPT.format(transcript=transcript)

        text = self._chat_completion(
            system_message="You return strict JSON for meeting analysis.",
            user_message=prompt,
            response_format={"type": "json_object"},
        )
        return self._parse_analysis_response(text)

    def answer_question(self, transcript: str, question: str) -> str:
        prompt = QA_PROMPT.format(transcript=transcript, question=question)

        answer = self._chat_completion(
            system_message="You answer questions about meeting transcripts.",
            user_message=prompt,
        ).strip()

        if not answer:
            raise GeminiServiceError("OpenRouter returned an empty answer.")
        return answer

    def _chat_completion(
        self,
        system_message: str,
        user_message: str,
        response_format: dict[str, Any] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.2,
            "max_tokens": 1200,
        }

        if response_format:
            payload["response_format"] = response_format

        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://127.0.0.1:8001",
                    "X-Title": "AfterThought AI",
                },
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            detail = ""
            if exc.response is not None:
                detail = f" Response: {exc.response.text}"
            raise GeminiServiceError(f"OpenRouter request failed: {exc}.{detail}") from exc

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GeminiServiceError(f"OpenRouter returned an unexpected response: {data}") from exc

    def _parse_analysis_response(self, text: str) -> MeetingAnalysis:
        raw_text = (text or "").strip()
        if not raw_text:
            raise GeminiServiceError("OpenRouter returned an empty analysis.")

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise GeminiServiceError(
                "OpenRouter returned invalid JSON. Try again or simplify the transcript."
            ) from exc

        normalized = self._normalize_analysis(data)

        try:
            return MeetingAnalysis.model_validate(normalized)
        except ValidationError as exc:
            raise GeminiServiceError(f"OpenRouter returned JSON with the wrong shape: {exc}") from exc

    def _normalize_analysis(self, data: dict[str, Any]) -> dict[str, Any]:
        """Ensure optional fields are present even when the transcript lacks them."""
        return {
            "summary": data.get("summary", ""),
            "participants": data.get("participants", []),
            "decisions": data.get("decisions", []),
            "action_items": data.get("action_items", []),
            "deadlines": data.get("deadlines", []),
            "blockers": data.get("blockers", []),
        }
