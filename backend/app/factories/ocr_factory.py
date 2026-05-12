"""Factory for the OCR strategy. Returns v2 placeholder at MVP."""
from __future__ import annotations

from app.core.config import Settings
from app.strategies.ocr.base import NotImplementedOCRStrategy, OCRStrategy


def build_ocr(settings: Settings) -> OCRStrategy:
    """Return the configured OCR strategy (placeholder at MVP)."""
    _ = settings
    return NotImplementedOCRStrategy()
