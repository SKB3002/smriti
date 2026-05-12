"""Push subscribe router tests with in-memory fake storage."""
from __future__ import annotations

import uuid
from typing import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.main import create_app
from tests.test_routers.test_tasks import FakeStorage


@pytest.fixture
async def app_client() -> AsyncIterator[tuple[AsyncClient, FakeStorage]]:
    app = create_app()
    storage = FakeStorage()
    user = CurrentUser(id=uuid.uuid4(), jwt="fake.jwt")
    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[get_user_storage] = lambda: storage
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, storage


async def test_subscribe_then_unsubscribe(
    app_client: tuple[AsyncClient, FakeStorage],
) -> None:
    client, storage = app_client
    body = {
        "endpoint": "https://push.example/abc",
        "p256dh": "p256",
        "auth": "auth",
        "user_agent": "pytest",
    }
    r = await client.post("/push/subscribe", json=body)
    assert r.status_code == 201, r.text
    assert len(storage.tables.get("push_subscriptions", {})) == 1

    # re-subscribe same endpoint should resurrect, not duplicate
    r2 = await client.post("/push/subscribe", json=body)
    assert r2.status_code == 201
    assert len(storage.tables["push_subscriptions"]) == 1

    d = await client.delete(
        f"/push/subscribe?endpoint={body['endpoint']}",
    )
    assert d.status_code == 204
    row = next(iter(storage.tables["push_subscriptions"].values()))
    assert row["disabled_at"] is not None
