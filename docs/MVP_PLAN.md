# Kairos — job-search MVP

The product is now focused on job seekers: “I’m looking for backend roles. Who should I meet here, why are they relevant, and what should I send after we talk?” This replaces the original sales/BD direction.

## Backend-first sequence

1. **Current slice:** persistent career profile, reviewed text/PDF import suggestions, fixture people, explainable interest ranking, shortlist decisions, meeting notes, editable template drafts, and approval. SQLite supports local development; FalkorDB provides actual graph traversal and graph-backed memory.
2. **Live event data:** one supported public speaker/judge source through Bright Data; normalized facts, original collection times, identity checks, and explicit snapshot fallback. No general crawler or inferred attendance.
3. **AI drafts:** OpenAI generation grounded in reviewed profile, sourced person data, and meeting notes. Optional TrueForge harness after the core works. Preserve the template provider as an explicitly labeled offline mode.
4. **Frontend:** teammates build setup, discovery, shortlist/details, and draft review from their Figma design against this stable API.
5. **Polish:** verify the full live and cached demo, source inspection, restart persistence, and mobile layouts.

## Onboarding

Manual entry is always available. Text-based PDF resumes and pasted assistant summaries produce editable suggestions. LinkedIn URLs are stored for reference; profile extraction is deferred. Confirm a career profile before it affects the graph. Target roles describe intent; past work and skills describe experience. They should not overwrite one another.

All imports lead to one confirmed profile. This starter uses deterministic keyword suggestions, not an LLM parser. Direct ChatGPT/Claude memory sync is outside this release.

## Graph model

- User → HAS_GOAL → Goal → TARGETS → Topic ← INTERESTED_IN ← Person.
- Person → APPEARS_AT → Conference scopes results.
- User → OWNS → Note/Triage/Draft → ABOUT → Person.
- Note/Triage/Draft → IN_CONFERENCE → Conference.

Individual notes are append-only records with timestamps. Source data and the JSON representation of each record remain stored with its graph node. Person IDs are conference-scoped. Profile updates replace the goal's topic edges. Matching paths explain relevance, never willingness to refer or an open position.

## Deferred

LinkedIn scraping, automatic memory sync, account signup, live job-board ingestion, warm-intro claims, reachability scores, external graph MCP, recommendation agents, and message sending. Job links and descriptions can be supplied manually for referral requests.

## Acceptance and handoff

The automated suite checks ranking changes, topic-edge replacement, conference scoping, reversible triage, concurrent note writes, restart persistence, import review, upload rejection, conditional referral requests, and draft approval reset. The same behavioral suite runs against SQLite and FalkorDB when the integration service is supplied.

Frontend teammates use `/docs`, the API contract, and generated frontend examples. Product claims should distinguish fictional fixtures, local storage, actual graph execution, template drafts, and future live integrations.

## Next external inputs

A real public event/judges URL, FalkorDB Cloud credentials if using cloud instead of local Docker, and Bright Data/OpenAI credentials for the next integration slices. Keep credentials in ignored local environment files. Qodo app installation remains a repository admin task; actual reviewed PRs and fixes are needed before claiming that track.
