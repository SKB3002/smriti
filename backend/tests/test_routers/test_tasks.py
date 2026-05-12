"""Tasks + projects router tests with in-memory fake storage."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.core.errors import NotFoundError
from app.main import create_app
from app.strategies.storage.base import StorageStrategy


class FakeStorage(StorageStrategy):
    def __init__(self) -> None:
        self.tables: dict[str, dict[str, dict[str, Any]]] = {}

    async def select(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        columns: str = "*",
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        rows = list(self.tables.get(table, {}).values())
        for k, v in (filters or {}).items():
            rows = [r for r in rows if str(r.get(k)) == str(v)]
        return rows[:limit] if limit else rows

    async def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        full = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            **row,
        }
        # defaults expected by the *Out DTOs
        if table == "tasks":
            full.setdefault("status", "todo")
            full.setdefault("priority", 0)
        if table == "projects":
            full.setdefault("description", None)
            full.setdefault("color", None)
            full.setdefault("archived_at", None)
        if table == "reminders":
            full.setdefault("enabled", True)
            full.setdefault("is_stealth", False)
            full.setdefault("codename_id", None)
            full.setdefault("last_fired_at", None)
            full.setdefault("next_fire_at", None)
            full.setdefault("end_at", None)
            full.setdefault("frequency_minutes", None)
        self.tables.setdefault(table, {})[full["id"]] = full
        return full

    async def update(
        self, table: str, row_id: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        rows = self.tables.get(table, {})
        if row_id not in rows:
            raise NotFoundError(f"{table}/{row_id}")
        rows[row_id].update(patch)
        rows[row_id]["updated_at"] = datetime.now(UTC).isoformat()
        return rows[row_id]

    async def delete(self, table: str, row_id: str) -> None:
        self.tables.get(table, {}).pop(row_id, None)

    async def rpc(self, fn: str, params: dict[str, Any]) -> Any:
        return None


@pytest.fixture
async def app_client() -> AsyncIterator[tuple[AsyncClient, FakeStorage, CurrentUser]]:
    app = create_app()
    storage = FakeStorage()
    user = CurrentUser(id=uuid.uuid4(), jwt="fake.jwt.token")
    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[get_user_storage] = lambda: storage
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, storage, user


async def test_project_then_task_crud(
    app_client: tuple[AsyncClient, FakeStorage, CurrentUser],
) -> None:
    client, _storage, _user = app_client

    # create project
    pr = await client.post("/projects", json={"name": "P1"})
    assert pr.status_code == 201, pr.text
    project_id = pr.json()["id"]

    # list projects
    lst = await client.get("/projects")
    assert lst.status_code == 200 and len(lst.json()) == 1

    # create task in project
    tr = await client.post(
        "/tasks", json={"project_id": project_id, "title": "T1"}
    )
    assert tr.status_code == 201, tr.text
    task_id = tr.json()["id"]

    # get task
    g = await client.get(f"/tasks/{task_id}")
    assert g.status_code == 200 and g.json()["title"] == "T1"

    # patch task
    p = await client.patch(f"/tasks/{task_id}", json={"status": "doing"})
    assert p.status_code == 200 and p.json()["status"] == "doing"

    # filter tasks by project
    f = await client.get(f"/tasks?project_id={project_id}")
    assert f.status_code == 200 and len(f.json()) == 1

    # delete task
    d = await client.delete(f"/tasks/{task_id}")
    assert d.status_code == 204
    g2 = await client.get(f"/tasks/{task_id}")
    assert g2.status_code == 404


async def test_unauthenticated_calls_rejected() -> None:
    """No dep override — bare /tasks call should 401."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/tasks")
    # missing Authorization header → FastAPI 422 from Header(...) requirement
    assert r.status_code in (401, 422)
