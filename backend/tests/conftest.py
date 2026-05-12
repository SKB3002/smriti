"""Shared pytest fixtures."""
from __future__ import annotations

from typing import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

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


@pytest.fixture(autouse=True)
def _dummy_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Populate required env vars so Settings() constructs in any test."""
    for k, v in _DUMMY_ENV.items():
        monkeypatch.setenv(k, v)
    from app.core.config import get_settings

    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """In-process httpx AsyncClient bound to the FastAPI app."""
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
