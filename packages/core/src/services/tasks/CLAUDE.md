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
S1 BUILT (mod-tasks #65 · LIF-142 · 2026-10-14): `createTasksService` — CRUD + ≤1-parent guard + app-layer cascade +
list filters, over DB-4 `tasks`/`task_time_logs` (migration 015). DB-11 reconcile shipped (`@vida/types.Task` +7 cols
−`tags`). S2–S9 designed (sub-tasks/rollup · completion/effects · timer · obligations · measurability · aggregation ·
tags/notes/views · Journal). Durable docs: `docs/modules/tasks/current-{spec,business-rules}.md`. Delivery:
`docs/features/tasks/delivery/`.
