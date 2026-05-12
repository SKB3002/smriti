"""Factory for the scheduler strategy."""
from __future__ import annotations

from app.core.config import Settings
from app.strategies.scheduler.base import SchedulerStrategy
from app.strategies.scheduler.supabase_cron_strategy import SupabaseCronStrategy


def build_scheduler(settings: Settings) -> SchedulerStrategy:
    """Return the configured scheduler strategy (Supabase pg_cron at MVP)."""
    return SupabaseCronStrategy(settings)
