"""NotificationStrategy interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class NotificationStrategy(ABC):
    """Abstract notification strategy (push/email/sms)."""

    @abstractmethod
    async def send(
        self,
        subscription: dict[str, Any],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Send a notification. Returns True on success."""
        raise NotImplementedError("MVP-stub")
