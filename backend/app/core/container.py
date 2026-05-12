"""Tiny DI container mapping interfaces to concrete strategy singletons."""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings
from app.factories.llm_factory import build_llm
from app.factories.notification_factory import build_notification
from app.factories.ocr_factory import build_ocr
from app.factories.scheduler_factory import build_scheduler
from app.factories.storage_factory import build_storage
from app.strategies.llm.base import LLMStrategy
from app.strategies.notification.base import NotificationStrategy
from app.strategies.ocr.base import OCRStrategy
from app.strategies.scheduler.base import SchedulerStrategy
from app.strategies.storage.base import StorageStrategy


@dataclass
class Container:
    """Holds singleton strategy instances for the app lifetime."""

    llm: LLMStrategy
    notification: NotificationStrategy
    storage: StorageStrategy
    scheduler: SchedulerStrategy
    ocr: OCRStrategy


def build_container(settings: Settings) -> Container:
    """Build the DI container from settings using each factory."""
    return Container(
        llm=build_llm(settings),
        notification=build_notification(settings),
        storage=build_storage(settings),
        scheduler=build_scheduler(settings),
        ocr=build_ocr(settings),
    )
