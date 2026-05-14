"""Natural-language reminder parser with auto-tagging.

One Groq call returns both the structured reminder fields and up to 3 tags
chosen from a fixed enum. Tags are generated at parse time so the create
endpoint incurs zero extra latency.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from app.core.errors import DomainError
from app.strategies.llm.base import LLMStrategy

_TAG_ENUM = ["work", "health", "finance", "personal", "family", "errands", "learning", "other"]

_SYSTEM = """\
You are a reminder parser. Given a natural-language reminder text, the \
current UTC datetime, AND the user's local timezone offset (minutes from UTC), \
extract structured fields and auto-assign tags.

Return ONLY valid JSON matching this exact schema:
{
  "title": "<concise reminder title, max 200 chars>",
  "start_at": "<ISO-8601 UTC datetime>",
  "kind": "normal" | "persistent",
  "end_at": "<ISO-8601 UTC datetime or null>",
  "frequency_minutes": <integer >= 1 or null>,
  "tags": ["<tag1>", ...]
}

Rules:
- IMPORTANT: When the user says a time like "10am" or "tomorrow at 3pm", they mean \
their LOCAL time. Convert it to UTC by SUBTRACTING the offset: \
utc_time = local_time - offset_minutes. \
Example: user in IST (offset = +330 min) says "10am tomorrow" → \
10:00 local - 330 min = 04:30 UTC. \
Example: user says "remind me in 3 minutes" and current UTC is 06:18, offset +330 → \
local now = 06:18 + 330min = 11:48 IST, +3min = 11:51 IST, \
back to UTC = 11:51 - 330min = 06:21 UTC. Return 06:21 UTC.
- For relative phrases like "in N minutes/hours", compute from current UTC directly \
(no timezone conversion needed since "now" has no local-vs-utc ambiguity).
- kind="persistent" only if the user explicitly mentions a repeating/recurring interval.
  For persistent, end_at and frequency_minutes must be set.
- kind="normal" otherwise. end_at and frequency_minutes must be null.
- start_at: if no date given, default to 1 hour from now.
- tags: pick 1-3 from this list only: """ + json.dumps(_TAG_ENUM) + """.
  Choose the most relevant. If nothing fits, use ["other"].
- All datetimes in ISO-8601 UTC (e.g. "2025-05-13T14:00:00+00:00").
- Respond with ONLY the JSON object. No extra text.
"""


class ReminderParseService:
    def __init__(self, llm: LLMStrategy) -> None:
        self._llm = llm

    async def parse(self, text: str, tz_offset_minutes: int = 0) -> dict[str, Any]:
        now_utc = datetime.now(UTC).isoformat()
        prompt = (
            f"Current UTC time: {now_utc}\n"
            f"User timezone offset (minutes from UTC): {tz_offset_minutes}\n\n"
            f"Reminder text: {text}"
        )
        full_prompt = f"{_SYSTEM}\n\n{prompt}"

        raw = await self._llm.complete(full_prompt, json_mode=True)
        if not isinstance(raw, dict):
            raise DomainError("llm returned unexpected type")

        return _validate(raw, now_utc)


def _validate(raw: dict[str, Any], now_iso: str) -> dict[str, Any]:
    """Light structural validation before handing off to the router."""
    title = str(raw.get("title", "")).strip()
    if not title:
        raise DomainError("parsed title is empty")

    kind = raw.get("kind")
    if kind not in ("normal", "persistent"):
        kind = "normal"

    try:
        start_at = datetime.fromisoformat(str(raw["start_at"]))
    except (KeyError, ValueError):
        start_at = datetime.fromisoformat(now_iso)

    end_at: datetime | None = None
    freq: int | None = None
    if kind == "persistent":
        try:
            end_at = datetime.fromisoformat(str(raw["end_at"]))
        except (KeyError, ValueError, TypeError):
            raise DomainError("persistent reminder requires valid end_at")
        try:
            freq = int(raw["frequency_minutes"])
            if freq < 1:
                raise ValueError
        except (KeyError, ValueError, TypeError):
            raise DomainError("persistent reminder requires frequency_minutes >= 1")

    raw_tags = raw.get("tags", [])
    tags = [t for t in raw_tags if isinstance(t, str) and t in _TAG_ENUM]
    if not tags:
        tags = ["other"]

    return {
        "title": title,
        "start_at": start_at.astimezone(UTC).isoformat(),
        "kind": kind,
        "end_at": end_at.astimezone(UTC).isoformat() if end_at else None,
        "frequency_minutes": freq,
        "tags": tags,
    }
