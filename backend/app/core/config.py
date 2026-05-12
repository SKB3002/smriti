"""Centralised application settings loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve repo-root .env regardless of where uvicorn was started from.
# backend/app/core/config.py -> parents[3] is the repo root.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """Typed settings; missing required vars raise ValidationError at startup."""

    model_config = SettingsConfigDict(
        env_file=str(_REPO_ROOT_ENV),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Groq
    GROQ_API_KEY: str
    GROQ_MODEL_PRIMARY: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_FALLBACK: str = "llama-3.1-8b-instant"

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: str
    VAPID_PRIVATE_KEY: str
    VAPID_CONTACT_EMAIL: str

    # Internal HMAC
    INTERNAL_HMAC_SECRET: str

    # Runtime
    ENV: Literal["dev", "staging", "prod"] = "dev"
    LLM_PROVIDER: Literal["groq"] = "groq"
    LOG_LEVEL: str = "INFO"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached Settings singleton."""
    return Settings()  # type: ignore[call-arg]
