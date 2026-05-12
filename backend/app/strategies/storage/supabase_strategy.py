"""Supabase storage strategy — wraps supabase-py client.

Sync supabase-py is used and wrapped with `asyncio.to_thread` to keep the
public interface async. Two flavours are supported per request:

- user calls:    anon key + JWT (RLS enforces user_id = auth.uid())
- service calls: service-role key (used by /internal/fire-due flow only)
"""
from __future__ import annotations

import asyncio
from typing import Any

from supabase import Client, create_client

from app.core.config import Settings
from app.core.errors import NotFoundError, UpstreamError
from app.strategies.storage.base import StorageStrategy


class SupabaseStorageStrategy(StorageStrategy):
    """Thin wrapper over supabase-py client."""

    def __init__(
        self,
        settings: Settings,
        *,
        jwt: str | None = None,
        use_service: bool = False,
    ) -> None:
        self._settings = settings
        self._jwt = jwt
        self._use_service = use_service
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is not None:
            return self._client
        key = (
            self._settings.SUPABASE_SERVICE_KEY
            if self._use_service
            else self._settings.SUPABASE_ANON_KEY
        )
        client = create_client(self._settings.SUPABASE_URL, key)
        if self._jwt and not self._use_service:
            client.postgrest.auth(self._jwt)
        self._client = client
        return client

    async def select(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        columns: str = "*",
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        def _run() -> list[dict[str, Any]]:
            q = self._get_client().table(table).select(columns)
            for k, v in (filters or {}).items():
                q = q.eq(k, v)
            if limit is not None:
                q = q.limit(limit)
            result = q.execute()
            return list(result.data or [])

        return await asyncio.to_thread(_run)

    async def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        def _run() -> dict[str, Any]:
            result = self._get_client().table(table).insert(row).execute()
            data = result.data or []
            if not data:
                raise UpstreamError(f"insert into {table} returned no row")
            return dict(data[0])

        return await asyncio.to_thread(_run)

    async def update(
        self,
        table: str,
        row_id: str,
        patch: dict[str, Any],
    ) -> dict[str, Any]:
        def _run() -> dict[str, Any]:
            result = (
                self._get_client().table(table).update(patch).eq("id", row_id).execute()
            )
            data = result.data or []
            if not data:
                raise NotFoundError(f"{table}/{row_id} not found")
            return dict(data[0])

        return await asyncio.to_thread(_run)

    async def delete(self, table: str, row_id: str) -> None:
        def _run() -> None:
            self._get_client().table(table).delete().eq("id", row_id).execute()

        await asyncio.to_thread(_run)

    async def rpc(self, fn: str, params: dict[str, Any]) -> Any:
        def _run() -> Any:
            return self._get_client().rpc(fn, params).execute().data

        return await asyncio.to_thread(_run)
