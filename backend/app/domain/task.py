"""Task domain model."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

TaskStatus = Literal["todo", "doing", "done", "blocked"]


class Task(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    project_id: UUID
    title: str
    notes: str | None = None
    status: TaskStatus = "todo"
    priority: int = Field(default=0, ge=0, le=100)
    priority_reason: str | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
