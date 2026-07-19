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
| 3 — Higher-order | Languages · ~~Purposes & Goals~~ → **CAPSTONE** (re-sequenced 2026-07-13) · ~~Bucket List~~ → Spaces (dissolved 07-15) |
| 4 — Peripheral | **Routines** (re-sequenced 2026-07-01 — orchestrator, needs its modules first) · Gamification · Notifications · Pomodoro |
| R — Recovered | Health · Duties · **Skills** (separated from Learning) (+ Finance→Commitments, Projects→Investigations expansions) |

> **EXECUTION ORDER (re-sequenced 2026-07-13; Duties dissolved 07-14)** — dependency-correct: **1 Health** ✅ →
> **2 Skills** ✅ → **3 Routines** ✅ → **4 expansions** ✅ → **5 Pomodoro** ✅ → ~~**6 Bucket List**~~ 🚫→Spaces → **7 Spaces** (CORE
> foundation) → **8 Purposes & Goals (CAPSTONE)** → **9 Gamification** → **10 Notifications**.
> Reframes: **Purposes & Goals → capstone** (meaning-spine, ladders up every module). **Languages DISSOLVED →
> Spaces** (a Personalization & Composability *foundation*: universal tags · saved views · capability Blocks ·
> templates — users assemble module-like surfaces from generic parts; Languages = its worked-example). **Duties
> DISSOLVED → Tasks + Spaces** (Duty + Obligation = task TYPES + presets, not a module; 07-14). Spaces' gaps deferred
> to #7 (it touches every module). Deferred: Fiscal & Legal. Rationale: [`../README.md`](../README.md).

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
| [Routines](routines/) | ~~2~~→3 | ✅ | [identity](routines/identity.md) · [business-rules](routines/business-rules.md) · [contract](routines/contract.md) · [structure-data](routines/structure-data.md) · [conventions](routines/conventions.md) — **documented + gate PASS 07-14**: cross-module ORCHESTRATION cockpit (named ordered sequences; compose-driven polymorphic steps; user-configurable completion/miss policies + acceptance window; policy-derived streak; provider via `dueIn`/`summary`). Composes Sessions(ADR-004)/Tasks/Habits/Health/Scheduler/Spaces. ⚠ INTENDED reframe → ADR-002 amendment + Routines design-pass |
| [Journals](journals/) (the integration layer — aggregation engine + daily dashboard + temporal Review engine) | 2 | ✅ | [identity](journals/identity.md) · [business-rules](journals/business-rules.md) · [contract](journals/contract.md) · [structure-data](journals/structure-data.md) · [conventions](journals/conventions.md) — provider-registry aggregation (no module coupling); snapshot-past + live-today + scheduled Wrapped-style reviews; refines N&P G7; **closes Wave 2** |
| [Learning: Education](learning/education/) (renamed from "Courses & Classes") | 2 | ✅ | [identity](learning/education/identity.md) · [business-rules](learning/education/business-rules.md) · [contract](learning/education/contract.md) · [structure-data](learning/education/structure-data.md) · [conventions](learning/education/conventions.md) — 8-level hierarchy reframe; umbrella: [learning/](learning/) |
| [Books](books/) (own module — extracted from Learning 2026-07-03) | 2 | ✅ | [identity](books/identity.md) · [business-rules](books/business-rules.md) · [contract](books/contract.md) · [structure-data](books/structure-data.md) · [conventions](books/conventions.md) — reading Universe reframe; partition serves Education |
| [Knowledge](knowledge/) (own module — extracted from Learning 2026-07-10) | 2 | ✅ | [identity](knowledge/identity.md) · [business-rules](knowledge/business-rules.md) · [contract](knowledge/contract.md) · [structure-data](knowledge/structure-data.md) · [conventions](knowledge/conventions.md) — knowledge-Universe reframe; most-personalizable module; provides mastery source to Education |
| [Sessions & Scheduling](sessions-and-scheduling/) (own module — extracted **+ PROMOTED** from Learning 2026-07-12) | F | ✅ | [identity](sessions-and-scheduling/identity.md) · [business-rules](sessions-and-scheduling/business-rules.md) · [contract](sessions-and-scheduling/contract.md) · [structure-data](sessions-and-scheduling/structure-data.md) · [conventions](sessions-and-scheduling/conventions.md) — Session supertype + sub-types · aggregator scheduling engine · 4-dim Integration Contract; views deferred (G9); **[ADR-004](../core/decisions/ADR-004-session-framework.md)** |
| [Knowledge: Flashcards](knowledge/flashcards/) (study-method **service** sub-context of Knowledge — reframed from Learning 2026-07-12) | 2 | ✅ | [identity](knowledge/flashcards/identity.md) · [business-rules](knowledge/flashcards/business-rules.md) · [contract](knowledge/flashcards/contract.md) · [structure-data](knowledge/flashcards/structure-data.md) · [conventions](knowledge/flashcards/conventions.md) — content+drill only; scheduling/curve/review/mastery/deck all generic (Knowledge engine); reference impl of **[ADR-005](../core/decisions/ADR-005-study-method-service-framework.md)**; 3 v2 tables retired |
| [**Skills**](skills/) (the "Abilities" growth engine) | R | ✅ | **documented + gate PASS 2026-07-14** — reframed from v2's 2-table floor via the Notion "Abilities" design (context) + Victor's current-intent: a **game-like, dependency-graphed, user-composable growth engine** (Skill Composer · Skill Graph · dispatch · three-way fill · shared reflective engine w/ Health). 5 aspect docs. |
| ~~Languages~~ → **Spaces** | ~~3~~→Core | ⏸ | **DISSOLVED into Spaces (foundation), 2026-07-13.** Not a module — a *configuration of generic seams*. Intake preserved → worked-example: `../intake/languages.md` → `../intake/spaces.md`. |
| **Spaces** (Personalization & Composability — CORE foundation) | Core | ⏸ | **PARKED — resume exec #8** (before Purposes capstone). Intake + gap map SP1–SP9 captured, name locked, 4 primitives confirmed: `../intake/spaces.md`. Touches every module → deferred; accumulates their needs. → ADR set (tags·views·blocks·templates). |
| [**Purposes & Goals**](purposes-and-goals/) — **CAPSTONE** | 3→**capstone** | ✅ | **DOCUMENTED + gate PASS 2026-07-17 (exec #8).** 5 canonical aspect docs; intake WHOLE (PG1–PG10 + SR-003). Meaning-spine: Values→Purposes→Targets (every joint optional), universal measurability (`measurement_kind`+`binding_mode`, CORE cross-cutting), first-class `contributions` weighted edge (Purpose-domain, not a Spaces primitive), restored `purpose_reviews`, provider registration. Surfaced **ADR-011 (Universal Measurability & Progress Propagation)** — pending draft. `../intake/purposes-and-goals.md` RESOLUTION. |
| ~~**Bucket List**~~ → **Spaces** (+ **Dreams**) | ~~3~~ | 🚫 dissolved | **DISSOLVED 2026-07-15** (Victor) → NOT a module. It's "a separated View of things I want to do before I die, with progress, to envision them" = a **Space** (a `#before-i-die` tag + vision-board Gallery View + progress + Template). The items **are Dreams** → `bucket_list_items` **collapses into `dreams`** (Purposes & Goals owns it; PG8 resolved). **3rd Spaces worked-example** (after Languages, Duties). Intent → `intake/spaces.md` accumulator + `intake/purposes-and-goals.md` PG8. Languages→Spaces precedent. |
| [**Gamification**](gamification/) ("the System") | 4 | ✅ | **DOCUMENTED + gate PASS 2026-07-19 (exec #9).** 5 canonical aspect docs; intake WHOLE (GG1–GG11). Reframed from a badge layer → a **behavioral incentive & consequence engine** (partner to Purposes): rule→consequence via typed effects (`grant_currency`·`lock_currency`·`move_money`·`surface_notification`) on the ADR-004 rail · **multi-currency economy** (real-money · self-granted allowances · measured-time) · **Storage** = a Finance-owned nestable box layer · rules = headless automation (ADR-010). Surfaced **ADR-012 (Points Economy & Consequence Engine)** — pending draft. `../intake/gamification.md` RESOLUTION. |
| Notifications | 4 | ⬜ | — |
| [**Pomodoro**](pomodoro/) (a **capability**, not a module — the focus-timer runtime of the `focus` Session sub-type) | 4 | ✅ | **documented + gate PASS 2026-07-15** — REFRAME (Victor): consolidated **entirely into the Sessions realm** (no leak to other entities); the `/pomodoro` block = a session-lens. [identity](pomodoro/identity.md) · [business-rules](pomodoro/business-rules.md) · [contract](pomodoro/contract.md) · [structure-data](pomodoro/structure-data.md) · [conventions](pomodoro/conventions.md). v1 richness (pause/interruption/auto-start/templates) reshaped into Sessions+Preferences; **Focus Mode** = polymorphic × platform-adaptive × tool-bearing (⚠ INTENDED design-pass). ⚠ **Moves a boundary:** `pomodoro_sessions` re-homes Notes→Sessions + re-points `session_id` (build-phase ADR-004 amendment + ADR-002 re-home; reconciled across Sessions+Notes docs). |
| [**Health**](health/) (Training + Nutrition, goal-driven) | R | ✅ | **documented + gate PASS 2026-07-13** — umbrella + **Core** (unified Metrics·Goals · Adaptation/Experiments · Disciplines · energy loop) + **Training** + **Nutrition** sub-contexts (5 aspects each). 18-DB Notion design harvested via MCP + OS-extension reshape. Surfaced: ADR (N-of-1 Experiment framework) + ADR-002 Health additions. |
| ~~**Duties**~~ | R | 🚫 dissolved | **DISSOLVED 2026-07-14** (defining intake complete) → NOT a module. Duty + Obligation = **task TYPES + presets** (thin tabs over the Tasks entity, distinct patterns/deliverables, user-extensible). Intent → `intake/tasks.md` ADDENDUM + `intake/spaces.md` (preset primitive). Languages→Spaces precedent. |
| _Finance → Commitments_ | R | ✅ 07-15 | resolved as a **management sub-context/layer** (no entity) — composes recurring txns/liabilities/income/investments/assets; bidirectional + derived progress-to-total; `dueIn`/Notifications. Threaded into Finance identity/FN-14/structure-data/contract |
| _Projects → Investigations_ | R | ✅ 07-15 | **resolved by composition** (no entity) — a research/investigation = a deliverable (`artifact`) backed by a Knowledge Lab investigation (`entity_links`). Threaded into Projects identity + structure-data |
| _Learning → Grades/Cycles_ | R | ✅ 07-15 | **VERIFIED** — Subject-as-entity, grading-system + derived GPA rollup (ED-7), academic terms all covered by Education; v1 cycle-session-gen = Sessions&Scheduling. No gap |

> **Wave R = recovered scope** from the v1 architecture audit (2026-06-30). See the manifest scope note +
> [`../intake/_scope-reconciliation-v1.md`](../intake/_scope-reconciliation-v1.md).

## How a feature gets documented
Run `/documentation features/<module>` — it runs Intake → Transform → Verify for that one context and writes
the 5 aspect docs here. See the scenario `documentation-blueprint` for the full loop. Update this table's
status row and the manifest status tracker on accept.
