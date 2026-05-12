"""Validation pipeline tests."""
from __future__ import annotations

import pytest
from pydantic import BaseModel, ConfigDict, Field

from app.core.errors import NotFoundError, ValidationFailed
from app.validators.pipeline import validate


class _In(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)


class _Out(BaseModel):
    id: int
    name: str


async def _ok_rule(dto: _In, ctx: dict[str, object]) -> None:  # type: ignore[override]
    ctx["row"] = {"id": 1, "name": dto.name}


async def _raise_rule(_dto: _In, _ctx: dict[str, object]) -> None:
    raise NotFoundError("nope")


async def test_pipeline_happy_path() -> None:
    out = await validate(_In, [_ok_rule], _Out, {"name": "x"}, {})
    assert out.id == 1 and out.name == "x"


async def test_pipeline_rejects_bad_input() -> None:
    with pytest.raises(ValidationFailed):
        await validate(_In, [_ok_rule], _Out, {"name": ""}, {})


async def test_pipeline_propagates_business_rule_errors() -> None:
    with pytest.raises(NotFoundError):
        await validate(_In, [_raise_rule], _Out, {"name": "x"}, {})


async def test_pipeline_requires_row_in_ctx() -> None:
    async def _no_row(_dto: _In, _ctx: dict[str, object]) -> None:
        return None

    with pytest.raises(ValidationFailed):
        await validate(_In, [_no_row], _Out, {"name": "x"}, {})
