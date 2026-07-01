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
| 2 — Dependent | Projects · **Learning** (5 sub-contexts: Courses&Classes · Books · Knowledge · Study Sessions&Planner · Flashcards) · Journals |
| 3 — Higher-order | Languages · Purposes & Goals · Bucket List |
| 4 — Peripheral | **Routines** (re-sequenced 2026-07-01 — orchestrator, needs its modules first) · Gamification · Notifications · Pomodoro |
| R — Recovered | Health · Duties · **Skills** (separated from Learning) (+ Finance→Commitments, Projects→Investigations expansions) |

## Status (⬜ not started · 🔄 in progress · ✅ documented + verified)
| Module | Wave | Status | Docs |
|--------|:----:|:------:|------|
| [Notes & Pages](notes-and-pages/) | 0 | ✅ | [identity](notes-and-pages/identity.md) · [business-rules](notes-and-pages/business-rules.md) · [contract](notes-and-pages/contract.md) · [structure-data](notes-and-pages/structure-data.md) · [conventions](notes-and-pages/conventions.md) |
| [Preferences](preferences/) | 0 | ✅ | [identity](preferences/identity.md) · [business-rules](preferences/business-rules.md) · [contract](preferences/contract.md) · [structure-data](preferences/structure-data.md) · [conventions](preferences/conventions.md) |
| [Tasks](tasks/) | 1 | ✅ | [identity](tasks/identity.md) · [business-rules](tasks/business-rules.md) · [contract](tasks/contract.md) · [structure-data](tasks/structure-data.md) · [conventions](tasks/conventions.md) |
| [Habits](habits/) | 1 | ✅ | [identity](habits/identity.md) · [business-rules](habits/business-rules.md) · [contract](habits/contract.md) · [structure-data](habits/structure-data.md) · [conventions](habits/conventions.md) |
| [Finance](finance/) | 1 | ✅ | [identity](finance/identity.md) · [business-rules](finance/business-rules.md) · [contract](finance/contract.md) · [structure-data](finance/structure-data.md) · [conventions](finance/conventions.md) |
| [Relationships](relationships/) | 1 | ✅ | [identity](relationships/identity.md) · [business-rules](relationships/business-rules.md) · [contract](relationships/contract.md) · [structure-data](relationships/structure-data.md) · [conventions](relationships/conventions.md) |
| [Check-ins](check-ins/) | 1 | ✅ | [identity](check-ins/identity.md) · [business-rules](check-ins/business-rules.md) · [contract](check-ins/contract.md) · [structure-data](check-ins/structure-data.md) · [conventions](check-ins/conventions.md) |
| [Projects](projects/) | 2 | ✅ | [identity](projects/identity.md) · [business-rules](projects/business-rules.md) · [contract](projects/contract.md) · [structure-data](projects/structure-data.md) · [conventions](projects/conventions.md) |
| Routines | ~~2~~→4 | ⏸ intake in progress | **Re-sequenced to late** (before peripherals) — orchestrator; needs referenced modules documented first. Intake mostly whole: `../intake/routines.md` |
| Journals | 2 | ⬜ | — |
| Learning: Courses & Classes | 2 | ⬜ | courses + ICS sync + homework/exams/syllabus |
| Learning: Books | 2 | ⬜ | books + book_chapters |
| Learning: Knowledge | 2 | ⬜ | study_topics + topic_reviews + knowledge_notes (skills REMOVED → Skills) |
| Learning: Study Sessions & Planner | 2 | ⬜ | study_sessions + §5.11 planner (5 tables) |
| Learning: Flashcards | 2 | ⬜ | flashcard_decks/flashcards/reviews (SM-2) |
| **Skills** (separated from Learning) | R | ⬜ | recovered — v2 is a downgraded 2-table version; envisioned larger/robust; own intake |
| Languages | 3 | ⬜ | — |
| Purposes & Goals | 3 | ⬜ | — |
| Bucket List | 3 | ⬜ | — |
| Gamification | 4 | ⬜ | — |
| Notifications | 4 | ⬜ | — |
| Pomodoro | 4 | ⬜ | — |
| **Health** (exercise + nutrition) | R | ⬜ | recovered v1 audit — new domain, no v2 schema; needs full intake |
| **Duties** | R | ⬜ | recovered v1 audit — needs defining intake (vs Task/Obligation/Routine) |
| _Finance → Commitments_ | R | ⚠ expand | Finance ✅ done; add recurring commitments (auto-txn + due) |
| _Projects → Investigations_ | R | ⚠ expand | Projects ✅ done; add research/investigation entity |
| _Learning → Grades/Cycles_ | R | ⚠ verify | check when documenting Learning |

> **Wave R = recovered scope** from the v1 architecture audit (2026-06-30). See the manifest scope note +
> [`../intake/_scope-reconciliation-v1.md`](../intake/_scope-reconciliation-v1.md).

## How a feature gets documented
Run `/documentation features/<module>` — it runs Intake → Transform → Verify for that one context and writes
the 5 aspect docs here. See the scenario `documentation-blueprint` for the full loop. Update this table's
status row and the manifest status tracker on accept.
