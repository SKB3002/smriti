"""OCRStrategy interface. NOTE: v2 — no implementation in MVP."""
from __future__ import annotations

from abc import ABC, abstractmethod


class OCRStrategy(ABC):
    """Abstract OCR strategy."""

    @abstractmethod
    async def extract(self, image_bytes: bytes) -> str:
        """Extract text from an image."""
        raise NotImplementedError("MVP-stub")


class NotImplementedOCRStrategy(OCRStrategy):
    """Placeholder OCR strategy — raises on use. v2 will replace."""

    async def extract(self, image_bytes: bytes) -> str:
        raise NotImplementedError("OCR is a v2 feature")
