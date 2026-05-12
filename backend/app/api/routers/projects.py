"""Projects router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.services.project_service import ProjectService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import ProjectCreateIn, ProjectOut, ProjectUpdateIn

router = APIRouter(prefix="/projects", tags=["projects"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> ProjectService:
    return ProjectService(storage)


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    user: CurrentUser = Depends(current_user),
    svc: ProjectService = Depends(_service),
) -> list[dict]:
    return await svc.list(user.id)


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    payload: ProjectCreateIn,
    user: CurrentUser = Depends(current_user),
    svc: ProjectService = Depends(_service),
) -> dict:
    return await svc.create(user.id, payload.model_dump(exclude_unset=True))


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: ProjectService = Depends(_service),
) -> dict:
    return await svc.get(user.id, project_id)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdateIn,
    user: CurrentUser = Depends(current_user),
    svc: ProjectService = Depends(_service),
) -> dict:
    return await svc.update(user.id, project_id, payload.model_dump(exclude_unset=True))


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: ProjectService = Depends(_service),
) -> Response:
    await svc.archive(user.id, project_id)
    return Response(status_code=204)
