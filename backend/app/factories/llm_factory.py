"""Factory for the LLM strategy."""
from __future__ import annotations

from app.core.config import Settings
from app.core.errors import ConfigError
from app.strategies.llm.base import LLMStrategy
from app.strategies.llm.groq_strategy import GroqStrategy


def build_llm(settings: Settings) -> LLMStrategy:
    """Return the configured LLM strategy."""
    if settings.LLM_PROVIDER == "groq":
        return GroqStrategy(settings)
    raise ConfigError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")
