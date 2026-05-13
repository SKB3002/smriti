"""Reminders router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response

from app.api.deps import CurrentUser, current_user, get_container, get_user_storage
from app.core.container import Container
from app.services.reminder_parse_service import ReminderParseService
from app.services.reminder_service import ReminderService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import (
    ReminderCreateIn,
    ReminderOut,
    ReminderParseIn,
    ReminderParseOut,
    ReminderUpdateIn,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> ReminderService:
    return ReminderService(storage)


def _parse_service(container: Container = Depends(get_container)) -> ReminderParseService:
    return ReminderParseService(container.llm)


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    user: CurrentUser = Depends(current_user),
    svc: ReminderService = Depends(_service),
) -> list[dict]:
    return await svc.list(user.id)


@router.post("/parse", response_model=ReminderParseOut)
async def parse_reminder(
    payload: ReminderParseIn,
    _user: CurrentUser = Depends(current_user),
    svc: ReminderParseService = Depends(_parse_service),
) -> dict:
    return await svc.parse(payload.text)


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
