# Mobile implementation

Frontend changes follow the mobile flow board in Figma file `mouA5TnOzdAVAhGc6oKyPB`, using the existing FastAPI endpoints. No backend changes are required.

## Implemented

- Viewport-height 390px mobile shell, safe-area-aware fixed bottom navigation, and local Figma navigation assets. Long content scrolls inside the shell; short screens do not create unnecessary page scrolling.
- Compact onboarding: import summary first, required review fields next, optional profile details expandable; actions remain reachable near the bottom.
- Discovery portrait cards, persisted triage decisions, resume from unsorted people, skipped review, note entry, and profile/event links.
- Lead sheet with To meet / Met / Follow up tabs, search, sorting, card/table views, CSV export, and restoring skipped people. Follow up means met with no approved draft; approved means user approved/copy-ready, not sent.
- Event list grouped by supplied event dates; selected event persists and clears the previous selected person. No invented event dates or live status.
- Today event summary, ranked top three, meeting status, and navigation to recap and the complete shortlist.
- Profile/interests editing and re-ranking through PUT /profile; suggestions use topics actually returned by the roster.
- Person graph using API nodes and edges; `/graph` focuses a real person; `/everyone` renders the event topic network with All / Interesting / Met / Speakers filters and a ranked-list toggle; `/topic/[slug]` focuses a topic and opens a filtered sorting deck. Memory shows recorded notes, draft status, and backend cross-event memories.
- Today opens `/person/[id]/glance`: full portrait brief, real opening/facts, next person, and note capture.
- Note capture uses the Figma bottom sheet, actual microphone recording/transcription, editable text and optional tags stored as note text. It awaits POST /met before navigating; no delayed save or fake Undo.
- Profile editing is an interest bottom sheet, preserving all existing fields. `/graph/re-ranked` compares real server rankings against the pre-save browser snapshot; absent snapshots do not invent rank changes.
- Explicit draft type and referral screens at `/drafts/new/type` and `/drafts/new/referral` share the existing generation logic. Follow-up/referral require a real saved note; existing pending introduction/follow-up drafts are reopened.
- Note save returns to Today with a toast. Notes remain append-only.
- Required onboarding name, roles, and interests now match backend validation; bare LinkedIn URLs gain https.
- Draft person lookups use the draft's event, and clipboard success is only claimed after a successful copy.
- Backend connection errors offer retry rather than leaving the app loading indefinitely. Dynamic images fall back to initials.

## Design references

Discovery: 219:1228. Lead sheet: 242:1173. Today: 219:1434. Events: 221:1192. Profile/interests: 222:1216. Person: 219:1319 and 220:1268. Glance: 219:1543. Note: 219:1602. Re-ranked: 222:1247. Everyone/topic: 223:1165 / 223:1246. Draft type/referral: 220:1295 / 220:1314. Graph: 222:1165. Memory: 245:1183. Existing resume onboarding follows 220:1165 / 220:1200 rather than the earlier sales concept.

## Backend limits / remaining assets

- The supplied blue graph / navy Kairos logo is stored locally and reused across the app wordmarks. The mock device status bar is removed.
- No APIs exist for connections CSV ingestion, LinkedIn sync, warm-intro traversal, semantic graph questions, notifications, data deletion, or undoing notes. These features were not simulated.
- The current backend returns empty openers/talks/signals and null fun facts/reachability. The UI uses these fields if supplied and otherwise uses the backend next step; it does not invent enrichment.
- Loading percentage and per-source ingestion counters are not exposed. Event creation retains its real request/loading/error flow.
- Approved drafts are copy-ready; the frontend does not send email or LinkedIn messages.

## Build

`npm run build:webpack` completed successfully, including TypeScript and page generation. Turbopack hit an environment-specific port-binding restriction. The standard Tailwind PostCSS adapter supports both bundlers; the regular build script remains available.

Additional tests and browser/visual verification were skipped at the user's request. Lint passed before the final additions; it was not rerun after the user asked to skip further tests.
