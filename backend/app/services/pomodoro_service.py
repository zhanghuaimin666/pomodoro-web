import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.pomodoro import PomodoroSession, Todo
from app.schemas.pomodoro import PomodoroSessionCreate, TodoCreate


def normalize_focus_hours(value) -> list[int]:
    if not isinstance(value, list) or len(value) != 24:
        return [0] * 24
    return [max(0, int(item or 0)) for item in value]


# --- PomodoroSession ---

def get_or_create_session(db: Session, date: datetime.date) -> PomodoroSession:
    session = db.query(PomodoroSession).filter(PomodoroSession.date == date).first()
    if not session:
        session = PomodoroSession(date=date)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def upsert_session(db: Session, data: PomodoroSessionCreate) -> PomodoroSession:
    session = get_or_create_session(db, data.date)
    session.focus_ms = data.focus_ms
    session.completed_pomodoros = data.completed_pomodoros
    session.interruptions = data.interruptions
    session.focus_hours = list(data.focus_hours)
    db.commit()
    db.refresh(session)
    return session


def list_sessions(db: Session, days: int = 30):
    since = datetime.date.today() - datetime.timedelta(days=days)
    rows = (
        db.query(PomodoroSession)
        .filter(PomodoroSession.date >= since)
        .order_by(PomodoroSession.date.desc())
        .all()
    )
    for row in rows:
        row.focus_hours = normalize_focus_hours(row.focus_hours)
    return rows


def get_stats(db: Session, days: int = 7):
    since = datetime.date.today() - datetime.timedelta(days=days)
    rows = (
        db.query(
            PomodoroSession.date,
            PomodoroSession.focus_ms,
            PomodoroSession.completed_pomodoros,
            PomodoroSession.interruptions,
            PomodoroSession.focus_hours,
        )
        .filter(PomodoroSession.date >= since)
        .order_by(PomodoroSession.date.asc())
        .all()
    )
    total_focus = sum(r.focus_ms for r in rows)
    total_pomodoros = sum(r.completed_pomodoros for r in rows)
    total_interruptions = sum(r.interruptions for r in rows)
    breakdown = [
        {
            "date": str(r.date),
            "focus_ms": r.focus_ms,
            "pomodoros": r.completed_pomodoros,
            "interruptions": r.interruptions,
            "focus_hours": normalize_focus_hours(r.focus_hours),
        }
        for r in rows
    ]
    return {
        "total_focus_ms": total_focus,
        "total_pomodoros": total_pomodoros,
        "total_interruptions": total_interruptions,
        "daily_breakdown": breakdown,
    }


# --- Todo ---

def create_todo(db: Session, data: TodoCreate) -> Todo:
    todo = Todo(
        text=data.text,
        done=data.done,
        position=data.position,
        date=datetime.date.today(),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def list_todos(db: Session):
    return (
        db.query(Todo)
        .filter(Todo.date == datetime.date.today())
        .order_by(Todo.position.asc())
        .all()
    )


def toggle_todo(db: Session, todo_id: int) -> Todo | None:
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo:
        todo.done = not todo.done
        db.commit()
        db.refresh(todo)
    return todo


def add_todo_pomodoro(db: Session, todo_id: int, focus_ms: int) -> Todo | None:
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo:
        todo.pomodoro_count = (todo.pomodoro_count or 0) + 1
        todo.focus_ms = (todo.focus_ms or 0) + focus_ms
        db.commit()
        db.refresh(todo)
    return todo


def delete_todo(db: Session, todo_id: int) -> bool:
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo:
        db.delete(todo)
        db.commit()
        return True
    return False


def reorder_todos(db: Session, todo_ids: list[int]):
    today = datetime.date.today()
    todos = db.query(Todo).filter(Todo.date == today, Todo.id.in_(todo_ids)).all()
    lookup = {t.id: t for t in todos}
    for idx, tid in enumerate(todo_ids):
        if tid in lookup:
            lookup[tid].position = idx
    db.commit()
