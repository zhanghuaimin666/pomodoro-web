import datetime

from pydantic import BaseModel, Field


class PomodoroSessionCreate(BaseModel):
    date: datetime.date
    focus_ms: int = Field(default=0, ge=0)
    completed_pomodoros: int = Field(default=0, ge=0)
    interruptions: int = Field(default=0, ge=0)
    focus_hours: list[int] = Field(default_factory=lambda: [0] * 24, min_length=24, max_length=24)


class PomodoroSessionOut(PomodoroSessionCreate):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class TodoCreate(BaseModel):
    text: str
    done: bool = False
    position: int = 0


class TodoOut(TodoCreate):
    id: int
    date: datetime.date
    created_at: datetime.datetime
    pomodoro_count: int = 0
    focus_ms: int = 0

    model_config = {"from_attributes": True}


class TodoPomodoroCreate(BaseModel):
    focus_ms: int = Field(gt=0, le=24 * 60 * 60 * 1000)


class StatsOut(BaseModel):
    total_focus_ms: int = 0
    total_pomodoros: int = 0
    total_interruptions: int = 0
    daily_breakdown: list[dict] = []
