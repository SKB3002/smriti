"""Reminder service — CRUD and next-fire-at computation.

Two kinds:
- normal:     fires once at `start_at`, then disables itself.
- persistent: fires every `frequency_minutes` between `start_at` and `end_at`.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from app.core.errors import NotFoundError
from app.strategies.storage.base import StorageStrategy

_TABLE = "reminders"


def _parse_dt(v: Any) -> datetime:
    if isinstance(v, datetime):
        return v.astimezone(UTC) if v.tzinfo else v.replace(tzinfo=UTC)
    if isinstance(v, str):
        dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)
    raise ValueError(f"unparseable datetime: {v!r}")


def initial_next_fire_at(reminder: dict[str, Any]) -> datetime:
    """For a freshly-created reminder, what's the first fire time?"""
    return _parse_dt(reminder["start_at"])


def compute_next_fire_at(
    reminder: dict[str, Any], from_when: datetime
) -> datetime | None:
    """Given a reminder row and a fired-at moment, return the next fire time.

    - normal:     returns None (one-shot done)
    - persistent: from_when + freq, capped at end_at; returns None past end_at
    """
    if reminder["kind"] == "normal":
        return None
    freq = int(reminder["frequency_minutes"])
    end_at = _parse_dt(reminder["end_at"])
    candidate = from_when.astimezone(UTC) + timedelta(minutes=freq)
    if candidate > end_at:
        return None
    return candidate


class ReminderService:
    """Reminder CRUD + scheduling helpers."""

    def __init__(self, storage: StorageStrategy) -> None:
        self._storage = storage

    async def create(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        row = {**payload, "user_id": str(user_id)}
        # serialize id-ish things to strings
        for k in ("task_id", "project_id", "codename_id"):
            if row.get(k) is not None:
                row[k] = str(row[k])
        # serialize datetimes to ISO
        for k in ("start_at", "end_at"):
            v = row.get(k)
            if isinstance(v, datetime):
                row[k] = v.astimezone(UTC).isoformat() if v.tzinfo else v.replace(tzinfo=UTC).isoformat()
        # ensure tags is always a list (default empty)
        if "tags" not in row or row["tags"] is None:
            row["tags"] = []
        row["next_fire_at"] = initial_next_fire_at(row).isoformat()
        return await self._storage.insert(_TABLE, row)

    async def list(self, user_id: UUID) -> list[dict[str, Any]]:
        return await self._storage.select(_TABLE, filters={"user_id": str(user_id)})

    async def get(self, user_id: UUID, reminder_id: UUID) -> dict[str, Any]:
        rows = await self._storage.select(
            _TABLE,
            filters={"user_id": str(user_id), "id": str(reminder_id)},
            limit=1,
        )
        if not rows:
            raise NotFoundError(f"reminder {reminder_id} not found")
        return rows[0]

    async def update(
        self, user_id: UUID, reminder_id: UUID, patch: dict[str, Any]
    ) -> dict[str, Any]:
        await self.get(user_id, reminder_id)
        for k in ("start_at", "end_at"):
            v = patch.get(k)
            if isinstance(v, datetime):
                patch[k] = v.astimezone(UTC).isoformat() if v.tzinfo else v.replace(tzinfo=UTC).isoformat()
        if "codename_id" in patch and patch["codename_id"] is not None:
            patch["codename_id"] = str(patch["codename_id"])
        return await self._storage.update(_TABLE, str(reminder_id), patch)

    async def delete(self, user_id: UUID, reminder_id: UUID) -> None:
        await self.get(user_id, reminder_id)
        await self._storage.delete(_TABLE, str(reminder_id))

    async def ack(self, user_id: UUID, reminder_id: UUID) -> dict[str, Any]:
        """Mark fired now; recompute next_fire_at (or disable if done)."""
        reminder = await self.get(user_id, reminder_id)
        now = datetime.now(UTC)
        next_fire = compute_next_fire_at(reminder, now)
        patch: dict[str, Any] = {"last_fired_at": now.isoformat()}
        if next_fire is None:
            patch["next_fire_at"] = None
            patch["enabled"] = False
        else:
            patch["next_fire_at"] = next_fire.isoformat()
        return await self._storage.update(_TABLE, str(reminder_id), patch)

    def compute_next_fire_at(
        self, reminder: dict[str, Any], now: datetime
    ) -> datetime | None:
        return compute_next_fire_at(reminder, now)
