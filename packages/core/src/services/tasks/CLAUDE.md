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
S1–S7 BUILT (mod-tasks #65 · LIF-142): `createTasksService` — S1 CRUD + ≤1-parent guard + app-layer cascade + list
filters (DB-4 `tasks`/`task_time_logs`, migration 015; DB-11 reconcile) · S2 sub-tasks + M4 derived rollup · S3
`completeTask`/`reopenTask` + deny-safe completion fan-out (`[award_xp, contribute_purpose_metric,
emit_measurement_signal]`; Tasks IS a §4 feeder) · **S4 `startTimer`/`stopTimer`/`getActualMinutes` + `registerTasksTimer`
+ `log_time` handler** (timer = a `'work'` session sub-type; `log_time` writes the kept `task_time_logs` ledger via the
rail, never direct — G-S4; + the read-only Sessions `findOpenSessionForEntity`) · **S5 `setRecurrence` + `completeTask`
obligation-regen** (RRULE via canonical `ical.js`; three outcomes: spawn / exhausted-end / `RecurrenceRegenError`).
S6–S9 designed (measurability · aggregation · tags/notes/views · Journal). Durable docs: `docs/modules/tasks/current-{spec,business-rules}.md`.
