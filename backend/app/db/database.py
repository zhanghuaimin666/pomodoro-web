from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    # create_all does not add columns to an existing table.
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE pomodoro_sessions "
                "ADD COLUMN IF NOT EXISTS focus_hours JSON NOT NULL DEFAULT '[]'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE todos "
                "ADD COLUMN IF NOT EXISTS pomodoro_count INTEGER NOT NULL DEFAULT 0"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE todos "
                "ADD COLUMN IF NOT EXISTS focus_ms INTEGER NOT NULL DEFAULT 0"
            )
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
