---
Session 3 — 2026-08-19
Goal: DB-4 group #4 — Tasks schema, full 5-phase lifecycle
Profile: Add Backend Component (schema-foundation 5-phase)
---

## Accomplished
- **DB-4 group #4 Tasks COMPLETE + committed** — 2 net-new tables (`tasks` · `task_time_logs`, migration
  `015_tasks`, v15):
  - `schema/tasks.ts` (new top-level domain module) + `migrations/015_tasks.ts` (hand-written SQL).
  - `@vida/types/task.ts` — `TASK_KIND = ['standard','obligation']` (net-new tuple) + `TaskKind`.
  - `@vida/core/validators/task.ts` — `TaskKindSchema`.
  - `schema/_registry.ts` — `ENTITY_TYPES += 'task'`; `schema/index.ts` — export; `runner.ts` — register (→ v15).
  - `enum-parity.test.ts` — +6 rows (status/priority/difficulty/kind/measurement_kind/binding_mode — first live use
    of the 5 shared tuples) + `ddlFor()` chain extended to `015`.
  - **Phase-5 DDL-introspection** (`db/tests/tasks-introspection.test.ts`, 8 cases: column-set·nullability·PK·default × 2).
- Full §XXVI double-gate + preflight + post-impl: gate-1 SHIP · preflight PASSED · gate-2 REVISE→SHIP · post-impl SHIP.
  `@vida/core` **240 tests** green · typecheck 11/11 · lint 0-err.
- §XXIX currency promoted (`database-layer/current-{spec,business-rules}.md` — BR-T4-1…9).
- Reconciled a stale `spaces.test.ts` fixture (hard-coded `'task'` as its throwaway unregistered example → now a seeded
  taggable type per TK-8; switched to a synthetic `'custom_user_type'`).

## Decisions Made
- **ZERO build-decisions** — every shape point is doc-determined (the group #3 outcome). No-FK reconcile (5 parent refs
  + self-ref + `task_id` → plain TEXT, TK-4 app-layer); recurrence = single `recurrence_rule` TEXT/RRULE (locked platform
  convention; habit/routine freq+days model **explicitly excluded** for tasks, conventions.md:13,25); `nesting_weight`
  INTEGER nullable (ADR-011 §3.3 L54, named verbatim; v2 has zero REAL cols); inline `tasks.tags`/`task_views` retired →
  `entity_tags`/`views` (AR-6 substrate); `Task` interface reconcile → DB-11.
- **`binding_mode` nullable, no default** (gate-2 catch) — the docs name what `event-trigger` *means* for a completion,
  not a universal default; ADR-011 §3.2 override-slot grain (NULL ⇒ derive). `measurement_kind` stays NOT NULL DEFAULT
  'milestone' (doc-licensed natural).

## Drift caught (Victor) — reinforced memory
- I first presented **4 "open shape points with leans"** at end of P1/P2. Victor: "GROUND EVERYTHING IN THE
  DOCUMENTATION, these open shape points seem like a drift." This is the **3rd recurrence** of the manufactured-decisions
  drift (Notes #1, Sessions #3, now Tasks #4) — every point was doc-closed. Then gate-2 caught the *reverse* form: a
  manufactured DEFAULT (`binding_mode='event-trigger'`) the docs don't license. Memory
  [[stale-source-plus-live-convention-is-fact-not-a-decision]] reinforced: the tell is "shape points / decisions with
  leans" in my OWN P1 framing; a DB-4 P1 doing its job produces "resolutions ALL doc-determined, ZERO decisions."

## Open Questions
- **DB-11 (carry-forward):** `Task` interface (+`completed_at`/`scheduled_date`/`kind`/`recurrence_rule`/
  `measurement_kind`/`binding_mode`/`nesting_weight`, −`tags`) · `TaskTimeLog` (+`updated_at`).
- ⚠ Pre-existing flake: `@vida/core` encryption "handles large data (1 MB)" tips over vitest's 5s timeout under
  full-suite parallel load (documented in the test itself; passes isolated ~9.9s). Not a Tasks regression.

## Next Session
First step: **open DB-4 group #5 Projects, Phase 1 intent intake** — FRESH clean-context session (one per group).
Read the FULL `docs/features/projects/` 5-aspect set + ADR-002 §5.4 + **grep each column concept across the corpus**
BEFORE claiming any gap or "shape point." A P1 that emits "decisions with leans" IS the drift. **4 of 22 done; 18 remain.**
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" · flow doc §2 · groups #1–#4 as the pattern ·
memories [[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[build-phase-flags-mean-resolve-now-not-defer]] ·
[[open-vocab-columns-take-no-sql-check]].
