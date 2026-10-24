# Kairos in one container for Spawnpoint: FalkorDB + FastAPI backend + Next.js frontend.
# The frontend serves :8080 and forwards /api/v1 to the backend on 127.0.0.1:8000, which uses the
# FalkorDB graph on 127.0.0.1:6379. Graph data, event snapshots and logs live in /data (persistent).
# Built from a bundle where this file is the root Dockerfile: see deploy/spawnpoint/bundle.sh.

FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx next build

FROM falkordb/falkordb:6.0.3
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/uv && /opt/uv/bin/pip install --no-cache-dir uv==0.10.12
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN UV_PYTHON_DOWNLOADS=never /opt/uv/bin/uv sync --frozen --no-dev --python python3
COPY backend ./backend
COPY --from=web /web ./frontend
COPY seed-snapshots ./seed-snapshots
COPY deploy/spawnpoint/start.sh ./start.sh
ENV PORT=8080
EXPOSE 8080
CMD ["bash", "/app/start.sh"]
