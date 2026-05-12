"""Factory for the storage strategy."""
from __future__ import annotations

from app.core.config import Settings
from app.strategies.storage.base import StorageStrategy
from app.strategies.storage.supabase_strategy import SupabaseStorageStrategy


def build_storage(settings: Settings) -> StorageStrategy:
    """Return the configured storage strategy (Supabase at MVP)."""
    return SupabaseStorageStrategy(settings)
