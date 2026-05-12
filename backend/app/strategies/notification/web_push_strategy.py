"""Web Push strategy using pywebpush + VAPID."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from pywebpush import WebPushException, webpush

from app.core.config import Settings
from app.core.errors import SubscriptionGoneError, UpstreamError
from app.core.logging import get_logger
from app.strategies.notification.base import NotificationStrategy

_log = get_logger("strategies.web_push")


class WebPushStrategy(NotificationStrategy):
    """Sends Web Push via pywebpush; raises SubscriptionGoneError on 404/410."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._vapid_private = settings.VAPID_PRIVATE_KEY
        self._vapid_claims = {"sub": f"mailto:{settings.VAPID_CONTACT_EMAIL}"}

    async def send(
        self,
        subscription: dict[str, Any],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> bool:
        payload = json.dumps({"title": title, "body": body, "data": data or {}})
        try:
            await asyncio.to_thread(self._send_sync, subscription, payload)
        except SubscriptionGoneError:
            raise
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):
                raise SubscriptionGoneError(subscription.get("endpoint", "")) from exc
            _log.warning("web_push_failed", status=status, error=str(exc))
            raise UpstreamError(f"web push {status}", code="push_error") from exc
        return True

    def _send_sync(self, subscription: dict[str, Any], payload: str) -> None:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=self._vapid_private,
            vapid_claims=dict(self._vapid_claims),
        )
