"""Supabase pg_cron-driven scheduler strategy.

pg_cron itself only triggers the Edge Function every minute. This strategy
is the read/write side used by FastAPI when the Edge Function calls
/internal/fire-due — it loads due reminders and records firings.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from supabase import Client, create_client

from app.core.config import Settings
from app.core.errors import NotFoundError
from app.services.reminder_service import compute_next_fire_at
from app.strategies.scheduler.base import SchedulerStrategy


class SupabaseCronStrategy(SchedulerStrategy):
    """Reads/writes the reminders table with the service-role key."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is None:
            self._client = create_client(
                self._settings.SUPABASE_URL,
                self._settings.SUPABASE_SERVICE_KEY,
            )
        return self._client

    async def list_due_reminders(self, now: datetime) -> list[dict[str, Any]]:
        now_iso = now.astimezone(UTC).isoformat()

        def _run() -> list[dict[str, Any]]:
            result = (
                self._get_client()
                .table("reminders")
                .select("*")
                .eq("enabled", True)
                .lte("next_fire_at", now_iso)
                .execute()
            )
            return list(result.data or [])

        return await asyncio.to_thread(_run)

    async def mark_fired(self, reminder_id: str, fired_at: datetime) -> None:
        def _fetch() -> dict[str, Any]:
            res = (
                self._get_client()
                .table("reminders")
                .select("*")
                .eq("id", reminder_id)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if not rows:
                raise NotFoundError(f"reminder {reminder_id} not found")
            return dict(rows[0])

        reminder = await asyncio.to_thread(_fetch)
        next_fire = compute_next_fire_at(reminder, fired_at)
        patch: dict[str, Any] = {
            "last_fired_at": fired_at.astimezone(UTC).isoformat(),
        }
        if next_fire is None:
            patch["next_fire_at"] = None
            patch["enabled"] = False
        else:
            patch["next_fire_at"] = next_fire.astimezone(UTC).isoformat()

        def _write() -> None:
            (
                self._get_client()
                .table("reminders")
                .update(patch)
                .eq("id", reminder_id)
                .execute()
            )

        await asyncio.to_thread(_write)
