"""Push subscription router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.core.container import Container
from app.core.errors import NotFoundError, SubscriptionGoneError
from app.services.push_service import PushSubscriptionService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import PushSubscribeIn, PushSubscribeOut

router = APIRouter(prefix="/push", tags=["push"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> PushSubscriptionService:
    return PushSubscriptionService(storage)


@router.post("/subscribe", response_model=PushSubscribeOut, status_code=201)
async def subscribe(
    payload: PushSubscribeIn,
    user: CurrentUser = Depends(current_user),
    svc: PushSubscriptionService = Depends(_service),
) -> dict:
    return await svc.subscribe(
        user.id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
        user_agent=payload.user_agent,
    )


@router.post("/test", status_code=200)
async def send_test_push(
    request: Request,
    user: CurrentUser = Depends(current_user),
    storage: StorageStrategy = Depends(get_user_storage),
) -> dict[str, int]:
    """Fire a one-off push to all active subscriptions of the current user.

    Useful for verifying VAPID keys + the push pipeline end-to-end without
    waiting on the Edge Function / pg_cron.
    """
    container: Container = request.app.state.container
    all_subs = await storage.select(
        "push_subscriptions",
        filters={"user_id": str(user.id)},
    )
    subs = [s for s in all_subs if s.get("disabled_at") is None]
    if not subs:
        raise NotFoundError("no active push subscriptions for this user")

    sent = 0
    gone = 0
    for s in subs:
        try:
            await container.notification.send(
                {
                    "endpoint": s["endpoint"],
                    "keys": {"p256dh": s["p256dh"], "auth": s["auth"]},
                },
                title="Second Brain",
                body="Test push — if you see this, the pipeline works.",
                data={"test": True},
            )
            sent += 1
        except SubscriptionGoneError:
            gone += 1
    return {"sent": sent, "subscription_gone": gone}


@router.delete("/subscribe", status_code=204)
async def unsubscribe(
    endpoint: str = Query(..., min_length=1),
    user: CurrentUser = Depends(current_user),
    svc: PushSubscriptionService = Depends(_service),
) -> Response:
    await svc.unsubscribe(user.id, endpoint)
    return Response(status_code=204)
