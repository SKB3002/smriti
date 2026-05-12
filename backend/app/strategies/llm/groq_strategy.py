"""Groq LLM strategy with primary/fallback model selection."""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import UpstreamError
from app.strategies.llm.base import LLMStrategy

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_FALLBACK_STATUSES = {429, 500, 502, 503, 504}


class GroqStrategy(LLMStrategy):
    """Groq client; falls back to secondary model on rate-limit/5xx."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._primary = settings.GROQ_MODEL_PRIMARY
        self._fallback = settings.GROQ_MODEL_FALLBACK
        self._headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

    async def complete(
        self,
        prompt: str,
        *,
        json_mode: bool = False,
        model: str | None = None,
    ) -> dict[str, Any] | str:
        target = model or self._primary
        try:
            return await self._call(target, prompt, json_mode=json_mode)
        except UpstreamError as exc:
            if model is not None or target == self._fallback:
                raise
            if exc.code != "groq_retryable":
                raise
            return await self._call(self._fallback, prompt, json_mode=json_mode)

    async def _call(
        self, model: str, prompt: str, *, json_mode: bool
    ) -> dict[str, Any] | str:
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.post(_GROQ_URL, json=body, headers=self._headers)

        if resp.status_code in _FALLBACK_STATUSES:
            raise UpstreamError(f"groq {resp.status_code}", code="groq_retryable")
        if resp.status_code >= 400:
            raise UpstreamError(f"groq {resp.status_code}: {resp.text}", code="groq_error")

        content = resp.json()["choices"][0]["message"]["content"]
        if json_mode:
            try:
                return json.loads(content)
            except json.JSONDecodeError as exc:
                raise UpstreamError(f"groq json parse: {exc}", code="groq_bad_json") from exc
        return content
