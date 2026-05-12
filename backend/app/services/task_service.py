"""Task service — CRUD + AI priority setter."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.errors import NotFoundError
from app.strategies.storage.base import StorageStrategy

_TABLE = "tasks"


class TaskService:
    """Task CRUD + priority management."""

    def __init__(self, storage: StorageStrategy) -> None:
        self._storage = storage

    async def create(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        row = {**payload, "user_id": str(user_id)}
        return await self._storage.insert(_TABLE, row)

    async def list(
        self, user_id: UUID, *, project_id: UUID | None = None
    ) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {"user_id": str(user_id)}
        if project_id is not None:
            filters["project_id"] = str(project_id)
        return await self._storage.select(_TABLE, filters=filters)

    async def get(self, user_id: UUID, task_id: UUID) -> dict[str, Any]:
        rows = await self._storage.select(
            _TABLE, filters={"user_id": str(user_id), "id": str(task_id)}, limit=1
        )
        if not rows:
            raise NotFoundError(f"task {task_id} not found")
        return rows[0]

    async def update(
        self, user_id: UUID, task_id: UUID, patch: dict[str, Any]
    ) -> dict[str, Any]:
        await self.get(user_id, task_id)
        return await self._storage.update(_TABLE, str(task_id), patch)

    async def delete(self, user_id: UUID, task_id: UUID) -> None:
        await self.get(user_id, task_id)
        await self._storage.delete(_TABLE, str(task_id))

    async def set_priority(
        self, task_id: UUID, score: int, reason: str
    ) -> dict[str, Any]:
        return await self._storage.update(
            _TABLE,
            str(task_id),
            {"priority": score, "priority_reason": reason},
        )
