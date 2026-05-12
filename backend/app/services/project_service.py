"""Project service — CRUD over projects table."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.errors import NotFoundError
from app.strategies.storage.base import StorageStrategy

_TABLE = "projects"


class ProjectService:
    """Project CRUD. RLS enforces user_id scoping; we still pass user_id on insert."""

    def __init__(self, storage: StorageStrategy) -> None:
        self._storage = storage

    async def create(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        row = {**payload, "user_id": str(user_id)}
        return await self._storage.insert(_TABLE, row)

    async def list(self, user_id: UUID) -> list[dict[str, Any]]:
        return await self._storage.select(_TABLE, filters={"user_id": str(user_id)})

    async def get(self, user_id: UUID, project_id: UUID) -> dict[str, Any]:
        rows = await self._storage.select(
            _TABLE, filters={"user_id": str(user_id), "id": str(project_id)}, limit=1
        )
        if not rows:
            raise NotFoundError(f"project {project_id} not found")
        return rows[0]

    async def update(
        self, user_id: UUID, project_id: UUID, patch: dict[str, Any]
    ) -> dict[str, Any]:
        await self.get(user_id, project_id)
        return await self._storage.update(_TABLE, str(project_id), patch)

    async def archive(self, user_id: UUID, project_id: UUID) -> None:
        await self.get(user_id, project_id)
        await self._storage.update(
            _TABLE, str(project_id), {"archived_at": datetime.now(UTC).isoformat()}
        )
