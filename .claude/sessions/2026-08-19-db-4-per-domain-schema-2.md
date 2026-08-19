---
Session 2 — 2026-08-19
Goal: DB-4 group #3 — Sessions & Scheduling (+Pomodoro) schema, full 5-phase lifecycle
Profile: Add Backend Component (schema-foundation 5-phase)
---

## Accomplished
- **Committed group #2 confirmation + fixed stale TASKS.md** — #2 Preferences was already committed
  (`0bc1508` + `0fec077`); corrected the "not yet committed" drift (git log is ground truth).
- **DB-4 group #3 COMPLETE + committed (`029cea7`)** — 6 tables (migration `014_sessions_scheduling`, v14):
  - Extensions (own `id` PK + `session_id UNIQUE`): `study_sessions` · `focus_sessions`
    (`schema/foundation/session-extensions.ts`, new).
  - Planner (appended to `scheduling.ts`): `study_availability` · `availability_exceptions` ·
    `study_plan_batches` · `session_templates`.
  - `STUDY_PLAN_BATCH_STATUS += 'failed'` · `ENTITY_TYPES += 'session'` · `PRESET_BLOCK` reused.
  - Phase-5 **DDL-introspection test** (`sessions-scheduling-introspection.test.ts`, 24 cases: column-set ·
    nullability · PK · default × 6) — the mandatory bookend.
- Full §XXVI double-gate + preflight + post-impl: gate-1 REVISE→resolved · preflight BLOCKED(BR-DB-1)→PASSED ·
  gate-2 REVISE→SHIP · post-impl SHIP. `@vida/core` **221 tests** · typecheck 11/11 · lint 0-err.
- §XXIX currency promoted (`database-layer/current-{spec,business-rules}.md` — BR-S4-1…10).

## Decisions Made
- **`focus_sessions` IS the `focus` timer runtime; `pomodoro_sessions` RETIRED into it** — NOT a build-decision.
  Doc-determined by the consuming-module reframe (`notes-and-pages/structure-data.md:30`, `contract.md:19`); the
  origin feature doc's "build-phase modelling decision" language is superseded. Corrected after 2 Victor drift-catches
  (I collapsed wrongly, then relayed a critic's manufactured "keep both as a decision"). Zero build-decisions in #3.
- **Extension PK = own `id` + `session_id UNIQUE`** (not `session_id`-as-PK) — BR-DB-1 + the repository factory
  generate `id`; ADR-004 §3.1 "keyed by session_id" = a key column, not a PK override. (Preflight catch.)
- **`scheduled_study_sessions` DROPPED** (→ `planned_blocks`); **`session_effects` is not a table** (dim2 = enum +
  registry JSON + `applied_effects`); other sub-type extensions belong to their own DB-4 groups (ADR-004 §3.1).

## Open Questions
- **X1 (cross-group):** PD-7 global config (`auto_start_breaks`/`auto_start_next_interval`/`show_notifications`/
  `play_sounds`) is absent from shipped `013_preferences.user_preferences` → a **group #2 Preferences backfill**.
- **DB-11:** interface reconcile owed — `PomodoroSession` (entity_type/page_id), `StudyPlanBatch` (course_id→scope),
  `StudySession` (spine fields still on the interface).
- ⚠ CI red repo-wide = known pnpm action-setup infra conflict (local green).

## Next Session
First step: **open DB-4 group #4 Tasks, Phase 1 intent intake** — FRESH clean-context session (one per group,
per `docs/roadmap/schema-foundation-build-flow.md §2`). `docs/features/tasks/structure-data.md` (FULL) → P2 → P3
double-gate → P4 → P5.
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" (22-group table) · flow doc §2 ·
the group #3 build as the pattern (`docs/specs/foundation/db-4-sessions-and-scheduling/` + `session-extensions.ts` +
`014_sessions_scheduling.ts`) · memory [[stale-source-plus-live-convention-is-fact-not-a-decision]] (grep the table
name across ALL of docs/; the reframe/current-* doc holds the resolution). **3 of 22 done; 19 remain.**
