from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """创建所有表（仅用于首次启动）"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI 依赖注入 — 获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
