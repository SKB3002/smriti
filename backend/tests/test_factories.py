"""Factory tests — each factory returns the expected concrete type."""
from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.container import build_container
from app.core.errors import ConfigError
from app.factories.llm_factory import build_llm
from app.strategies.llm.groq_strategy import GroqStrategy
from app.strategies.notification.web_push_strategy import WebPushStrategy
from app.strategies.ocr.base import NotImplementedOCRStrategy
from app.strategies.scheduler.supabase_cron_strategy import SupabaseCronStrategy
from app.strategies.storage.supabase_strategy import SupabaseStorageStrategy

_DUMMY_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "anon",
    "SUPABASE_SERVICE_KEY": "service",
    "SUPABASE_JWT_SECRET": "jwt-secret",
    "GROQ_API_KEY": "groq",
    "VAPID_PUBLIC_KEY": "pub",
    "VAPID_PRIVATE_KEY": "priv",
    "VAPID_CONTACT_EMAIL": "ops@example.com",
    "INTERNAL_HMAC_SECRET": "hmac",
}


def _settings(**overrides: str) -> Settings:
    return Settings(**{**_DUMMY_ENV, **overrides})  # type: ignore[arg-type]


def test_container_returns_expected_concrete_types() -> None:
    container = build_container(_settings())
    assert isinstance(container.llm, GroqStrategy)
    assert isinstance(container.notification, WebPushStrategy)
    assert isinstance(container.storage, SupabaseStorageStrategy)
    assert isinstance(container.scheduler, SupabaseCronStrategy)
    assert isinstance(container.ocr, NotImplementedOCRStrategy)


def test_unknown_llm_provider_raises() -> None:
    settings = _settings()
    object.__setattr__(settings, "LLM_PROVIDER", "openai")
    with pytest.raises(ConfigError):
        build_llm(settings)
