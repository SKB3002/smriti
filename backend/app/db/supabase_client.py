"""Async Supabase client wrapper — user (JWT) and service flavours."""
from __future__ import annotations

from typing import Any


async def user_client(jwt: str) -> Any:
    """Return a Supabase async client authenticated as the user (anon + JWT)."""
    raise NotImplementedError("MVP-stub")


async def service_client() -> Any:
    """Return a Supabase async client using the service-role key."""
    raise NotImplementedError("MVP-stub")
