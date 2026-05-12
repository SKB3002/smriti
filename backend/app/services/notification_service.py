"""Notification service — fires due reminders via push strategy."""
from __future__ import annotations

from typing import Any

from app.strategies.notification.base import NotificationStrategy
from app.strategies.scheduler.base import SchedulerStrategy
from app.strategies.storage.base import StorageStrategy


class NotificationService:
    """Pulls due reminders, sends pushes, marks fired."""

    def __init__(
        self,
        scheduler: SchedulerStrategy,
        notification: NotificationStrategy,
        storage: StorageStrategy,
    ) -> None:
        self._scheduler = scheduler
        self._notification = notification
        self._storage = storage

    async def fire_due(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        raise NotImplementedError("MVP-stub")
