"""Tests for api/deps: bearer-token user extraction + HMAC verifier."""
from __future__ import annotations

import base64
import hmac
import json
from hashlib import sha256
from uuid import uuid4

import pytest
from starlette.requests import Request

from app.api.deps import _decode_unverified_claims, current_user, require_internal_hmac
from app.core.errors import AuthError


def _make_token(claims: dict[str, object]) -> str:
    def _b64(b: bytes) -> bytes:
        return base64.urlsafe_b64encode(b).rstrip(b"=")

    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(json.dumps(claims).encode())
    sig = _b64(b"sig")
    return b".".join([header, payload, sig]).decode()


async def test_current_user_extracts_sub() -> None:
    uid = uuid4()
    token = _make_token({"sub": str(uid)})
    user = await current_user(authorization=f"Bearer {token}")
    assert user.id == uid
    assert user.jwt == token


async def test_current_user_rejects_missing_bearer() -> None:
    with pytest.raises(AuthError):
        await current_user(authorization="Token abc")


async def test_current_user_rejects_bad_sub() -> None:
    token = _make_token({"sub": "not-a-uuid"})
    with pytest.raises(AuthError):
        await current_user(authorization=f"Bearer {token}")


def test_decode_unverified_claims_malformed() -> None:
    with pytest.raises(AuthError):
        _decode_unverified_claims("not.a.jwt.token")


def _request_with_body(body: bytes) -> Request:
    sent = {"done": False}

    async def receive() -> dict[str, object]:
        if sent["done"]:
            return {"type": "http.disconnect"}
        sent["done"] = True
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {"type": "http", "method": "POST", "path": "/", "headers": []}
    return Request(scope, receive)  # type: ignore[arg-type]


async def test_require_internal_hmac_accepts_valid_signature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_HMAC_SECRET", "hmac")
    from app.core.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]

    body = b'{"hello":"world"}'
    sig = hmac.new(b"hmac", body, sha256).hexdigest()
    await require_internal_hmac(_request_with_body(body), x_signature=sig)


async def test_require_internal_hmac_rejects_bad_signature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_HMAC_SECRET", "hmac")
    from app.core.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]

    with pytest.raises(AuthError):
        await require_internal_hmac(_request_with_body(b"x"), x_signature="deadbeef")
