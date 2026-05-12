"""FastAPI dependencies: bearer-token user extraction + internal HMAC verification.

Note on auth: FastAPI does NOT verify Supabase JWT signatures. The frontend
authenticates with Supabase Auth and forwards the bearer token here. We read
the unverified `sub` claim only to know the user_id; the actual security
boundary is Postgres RLS, enforced when the token is forwarded to Supabase.
"""
from __future__ import annotations

import base64
import hmac
import json
from dataclasses import dataclass
from hashlib import sha256
from uuid import UUID

from fastapi import Depends, Header, Request

from app.core.config import get_settings
from app.core.container import Container
from app.core.errors import AuthError
from app.strategies.storage.base import StorageStrategy
from app.strategies.storage.supabase_strategy import SupabaseStorageStrategy


@dataclass
class CurrentUser:
    """Authenticated user context. JWT is forwarded to Supabase by callers."""

    id: UUID
    jwt: str


def get_container(request: Request) -> Container:
    """Return the app-wide DI container."""
    container: Container = request.app.state.container
    return container


def _decode_unverified_claims(token: str) -> dict[str, object]:
    """Base64-decode the JWT payload segment without signature verification."""
    parts = token.split(".")
    if len(parts) != 3:
        raise AuthError("malformed token")
    payload_b64 = parts[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    try:
        payload = base64.urlsafe_b64decode(payload_b64.encode("ascii"))
        claims = json.loads(payload)
    except (ValueError, json.JSONDecodeError) as exc:
        raise AuthError("token payload not decodable") from exc
    if not isinstance(claims, dict):
        raise AuthError("token payload not an object")
    return claims


async def current_user(authorization: str = Header(...)) -> CurrentUser:
    """Extract user_id from the bearer token's unverified `sub` claim."""
    if not authorization.lower().startswith("bearer "):
        raise AuthError("missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    claims = _decode_unverified_claims(token)
    sub = claims.get("sub")
    if not isinstance(sub, str):
        raise AuthError("token missing sub")
    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise AuthError("sub is not a uuid") from exc
    return CurrentUser(id=user_id, jwt=token)


def get_user_storage(
    user: "CurrentUser" = Depends(current_user),
) -> StorageStrategy:
    """Per-request storage strategy bound to the user's JWT (RLS applies)."""
    return SupabaseStorageStrategy(get_settings(), jwt=user.jwt)


async def require_internal_hmac(
    request: Request,
    x_signature: str = Header(..., alias="X-Signature"),
) -> None:
    """Constant-time HMAC-SHA256 check over the raw request body."""
    secret = get_settings().INTERNAL_HMAC_SECRET.encode("utf-8")
    body = await request.body()
    expected = hmac.new(secret, body, sha256).hexdigest()
    if not hmac.compare_digest(expected, x_signature):
        raise AuthError("invalid signature")
