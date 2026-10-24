# Proposed v1 API contract

Status: design only; endpoints are not implemented. Base prefix: `/api/v1`. Single-user demo, bound to localhost until authentication is added. Every operation is scoped to the current demo user and selected conference. This is not a production multi-user authorization model.

## Routes

| Method/path | Input | Output |
| --- | --- | --- |
| POST /onboarding | name, product, goal, topics[] | user_id |
| POST /conference | user_id, url | 202: conference_id, status_url |
| GET /conference/{id}/status | — | stage, people_found, data_mode, stale, error |
| GET /people | conference_id, optional triage | PersonCard[] |
| GET /people/{id} | conference_id | PersonCard |
| GET /people/{id}/graph | conference_id | nodes[], edges[] |
| POST /triage | conference_id, person_id, decision | ok |
| POST /met | conference_id, person_id, note | note_id, text, created_at |
| GET /priorities | conference_id | Up to three interesting PersonCards, ordered by score |
| POST /followups/{person_id}/draft | conference_id | draft_id, subject, body, linkedin_message, grounded_on[], status |
| POST /followups/{draft_id}/approve | subject, body, linkedin_message | draft_id, status: approved, approved_at |

Canonical decisions: `interesting`, `not_interesting`, or null to reset. Do not mix these with the older meet/maybe/skip vocabulary. `/met` appends a note; it never overwrites the earlier notes. `notes[].date` is an ISO UTC timestamp for compatibility with the supplied card shape.

Stages: queued, fetching, extracting, ranking, ready, failed. Data modes: live, cache, fixture. A fixture is fictional; a cache is a real collected snapshot. Retry exhaustion must produce either an explicit stale fallback or a failure, never a fabricated success.

## Card shape

`backend/fixtures/people.json` is the canonical example for this starter. Fields retained from the guide: id, name, title, company, photo_url, source, match_confidence, stale, score, why, who, next_step, fun_fact, reachability, notes, warm_intro, talks, openers, signals, sources, triage, met.

Additive fields: conference_id and data_mode. `why.nodes` includes User, Goal, Topic and Person types. Edges use `from`, `to`, `label`. `score` is normalized topic overlap in [0,1], not a probability of a successful meeting. `source=fixture` is explicitly allowed for development; production source values include speaker, judges, sponsor, luma and csv.

Unknown photo_url, fun_fact, reachability, warm_intro and met are null. Arrays are empty when unavailable. The frontend uses initials when photos are unavailable and never infers attendance from employment at a sponsor. Each factual live card includes source URL and collection timestamp; derived statements cite their input evidence. Fixtures use example.invalid and are not factual evidence.

`grounded_on` entries identify a source fact or saved note with a stable ID and its text; source facts also include their source URL and collection time. Approval saves edited content without sending it. Provider failures preserve the last saved draft and display an error; a deterministic fallback must be labeled if introduced.

## Errors and validation

Use FastAPI validation errors (422) for invalid fields, 404 for missing/scoped-out objects, 409 for not-ready data, and 502/503 for upstream failures without usable cache. Bound note length, request size, and number of topic tags. Frontend origins are explicitly configured. Credentials and source payloads must not appear in error responses.
