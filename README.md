# Kairos

**Walk in knowing the room.**

Kairos helps conference attendees with a sales or BD goal find relevant people, understand why they match, remember conversations, and prepare specific follow-ups.

Built for Patch the Conference, October 24, 2026.

## Current status

Planning and frontend handoff starter. No application server, live ingestion, graph database integration, or AI agent is implemented yet. All fixture people are fictional and visibly marked as demo data.

- [MVP plan](docs/MVP_PLAN.md): scope, architecture, milestones, and demo acceptance checks.
- [API contract](docs/API_CONTRACT.md): proposed frontend/backend handshake.
- [Sample people](backend/fixtures/people.json): five fictional cards for frontend development.

## Intended stack

Michelle: Next.js, React, Tailwind. Kiran: FastAPI, FalkorDB, Bright Data. Follow-up generation: OpenAI; TrueForge integration after the core flow works. Chloe: pitch and demo evidence.

The initial demo is single-user and limited to one supported conference source. General conference discovery and production accounts are later work.

## Development workflow

Create a branch such as `codex/graph-ranking`, make a focused change, and open a PR describing behavior and validation. Install Qodo on this repository to start collecting real review feedback; it is not configured by this starter. Do not claim sponsor integrations until demonstrated.

Never commit credentials, resumes, connection exports, or scraped personal records. `.env.example` documents configuration names only. Use sanitized fixtures in Git and keep runtime snapshots local.
