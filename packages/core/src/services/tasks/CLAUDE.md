# services/tasks — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
Tasks, sub-tasks, time logs, cross-module FK links; measurement + effect emission

## Owning ADR / context
tasks context

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
S1–S8 BUILT (mod-tasks #65 · LIF-142): `createTasksService` — S1 CRUD + ≤1-parent guard + app-layer cascade + list
filters (DB-4 `tasks`/`task_time_logs`, migration 015; DB-11 reconcile) · S2 sub-tasks + M4 derived rollup · S3
`completeTask`/`reopenTask` + deny-safe completion fan-out (`[award_xp, contribute_purpose_metric,
emit_measurement_signal]`; Tasks IS a §4 feeder) · S4 `startTimer`/`stopTimer`/`getActualMinutes` + `registerTasksTimer`
+ `log_time` handler (timer = a `'work'` session sub-type; `log_time` writes the kept `task_time_logs` ledger via the
rail, never direct — G-S4) · S5 `setRecurrence` + obligation regen (RRULE via canonical `ical.js`) · S6 `getTaskProgress`
(pursuable `progress()`, derived-on-read; `binding_mode` READ-side) · S7 `getAggregatedTasks` (R7 fan-out over the
SHARED `foundation/views` `ViewProviderRegistry`; top-level grain; per-group degradation) · **S8 `tagTask`/`untagTask`/
`getTaskTags` (via `spaces.tagEntity`, live-tag guard) · `getTaskNote` (`task_note` page via `ensureEntityNote`) ·
`saveView`/`listViews` (a task view = `views` row with `entity_types` EXACTLY `['task']`; REPLACE semantics) ·
`TASK_VIEW_PRESETS` + `kind` filter · `createTasksReadProvider`/`registerTasksReadProvider` (tasks AS a `ReadProvider`:
by-id short-circuit, per-key validation, top-level grain, `tags` = membership incl. NESTED, union)**. Deps after S1 are
optional + fail-loud (`TimerNotWiredError`, `TasksDepNotWiredError`); `'task'` is pre-seeded (no `registry` dep).
`pinView`/`reorderViews` are Preferences-owned (ADR-007 §3.5) — not here. S9 (Journal summary + DueProvider) designed.
Durable docs: `docs/modules/tasks/current-{spec,business-rules}.md`; slice specs `docs/features/tasks/delivery/PLAN-S*.md`.
