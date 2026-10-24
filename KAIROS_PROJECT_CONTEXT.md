# Kairos — complete project context and Claude Code handoff

> Snapshot prepared October 24, 2026 (America/Los_Angeles), against backend commit `80660ec`.
> This is a standalone project handoff, not a transcript. It preserves the user's latest decisions, explains what actually exists, and separates implementation from roadmap. Inspect the current repository before making changes; newer code or user instructions take precedence over this snapshot.

## 1. Start here

Kairos helps **job seekers find relevant people at conferences, understand why they should connect, remember their conversations, and prepare thoughtful follow-ups or referral requests**.

The user approved this demo framing:

> “I’m looking for backend roles. Who should I meet here, why are they relevant, and what should I send after we talk?”

The latest development direction is **backend first**. The user's teammates are designing the frontend in Figma in parallel. Continue the existing backend instead of rebuilding it, and defer substantial frontend work until the designs or an explicit frontend request arrive.

A working backend foundation already exists. It has real FalkorDB persistence and multi-hop ranking, an explicit SQLite development alternative, fictional event fixtures, and deterministic message templates. It does **not** yet fetch real event data or generate messages using an LLM.

## 2. Repository and handoff references

- GitHub owner: `kirandevihosur74`.
- Application/repository name: `kairos`.
- Repository: https://github.com/kirandevihosur74/kairos
- Repository was created private.
- Backend branch: `codex/backend-mvp`.
- Backend pull request: https://github.com/kirandevihosur74/kairos/pull/1
- Last verified implementation commit: `80660ec` (`Use the verified FalkorDB container release tag`).
- Main backend implementation commit: `cbb9c1e`.
- Successful real-graph CI run: https://github.com/kirandevihosur74/kairos/actions/runs/40124587863
- At handoff, the implementation was delivered through PR #1; it was not merged by the prior agent. Check current PR state instead of assuming `main` contains it.
- Original local checkout: `/Users/kirandevihosur/Documents/Codex/2026-10-24/so-we-doing-the-hackathon-x20-10/outputs/kairos`.
- Source archive produced alongside this handoff: `outputs/kairos-backend.zip` in the original workspace. GitHub is the portable source of truth.

To obtain the implementation in a new environment:

```sh
git clone https://github.com/kirandevihosur74/kairos.git
cd kairos
git fetch origin
git switch codex/backend-mvp
```

Access to the private repository requires the user's existing GitHub authentication. If the branch has since been merged or removed, inspect the repository and use the current implementation instead.

## 3. Product evolution and settled decisions

### Original concept, now superseded

The supplied hackathon working doc and backend guide initially described a sales/BD conference networking app: enter what you sell, rank prospects, discover warm intros, and draft sales follow-ups. The user explicitly changed the audience to job seekers.

Do not restore product/sales onboarding, buyer-intent rankings, sales pitches, or the CI/CD-sales demo. CI/CD can still be a career interest, but selling a CI/CD tool is not the current user goal.

### Current product

1. Learn the user's professional background and current career goals.
2. Select an event.
3. Find relevant people from documented public event sources.
4. Explain relevance through concrete shared topics or professional work.
5. Let the user shortlist people and record meetings.
6. Draft a cold introduction, post-meeting follow-up, or contextual referral request.
7. Let the user edit and approve for copying. Do not send anything automatically.

The intended product works for job seekers generally; backend engineering is the initial demo persona.

### Scope decisions

- Start with one user, one supported event source, and roughly 5–15 useful people.
- Keep manual onboarding available even when imports are supported.
- All onboarding inputs converge into one editable, user-confirmed career profile.
- Keep current goals separate from historical experience. A frontend resume does not mean the user is not targeting backend roles.
- Show evidence for recommendations, not just a score.
- A speaker's title or employer does not establish that their company is hiring, that they can refer, or that they know a mutual contact.
- Use introductions for people the user has not met; use conversation notes for follow-ups.
- Referral requests should be contextual and conditional. The current implementation requires a meeting note plus a specific job link and description.
- No automatic sending. Approval means reviewed and ready to copy, not delivered.
- Preserve meeting notes rather than overwriting them.
- Keep fixture, cache, live-data, template, and AI modes visibly distinct.

Working tagline: **“Meet the right people. Follow up with purpose.”** Earlier tagline: “Walk in knowing the room.” Neither requires a branding redesign.

## 4. Team and design context

Team roles from the supplied working document:

- Kiran: backend.
- Michelle: frontend.
- Chloe: idea, pitch, and deck.

The user most recently said teammates are building Figma designs in parallel. Those designs should guide the frontend when available.

Architecture board supplied by the user:

https://www.figma.com/board/Q5rpLTBB4GMLZxmGJCvFxm/Conference-Networking-App---Architecture?node-id=0-1

The prior agent saw four attached architecture/flow screenshots; the live Figma board itself was not fetched. Do not claim its latest contents have been reviewed.

The screenshots depicted:

- Next.js/React/Tailwind web frontend → FastAPI REST API.
- Discovery/ingestion → Bright Data → FalkorDB plus JSON snapshots.
- Graph ranking, warm-intro paths, and persistent memory.
- Follow-up agent using TrueForge/OpenAI.
- Optional graph MCP interface for Claude/ChatGPT.
- Onboarding → event URL → loading → person cards → triage → shortlist/notes → priorities → drafts/approval.

These diagrams describe a broader architecture than the implemented MVP. The graph MCP server, warm intros, live ingestion, TrueForge agent, and frontend are not already built simply because they appear in the diagrams.

Four intended frontend views:

| View | Purpose |
| --- | --- |
| Setup | Career profile, optional import/review, event URL |
| Discover | Ranked cards, evidence, conversation starter, shortlist decisions |
| Shortlist/details | Saved people, meeting notes, person context |
| Draft review | Introduction/follow-up/referral selection, editing, approval, copying |

## 5. Hackathon context

These details come from the user's event text and attached working docs; they are historical planning context, not freshly verified event rules.

- Event: Patch the Conference Hackathon, presented by Bright Data.
- Date: Saturday, October 24, 2026.
- Location: Bright Data, 625 2nd St, San Francisco.
- Event hours: 9 AM–7 PM Pacific; demos at 5:30 PM.
- Teams: solo or up to four people.
- Entry: 21+ with government photo ID.
- Original team plan: 3:30 PM scope checkpoint; 4:15 PM feature freeze; 5:30 PM demo.
- Original guide included earlier hourly milestones that are now historical. Replan based on the actual current time; do not treat them as achievable future deadlines automatically.
- Working docs mentioned $50 OpenAI and $50 Bright Data credits and a FalkorDB Cloud code `PTC`. Redemption or current availability was not verified.

| Track | Stated prize | Relevant project evidence |
| --- | --- | --- |
| FalkorDB | iPhone Duos / described cash alternative | Actual multi-hop ranking, graph-backed memory, explainable paths |
| Bright Data | $1,500 | Reliable live public event/profile data, provenance, handling failures |
| TrueFoundry × OpenAI | $1,000 | Follow-up agent actually running on TrueForge with OpenAI and meaningful tools/approvals |
| Qodo | $500 | Real PR reviews, fixes to actual findings, clean incremental workflow |

The original team ambition was all four tracks. Keep Bright Data and FalkorDB central; do not expand scope to chase every track at the expense of a working demo. Direct OpenAI calls alone are not TrueForge integration. An app's normal note-writing handler is not an AI agent. Qodo installation/review evidence has not been established.

## 6. Onboarding and assistant-memory decisions

The user requested multiple onboarding methods:

1. Manual interests/background/goals.
2. LinkedIn profile URL.
3. Resume upload.
4. Potential use of existing ChatGPT/Claude context.

The agreed design is:

```text
Input source(s)
    → Extract proposed career fields
    → Merge/deduplicate suggestions
    → User reviews and edits
    → Confirmed career profile
    → Graph relationships and recommendations
```

Not all these steps are fully implemented. Current extraction uses a fixed technology keyword list; it does not semantically merge conflicting sources or preserve per-fact provenance. Each import yields a separate proposal, and the user explicitly submits the reviewed profile. Source tracking is coarse, at the import/profile level.

### What is implemented

- Manual profile creation and complete profile replacement.
- Plain-text imports tagged manual, assistant_summary, or resume_text.
- Text-based PDF resumes, at most 2 MB and 10 pages; no OCR or encrypted PDFs.
- Conservative skill suggestions, blank target-role/interest lists for the user to fill, and up to 5,000 characters of background.
- A `requires_review` response; import alone does not update the saved profile.
- Optional `import_id` linking a confirmed profile to its import.
- Optional HTTPS LinkedIn URL stored as a reference; no profile fetch.

### ChatGPT/Claude memory discussion

The user explored a “profile-learning watcher” that could learn from personal assistant context. The final decision was to keep the MVP simple and defer the watcher.

Do not assume an API key, OAuth login, or MCP connection grants access to a user's entire ChatGPT/Claude memory. The prior discussion did not establish a general third-party ChatGPT memory-read API. Any future integration requires fresh verification against official provider documentation.

For now, the user may ask their assistant for a career summary, paste it into Kairos, and review the extracted fields. This is a one-time user-controlled import, not background synchronization or guaranteed complete memory export.

Suggested prompt for the user to run in their assistant:

> Help me create a career profile for a conference networking app. Using the context available to you, summarize my target roles, professional experience, technical skills, relevant projects, career interests, and job-location preferences. Include only career-relevant information. Distinguish explicitly stated facts from inferences, flag anything potentially outdated, and leave unknown fields blank. Do not include unrelated personal information or invent details.

Future direction, not current scope: a connected assistant might call a Kairos `propose_profile_update` tool with selected career context. Kairos would show proposed changes for confirmation. Learning from chats within Kairos could also suggest updates later. Neither capability exists now.

## 7. Current implementation inventory

| Capability | Current state |
| --- | --- |
| FastAPI backend | Implemented |
| Pydantic input validation | Implemented |
| SQLite persistence | Implemented, default local development mode |
| FalkorDB persistence | Implemented and exercised against real FalkorDB in CI |
| Multi-hop topic ranking | Implemented in FalkorDB; equivalent set overlap in SQLite |
| Profile creation/update | Implemented, one fixed demo user |
| Resume/text suggestion review | Implemented, deterministic keywords |
| LinkedIn scraping | Not implemented; URL storage only |
| Event ingestion | Five fictional fixtures only; supplied event URL is not fetched |
| Asynchronous ingestion jobs | Not implemented; fixture loading is synchronous |
| Real source snapshots/cache fallback | Not implemented |
| Shortlisting and reversible triage | Implemented |
| Append-only meeting notes | Implemented |
| Top-three priorities | Implemented using existing score among interesting people |
| Introduction/follow-up/referral drafts | Implemented as templates, not AI generation |
| Draft editing and approval | Implemented; edits reset approval |
| Sending email/LinkedIn messages | Not implemented and not part of v1 |
| Bright Data / OpenAI / TrueForge integration | Not implemented |
| External graph MCP server | Not implemented |
| Frontend | Not implemented; teammates own the designs |
| Multi-user auth and authorization | Not implemented; optional shared demo key only |
| Qodo installation / branch protection | Pending/unverified |
| Docker Compose and Dockerfile | Added; real graph service tested in CI, full local Compose stack not verified on the prior machine |

## 8. Repository layout and where to make changes

```text
kairos/
  README.md
  pyproject.toml
  uv.lock
  .env.example
  .gitignore
  .dockerignore
  Dockerfile
  compose.yaml
  .github/
    pull_request_template.md
    workflows/backend.yml
  backend/
    kairos/
      __init__.py
      app.py          # API, lifecycle, auth, CORS, upload limits, PDF import
      config.py       # KAIROS_ settings and storage selection
      models.py       # Request models and validation
      service.py      # Card construction, ranking presentation, templates, suggestions
      store.py        # SQLite and FalkorDB implementations
    fixtures/people.json
    tests/test_api.py
    smoke.py          # Full local HTTP walkthrough; creates demo data
    data/             # Ignored local runtime data
  docs/
    API_CONTRACT.md
    MVP_PLAN.md
    frontend-examples.json
    openapi.json
```

There are no production `ingest/`, `agents/`, or frontend directories yet. They were proposed in the original guides, not implemented.

`backend/fixtures/people.json` contains seed records, not complete API cards. Frontend developers should use `docs/frontend-examples.json` or actual API responses. `docs/openapi.json` is a generated snapshot; regenerate it if endpoints change. Current request schemas are typed, while many response routes return dictionaries rather than dedicated response models; typed response schemas are a sensible later improvement.

## 9. Runtime and configuration

Python 3.11+; Python 3.12 was used for CI. Dependencies are locked in `uv.lock`. Main libraries: FastAPI, Uvicorn, Pydantic Settings, FalkorDB Python client, python-multipart, and pypdf. Test tools: pytest, httpx, Ruff.

No external API keys are required for the current fixture/template demo.

```sh
uv sync --frozen
uv run uvicorn kairos.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

- Interactive API docs: http://127.0.0.1:8000/docs
- OpenAPI: http://127.0.0.1:8000/openapi.json
- Health: http://127.0.0.1:8000/health
- API prefix: `/api/v1`

The prior agent temporarily served docs on port 8001 during testing. Do not assume that process is still running; the documented default is 8000.

Configuration from `.env.example`:

```dotenv
KAIROS_STORAGE=sqlite
KAIROS_SQLITE_PATH=backend/data/kairos.sqlite3
KAIROS_FRONTEND_ORIGIN=http://localhost:3000
KAIROS_FALKORDB_URL=redis://localhost:6379
KAIROS_GRAPH_NAME=kairos
KAIROS_API_KEY=
```

- `KAIROS_STORAGE` accepts sqlite or falkordb. There is no implicit fallback from failed FalkorDB to SQLite.
- Use `rediss://` for TLS connections where appropriate.
- If configured, `KAIROS_API_KEY` is sent as `X-API-Key` on API routes. This is a shared demo secret, not individual user authentication.
- CORS accepts one exact configured origin. `localhost` and `127.0.0.1` are distinct origins.
- The original guide's unprefixed `FALKORDB_URL` and `DEMO_MODE=cache` are not the current application settings. Use the implemented `KAIROS_` variables.
- Bright Data/OpenAI credentials and provider settings still need to be designed when those integrations are added. Do not invent existing support.

For the complete graph/API stack:

```sh
docker compose up --build
```

Compose uses `falkordb/falkordb:6.0.3`, loopback-only ports, and a persistent graph volume. The verified Docker tag is `6.0.3`, without a `v` prefix. A previous CI attempt using `v6.0.3` failed; the corrected tag passed.

For a local API connecting to a separately running graph:

```sh
KAIROS_STORAGE=falkordb KAIROS_FALKORDB_URL=redis://localhost:6379 \
  uv run uvicorn kairos.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

SQLite and FalkorDB are separate stores. Switching the setting does not migrate existing data. Current persistence is optimized for a small demo; some services enumerate records and filter them in Python. Pagination, indexing, migrations, and larger-scale query design are future work.

## 10. Actual graph and ranking behavior

```text
(User)-[:HAS_GOAL]->(Goal)-[:TARGETS]->(Topic)
(Person)-[:INTERESTED_IN]->(Topic)
(Person)-[:APPEARS_AT]->(Conference)
(User)-[:OWNS]->(Note | Triage | Draft)
(Note | Triage | Draft)-[:ABOUT]->(Person)
(Note | Triage | Draft)-[:IN_CONFERENCE]->(Conference)
```

Other persisted entity type: Import. Records retain a JSON payload on their graph node, with explicit relationships for ranking and memory. The user ID is always `demo_user` in this MVP. Person IDs are prefixed with their conference ID.

Actual multi-hop ranking query:

```cypher
MATCH (u:User {id:$uid})-[:HAS_GOAL]->(:Goal)-[:TARGETS]->(t:Topic)
      <-[:INTERESTED_IN]-(p:Person)-[:APPEARS_AT]->(:Conference {id:$cid})
RETURN p.id, collect(DISTINCT t.name)
```

- Score = number of distinct matching interests / number of user-selected interests.
- Topics are exact normalized strings; there is no semantic similarity, alias resolution, or embedding search yet.
- Matching uses interests, not the user's skill list, location preferences, or role names. Those fields provide stored career context and draft content.
- Profile updates replace old TARGETS edges so obsolete interests stop influencing rankings.
- Cards are sorted by descending score, then stable person ID.
- Default discovery excludes not_interesting people.
- Why diagrams are constructed from the graph-returned matched topics; they are not LLM-invented paths. Their presentation IDs are UI identifiers, not raw database internal IDs.
- Notes are individual records ordered by timestamp and ID. Concurrent note writes do not overwrite a single shared note array.
- Parameterize all user values in Cypher; labels come from a fixed allowlist.

The expanded original schema included Company, Talk, School, CONNECTED_TO, hiring/funding signals, and MET/SKIPPED edges. That is not the implemented schema; do not assume those entities or relationships exist.

## 11. Implemented API contract

The following section is copied from the current repository contract so this handoff remains useful on its own.

## Backend API v1 — career networking

Implemented base URL: `http://127.0.0.1:8000/api/v1`. Interactive documentation: `/docs`; machine-readable schema: `/openapi.json`. All endpoints operate on one fixed `demo_user`. No user ID is accepted as an authorization mechanism.

### Recommended frontend sequence

1. Optionally POST `/onboarding/import-text` or `/onboarding/resume` to obtain suggested fields and an `import_id`.
2. Show editable fields and POST the reviewed profile to `/onboarding`. Imports do not update the profile until this call.
3. POST `/conference` with `url` and optional `name`. This version accepts only `data_mode: fixture`; the event URL is stored, not fetched.
4. GET `/people?conference_id=...`, then save `/triage` and `/met` changes.
5. POST `/followups/{person_id}/draft`, edit, and approve for copying.

`docs/frontend-examples.json` contains responses generated by the actual application. `backend/fixtures/people.json` is ingestion seed data; it is not a full card response. Use the generated examples or live API for frontend mocks.

### Routes

| Method/path | Request | Response |
| --- | --- | --- |
| GET /health (no prefix) | — | Storage and fixture/template capability status |
| POST /onboarding | Profile below | Saved profile; 200 |
| GET /profile | — | Saved profile; 409 before onboarding |
| PUT /profile | Complete reviewed profile | Replaces profile and updates ranking interests |
| POST /onboarding/import-text | source, text | import_id, suggested_profile, requires_review |
| POST /onboarding/resume | Multipart file | Same preview; text-based PDF only |
| POST /conference | url, name?, data_mode: fixture | 201: conference_id, stage, people_found, status_url |
| GET /conference/{id}/status | — | Persisted conference status |
| GET /people | conference_id, triage? | Ranked card array |
| GET /people/{id} | conference_id | Card including notes, even if skipped |
| GET /people/{id}/graph | conference_id | sentence, nodes, edges |
| POST /triage | conference_id, person_id, decision | Persisted decision |
| POST /met | conference_id, person_id, note | 201: note_id, text, created_at |
| GET /priorities | conference_id | Top three interesting cards |
| POST /followups/{person_id}/draft | conference_id, kind, job_url?, job_description? | 201: draft_id, subject, body, linkedin_message, grounded_on, status |
| GET /drafts/{id} | — | Saved draft |
| PATCH /drafts/{id} | subject, body, linkedin_message | Saves edits and resets approval |
| POST /followups/{draft_id}/approve | subject, body, linkedin_message | Saves the exact reviewed content as approved |

### Profile

```json
{
  "name": "Kiran",
  "target_roles": ["Backend engineer"],
  "skills": ["Python", "FastAPI"],
  "interests": ["Python", "Distributed systems"],
  "background": "I build backend APIs and want to work on infrastructure.",
  "location_preferences": ["San Francisco"],
  "linkedin_url": null,
  "import_id": null
}
```

Name, target_roles, and interests are required. Interests and skills are lowercased and deduplicated. Ranking currently uses interests only; target roles contextualize the goal and drafts, and skills are stored for later matching. Explicit user edits are authoritative. `linkedin_url` is an HTTPS LinkedIn URL for reference, not a scraping request. Imports perform keyword matching against a small technology vocabulary, not AI inference. Users must supply or confirm their target roles and interests.

`source` for text imports: manual, assistant_summary, resume_text. PDF imports use resume_pdf. Uploaded files are not retained; suggested fields and up to 5,000 characters of extracted background are stored locally until cleanup outside this initial API. Avoid importing unrelated personal details. There is no direct ChatGPT/Claude memory access.

### Cards and ranking

Score = distinct matching interests / selected interests, in [0,1]. Ties sort by ID. It is not a hiring probability, referral likelihood, or evidence that the person's company is hiring. Why-path edges correspond to matching topics; in FalkorDB mode those topics come from the multi-hop graph query.

Triage decisions: interesting, not_interesting, null (reset). Default discovery excludes not_interesting. Explicit filters: interesting, not_interesting, all. Each card has data_mode: fixture, source: fixture, and fictional example.invalid sources with null collection dates. Unknown photos, fun facts, reachability, and warm intros are null. Render initials for missing photos. Do not imply these sample people attend the supplied event.

`notes` preserves all entries in timestamp order. `met` indicates a saved meeting note. Adding notes represents the user's account of the conversation. Nothing infers a meeting from a shortlist decision.

### Drafts

`kind`: introduction, follow_up, referral. Introduction does not imply a prior meeting. Follow-up requires a note. Referral requires a note and a job URL plus description; it asks conditionally, without claiming the person can refer. This is a deliberate initial product constraint.

All drafts include `generation_mode: template` and grounding references. They use the latest meeting note and confirmed background. Users review before copying. Approval is persisted, never sent. Editing an approved draft resets its status to draft.

### Operational boundaries

Fixture loading is synchronous and returns 201 with stage ready, not the earlier proposed 202 asynchronous scrape. A failed/interrupted load marks the conference failed; cards are unavailable for it. Live ingestion and snapshot fallback remain later work and are rejected rather than silently simulated.

422: invalid input or missing job data; 404: unknown or cross-conference IDs; 409: missing onboarding/note or not-ready conference; 413: oversized upload; 401: missing/wrong configured API key; 503: graph connection errors. Error bodies use `detail`.

Local demo only: CORS is configured for one exact frontend origin; it is not authentication. Optional X-API-Key is a shared team credential. Multi-user sessions, per-user authorization, deletion/export controls, and hardened document parsing are prerequisites to public deployment.

## 12. Representative complete person-card response

This example comes from the running application, using fictional data. IDs and timestamps are illustrative and will change across runs. `example.invalid` is deliberately not real evidence. Runtime graph diagrams use the current user's selected interests.

```json
{
  "id": "conference_5ce138fa3eca4afb9d8a7d8036a0b74f:fixture_p_1",
  "name": "Alex Morgan",
  "title": "Backend Engineering Lead",
  "company": "Example Build Co",
  "topics": [
    "python",
    "distributed systems",
    "backend"
  ],
  "photo_url": null,
  "source": "fixture",
  "data_mode": "fixture",
  "match_confidence": "low",
  "stale": false,
  "sources": [
    {
      "url": "https://example.invalid/people/1",
      "collected_at": null
    }
  ],
  "conference_id": "conference_5ce138fa3eca4afb9d8a7d8036a0b74f",
  "score": 1.0,
  "why": {
    "sentence": "Shared career interests: distributed systems, python",
    "nodes": [
      {
        "id": "demo_user",
        "label": "Demo job seeker",
        "type": "User"
      },
      {
        "id": "goal:demo_user",
        "label": "Backend engineer",
        "type": "Goal"
      },
      {
        "id": "conference_5ce138fa3eca4afb9d8a7d8036a0b74f:fixture_p_1",
        "label": "Alex Morgan",
        "type": "Person"
      },
      {
        "id": "topic:distributed systems",
        "label": "distributed systems",
        "type": "Topic"
      },
      {
        "id": "topic:python",
        "label": "python",
        "type": "Topic"
      }
    ],
    "edges": [
      {
        "from": "demo_user",
        "to": "goal:demo_user",
        "label": "HAS_GOAL"
      },
      {
        "from": "goal:demo_user",
        "to": "topic:distributed systems",
        "label": "TARGETS"
      },
      {
        "from": "conference_5ce138fa3eca4afb9d8a7d8036a0b74f:fixture_p_1",
        "to": "topic:distributed systems",
        "label": "INTERESTED_IN"
      },
      {
        "from": "goal:demo_user",
        "to": "topic:python",
        "label": "TARGETS"
      },
      {
        "from": "conference_5ce138fa3eca4afb9d8a7d8036a0b74f:fixture_p_1",
        "to": "topic:python",
        "label": "INTERESTED_IN"
      }
    ]
  },
  "who": "Backend Engineering Lead at Example Build Co",
  "next_step": "Ask about their work in distributed systems.",
  "notes": [],
  "met": null,
  "triage": null,
  "warm_intro": null,
  "reachability": null,
  "fun_fact": null,
  "talks": [],
  "signals": [],
  "openers": []
}
```

## 13. Verification already completed

At commit `80660ec`:

- **21 tests passed** in GitHub CI with SQLite and a real FalkorDB 6.0.3 service.
- Ruff checks passed.
- A live local HTTP smoke walkthrough completed onboarding → conference fixtures → cards → shortlist → note → approved template draft.
- Local tests without a graph reported 11 passed and 10 explicitly skipped graph cases.
- One non-failing Starlette/httpx deprecation warning remained; do not describe the run as warning-free.
- The full local Docker Compose stack was not verified because Docker was not running on the prior machine. CI did verify the real graph service and graph-backed behavior.

Test coverage includes:

1. Changed interests change rankings, including removal of old graph topic edges.
2. Why-edge endpoints reference existing returned diagram nodes.
3. Conference scoping rejects mismatched person/conference IDs.
4. Triage supports interesting, not_interesting, and reset.
5. Priorities contain shortlisted people.
6. Multiple notes and approved drafts survive an application restart.
7. Concurrent note writes are preserved.
8. Imports do not silently update the profile.
9. Successful text-PDF extraction and rejection of invalid, blank, or oversized documents.
10. Invalid inputs and unsupported live modes are rejected.
11. Introductions do not invent meetings; referral prerequisites are enforced.
12. Large profile/note inputs still yield editable drafts.
13. Optional API-key enforcement.
14. Editing an approved draft resets approval.

Run:

```sh
uv run ruff check backend
uv run pytest -q
TEST_FALKORDB_URL=redis://localhost:6379 uv run pytest -q
```

With a local API running:

```sh
uv run python backend/smoke.py
```

The smoke script changes the single demo user's profile and creates a new fixture conference, note, and draft. Use it against development data, not someone else's meaningful profile. Set `KAIROS_BASE_URL` to change its default server; set `KAIROS_API_KEY` if required.

## 14. Recommended next implementation slices

These are proposed continuation tasks, not claims of completed work. Preserve the backend-first direction unless the user changes it.

### Slice A — One real Bright Data event ingestion path

Obtain the actual public event/judges/speaker URL and Bright Data credentials through local environment configuration. The exact event page URL was not supplied in the conversation; the Figma board is not a data source.

1. Pick one supported public source. Avoid promising arbitrary conference URLs.
2. Verify the current official Bright Data API/SDK and choose the appropriate scraper/unlocker workflow.
3. Add a normalized person/source schema and stable source-derived identity keys. Deduplicate deliberately; do not merge unrelated people solely by name.
4. Store real source URLs, collection times, source type, and confidence. A sponsor's employee is not automatically an attendee.
5. Write successful raw/normalized snapshots before making them the fallback source.
6. Add a real live/cache/fixture distinction. Keep fictional fixtures separately labeled.
7. On transient failure, retry within a short bound. Use a last-good real snapshot only when available and appropriate to the requested source. Preserve its original timestamp and mark it stale.
8. If there is no valid snapshot, expose a failure. Never quietly substitute fictional data.
9. Add asynchronous progress only when needed for actual remote latency. The current synchronous 201 contract must change explicitly if moving to 202 jobs; coordinate with frontend users.
10. Validate outbound destinations and redirects, block private/local addresses, and avoid exposing a general backend URL-fetch proxy.

Acceptance: one supported event yields real sourced people, their topic matches are backed by evidence, and failure behavior is visible and tested.

### Slice B — Grounded OpenAI drafting

1. Verify the current official API and configure credentials locally; do not invent model names or SDK schemas.
2. Introduce a provider boundary so template mode remains available and explicit.
3. Give the model only the confirmed career profile, scoped person facts, relevant notes, and optional user-supplied job context.
4. Request structured subject/body/LinkedIn message plus grounding references.
5. Do not invent conversations, mutual connections, hiring status, referral willingness, or job eligibility.
6. Preserve draft editing, approval persistence, and approval reset on edit.
7. Handle timeouts and provider failures without erasing existing drafts or silently presenting templates as AI-generated text.
8. Treat imported content as data. Embedded instructions in resumes, scraped pages, or pasted assistant summaries must not control tools or system behavior.

Acceptance: a new draft accurately reflects a saved meeting note and the user's target role, with inspectable source references and no automatic sending.

### Slice C — Better onboarding extraction

If needed after live ingestion and drafting, replace keyword suggestions with structured extraction of experience, projects, skills, and career preferences. Maintain explicit review, allow manual correction, surface conflicts, preserve source metadata per fact, and distinguish inferred interests from stated goals. Keep resume parsing, LinkedIn fetching, and assistant-context imports optional.

Do not implement full ChatGPT/Claude memory watching as part of this slice.

### Slice D — TrueForge integration, if time and track goals justify it

Run the follow-up workflow on an actual verified TrueForge harness with bounded tools for reading scoped profile/person/notes and writing drafts. Use real approval semantics if supported. Do not expose arbitrary writable Cypher as a public tool. If only direct OpenAI works, describe it honestly and do not claim the TrueForge track.

### Slice E — Frontend from team designs

Use the Figma designs when supplied. Planned stack is Next.js, React, and Tailwind. Use one frontend API data layer. Start with the generated response examples or the live fixture API, handle null fields, surface source/mode labels, and make note/draft flows work on mobile. Add initials when photos are absent. Do not independently redesign the app while the teammates are designing it unless requested.

## 15. Scope boundaries and unresolved items

Still needed for live integrations:

- Actual public event/judges/speaker source URL.
- Bright Data credentials and any required scraper configuration.
- OpenAI credentials/model decision.
- FalkorDB Cloud endpoint only if the team chooses cloud over local Docker.
- TrueForge setup if pursuing that track.
- Current frontend Figma designs and agreed frontend API origin.
- Qodo installation/review evidence and any branch-protection decisions.

Not in the current release:

- Full attendee lists or inferred attendance.
- LinkedIn connections CSV, mutual-connection discovery, or verified warm intros.
- Live job-board crawling or autonomous referral outreach.
- Event recommendations, transcripts, voice agents, PWA/offline sync.
- Background assistant-memory access.
- Accounts, multi-user data isolation, public deployment, email sending.

Known infrastructure limitations to keep visible:

- One fixed demo user; shared API key is not account authorization.
- Profile, note, and import deletion/export controls are absent.
- PDF parsing is bounded but not a hardened isolated document-processing service.
- Some reads scan all records; this is intentionally small-demo infrastructure.
- There is no automatic migration between storage engines.
- Topic matching is literal, not semantic.
- Templates use the latest note and excerpts of long fields; they do not synthesize the entire conversation history.
- The user-supplied job description is recorded as grounding, but current templates do not perform job-fit analysis.
- No real-person source extraction/identity-resolution pipeline exists yet.

Before public deployment, add real authentication, per-user authorization, deletion/retention controls, appropriate rate/resource limits, and stronger document ingestion boundaries. These do not need to block the local hackathon prototype.

## 16. How to continue effectively in Claude Code

1. Read this handoff and inspect the current checkout, branch, README, API contract, implementation, and tests.
2. Look for applicable repository instructions. Preserve unrelated changes and never commit secrets or real private resume data.
3. Verify whether PR #1 has been merged or superseded. Do not rebuild existing endpoints or revert the job-search pivot.
4. Establish the local baseline with the locked dependencies and relevant tests.
5. Continue backend work in focused PRs. Suggested next priority is real Bright Data ingestion, then AI drafting.
6. If credentials or the exact source URL are missing, build provider interfaces and meaningful failure tests while requesting only the missing inputs. Do not fabricate a live integration.
7. Keep response contracts and examples in sync. Add explicit migration notes if changing the conference response from synchronous to asynchronous.
8. Track implementation status honestly: tested, untested, planned, fixture, cache, live, template, or AI.
9. Keep updates concise and practical; the user wants progress on a working MVP, not repeated planning or permission requests for routine reversible development.
10. Do not send emails, LinkedIn messages, teammate messages, or other communications without explicit user authorization. Draft approval inside this app is currently approval for copying only.

Original external working-doc checklists, diagrams, and submission drafts are background reference. They are not evidence that setup steps occurred, and they do not override the user's latest job-search and backend-first direction.

## 17. Suggested initial instruction to Claude Code

> Read KAIROS_PROJECT_CONTEXT.md and inspect the existing Kairos repository before changing anything. Continue the job-search networking backend on top of PR #1 / the current implementation. Preserve the confirmed-profile onboarding flow, graph explanations, meeting-note persistence, and draft-only approval behavior. Start by verifying the existing tests and current branch. Then implement the next backend slice: one real Bright Data event ingestion path with provenance and honest failure/cache behavior. Ask for the actual event source URL and credentials only where needed, and continue independent interface/test work in the meantime. Do not build the frontend yet; teammates are designing it in Figma. Do not add automatic ChatGPT/Claude memory access or message sending. Keep changes small and clearly distinguish implemented behavior from roadmap.

## 18. Reference provenance

This handoff consolidates:

- The user's event description and hackathon track/judging text.
- The attached “Patch the Conference — Hackathon Working Doc” and “Backend Build Guide — Kiran”.
- Four supplied architecture and flow screenshots.
- The user's subsequent job-search pivot, onboarding discussion, and backend-first decision.
- The actual local repository at commit `80660ec`, including its README, API contract, plan, models, services, stores, Compose configuration, and CI workflow.
- The successful CI result and local HTTP walkthrough from the preceding build session.

Historical memory references discussed earlier (reverify before implementing provider-dependent behavior):

- https://learn.chatgpt.com/docs/customization/memories
- https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude

No credentials or private resume contents are included in this document.
