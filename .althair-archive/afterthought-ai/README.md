# AfterThought AI

AfterThought is a local FastAPI backend that turns meeting transcripts into structured meeting intelligence.

It can:

- Summarize meetings
- Identify participants
- Extract decisions
- Extract action items, owners, and deadlines
- Detect blockers
- Answer questions about a transcript

## Project Structure

```text
afterthought-ai/
├── app.py
├── routes/
│   ├── __init__.py
│   └── meetings.py
├── services/
│   ├── __init__.py
│   └── gemini_service.py
├── prompts/
│   ├── __init__.py
│   └── meeting_prompts.py
├── models/
│   ├── __init__.py
│   └── schemas.py
├── .env.example
├── requirements.txt
├── sample_meeting.txt
└── README.md
```

## When To Add Your OpenRouter API Key

Add your key before running the server.

1. Copy `.env.example` to `.env`.
2. Paste your key into `.env`:

```env
OPENROUTER_API_KEY=your_real_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash
```

Do not commit `.env` to GitHub.

OpenRouter keys usually start with `sk-or-`. They are different from Google AI Studio Gemini keys.

## Install

```bash
cd afterthought-ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

## Run

```bash
uvicorn app:app --reload
```

Open the API docs:

```text
http://127.0.0.1:8000/docs
```

## Analyze Endpoint

`POST /analyze`

Request:

```json
{
  "transcript": "Alice: The API is too slow. Ben: I will redesign the API before Friday. Alice: Decision is to deploy next Tuesday."
}
```

Response:

```json
{
  "summary": "The team discussed API performance and agreed to redesign the API. Ben will complete the redesign before Friday, and the team plans to deploy next Tuesday.",
  "participants": ["Alice", "Ben"],
  "decisions": ["The team agreed to redesign the API.", "The team agreed to deploy next Tuesday."],
  "action_items": [
    {
      "owner": "Ben",
      "task": "Redesign the API",
      "deadline": "Friday"
    }
  ],
  "deadlines": ["Friday", "next Tuesday"],
  "blockers": []
}
```

## Ask Endpoint

`POST /ask`

Request:

```json
{
  "transcript": "Alice: The API is too slow. Ben: I will redesign the API before Friday. Alice: Decision is to deploy next Tuesday.",
  "question": "Who owns the API redesign?"
}
```

Response:

```json
{
  "answer": "Ben owns the API redesign and is expected to complete it before Friday."
}
```

## File Guide

- `app.py`: Creates the FastAPI app, adds CORS, and registers routes.
- `routes/meetings.py`: Defines `/analyze` and `/ask`.
- `services/gemini_service.py`: Calls OpenRouter's chat completions API and validates the response.
- `prompts/meeting_prompts.py`: Stores reusable prompts.
- `models/schemas.py`: Defines request and response models with Pydantic.
- `.env.example`: Shows where your OpenRouter API key goes.
- `requirements.txt`: Python dependencies.
- `sample_meeting.txt`: Five realistic transcripts for testing.

## Chrome Extension Integration Later

A Chrome Extension can call this local backend with `fetch`.

```js
const response = await fetch("http://127.0.0.1:8000/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transcript })
});

const analysis = await response.json();
```
