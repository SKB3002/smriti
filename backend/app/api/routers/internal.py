"""Internal router — Edge Function -> backend bridge (HMAC-protected).

The Edge Function fans out one POST per due reminder. This handler:

1. Builds the push payload (stealth-aware).
2. Calls the notification strategy to deliver the push.
3. Asks the scheduler strategy to record the firing — which transparently
   handles "normal → disable" vs "persistent → tick next_fire_at".
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request

from app.api.deps import require_internal_hmac
from app.core.container import Container
from app.core.errors import SubscriptionGoneError
from app.core.logging import get_logger
from app.validators.schemas import FireDueIn, FireDueOut

router = APIRouter(prefix="/internal", tags=["internal"])
_log = get_logger("api.internal")


def _container(request: Request) -> Container:
    return request.app.state.container  # type: ignore[no-any-return]


@router.post(
    "/fire-due",
    response_model=FireDueOut,
    dependencies=[Depends(require_internal_hmac)],
)
async def fire_due(
    payload: FireDueIn,
    container: Container = Depends(_container),
) -> FireDueOut:
    if payload.is_stealth:
        title = payload.codename or "Smriti"
        body = "Tap to reveal"
    else:
        title = payload.real_label or "Smriti reminder"
        body = "Tap to open"
    data = {
        "reminder_id": str(payload.reminder_id),
        "is_stealth": payload.is_stealth,
        "codename": payload.codename,
        "real_label": payload.real_label,
    }
    sub = {
        "endpoint": payload.subscription.endpoint,
        "keys": {
            "p256dh": payload.subscription.keys.p256dh,
            "auth": payload.subscription.keys.auth,
        },
    }
    try:
        await container.notification.send(sub, title=title, body=body or "Reminder", data=data)
    except SubscriptionGoneError:
        _log.info("subscription_gone", endpoint=payload.subscription.endpoint)
        return FireDueOut(fired=False, subscription_disabled=True)

    # Record the firing — scheduler handles normal-vs-persistent bookkeeping.
    try:
        await container.scheduler.mark_fired(str(payload.reminder_id), datetime.now(UTC))
    except Exception as exc:  # noqa: BLE001 — push already sent; log and continue
        _log.warning("mark_fired_failed", reminder_id=str(payload.reminder_id), error=str(exc))

    return FireDueOut(fired=True)
