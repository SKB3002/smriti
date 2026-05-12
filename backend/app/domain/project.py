"""Project domain model."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    color: str | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
