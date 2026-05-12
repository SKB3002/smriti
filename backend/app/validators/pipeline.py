"""Generic 3-step InputDTO -> BusinessRules -> OutputDTO validation pipeline."""
from __future__ import annotations

from typing import Any, Awaitable, Callable, TypeVar

from pydantic import BaseModel, ValidationError

from app.core.errors import ValidationFailed

InT = TypeVar("InT", bound=BaseModel)
OutT = TypeVar("OutT", bound=BaseModel)

BusinessRule = Callable[[BaseModel, dict[str, Any]], Awaitable[None]]


async def validate(
    input_cls: type[InT],
    business_rules: list[BusinessRule],
    output_cls: type[OutT],
    payload: dict[str, Any],
    ctx: dict[str, Any],
) -> OutT:
    """Run input validation -> async business rules -> output validation.

    Stages:
        1. `input_cls.model_validate(payload)` — fail-fast on schema errors
        2. each rule called as `await rule(input_dto, ctx)` — rules either
           mutate `ctx` (e.g. write `ctx["row"]`) or raise `DomainError`
        3. `output_cls.model_validate(ctx["row"])` — final shape check

    Rules are responsible for putting the row to be returned into
    `ctx["row"]` (a dict). The pipeline does not assume any other contract.
    """
    try:
        input_dto = input_cls.model_validate(payload)
    except ValidationError as exc:
        raise ValidationFailed(str(exc)) from exc

    for rule in business_rules:
        await rule(input_dto, ctx)

    row = ctx.get("row")
    if row is None:
        raise ValidationFailed("pipeline: ctx['row'] not set by business rules")

    try:
        return output_cls.model_validate(row)
    except ValidationError as exc:
        raise ValidationFailed(f"output validation: {exc}") from exc
