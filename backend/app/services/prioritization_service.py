"""AI prioritization service — calls LLM and persists scores."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app.core.errors import UpstreamError
from app.services.task_service import TaskService
from app.strategies.llm.base import LLMStrategy

_OPEN_STATUSES = ("todo", "doing", "blocked")
_PROMPT_TMPL = """You are prioritizing a user's open tasks. Pick the {n} most \
important ones to do next and explain why.

Return strict JSON of the form:
{{
  "items": [
    {{"task_id": "<uuid>", "score": <int 0-100>, "reason": "<one short sentence>"}}
  ]
}}

Higher score = more important. Consider due dates, blockers, and recency.

Tasks (JSON):
{tasks}
"""


class PrioritizationService:
    """Picks top-N open tasks via LLM JSON mode and persists the scores."""

    def __init__(self, llm: LLMStrategy, task_service: TaskService) -> None:
        self._llm = llm
        self._tasks = task_service

    async def prioritize_top_n(
        self, user_id: UUID, n: int = 5
    ) -> list[dict[str, Any]]:
        tasks = await self._tasks.list(user_id)
        open_tasks = [t for t in tasks if t.get("status") in _OPEN_STATUSES]
        if not open_tasks:
            return []

        slim = [
            {
                "id": str(t["id"]),
                "title": t["title"],
                "status": t["status"],
                "due_at": t.get("due_at"),
                "notes": t.get("notes"),
            }
            for t in open_tasks
        ]
        prompt = _PROMPT_TMPL.format(n=n, tasks=json.dumps(slim))
        result = await self._llm.complete(prompt, json_mode=True)
        if not isinstance(result, dict) or "items" not in result:
            raise UpstreamError("llm returned no items", code="prioritize_bad_shape")

        items = result["items"]
        if not isinstance(items, list):
            raise UpstreamError("llm items not a list", code="prioritize_bad_shape")

        valid_ids = {str(t["id"]) for t in open_tasks}
        cleaned: list[dict[str, Any]] = []
        for it in items[:n]:
            if not isinstance(it, dict):
                continue
            tid = str(it.get("task_id", ""))
            if tid not in valid_ids:
                continue
            try:
                score = max(0, min(100, int(it.get("score", 0))))
            except (TypeError, ValueError):
                continue
            reason = str(it.get("reason", "")).strip() or "—"
            cleaned.append({"task_id": tid, "score": score, "reason": reason})

        # Persist scores (best-effort; don't fail the response if one update errors).
        for it in cleaned:
            try:
                await self._tasks.set_priority(
                    UUID(it["task_id"]), it["score"], it["reason"]
                )
            except Exception:
                pass

        return cleaned
