# Second Brain — MVP Plan (Week 1-2)

> **Architecture:** Lean PWA + Supabase Edge (locked)
> **Stack:** Next.js 15 PWA · FastAPI on Fly.io · Supabase · Groq · Web Push
> **Date:** 2026-05-08
> **Mode:** Planning only — no source code in this document.

---

## 1. Goals & Non-Goals

### Goals (MVP, ship in 14 days)
- Capture **projects → tasks → reminders** with rich time-slot/frequency semantics.
- Fire **Web Push** notifications inside a reminder's time slot at a configured frequency.
- **Stealth mode**: push body shows a codename only; real text revealed via blur-on-tap.
- **AI prioritization** via Groq returning top-5 tasks with reasoning (debounced 5 min).
- Single responsive PWA codebase — installable on desktop Chrome and mobile Chrome.
- Async-by-default FastAPI backend with factory/strategy abstractions ready for v2 swaps.

### Non-Goals (explicitly v2)
- ❌ Cycle tracker (4-phase predictor, encrypted notes)
- ❌ OCR / vision (`GroqVisionStrategy`) — interface only at MVP
- ❌ Redis / Upstash cache layer
- ❌ Email escalation (Resend) after missed acks
- ❌ SMS notifications
- ❌ Daily AI digest job
- ❌ Native mobile apps (PWA only)

---

## 2. Architecture Overview

### Request Flow (ASCII)

```
                       ┌────────────────────────────┐
                       │   Browser PWA (Next.js 15) │
                       │   Service Worker + Push    │
                       └─────────┬──────────────────┘
                                 │ HTTPS + JWT
                                 ▼
   ┌──────────────────┐   ┌──────────────────────────┐   ┌──────────────┐
   │  Supabase Auth   │◄──┤   FastAPI (Fly.io)       │──►│  Groq LLM    │
   │  (JWT issuer)    │   │   async + factory/strat. │   │  llama-3.3   │
   └──────────────────┘   └─────────┬────────────────┘   └──────────────┘
                                    │ asyncpg / supabase-py
                                    ▼
                       ┌────────────────────────────┐
                       │  Supabase Postgres + RLS   │
                       │  Realtime · pg_cron        │
                       └─────────┬──────────────────┘
                                 │ pg_cron (* * * * *)
                                 ▼
                       ┌────────────────────────────┐
                       │  Edge Function: fire-due   │
                       │  (Deno, HMAC-signs payload)│
                       └─────────┬──────────────────┘
                                 │ POST /internal/fire-due
                                 ▼
                       ┌────────────────────────────┐
                       │ FastAPI WebPushStrategy    │
                       │ → pywebpush → Browser SW   │
                       └────────────────────────────┘
```

### Mandate
All cross-boundary I/O (LLM calls, DB, push, future OCR/email) is mediated by a **factory** that returns a **strategy** implementing a base interface. Every I/O method is `async`; only pure CPU functions stay sync. Every router boundary runs the **InputDTO → BusinessRuleValidator → OutputDTO** pipeline (pydantic v2). Config, logging, and the DI container live exclusively in `app/core/`. This lets us swap Groq→OpenAI, Web Push→Resend, pg_cron→APScheduler in v2 without touching service code.

---

## 3. Repository Layout

```
second-brain/
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   └── PLAN-second-brain-mvp.md          (this file)
├── supabase/
│   ├── schema.sql
│   ├── policies.sql
│   ├── cron.sql
│   └── functions/
│       └── fire-due/
│           ├── index.ts
│           └── deno.json
├── backend/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── fly.toml
│   ├── scripts/
│   │   └── generate_vapid_keys.py
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   ├── container.py
│   │   │   └── errors.py
│   │   ├── factories/
│   │   │   ├── llm_factory.py
│   │   │   ├── notification_factory.py
│   │   │   ├── storage_factory.py
│   │   │   ├── scheduler_factory.py
│   │   │   └── ocr_factory.py
│   │   ├── strategies/
│   │   │   ├── llm/{base.py, groq_strategy.py}
│   │   │   ├── notification/{base.py, web_push_strategy.py}
│   │   │   ├── storage/{base.py, supabase_strategy.py}
│   │   │   ├── ocr/base.py
│   │   │   └── scheduler/{base.py, supabase_cron_strategy.py}
│   │   ├── domain/
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   ├── reminder.py
│   │   │   ├── codename.py
│   │   │   └── push_subscription.py
│   │   ├── services/
│   │   │   ├── project_service.py
│   │   │   ├── task_service.py
│   │   │   ├── reminder_service.py
│   │   │   ├── prioritization_service.py
│   │   │   ├── notification_service.py
│   │   │   └── codename_service.py
│   │   ├── validators/
│   │   │   ├── schemas.py
│   │   │   └── pipeline.py
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routers/{auth,projects,tasks,reminders,codenames,push,ai,internal}.py
│   │   ├── db/
│   │   │   └── supabase_client.py
│   │   └── workers/
│   │       └── __init__.py
│   └── tests/
│       ├── test_smoke.py
│       ├── test_factories.py
│       ├── test_validators.py
│       └── test_routers/{test_tasks.py, test_reminders.py, test_ai.py}
└── frontend/
    ├── package.json
    ├── next.config.mjs
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── .env.local.example
    ├── public/
    │   ├── manifest.webmanifest
    │   ├── sw.js                          (Serwist-generated; push handler patched in)
    │   └── icons/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                       (dashboard)
    │   ├── (auth)/login/page.tsx
    │   ├── (auth)/signup/page.tsx
    │   ├── projects/page.tsx
    │   ├── projects/[id]/page.tsx
    │   ├── tasks/page.tsx
    │   ├── reminders/page.tsx
    │   └── codenames/page.tsx
    ├── components/
    │   ├── TaskList.tsx
    │   ├── TaskForm.tsx
    │   ├── ReminderForm.tsx
    │   ├── StealthReveal.tsx
    │   └── PrioritizePanel.tsx
    └── lib/
        ├── supabaseClient.ts
        ├── api.ts
        └── pushSubscribe.ts
```

---

## 4. Database Schema

> All tables: `id uuid PK default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `user_id uuid not null references auth.users(id) on delete cascade`. RLS enabled on every table; default policy: `user_id = auth.uid()`.

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | RLS key |
| name | text not null | |
| description | text | |
| color | text | hex tag |
| archived_at | timestamptz | soft delete |
| created_at, updated_at | timestamptz | |

**Indexes:** `(user_id, archived_at)`.
**RLS:** owner full CRUD; no public read.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| project_id | uuid FK → projects, on delete cascade | |
| title | text not null | |
| notes | text | |
| status | text check in ('todo','doing','done','blocked') default 'todo' | |
| priority | smallint default 0 | LLM-set 0-100 |
| priority_reason | text | last AI explanation |
| due_at | timestamptz | optional |
| completed_at | timestamptz | |

**Indexes:** `(user_id, status)`, `(user_id, project_id)`, `(user_id, priority desc)`.
**RLS:** owner full CRUD.

### `reminders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| task_id | uuid FK → tasks, on delete cascade | |
| project_id | uuid FK → projects | denorm for fast cron query |
| time_slot_start | time not null | local-time slot start |
| time_slot_end | time not null | local-time slot end |
| timezone | text not null default 'UTC' | IANA tz |
| frequency_minutes | int not null check (>=1) | fire every N minutes inside slot |
| is_stealth | boolean default false | |
| codename_id | uuid FK → codenames | nullable |
| last_fired_at | timestamptz | updated by /internal/fire-due |
| next_fire_at | timestamptz | computed; pg_cron query target |
| enabled | boolean default true | |

**Indexes:** `(enabled, next_fire_at)`, `(user_id)`.
**RLS:** owner full CRUD; **service role bypass** for cron (Edge Fn uses service key).

### `codenames`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| codename | text not null | shown in stealth push |
| real_label | text not null | revealed after tap-and-hold |

**Indexes:** `(user_id)`, unique `(user_id, codename)`.
**RLS:** owner full CRUD.

### `push_subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| endpoint | text not null unique | browser push endpoint |
| p256dh | text not null | |
| auth | text not null | |
| user_agent | text | |
| disabled_at | timestamptz | invalid endpoint marker |

**Indexes:** unique on `endpoint`, `(user_id, disabled_at)`.
**RLS:** owner read/insert/delete; service role read for fire-due.

### `pg_cron` job
- **Name:** `fire_due_reminders`
- **Schedule:** `* * * * *` (every minute)
- **Action:** `select net.http_post(url := <edge_fn_url>, headers := jsonb_build_object('Authorization', 'Bearer ' || <service_key>), body := jsonb_build_object('ts', now()));`
- Defined in `supabase/cron.sql`. Uses the `pg_net` extension.

---

## 5. Backend File-by-File Plan

> All listed methods are `async` unless explicitly marked `(sync)`. CPU-bound helpers (e.g. priority math, HMAC compare) may be sync.

### `app/main.py`
- **Purpose:** FastAPI app factory.
- **Symbols:** `create_app() -> FastAPI` (sync, returns app), `lifespan(app)` (async ctx mgr — initialises container, closes clients).
- **Deps:** `core.config`, `core.logging`, `core.container`, all routers under `api.routers`.
- **Verify:** `GET /health` returns `{"status":"ok"}`; CORS allows the PWA origin; OpenAPI loads.

### `app/core/config.py`
- **Purpose:** Centralised settings.
- **Symbols:** `class Settings(BaseSettings)` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL_PRIMARY`, `GROQ_MODEL_FALLBACK`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`, `INTERNAL_HMAC_SECRET`, `ENV`, `LLM_PROVIDER='groq'`, `LOG_LEVEL='INFO'`. `get_settings()` cached via `lru_cache` (sync).
- **Deps:** none.
- **Verify:** missing required vars raise `ValidationError` at import time; `.env.example` contains every key.

### `app/core/logging.py`
- **Purpose:** structlog-style JSON logger configured from `LOG_LEVEL`.
- **Symbols:** `configure_logging() -> None` (sync), `get_logger(name) -> Logger` (sync).
- **Verify:** log lines are JSON in `ENV=prod`, pretty in `ENV=dev`.

### `app/core/container.py`
- **Purpose:** Tiny DI registry — maps interfaces → singleton strategy instances built via factories.
- **Symbols:** `class Container` with `llm`, `notification`, `storage`, `scheduler`, `ocr` properties; `build_container(settings) -> Container` (sync).
- **Deps:** all `factories/*`.
- **Verify:** `test_factories.py` asserts each property returns the expected concrete type given config.

### `app/core/errors.py`
- **Purpose:** Domain exception hierarchy mapped to HTTP codes by an exception handler in `main.py`.
- **Symbols:** `DomainError`, `NotFoundError(404)`, `AuthError(401)`, `ForbiddenError(403)`, `ValidationFailed(422)`, `RateLimited(429)`, `UpstreamError(502)`.

### `app/factories/*_factory.py`
- **Purpose:** One module per strategy family. Each exposes `def build_X(settings) -> XStrategy` (sync) returning the right concrete class based on config (e.g. `LLM_PROVIDER`).
- **Verify:** unit test checks unknown provider raises `ConfigError`.
- **`ocr_factory.py`** returns a `NotImplementedOCRStrategy` placeholder marked **v2**.

### `app/strategies/llm/base.py`
- **Symbols:** `class LLMStrategy(Protocol)`: `async def complete(prompt: str, *, json_mode: bool=False, model: str|None=None) -> dict|str`.

### `app/strategies/llm/groq_strategy.py`
- **Purpose:** Groq client; primary = `llama-3.3-70b-versatile`, fallback to `llama-3.1-8b-instant` on rate-limit/5xx.
- **Symbols:** `class GroqStrategy(LLMStrategy)`: `async def complete(...)`, private `async def _call(model)`.
- **Verify:** mock httpx returns 429 → fallback model invoked; JSON mode parses to dict.

### `app/strategies/notification/base.py` + `web_push_strategy.py`
- **Base:** `async def send(subscription, title, body, data) -> bool`.
- **WebPush impl:** wraps `pywebpush` with VAPID claims; on 404/410 marks subscription `disabled_at`.
- **Verify:** failing endpoint flips `disabled_at`.

### `app/strategies/storage/base.py` + `supabase_strategy.py`
- **Base:** generic CRUD: `async def select`, `insert`, `update`, `delete`, `rpc` over a table name.
- **Impl:** thin wrapper over `supabase-py` async client; uses anon key + JWT for user calls, service key for `/internal/fire-due` queries.

### `app/strategies/ocr/base.py`
- **Symbols:** `class OCRStrategy(Protocol)`: `async def extract(image_bytes) -> str`. **NOTE: v2 — no implementation in MVP.**

### `app/strategies/scheduler/base.py` + `supabase_cron_strategy.py`
- **Base:** `async def list_due_reminders(now) -> list[Reminder]`, `async def mark_fired(reminder_id, fired_at)`.
- **Impl:** queries `reminders` where `enabled and next_fire_at <= now`; computes next slot tick.

### `app/domain/*.py`
- **Purpose:** Pure pydantic v2 models — **no I/O**.
- **Files:** `project.py`, `task.py`, `reminder.py`, `codename.py`, `push_subscription.py`.
- **Verify:** instantiating with bad data raises `ValidationError`; round-trips via `.model_dump()`.

### `app/services/*`
- **`project_service.py`** — `async create/list/get/update/archive` projects.
- **`task_service.py`** — CRUD + `async set_priority(task_id, score, reason)`.
- **`reminder_service.py`** — CRUD + `async compute_next_fire_at(reminder)` (sync helper allowed); enforces `time_slot_start < time_slot_end` and `frequency_minutes >= 1`.
- **`prioritization_service.py`** — `async prioritize_top_n(user_id, n=5)`: loads open tasks, builds prompt, calls `LLMStrategy.complete(json_mode=True)`, persists scores.
- **`notification_service.py`** — `async fire_due()`: pulls due reminders via `SchedulerStrategy`, fans out via `NotificationStrategy`, marks fired.
- **`codename_service.py`** — CRUD codename map.
- **Verify:** each service has at least one happy-path + one error-path test.

### `app/validators/schemas.py`
- **Purpose:** Input/Output DTOs per resource (`TaskCreateIn`, `TaskOut`, `ReminderCreateIn`, `ReminderOut`, `PrioritizeIn`, `PrioritizeOut`, `PushSubscribeIn`, `FireDueIn`, etc.).

### `app/validators/pipeline.py`
- **Purpose:** Generic 3-step validation pipeline.
- **Symbols:** `async def validate(input_cls, business_rules: list[Callable], output_cls, payload, ctx) -> OutputDTO` — runs `input_cls.model_validate` → each business rule (async) → `output_cls.model_validate`.
- **Verify:** fails fast at any stage with the right error type.

### `app/api/deps.py`
- **Purpose:** FastAPI dependencies.
- **Symbols:** `async def current_user(authorization: str = Header(...)) -> User` — verifies Supabase JWT (HS256 with `SUPABASE_JWT_SECRET`); `async def require_internal_hmac(x_signature: str = Header(...), body: bytes = Body(...))` — constant-time compares HMAC-SHA256 of body with `INTERNAL_HMAC_SECRET`.

### `app/api/routers/*`
| Router | Endpoints |
|---|---|
| `auth.py` | `POST /auth/exchange` (optional — proxies to Supabase if needed); mostly informational since PWA talks to Supabase Auth directly. |
| `projects.py` | `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}` |
| `tasks.py` | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/{id}` |
| `reminders.py` | `GET/POST /reminders`, `PATCH/DELETE /reminders/{id}`, `POST /reminders/{id}/ack` |
| `codenames.py` | `GET/POST /codenames`, `PATCH/DELETE /codenames/{id}` |
| `push.py` | `POST /push/subscribe`, `DELETE /push/subscribe` |
| `ai.py` | `POST /ai/prioritize` (rate-limited per-user 1/5min server-side as defense-in-depth) |
| `internal.py` | `POST /internal/fire-due` — protected by `require_internal_hmac`; calls `notification_service.fire_due()` |

- **Verify:** every router has integration tests; protected routes 401 without JWT; `/internal/fire-due` 401 without valid HMAC.

### `app/db/supabase_client.py`
- **Purpose:** Async Supabase client wrapper with two flavours: `user_client(jwt)` and `service_client()`.
- **Symbols:** `async def user_client(jwt) -> AsyncClient`, `async def service_client() -> AsyncClient`.

### `app/workers/__init__.py`
- **Purpose:** Placeholder. **No APScheduler at MVP** — pg_cron drives firing. File exists so v2 can drop in `apscheduler_strategy.py`.

### `tests/`
- `test_smoke.py` — app boots, `/health` 200.
- `test_factories.py` — each factory returns expected concrete + raises on bad config.
- `test_validators.py` — pipeline rejects bad inputs, accepts good.
- `test_routers/test_tasks.py`, `test_reminders.py`, `test_ai.py` — happy + auth-failure paths against a Supabase test schema (or mocked storage strategy).

### Top-level backend files
- **`pyproject.toml` / `requirements.txt`:** `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `pydantic-settings`, `httpx`, `supabase`, `pyjwt[crypto]`, `pywebpush`, `cryptography`, `structlog`, `python-multipart`. Dev: `pytest`, `pytest-asyncio`, `mypy`, `ruff`, `respx`.
- **`Dockerfile`:** python:3.12-slim, install deps, `uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8080`.
- **`fly.toml`:** app name, region, internal_port 8080, auto_stop_machines = true, min_machines_running = 0 (free tier; cold start mitigation in §11).
- **`scripts/generate_vapid_keys.py`:** prints VAPID public/private keypair using `cryptography` ECDSA P-256; run once locally, paste into Fly secrets.

---

## 6. Frontend File-by-File Plan

### App shell
- **`app/layout.tsx`** — root layout; loads Tailwind, registers service worker, provides `SupabaseProvider`.
- **`app/globals.css`** — Tailwind layers + minimal design tokens.
- **`app/page.tsx`** — dashboard: today's reminders, top-5 priorities (uses `<PrioritizePanel/>`), quick-add task.

### Auth
- **`app/(auth)/login/page.tsx`** — email/password via Supabase Auth.
- **`app/(auth)/signup/page.tsx`** — same, with confirm flow.

### Projects
- **`app/projects/page.tsx`** — list + create.
- **`app/projects/[id]/page.tsx`** — project detail with embedded task list.

### Tasks
- **`app/tasks/page.tsx`** — global task list with filters.
- **`components/TaskList.tsx`** — virtualised list, status toggle.
- **`components/TaskForm.tsx`** — create/edit task; project picker.

### Reminders
- **`app/reminders/page.tsx`** — list + create reminders.
- **`components/ReminderForm.tsx`** — fields: project, task, `time_slot_start`/`end` (time pickers), `frequency_minutes`, `is_stealth` toggle, `codename_id` picker (visible only when stealth=true).

### Codenames
- **`app/codenames/page.tsx`** — codename ↔ real_label editor (table with inline edit).

### Stealth & AI
- **`components/StealthReveal.tsx`** — renders `real_label` with `filter: blur(8px)`; `pointer-down` for ≥600ms unblurs; `pointer-up` re-blurs.
- **`components/PrioritizePanel.tsx`** — button → `POST /ai/prioritize`; client-side debounce (`localStorage` timestamp) blocks calls within 5 minutes; renders ranked list with reasoning.

### Lib
- **`lib/supabaseClient.ts`** — `createBrowserClient` with anon key.
- **`lib/api.ts`** — typed `fetch` wrapper that injects Supabase JWT into `Authorization: Bearer …`.
- **`lib/pushSubscribe.ts`** — `subscribeToPush()`: registers SW, asks permission, calls `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })`, POSTs to `/push/subscribe`.

### PWA assets
- **`public/manifest.webmanifest`** — name, icons, `display: standalone`, theme color.
- **`public/sw.js`** (generated by Serwist + custom push handler) — `push` event: `event.waitUntil(self.registration.showNotification(title, { body, data, tag }))`. For stealth payloads, `body = data.codename`; full text lives in `data.realLabel` and is sent only on `notificationclick` to the focused client, which renders via `<StealthReveal/>`.

### Tooling
- **`tailwind.config.ts`**, **`postcss.config.mjs`**, **`next.config.mjs`** (with Serwist plugin), **`.env.local.example`** (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, NEXT_PUBLIC_API_URL).

### Frontend deps
- `next@15`, `react@19`, `@supabase/ssr`, `@supabase/supabase-js`, `@serwist/next`, `serwist`, `tailwindcss`, `zod`, `clsx`, `lucide-react`.

---

## 7. Supabase Layer Plan

### `supabase/schema.sql` outline
- Section 1: extensions (`pgcrypto`, `pg_net`, `pg_cron`).
- Section 2: tables (projects, tasks, reminders, codenames, push_subscriptions).
- Section 3: indexes (per table as listed in §4).
- Section 4: triggers (`updated_at` auto-touch via `moddatetime`).

### `supabase/policies.sql`
- Enable RLS on all five tables.
- Per-table policies:
  - **projects/tasks/reminders/codenames/push_subscriptions:** `select/insert/update/delete using (user_id = auth.uid())`.
  - **reminders + push_subscriptions:** additional `select/update` policy `using (auth.role() = 'service_role')` so the Edge Function can read them and mark fired.

### `supabase/cron.sql`
- Schedule `fire_due_reminders` every minute via `cron.schedule(...)`.
- Job body: `select net.http_post(url, headers, body)` targeting the Edge Function URL with the service-role bearer.

### Edge Function `supabase/functions/fire-due/index.ts` (Deno)
- Receives the cron POST.
- Queries `reminders` where `enabled and next_fire_at <= now()` joined with active `push_subscriptions` and (if stealth) `codenames`.
- Builds payload `{reminder_id, codename, real_label, is_stealth, subscription}`.
- Computes `HMAC-SHA256(body, INTERNAL_HMAC_SECRET)` → `X-Signature` header.
- POSTs to `${API_BASE}/internal/fire-due`.
- On 200: updates `last_fired_at = now()`, recomputes `next_fire_at`. (Edge Fn updates DB directly — FastAPI just sends the push.)

---

## 8. Dependency Graph

```
core/config ──► core/logging ──► core/errors
       │                              │
       ▼                              ▼
  strategies/*/base ◄──────── domain/*
       │
       ▼
  strategies/*/<impl>  (groq, web_push, supabase, supabase_cron)
       │
       ▼
  factories/*_factory ──► core/container
                              │
                              ▼
                          services/*
                              │
                              ▼
                       validators/{schemas,pipeline}
                              │
                              ▼
                          api/deps ──► api/routers/*
                              │
                              ▼
                            main.py
```

Build/test order: **config → logging/errors → domain → strategy bases → strategy impls → factories → container → services → validators → deps → routers → main → tests**.

---

## 9. 2-Week Day-by-Day Checkpoints

### Days 1-3 — Infra
- **Day 1:** Repo scaffold (backend/, frontend/, supabase/, docs/, .env.example, .gitignore). Create Supabase project. Generate VAPID keys. Verify: `git log` clean, secrets in `.env`.
- **Day 2:** Write `supabase/schema.sql` + `policies.sql` and apply. Verify: tables visible in Supabase Studio, RLS shows enabled, sample insert as anonymous user fails.
- **Day 3:** Write `supabase/cron.sql` + Edge Function skeleton (echoes payload, no HMAC yet). Verify: cron runs every minute (check `cron.job_run_details`), Edge Fn invocations show in dashboard.

### Days 4-6 — Backend skeleton + factories
- **Day 4:** `core/config.py`, `logging.py`, `errors.py`, `main.py` with `/health`. Dockerfile + fly.toml. Verify: `docker run` returns 200 on /health locally.
- **Day 5:** Strategy bases + `groq_strategy`, `web_push_strategy`, `supabase_strategy`, `supabase_cron_strategy`, `ocr/base.py` (v2 stub). Factories + container. Verify: `pytest tests/test_factories.py` green.
- **Day 6:** Domain models + validators (schemas + pipeline) + `api/deps.py` (JWT verify). Smoke router for `/me`. Verify: hitting `/me` with a real Supabase JWT returns the user_id.

### Days 7-9 — Frontend shell
- **Day 7:** `npx create-next-app`, Tailwind, Serwist, manifest, basic layout. Verify: `npm run dev`, Lighthouse PWA score "installable".
- **Day 8:** Auth pages + `lib/supabaseClient.ts` + `lib/api.ts`. Verify: signup → login → JWT shows in network tab → call to backend `/me` returns 200.
- **Day 9:** Projects + Tasks pages with `TaskList`, `TaskForm`. Backend routers `projects.py`, `tasks.py` wired to `services` + Supabase via storage strategy. Verify: create/list/edit/delete a task end-to-end.

### Days 10-11 — Notifications + cron
- **Day 10:** `push.py` router + `lib/pushSubscribe.ts` + service worker push handler. Deploy backend to Fly. Verify: subscribe from browser, row appears in `push_subscriptions`; manual `curl` to `pywebpush` test endpoint shows a notification.
- **Day 11:** Reminders router + service + `compute_next_fire_at`. Wire Edge Function with HMAC → `/internal/fire-due` → `WebPushStrategy.send`. Verify: create reminder for "next minute" → push lands on phone within 60s.

### Days 12-13 — Stealth UI + AI prioritize
- **Day 12:** Codenames CRUD (router + page). `StealthReveal.tsx` with blur + tap-and-hold. SW push handler reads `is_stealth` and shows codename only. Verify: stealth reminder push body shows codename; opening the app reveals real text only after 600ms hold.
- **Day 13:** `prioritization_service` + `ai.py` router (Groq JSON mode, fallback model). `PrioritizePanel.tsx` with 5-min localStorage debounce + server-side per-user rate limiter. Verify: panel returns ranked top-5 with reasoning; second click within 5 min is blocked client-side and 429'd server-side.

### Day 14 — E2E + PWA polish
- **Day 14:** End-to-end smoke (signup → project → task → reminder → push → ack → prioritize). Lighthouse audit. Icons + manifest finalised. Update README. Verify: every box in §10 is checked.

---

## 10. Verification Checklist

**Done = all of:**
- [ ] Can create project, task, reminder via UI
- [ ] Reminder fires push notification within its time slot at the configured frequency
- [ ] Stealth reminder shows codename only in push; reveals real text after tap-and-hold
- [ ] `/ai/prioritize` returns ranked top-5 with reasoning
- [ ] Auth works end-to-end (signup → login → JWT in API calls)
- [ ] PWA installable on desktop Chrome and mobile Chrome
- [ ] All I/O functions are async; `mypy` / `pyright` clean; `ruff check` clean
- [ ] No cycle / OCR / Redis code present (correctly deferred to v2)
- [ ] RLS verified: a second user cannot see another's rows (manual test with two accounts)
- [ ] `/internal/fire-due` rejects requests with bad/missing HMAC

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Fly.io free-tier cold start delays push fan-out | Add a Supabase pg_cron keep-warm job hitting `/health` every 4 min; if still bad, switch deploy target to Render free tier (same Dockerfile). |
| Supabase free project pauses after 7 days inactivity | External daily ping via cron-job.org → `${SUPABASE_URL}/rest/v1/` and `${API_URL}/health`. |
| Groq rate limits during peak | Client 5-min debounce + server per-user limiter; fallback model on 429; v2 adds Upstash Redis cache keyed by `(user_id, task_set_hash)`. |
| Web Push unreliable on locked Android / iOS Safari | Acknowledge as a known MVP limit; v2 adds Resend email escalation after N missed acks. |
| Edge Function ↔ FastAPI HMAC drift | Single shared secret in Fly + Supabase secrets; rotate via runbook; constant-time compare. |
| Time-zone bugs in `compute_next_fire_at` | Store IANA tz on reminder; compute in `zoneinfo`; unit tests covering DST boundary. |

---

## 12. v2 Backlog (deferred — DO NOT BUILD AT MVP)

- Cycle tracker: 4-phase predictor, `pgcrypto`-encrypted notes, dedicated `cycles` table.
- OCR via `GroqVisionStrategy` (`llama-3.2-90b-vision`) — slot into existing `ocr_factory`.
- Redis (Upstash) cache layer for prioritisation + LLM responses.
- Email escalation via Resend after N missed push acks.
- Daily AI digest job (pg_cron at 07:00 local → Edge Fn → email).
- SMS strategy (Twilio) behind `NotificationFactory`.
- Native wrappers (Capacitor) if PWA push proves too unreliable.
