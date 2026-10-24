# Kairos

**Meet the right people. Follow up with purpose.**

Backend-first MVP for job seekers networking at conferences. Enter career goals, discover relevant people, understand the match, save conversation notes, and prepare introductions, follow-ups, or referral requests.

## Run locally (no API keys or Docker needed)

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```sh
uv sync --frozen
uv run uvicorn kairos.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs for the interactive API. Health: http://127.0.0.1:8000/health.

The default is **SQLite development storage, fictional fixture people, and template drafts**. It is a functioning persistent API, not a live-data or AI demo. No external requests are made to the supplied event or LinkedIn URLs.

## Run with FalkorDB

With Docker running:

```sh
docker compose up --build
```

This starts FalkorDB plus the API; both ports are bound to localhost. Graph data persists in a named Docker volume. Or run the API locally against a cloud/local graph:

```sh
KAIROS_STORAGE=falkordb KAIROS_FALKORDB_URL=redis://localhost:6379 \
  uv run uvicorn kairos.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

Use `rediss://` for TLS endpoints. Store credentials only in an ignored `.env` file; `.env.example` lists the supported `KAIROS_` variables. No silent fallback occurs if the graph is unavailable.

FalkorDB stores profiles, career topic paths, conference people, triage, individual notes, and drafts. Ranking traverses `User → Goal → Topic ← Person → Conference`. SQLite is an explicit substitute for local development with the same API; it does not qualify as FalkorDB usage.

## What works

- Manual career onboarding and updates: target roles, skills, interests, background, location preferences, optional LinkedIn URL.
- Pasted resume/assistant-summary text and text-based PDF uploads (2 MB, 10 pages maximum), with conservative keyword suggestions followed by user confirmation. No OCR or LLM extraction.
- Five fictional event people, scored by selected interest overlap with explainable paths.
- Interesting/not-interesting/reset, priorities, and conference-scoped people.
- Append-only meeting notes and persistent editable drafts.
- Introduction, post-meeting follow-up, and referral templates with grounding references. Referrals require a saved meeting note plus a job link and description.
- Explicit approval for copying, and edits reset approval. No sending endpoint.
- Optional shared demo API key, configured CORS, upload limits, health endpoint, automated tests, and CI with a real FalkorDB service.

## Frontend handoff

See [API contract](docs/API_CONTRACT.md), [example responses](docs/frontend-examples.json), and [build plan](docs/MVP_PLAN.md). Run the walkthrough below against a local server:

```sh
uv run python backend/smoke.py
```

The base URL is `http://127.0.0.1:8000/api/v1`. Default allowed frontend origin is `http://localhost:3000`; configure `KAIROS_FRONTEND_ORIGIN` to match your frontend exactly. If `KAIROS_API_KEY` is configured, send `X-API-Key` on API requests. This is a shared, single-user demo, not account authentication. Keep it on localhost until authentication and deployment controls are added.

## Verification

```sh
uv run ruff check backend
uv run pytest -q
# With FalkorDB running, exercise both storage engines:
TEST_FALKORDB_URL=redis://localhost:6379 uv run pytest -q
```

Without `TEST_FALKORDB_URL`, graph integration tests are explicitly skipped. GitHub CI supplies it and runs both stores.

## Next slices

Bright Data live event ingestion with verified sources and snapshot fallback; OpenAI-grounded drafting; optional TrueForge agent integration; real LinkedIn extraction; frontend based on the team's Figma design. These are not implemented in this PR. Qodo installation and branch protection are still repository setup tasks.

Use small PRs. Never commit credentials, private resumes, scraped personal records, or connection exports. The demo fixtures are fictional.
