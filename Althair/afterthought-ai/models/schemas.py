from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Plain-text meeting transcript.")


class AskRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Plain-text meeting transcript.")
    question: str = Field(..., min_length=1, description="Question about the transcript.")


class ActionItem(BaseModel):
    owner: str = ""
    task: str = ""
    deadline: str = ""


class MeetingAnalysis(BaseModel):
    summary: str = ""
    participants: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    deadlines: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)


class QuestionAnswer(BaseModel):
    answer: str
