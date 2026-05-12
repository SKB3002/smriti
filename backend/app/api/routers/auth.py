"""Auth router — informational; PWA talks to Supabase Auth directly."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/exchange")
async def exchange() -> dict[str, str]:
    """Optional token exchange endpoint (placeholder)."""
    raise NotImplementedError("MVP-stub")


@router.get("/me")
async def me(user: CurrentUser = Depends(current_user)) -> dict[str, str]:
    """Return the authenticated user id (smoke test for JWT verification)."""
    return {"user_id": str(user.id)}
