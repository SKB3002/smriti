"""Codenames router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.services.codename_service import CodenameService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import CodenameCreateIn, CodenameOut, CodenameUpdateIn

router = APIRouter(prefix="/codenames", tags=["codenames"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> CodenameService:
    return CodenameService(storage)


@router.get("", response_model=list[CodenameOut])
async def list_codenames(
    user: CurrentUser = Depends(current_user),
    svc: CodenameService = Depends(_service),
) -> list[dict]:
    return await svc.list(user.id)


@router.post("", response_model=CodenameOut, status_code=201)
async def create_codename(
    payload: CodenameCreateIn,
    user: CurrentUser = Depends(current_user),
    svc: CodenameService = Depends(_service),
) -> dict:
    return await svc.create(user.id, payload.model_dump(exclude_unset=True))


@router.patch("/{codename_id}", response_model=CodenameOut)
async def update_codename(
    codename_id: UUID,
    payload: CodenameUpdateIn,
    user: CurrentUser = Depends(current_user),
    svc: CodenameService = Depends(_service),
) -> dict:
    return await svc.update(
        user.id, codename_id, payload.model_dump(exclude_unset=True)
    )


@router.delete("/{codename_id}", status_code=204)
async def delete_codename(
    codename_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: CodenameService = Depends(_service),
) -> Response:
    await svc.delete(user.id, codename_id)
    return Response(status_code=204)
