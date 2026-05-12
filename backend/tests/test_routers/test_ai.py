"""AI router tests with fake LLM + in-memory storage."""
from __future__ import annotations

import uuid
from typing import Any, AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.api.routers import ai as ai_router
from app.core.config import get_settings
from app.core.container import build_container
from app.main import create_app
from app.strategies.llm.base import LLMStrategy
from tests.test_routers.test_tasks import FakeStorage


class FakeLLM(LLMStrategy):
    def __init__(self, response: dict[str, Any]) -> None:
        self.response = response
        self.calls: list[str] = []

    async def complete(
        self,
        prompt: str,
        *,
        json_mode: bool = False,
        model: str | None = None,
    ) -> dict[str, Any] | str:
        self.calls.append(prompt)
        return self.response


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    ai_router._last_call.clear()


@pytest.fixture
async def client_with_tasks() -> AsyncIterator[
    tuple[AsyncClient, FakeStorage, FakeLLM, CurrentUser]
]:
    app = create_app()
    storage = FakeStorage()
    user = CurrentUser(id=uuid.uuid4(), jwt="fake.jwt")

    # seed two open tasks
    pid = str(uuid.uuid4())
    t1 = await storage.insert(
        "tasks",
        {"user_id": str(user.id), "project_id": pid, "title": "Refactor groq", "status": "todo"},
    )
    t2 = await storage.insert(
        "tasks",
        {"user_id": str(user.id), "project_id": pid, "title": "Call dentist", "status": "doing"},
    )

    llm = FakeLLM(
        {
            "items": [
                {"task_id": t1["id"], "score": 90, "reason": "blocks downstream work"},
                {"task_id": t2["id"], "score": 60, "reason": "time-sensitive"},
            ]
        }
    )

    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[get_user_storage] = lambda: storage
    app.state.container = build_container(get_settings())
    app.state.container.llm = llm

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, storage, llm, user


async def test_prioritize_happy_path(
    client_with_tasks: tuple[AsyncClient, FakeStorage, FakeLLM, CurrentUser],
) -> None:
    client, storage, llm, _user = client_with_tasks
    r = await client.post("/ai/prioritize", json={"n": 5})
    assert r.status_code == 200, r.text
    out = r.json()
    assert len(out["items"]) == 2
    assert out["items"][0]["score"] == 90
    # scores were persisted
    tasks = list(storage.tables["tasks"].values())
    assert any(t["priority"] == 90 for t in tasks)
    assert llm.calls, "llm.complete was not called"


async def test_prioritize_rate_limited(
    client_with_tasks: tuple[AsyncClient, FakeStorage, FakeLLM, CurrentUser],
) -> None:
    client, *_ = client_with_tasks
    r1 = await client.post("/ai/prioritize", json={"n": 5})
    assert r1.status_code == 200
    r2 = await client.post("/ai/prioritize", json={"n": 5})
    assert r2.status_code == 429
    assert r2.json()["error"]["code"] == "rate_limited"
