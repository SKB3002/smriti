FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_NO_PROGRESS=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install uv (single static binary — matches local dev workflow).
RUN pip install --no-cache-dir uv

# Install runtime deps from the lockfile into a project venv.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App code last so dependency-change layer stays cached.
COPY app ./app
COPY scripts ./scripts

EXPOSE 3100

# Render sets $PORT at runtime; default to 3100 for local Docker.
CMD ["sh", "-c", ".venv/bin/uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-3100}"]
