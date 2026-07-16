import datetime

from pydantic import BaseModel


class PomodoroSessionCreate(BaseModel):
    date: datetime.date
    focus_ms: int = 0
    completed_pomodoros: int = 0
    interruptions: int = 0


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

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    total_focus_ms: int = 0
    total_pomodoros: int = 0
    total_interruptions: int = 0
    daily_breakdown: list[dict] = []
