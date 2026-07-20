import datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    focus_ms: Mapped[int] = mapped_column(Integer, default=0, comment="当日专注毫秒数")
    completed_pomodoros: Mapped[int] = mapped_column(Integer, default=0, comment="完成的番茄钟数")
    interruptions: Mapped[int] = mapped_column(Integer, default=0, comment="中断次数")
    focus_hours: Mapped[list[int]] = mapped_column(
        JSON, nullable=False, default=lambda: [0] * 24
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(String(200), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    pomodoro_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    focus_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    date: Mapped[datetime.date] = mapped_column(
        Date, nullable=False, default=datetime.date.today
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
