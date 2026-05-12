"""Reminder domain model."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

ReminderKind = Literal["normal", "persistent"]


class Reminder(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    task_id: UUID
    project_id: UUID
    kind: ReminderKind
    start_at: datetime
    end_at: datetime | None = None
    frequency_minutes: int | None = Field(default=None, ge=1)
    is_stealth: bool = False
    codename_id: UUID | None = None
    last_fired_at: datetime | None = None
    next_fire_at: datetime | None = None
    enabled: bool = True
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def _check_shape(self) -> "Reminder":
        if self.kind == "normal":
            if self.end_at is not None or self.frequency_minutes is not None:
                raise ValueError("normal reminders must not set end_at/frequency_minutes")
        else:
            if self.end_at is None or self.frequency_minutes is None:
                raise ValueError(
                    "persistent reminders require end_at and frequency_minutes"
                )
            if self.end_at <= self.start_at:
                raise ValueError("end_at must be > start_at")
        return self
