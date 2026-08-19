# Task: db-4-per-domain-schema
# Status: in-progress
# Profile: add-backend-component
# Scenario: add-backend-component (schema-foundation build — 5-phase lifecycle, per-domain sub-issues)
# Linear: LIF-66
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/features/<module>/structure-data.md ×19 (ADR-002 §5.20 Stream (ii)) · flow: docs/roadmap/schema-foundation-build-flow.md
<!-- Model B (upfront foundation) decided 2026-08-18: DB-4 is a REAL gated build head, not a stream.
     It authors ALL per-domain schema BEFORE M1.1; M1.1 modules build service+UI on the finished schema. -->

## Goal
Author the **complete per-domain Drizzle schema** (all ~19 domains) as a self-contained, gated M1.0 foundation build,
consuming the DB-3 substrate spine. This finishes the M1.0 schema foundation; M1.1+ modules then build service + UI on
it and **author no schema**. Delivered as **one component sub-issue per domain group** (added when this issue starts),
each running the 5-phase lifecycle at domain granularity.

## Intent source (Phase 1)
- The **19 `docs/features/<module>/structure-data.md`** docs (§5.20 Stream (ii)): books · check-ins · finance
  (+fiscal-legal) · habits · journals · knowledge (+flashcards) · pomodoro · preferences · projects · relationships ·
  routines · sessions-and-scheduling · skills · tasks · health/{core,nutrition,training} · learning/education.
- **Cross-module MOVES** (§5.20): `bucket_list_items`→`dreams`; `pomodoro_sessions`→Sessions realm; `skill_resources`→`entity_links`.

## Dependencies
- blocked by `db-1-schema-primitives` (✅ done)
- blocked by `db-3-stream-i-consolidation` (substrate spine — must finish first)

## Build Steps (per domain group — 5-phase lifecycle, flow doc §2/§4)
- [x] **P0 · Slice** — enumerate the domain groups (canonical list below); track each as a lightweight build-step
      (D3: no Linear sub-issues — DB-4 stays LIF-66). Done 2026-08-18.
- [ ] Per domain group: **P1 intent intake** (its structure-data.md, FULL) → **P2 current-state read** →
      **P3 plan double-gate** → **P4 implement** (SQL migration + Drizzle modules + `ENTITY_TYPES` appends) →
      **P5 foundation-soundness verify** (the module that consumes it, e.g. MOD-notes for Notes, finds every table/column).
- [ ] **Close** — when all domains authored + verified, mark DB-4 Done → M1.0 schema foundation complete → M1.1 opens.

## P0 Output — Canonical Domain-Group Slice (2026-08-18, approved)
**22 domain groups**, each its own 5-phase run. Resolved grain decisions:
- **D1 Health → SPLIT into 3** (Core / Nutrition / Training) — ~23 tables, distinct concerns.
- **D2 Languages → OWN group** — docs verify: intent source is **ADR-002 §5.10 Language Learning Domain** (~9 tables,
  fully specified); the `docs/features/languages/*.md` stubs are 0-byte → author `structure-data.md` from the ADR in its P1.
- **D3 Pomodoro → FOLDED into Sessions & Scheduling** (self-declared "capability within the Sessions realm"; `pomodoro_sessions`→`focus_sessions` via `session_id`).
- **D4 ICS → FOLDED into Learning/Education**; Bucket List → Purpose (`dreams`); Duties → dissolved (intake only).
- **Sub-issue form (D3 answer):** lightweight task-file/build-step checklist, no Linear sub-issues.
- **Ordering:** cross-domain refs are **plain TEXT, no FK** (DB-3 decision) → domain groups have **no hard build-order
  dependency**; **Notes & Pages first** (in-degree-14 hub) is a convention for Phase-5 readiness, not a blocker.

| # | Domain group | Intent source | Status |
|---|---|---|---|
| 1 | Notes & Pages (hub) | `notes-and-pages/structure-data.md` | ☐ |
| 2 | Preferences | `preferences/structure-data.md` | ☐ |
| 3 | Sessions & Scheduling (+Pomodoro) | `sessions-and-scheduling/` + `pomodoro/` | ☐ |
| 4 | Tasks | `tasks/structure-data.md` | ☐ |
| 5 | Projects | `projects/structure-data.md` | ☐ |
| 6 | Habits | `habits/structure-data.md` | ☐ |
| 7 | Routines | `routines/structure-data.md` | ☐ |
| 8 | Purpose & Goals (+dreams) | `purposes-and-goals/structure-data.md` | ☐ |
| 9 | Skills | `skills/structure-data.md` | ☐ |
| 10 | Knowledge (+flashcards) | `knowledge/` + `knowledge/flashcards/` | ☐ |
| 11 | Books | `books/structure-data.md` | ☐ |
| 12 | Learning/Education (+ICS) | `learning/education/structure-data.md` | ☐ |
| 13 | Languages | **ADR-002 §5.10** (stub `structure-data.md` to author in P1) | ☐ |
| 14 | Relationships | `relationships/structure-data.md` | ☐ |
| 15 | Finance (+Fiscal & Legal) | `finance/` + `finance/fiscal-legal/` | ☐ |
| 16 | Check-ins | `check-ins/structure-data.md` | ☐ |
| 17 | Health: Core | `health/core/structure-data.md` | ☐ |
| 18 | Health: Nutrition | `health/nutrition/structure-data.md` | ☐ |
| 19 | Health: Training | `health/training/structure-data.md` | ☐ |
| 20 | Journals | `journals/structure-data.md` | ☐ |
| 21 | Gamification | `gamification/structure-data.md` | ☐ |
| 22 | Notifications | `notifications/structure-data.md` | ☐ |

## Route History
- 2026-08-01: created as a `# Stream: true` non-head (Model A).
- 2026-08-18: **re-chartered as a real gated build head (Model B)** — Victor's schema-foundation blueprint. Stream
  header removed; profile add-backend-component; per-domain-sub-issue 5-phase grain. Flow:
  `docs/roadmap/schema-foundation-build-flow.md`. Blocked by DB-3; runs in its own clean-context session(s) after DB-3.
- 2026-08-18: **PICKED UP** — DB-3 PR #31 merged to main (`97a0e0c`); profile switched Project Foundation →
  add-backend-component. Started **P0 · Slice**: verified 24 `structure-data.md` intent docs on disk + inspected
  grain-ambiguous groups (health 3-doc, knowledge+flashcards, finance+fiscal-legal, pomodoro MOVE, languages dissolve).
  Canonical domain-group list proposed for approval before sub-issue creation.
