"""SchedulerStrategy interface — drives reminder firing."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class SchedulerStrategy(ABC):
    """Abstract scheduler strategy."""

    @abstractmethod
    async def list_due_reminders(self, now: datetime) -> list[dict[str, Any]]:
        """Return reminders where enabled and next_fire_at <= now."""
        raise NotImplementedError("MVP-stub")

    @abstractmethod
    async def mark_fired(self, reminder_id: str, fired_at: datetime) -> None:
        """Update last_fired_at and recompute next_fire_at."""
        raise NotImplementedError("MVP-stub")
