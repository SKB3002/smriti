"""Domain exception hierarchy mapped to HTTP status codes."""
from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain-level errors."""

    status_code: int = 500
    code: str = "domain_error"

    def __init__(self, message: str = "", *, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class AuthError(DomainError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(DomainError):
    status_code = 403
    code = "forbidden"


class ValidationFailed(DomainError):
    status_code = 422
    code = "validation_failed"


class RateLimited(DomainError):
    status_code = 429
    code = "rate_limited"


class UpstreamError(DomainError):
    status_code = 502
    code = "upstream_error"


class SubscriptionGoneError(DomainError):
    """Raised when a push subscription endpoint returns 404/410 (gone)."""

    status_code = 410
    code = "subscription_gone"

    def __init__(self, endpoint: str) -> None:
        super().__init__(f"push subscription gone: {endpoint}")
        self.endpoint = endpoint


class ConfigError(DomainError):
    """Raised when configuration is invalid (e.g., unknown provider)."""

    status_code = 500
    code = "config_error"
