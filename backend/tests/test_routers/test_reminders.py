"""Reminders router tests with in-memory fake storage."""
from __future__ import annotations

import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any, AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import CurrentUser, current_user, get_user_storage
from app.core.config import get_settings
from app.core.container import build_container
from app.main import create_app
from app.strategies.notification.base import NotificationStrategy
from app.strategies.scheduler.base import SchedulerStrategy
from tests.test_routers.test_tasks import FakeStorage


class FakeNotification(NotificationStrategy):
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    async def send(
        self,
        subscription: dict[str, Any],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> bool:
        self.sent.append(
            {"subscription": subscription, "title": title, "body": body, "data": data}
        )
        return True


class FakeScheduler(SchedulerStrategy):
    def __init__(self) -> None:
        self.fired: list[tuple[str, datetime]] = []

    async def list_due_reminders(self, now: datetime) -> list[dict[str, Any]]:
        return []

    async def mark_fired(self, reminder_id: str, fired_at: datetime) -> None:
        self.fired.append((reminder_id, fired_at))


@pytest.fixture
async def app_client() -> AsyncIterator[
    tuple[AsyncClient, FakeStorage, FakeNotification, FakeScheduler]
]:
    app = create_app()
    storage = FakeStorage()
    notif = FakeNotification()
    sched = FakeScheduler()
    user = CurrentUser(id=uuid.uuid4(), jwt="fake.jwt")
    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[get_user_storage] = lambda: storage
    app.state.container = build_container(get_settings())
    app.state.container.notification = notif
    app.state.container.scheduler = sched
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, storage, notif, sched


async def test_normal_reminder_crud(
    app_client: tuple[AsyncClient, FakeStorage, FakeNotification, FakeScheduler],
) -> None:
    client, _storage, _notif, _sched = app_client
    body = {
        "task_id": str(uuid.uuid4()),
        "project_id": str(uuid.uuid4()),
        "kind": "normal",
        "start_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
        "is_stealth": False,
    }
    r = await client.post("/reminders", json=body)
    assert r.status_code == 201, r.text
    out = r.json()
    assert out["kind"] == "normal"
    assert out["end_at"] is None
    assert out["frequency_minutes"] is None
    assert out["next_fire_at"] == out["start_at"]
    rid = out["id"]

    # ack should disable the reminder (one-shot done)
    a = await client.post(f"/reminders/{rid}/ack")
    assert a.status_code == 200
    assert a.json()["enabled"] is False
    assert a.json()["next_fire_at"] is None


async def test_persistent_reminder_crud(
    app_client: tuple[AsyncClient, FakeStorage, FakeNotification, FakeScheduler],
) -> None:
    client, *_ = app_client
    start = datetime.now(UTC) + timedelta(minutes=10)
    body = {
        "task_id": str(uuid.uuid4()),
        "project_id": str(uuid.uuid4()),
        "kind": "persistent",
        "start_at": start.isoformat(),
        "end_at": (start + timedelta(hours=2)).isoformat(),
        "frequency_minutes": 30,
    }
    r = await client.post("/reminders", json=body)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]

    # ack should set next_fire_at = fired_at + 30 min (within window)
    a = await client.post(f"/reminders/{rid}/ack")
    assert a.status_code == 200
    nxt = a.json()
    assert nxt["enabled"] is True
    assert nxt["next_fire_at"] is not None


async def test_internal_fire_due_sends_push_and_records(
    app_client: tuple[AsyncClient, FakeStorage, FakeNotification, FakeScheduler],
) -> None:
    client, _storage, notif, sched = app_client
    rid = uuid.uuid4()
    payload = {
        "reminder_id": str(rid),
        "user_id": str(uuid.uuid4()),
        "is_stealth": True,
        "codename": "alpha",
        "real_label": "Buy milk",
        "subscription": {
            "endpoint": "https://push.example/x",
            "keys": {"p256dh": "p", "auth": "a"},
        },
    }
    body_bytes = json.dumps(payload).encode()
    sig = hmac.new(b"hmac", body_bytes, sha256).hexdigest()
    r = await client.post(
        "/internal/fire-due",
        content=body_bytes,
        headers={"X-Signature": sig, "Content-Type": "application/json"},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"fired": True, "subscription_disabled": False}
    assert len(notif.sent) == 1
    assert notif.sent[0]["body"] == "alpha"
    assert notif.sent[0]["data"]["real_label"] == "Buy milk"
    assert sched.fired and sched.fired[0][0] == str(rid)


async def test_internal_fire_due_rejects_bad_hmac(
    app_client: tuple[AsyncClient, FakeStorage, FakeNotification, FakeScheduler],
) -> None:
    client, *_ = app_client
    r = await client.post(
        "/internal/fire-due",
        json={
            "reminder_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "is_stealth": False,
            "subscription": {
                "endpoint": "x",
                "keys": {"p256dh": "p", "auth": "a"},
            },
        },
        headers={"X-Signature": "deadbeef"},
    )
    assert r.status_code in (401, 422, 500)
