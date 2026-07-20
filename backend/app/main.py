from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import api_router
from app.db.database import init_db


@asynccontextmanager
async def app_lifecycle(app):
    init_db()
    yield


app = FastAPI(
    title="Pomodoro API",
    description="Backend API service for Pomodoro timer",
    version="1.0.0",
    lifespan=app_lifecycle,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Pomodoro API is running", "docs": "/docs"}