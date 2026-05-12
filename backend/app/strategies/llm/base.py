"""LLMStrategy interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class LLMStrategy(ABC):
    """Abstract LLM strategy."""

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        *,
        json_mode: bool = False,
        model: str | None = None,
    ) -> dict[str, Any] | str:
        """Run a completion. Returns dict when json_mode=True, str otherwise."""
        raise NotImplementedError("MVP-stub")
