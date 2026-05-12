"""AI router — top-N task prioritization (rate-limited per user)."""
from __future__ import annotations

import time
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.core.container import Container
from app.core.errors import RateLimited
from app.services.prioritization_service import PrioritizationService
from app.services.task_service import TaskService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import PrioritizeIn, PrioritizeOut, PrioritizedTask

router = APIRouter(prefix="/ai", tags=["ai"])

_WINDOW_SECS = 5 * 60
_last_call: dict[UUID, float] = {}


def _gate(user_id: UUID) -> None:
    now = time.monotonic()
    prev = _last_call.get(user_id)
    if prev is not None and now - prev < _WINDOW_SECS:
        wait = int(_WINDOW_SECS - (now - prev))
        raise RateLimited(f"Try again in {wait}s")
    _last_call[user_id] = now


def _container(request: Request) -> Container:
    return request.app.state.container  # type: ignore[no-any-return]


def _service(
    storage: StorageStrategy = Depends(get_user_storage),
    container: Container = Depends(_container),
) -> PrioritizationService:
    return PrioritizationService(container.llm, TaskService(storage))


@router.post("/prioritize", response_model=PrioritizeOut)
async def prioritize(
    payload: PrioritizeIn,
    user: CurrentUser = Depends(current_user),
    svc: PrioritizationService = Depends(_service),
) -> PrioritizeOut:
    _gate(user.id)
    items = await svc.prioritize_top_n(user.id, payload.n)
    return PrioritizeOut(
        items=[
            PrioritizedTask(task_id=UUID(it["task_id"]), score=it["score"], reason=it["reason"])
            for it in items
        ]
    )
