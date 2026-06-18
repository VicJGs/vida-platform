<!-- Features index — the 17 feature contexts. Master map + status: docs/README.md (manifest).
     Each documented feature carries the canonical 5 aspect docs: identity · business-rules · contract · structure-data · conventions. -->

# Features — Vida Platform

The 17 product modules. Each is a **feature context** documented with the **canonical 5 aspects**
(`identity` · `business-rules` · `contract` · `structure-data` · `conventions`) — the same axes used at
every level (see the master manifest: [`../README.md`](../README.md)).

> Modules are documented in **dependency fill order** — a context is never specced against a foundation
> that isn't documented yet. `[FACT: docs/core/architecture/module-dependency-graph.md]`

## Fill order (waves)
| Wave | Modules |
|------|---------|
| 0 — Foundational | **Notes & Pages** (hub, in-degree 14) · Preferences |
| 1 — Independent | Tasks · Habits · Finance · Relationships · Check-ins |
| 2 — Dependent | Projects · Routines · Journals · Learning |
| 3 — Higher-order | Languages · Purposes & Goals · Bucket List |
| 4 — Peripheral | Gamification · Notifications · Pomodoro |

## Status (⬜ not started · 🔄 in progress · ✅ documented + verified)
| Module | Wave | Status | Docs |
|--------|:----:|:------:|------|
| [Notes & Pages](notes-and-pages/) | 0 | ✅ | [identity](notes-and-pages/identity.md) · [business-rules](notes-and-pages/business-rules.md) · [contract](notes-and-pages/contract.md) · [structure-data](notes-and-pages/structure-data.md) · [conventions](notes-and-pages/conventions.md) |
| [Preferences](preferences/) | 0 | ✅ | [identity](preferences/identity.md) · [business-rules](preferences/business-rules.md) · [contract](preferences/contract.md) · [structure-data](preferences/structure-data.md) · [conventions](preferences/conventions.md) |
| Tasks | 1 | ⬜ | — |
| Habits | 1 | ⬜ | — |
| Finance | 1 | ⬜ | — |
| Relationships | 1 | ⬜ | — |
| Check-ins | 1 | ⬜ | — |
| Projects | 2 | ⬜ | — |
| Routines | 2 | ⬜ | — |
| Journals | 2 | ⬜ | — |
| Learning | 2 | ⬜ | — |
| Languages | 3 | ⬜ | — |
| Purposes & Goals | 3 | ⬜ | — |
| Bucket List | 3 | ⬜ | — |
| Gamification | 4 | ⬜ | — |
| Notifications | 4 | ⬜ | — |
| Pomodoro | 4 | ⬜ | — |

## How a feature gets documented
Run `/documentation features/<module>` — it runs Intake → Transform → Verify for that one context and writes
the 5 aspect docs here. See the scenario `documentation-blueprint` for the full loop. Update this table's
status row and the manifest status tracker on accept.
