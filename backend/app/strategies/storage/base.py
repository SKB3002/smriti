"""StorageStrategy interface — generic CRUD over a table name."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class StorageStrategy(ABC):
    """Abstract storage strategy."""

    @abstractmethod
    async def select(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        columns: str = "*",
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError("MVP-stub")

    @abstractmethod
    async def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("MVP-stub")

    @abstractmethod
    async def update(
        self,
        table: str,
        row_id: str,
        patch: dict[str, Any],
    ) -> dict[str, Any]:
        raise NotImplementedError("MVP-stub")

    @abstractmethod
    async def delete(self, table: str, row_id: str) -> None:
        raise NotImplementedError("MVP-stub")

    @abstractmethod
    async def rpc(self, fn: str, params: dict[str, Any]) -> Any:
        raise NotImplementedError("MVP-stub")
