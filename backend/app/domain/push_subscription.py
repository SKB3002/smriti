"""Push subscription domain model."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PushSubscription(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None
    disabled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
