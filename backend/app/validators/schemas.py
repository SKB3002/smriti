"""Input/Output DTOs (pydantic v2) for every router boundary."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------- Projects ----------

class ProjectCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    color: str | None = None


class ProjectUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    description: str | None = None
    color: str | None = None
    archived_at: datetime | None = None


class ProjectOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    color: str | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ---------- Tasks ----------

TaskStatus = Literal["todo", "doing", "done", "blocked"]


class TaskCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: UUID
    title: str = Field(min_length=1, max_length=300)
    notes: str | None = None
    status: TaskStatus = "todo"
    due_at: datetime | None = None


class TaskUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    notes: str | None = None
    status: TaskStatus | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None


class TaskOut(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    title: str
    notes: str | None = None
    status: TaskStatus
    priority: int
    priority_reason: str | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ---------- Reminders ----------

ReminderKind = Literal["normal", "persistent"]


class ReminderCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_id: UUID
    project_id: UUID
    kind: ReminderKind
    start_at: datetime
    end_at: datetime | None = None
    frequency_minutes: int | None = Field(default=None, ge=1)
    is_stealth: bool = False
    codename_id: UUID | None = None
    enabled: bool = True
    tags: list[str] = Field(default_factory=list)


class ReminderUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: ReminderKind | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    frequency_minutes: int | None = Field(default=None, ge=1)
    is_stealth: bool | None = None
    codename_id: UUID | None = None
    enabled: bool | None = None


class ReminderOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID
    project_id: UUID
    kind: ReminderKind
    start_at: datetime
    end_at: datetime | None = None
    frequency_minutes: int | None = None
    is_stealth: bool
    codename_id: UUID | None = None
    last_fired_at: datetime | None = None
    next_fire_at: datetime | None = None
    enabled: bool
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ---------- Codenames ----------

class CodenameCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    codename: str = Field(min_length=1, max_length=80)
    real_label: str = Field(min_length=1, max_length=300)


class CodenameUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    codename: str | None = None
    real_label: str | None = None


class CodenameOut(BaseModel):
    id: UUID
    user_id: UUID
    codename: str
    real_label: str
    created_at: datetime
    updated_at: datetime


# ---------- Push ----------

class PushSubscribeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None


class PushSubscribeOut(BaseModel):
    id: UUID
    endpoint: str
    created_at: datetime


# ---------- AI ----------

class PrioritizeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    n: int = Field(default=5, ge=1, le=20)


class PrioritizedTask(BaseModel):
    task_id: UUID
    score: int = Field(ge=0, le=100)
    reason: str


class PrioritizeOut(BaseModel):
    items: list[PrioritizedTask]


class ReminderParseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=1000)


class ReminderParseOut(BaseModel):
    title: str
    start_at: datetime
    kind: ReminderKind
    end_at: datetime | None = None
    frequency_minutes: int | None = None
    tags: list[str]


# ---------- Internal ----------

class FireDueKeys(BaseModel):
    p256dh: str
    auth: str


class FireDueSubscription(BaseModel):
    endpoint: str
    keys: FireDueKeys


class FireDueIn(BaseModel):
    """Per-reminder payload from the Edge Function to /internal/fire-due."""

    model_config = ConfigDict(extra="ignore")
    reminder_id: UUID
    user_id: UUID
    is_stealth: bool = False
    codename: str | None = None
    real_label: str | None = None
    subscription: FireDueSubscription


class FireDueOut(BaseModel):
    fired: bool
    subscription_disabled: bool = False
