# Mobile PR consolidation

PR #10 is the active backend-compatible implementation against `main`. The earlier PRs below are archived design prototypes, not merged features. Their source branches remain intact. Closing them does not mean their complete Figma layouts have been implemented in #10.

| Archived PR | Preserved branch | Source commit | Work to reuse / required fixes |
| --- | --- | --- | --- |
| [#4 At the event](https://github.com/kirandevihosur74/kairos/pull/4) | `frontend/flows-v2-pr4-at-event` | `6ccd5b7a1c1359a4a9352f7976731c429978cee4` | Reuse glance and note-sheet layouts. Keep real voice transcription; await POST /met before navigating. The prototype's cleanup cancels its delayed save. |
| [#5 Setup](https://github.com/kirandevihosur74/kairos/pull/5) | `frontend/flows-v2-pr6-setup` | `d42bc4e609a4d453adf990c8f8dfc1d5c0e1fcbc` | Reuse onboarding layout improvements. CSV selection is mocked; do not claim 1,284 imported without a real connections endpoint. |
| [#6 Reading / Ask](https://github.com/kirandevihosur74/kairos/pull/6) | `frontend/flows-v2-pr8-reading-ask` | `4bb22d377f01efad417b7aca9a2d75c4103d83c3` | Preserve as future UI reference. Source progress and graph answers are mocked; backend APIs are required before shipping. |
| [#7 After](https://github.com/kirandevihosur74/kairos/pull/7) | `frontend/flows-v2-pr5-after` | `cf18ff1b837c16deeb40dd880af57390b855103f` | Reuse draft-type/referral and approval layouts. Replace constant event label / seven-met count; count actual pending drafts through GET /drafts. |
| [#8 Trust](https://github.com/kirandevihosur74/kairos/pull/8) | `frontend/flows-v2-pr7-trust` | `dcbb09be628cb9e2965a4b04ee581012cc9ab75e` | Preserve explanation/hide/privacy layouts. Browser reset does not delete server data; source switches do not control ingestion. Server support is required. |
| [#9 Graph](https://github.com/kirandevihosur74/kairos/pull/9) | `frontend/flows-v2-pr3-graph` | `dd35566f14094fb6949f87d19b508db7e6724903` | Reuse graph, interest bottom-sheet and re-ranked layouts. Reconcile overlapping graph routes and shared component changes with #10. |

## Remaining Figma work

- Glance brief and note-capture bottom-sheet presentation.
- Interest-edit bottom sheet and explicit re-ranked screen.
- Remaining onboarding and follow-up presentation details from the archived prototypes.
- Replacement logo completed in a follow-up using the supplied artwork.
- Unsupported network import, source-specific progress, graph Q&A, hiding across events, data deletion and notifications require separate backend work.

Use `main` as the base for future focused implementation PRs. Port visual pieces selectively; do not merge the prototype branches wholesale. Reopen an archived PR if its work is resumed, or use its preserved source commit in a new PR.

No application code changed during this PR cleanup. The earlier production build passed; additional tests were skipped at the user's request.
