"""Factory for the notification strategy."""
from __future__ import annotations

from app.core.config import Settings
from app.strategies.notification.base import NotificationStrategy
from app.strategies.notification.web_push_strategy import WebPushStrategy


def build_notification(settings: Settings) -> NotificationStrategy:
    """Return the configured notification strategy (web push at MVP)."""
    return WebPushStrategy(settings)
