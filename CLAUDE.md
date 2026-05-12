# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Second Brain — a personal AI-powered reminder PWA. Single codebase serves desktop + mobile. MVP scope is deliberately narrow; see [docs/PLAN-second-brain-mvp.md](docs/PLAN-second-brain-mvp.md) for the day-by-day build plan (read first when picking up unfinished work).

Stack: Next.js 15 (App Router, Serwist PWA, Tailwind v4) · FastAPI (Python 3.12, async) on Fly.io · Supabase (Postgres + Auth + RLS + Realtime + pg_cron + Edge Functions) · Groq LLM (`llama-3.3-70b-versatile` primary, `llama-3.1-8b-instant` fallback) · Web Push (VAPID).

Explicitly out of MVP scope (do **not** add): Redis, OCR, cycle tracker, email, SMS, daily digest. These live as deferred strategies/factories and a v2 backlog in the README.

## Commands

Backend (from `backend/`, uses `uv`):
- Install: `uv sync`
- Run dev: `uvicorn app.main:app --reload`
- Tests: `pytest` · single test: `pytest tests/path/to/test_x.py::test_name`
- Lint / format / types: `ruff check .` · `ruff format .` · `mypy .` (mypy is `strict`)
- Generate VAPID keys: `python scripts/generate_vapid_keys.py`

Frontend (from `frontend/`):
- `npm install` · `npm run dev` · `npm run build` · `npm run start` · `npm run lint`

Supabase: apply `supabase/schema.sql` to the project; deploy `supabase/functions/fire-due/` as a Deno Edge Function. `pg_cron` calls that function, which calls FastAPI `POST /internal/fire-due`.

## Architecture

**Provider-swappable via env (Factory + Strategy).** Five capabilities — LLM, Notification, Storage, Scheduler, OCR — each have:
- `app/strategies/<cap>/base.py` — abstract interface
- `app/strategies/<cap>/<provider>_strategy.py` — concrete impl(s)
- `app/factories/<cap>_factory.py` — selects impl from `Settings`

`app/core/container.py::build_container` wires the singletons into a `Container` at FastAPI lifespan startup (`app/main.py`). Routers receive strategies via `app/api/deps.py`. To add a provider: add a strategy class implementing the base, branch in the factory on a settings value — do not import providers directly from routers/services.

**Validation pipeline (mandate).** Every router boundary goes Input DTO → async business rules → Output DTO via `app/validators/pipeline.py::validate`. DTO schemas live in `app/validators/schemas.py`. Domain models in `app/domain/` are framework-free; `app/services/` orchestrate them and call strategies via the container.

**Async-by-default.** All I/O paths (Supabase, Groq, web push, HTTP) are async. Sync only for CPU-bound work.

**Reminder firing path:** Supabase `pg_cron` (every minute) → Edge Function `fire-due` → FastAPI `POST /internal/fire-due` (auth via shared secret) → `notification_service` → `WebPushStrategy` → service worker → user. The `internal` router is **not** for clients; it is the cron callback surface.

**Auth + RLS.** Supabase Auth issues JWTs on the frontend. FastAPI does **not** verify JWT signatures — it forwards the bearer token to the Supabase client (`postgrest.auth(jwt)`) and Postgres RLS (`user_id = auth.uid()`) is the security boundary. `api/deps.current_user` reads the *unverified* `sub` claim only to know the user_id. Never bypass RLS with the service-role key outside the `internal`/cron path.

**Frontend.** Next.js App Router under `frontend/app/`. Serwist (`@serwist/next`) generates the SW that handles push events and offline shell. Tailwind v4 uses CSS-first config (no `tailwind.config.js`). Talks to FastAPI for app data and to Supabase JS only for auth/realtime.

## Conventions

- Centralised config (`app/core/config.py`), logging (`structlog`), DI (`container.py`) — don't read env vars or instantiate providers ad-hoc inside services/routers.
- Errors: raise `DomainError` subclasses (`app/core/errors.py`); the global handler in `main.py` shapes the JSON response.
- Ruff line length 100, target py312. Mypy strict — type everything; no implicit `Any`.
- Pytest is `asyncio_mode = "auto"` — async tests don't need a marker.
