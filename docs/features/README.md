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
| 2 — Dependent | Projects · **Books** (own module — extracted from Learning 2026-07-03) · **Knowledge** (own module — extracted from Learning 2026-07-10; **Flashcards** is its study-method sub-context) · **Learning** (1 sub-context: Education) · Journals |
| F — Foundation | **Sessions & Scheduling** (own module — extracted **+ PROMOTED** from Learning 2026-07-12; the session foundation + scheduling engine many modules build on) |
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
| [Journals](journals/) (the integration layer — aggregation engine + daily dashboard + temporal Review engine) | 2 | ✅ | [identity](journals/identity.md) · [business-rules](journals/business-rules.md) · [contract](journals/contract.md) · [structure-data](journals/structure-data.md) · [conventions](journals/conventions.md) — provider-registry aggregation (no module coupling); snapshot-past + live-today + scheduled Wrapped-style reviews; refines N&P G7; **closes Wave 2** |
| [Learning: Education](learning/education/) (renamed from "Courses & Classes") | 2 | ✅ | [identity](learning/education/identity.md) · [business-rules](learning/education/business-rules.md) · [contract](learning/education/contract.md) · [structure-data](learning/education/structure-data.md) · [conventions](learning/education/conventions.md) — 8-level hierarchy reframe; umbrella: [learning/](learning/) |
| [Books](books/) (own module — extracted from Learning 2026-07-03) | 2 | ✅ | [identity](books/identity.md) · [business-rules](books/business-rules.md) · [contract](books/contract.md) · [structure-data](books/structure-data.md) · [conventions](books/conventions.md) — reading Universe reframe; partition serves Education |
| [Knowledge](knowledge/) (own module — extracted from Learning 2026-07-10) | 2 | ✅ | [identity](knowledge/identity.md) · [business-rules](knowledge/business-rules.md) · [contract](knowledge/contract.md) · [structure-data](knowledge/structure-data.md) · [conventions](knowledge/conventions.md) — knowledge-Universe reframe; most-personalizable module; provides mastery source to Education |
| [Sessions & Scheduling](sessions-and-scheduling/) (own module — extracted **+ PROMOTED** from Learning 2026-07-12) | F | ✅ | [identity](sessions-and-scheduling/identity.md) · [business-rules](sessions-and-scheduling/business-rules.md) · [contract](sessions-and-scheduling/contract.md) · [structure-data](sessions-and-scheduling/structure-data.md) · [conventions](sessions-and-scheduling/conventions.md) — Session supertype + sub-types · aggregator scheduling engine · 4-dim Integration Contract; views deferred (G9); **[ADR-004](../core/decisions/ADR-004-session-framework.md)** |
| [Knowledge: Flashcards](knowledge/flashcards/) (study-method **service** sub-context of Knowledge — reframed from Learning 2026-07-12) | 2 | ✅ | [identity](knowledge/flashcards/identity.md) · [business-rules](knowledge/flashcards/business-rules.md) · [contract](knowledge/flashcards/contract.md) · [structure-data](knowledge/flashcards/structure-data.md) · [conventions](knowledge/flashcards/conventions.md) — content+drill only; scheduling/curve/review/mastery/deck all generic (Knowledge engine); reference impl of **[ADR-005](../core/decisions/ADR-005-study-method-service-framework.md)**; 3 v2 tables retired |
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
