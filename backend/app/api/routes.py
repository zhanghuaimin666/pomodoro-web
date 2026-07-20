import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.pomodoro import (
    PomodoroSessionCreate,
    PomodoroSessionOut,
    StatsOut,
    TodoCreate,
    TodoOut,
    TodoPomodoroCreate,
)
from app.services import pomodoro_service as svc

api_router = APIRouter()


# ─── 健康检查 ───────────────────────────────────────────────────

@api_router.get("/health")
def health_check():
    return {"status": "ok"}


# ─── PomodoroSession ────────────────────────────────────────────

@api_router.get("/pomodoros", response_model=list[PomodoroSessionOut])
def list_pomodoros(days: int = 30, db: Session = Depends(get_db)):
    return svc.list_sessions(db, days=days)


@api_router.post("/pomodoros", response_model=PomodoroSessionOut)
def upsert_pomodoro(data: PomodoroSessionCreate, db: Session = Depends(get_db)):
    return svc.upsert_session(db, data)


@api_router.get("/pomodoros/stats", response_model=StatsOut)
def get_stats(days: int = 7, db: Session = Depends(get_db)):
    return svc.get_stats(db, days=days)


# ─── Todo ───────────────────────────────────────────────────────

@api_router.get("/todos", response_model=list[TodoOut])
def list_todos(db: Session = Depends(get_db)):
    return svc.list_todos(db)


@api_router.post("/todos", response_model=TodoOut, status_code=201)
def create_todo(data: TodoCreate, db: Session = Depends(get_db)):
    return svc.create_todo(db, data)


@api_router.patch("/todos/{todo_id}/toggle", response_model=TodoOut)
def toggle_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = svc.toggle_todo(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@api_router.post("/todos/{todo_id}/pomodoros", response_model=TodoOut)
def add_todo_pomodoro(
    todo_id: int, data: TodoPomodoroCreate, db: Session = Depends(get_db)
):
    todo = svc.add_todo_pomodoro(db, todo_id, data.focus_ms)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@api_router.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    if not svc.delete_todo(db, todo_id):
        raise HTTPException(status_code=404, detail="Todo not found")


@api_router.post("/todos/reorder")
def reorder_todos(todo_ids: list[int], db: Session = Depends(get_db)):
    svc.reorder_todos(db, todo_ids)
    return {"status": "ok"}
