"""FastAPI application factory."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import (
    ai,
    auth,
    codenames,
    internal,
    projects,
    push,
    reminders,
    tasks,
)
from app.core.config import get_settings
from app.core.container import build_container
from app.core.errors import DomainError
from app.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialise container on startup, dispose resources on shutdown."""
    configure_logging()
    settings = get_settings()
    app.state.settings = settings
    app.state.container = build_container(settings)
    log = get_logger("app.lifespan")
    log.info("startup_complete", env=settings.ENV)
    try:
        yield
    finally:
        log.info("shutdown")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="Smriti API",
        version="0.1.0",
        lifespan=lifespan,
    )

    settings = get_settings()
    _origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(DomainError)
    async def _domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(projects.router)
    app.include_router(tasks.router)
    app.include_router(reminders.router)
    app.include_router(codenames.router)
    app.include_router(push.router)
    app.include_router(ai.router)
    app.include_router(internal.router)

    return app
