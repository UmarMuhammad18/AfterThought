from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routes.meetings import router as meetings_router


app = FastAPI(
    title="AfterThought AI",
    description="AI-powered meeting memory assistant for transcript analysis and Q&A.",
    version="0.1.0",
)

# Permissive CORS keeps local frontend integration simple for a hackathon.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "AfterThought AI backend is running.",
        "endpoints": ["/analyze", "/ask"],
    }
