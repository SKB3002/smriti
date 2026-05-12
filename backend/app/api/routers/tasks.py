"""Tasks router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.services.task_service import TaskService
from app.strategies.storage.base import StorageStrategy
from app.validators.schemas import TaskCreateIn, TaskOut, TaskUpdateIn

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _service(storage: StorageStrategy = Depends(get_user_storage)) -> TaskService:
    return TaskService(storage)


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    project_id: UUID | None = None,
    user: CurrentUser = Depends(current_user),
    svc: TaskService = Depends(_service),
) -> list[dict]:
    return await svc.list(user.id, project_id=project_id)


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    payload: TaskCreateIn,
    user: CurrentUser = Depends(current_user),
    svc: TaskService = Depends(_service),
) -> dict:
    body = payload.model_dump(exclude_unset=True)
    body["project_id"] = str(body["project_id"])
    return await svc.create(user.id, body)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: TaskService = Depends(_service),
) -> dict:
    return await svc.get(user.id, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    payload: TaskUpdateIn,
    user: CurrentUser = Depends(current_user),
    svc: TaskService = Depends(_service),
) -> dict:
    return await svc.update(user.id, task_id, payload.model_dump(exclude_unset=True))


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    user: CurrentUser = Depends(current_user),
    svc: TaskService = Depends(_service),
) -> Response:
    await svc.delete(user.id, task_id)
    return Response(status_code=204)
