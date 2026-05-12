"""Reminders router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.services.reminder_service import ReminderService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import ReminderCreateIn, ReminderOut, ReminderUpdateIn

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> ReminderService:
    return ReminderService(storage)


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> list[dict]:
    return await svc.list(user.id)


@router.post("", response_model=ReminderOut, status_code=201)
async def create_reminder(
    payload: ReminderCreateIn,
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> dict:
    return await svc.create(user.id, payload.model_dump(exclude_unset=True))


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: UUID,
    payload: ReminderUpdateIn,
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> dict:
    return await svc.update(user.id, reminder_id, payload.model_dump(exclude_unset=True))


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> Response:
    await svc.delete(user.id, reminder_id)
    return Response(status_code=204)


@router.post("/{reminder_id}/ack", response_model=ReminderOut)
async def ack_reminder(
    reminder_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> dict:
    return await svc.ack(user.id, reminder_id)
