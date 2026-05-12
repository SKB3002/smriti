"""Push subscription service — CRUD over push_subscriptions table."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.strategies.storage.base import StorageStrategy

_TABLE = "push_subscriptions"


class PushSubscriptionService:
    """Insert / disable browser push subscriptions for a user."""

    def __init__(self, storage: StorageStrategy) -> None:
        self._storage = storage

    async def subscribe(
        self,
        user_id: UUID,
        *,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        # Re-subscribing the same endpoint resurrects the row.
        existing = await self._storage.select(
            _TABLE, filters={"endpoint": endpoint}, limit=1
        )
        if existing:
            row_id = existing[0]["id"]
            return await self._storage.update(
                _TABLE,
                row_id,
                {
                    "user_id": str(user_id),
                    "p256dh": p256dh,
                    "auth": auth,
                    "user_agent": user_agent,
                    "disabled_at": None,
                },
            )
        return await self._storage.insert(
            _TABLE,
            {
                "user_id": str(user_id),
                "endpoint": endpoint,
                "p256dh": p256dh,
                "auth": auth,
                "user_agent": user_agent,
            },
        )

    async def unsubscribe(self, user_id: UUID, endpoint: str) -> None:
        rows = await self._storage.select(
            _TABLE,
            filters={"user_id": str(user_id), "endpoint": endpoint},
            limit=1,
        )
        if not rows:
            return
        await self._storage.update(
            _TABLE,
            rows[0]["id"],
            {"disabled_at": datetime.now(UTC).isoformat()},
        )
