"""Codename service — CRUD over codename map."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.errors import NotFoundError
from app.strategies.storage.base import StorageStrategy

_TABLE = "codenames"


class CodenameService:
    """Codename CRUD."""

    def __init__(self, storage: StorageStrategy) -> None:
        self._storage = storage

    async def create(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._storage.insert(
            _TABLE, {**payload, "user_id": str(user_id)}
        )

    async def list(self, user_id: UUID) -> list[dict[str, Any]]:
        return await self._storage.select(_TABLE, filters={"user_id": str(user_id)})

    async def get(self, user_id: UUID, codename_id: UUID) -> dict[str, Any]:
        rows = await self._storage.select(
            _TABLE,
            filters={"user_id": str(user_id), "id": str(codename_id)},
            limit=1,
        )
        if not rows:
            raise NotFoundError(f"codename {codename_id} not found")
        return rows[0]

    async def update(
        self, user_id: UUID, codename_id: UUID, patch: dict[str, Any]
    ) -> dict[str, Any]:
        await self.get(user_id, codename_id)
        return await self._storage.update(_TABLE, str(codename_id), patch)

    async def delete(self, user_id: UUID, codename_id: UUID) -> None:
        await self.get(user_id, codename_id)
        await self._storage.delete(_TABLE, str(codename_id))
