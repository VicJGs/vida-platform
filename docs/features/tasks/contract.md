<!-- Contract — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · task.ts · intake -->

# Contract — Tasks  (level: Feature)

> **Status:** types exist (`@vida/types/task.ts`) but `@vida/core` task services do **not** yet. Signatures below
> are the **designed interface**; ⚠ INTENDED items (views, recurrence, completed_at, scheduled_date) depend on the
> schema amendment. `[FACT: task.ts present; no core service; ADR-002 §5.3]`

## Exposed surface (via `@vida/core`)
- **Task CRUD & queries** (`Task` `[FACT: task.ts L19-40]`):
  - `createTask({parent?, ...})` (TK-2 enforces ≤1 parent) · `updateTask(id, patch)` · `softDeleteTask(id)` (cascades, TK-4)
  - `listTasks(filter)` · `getAggregatedTasks(grouping)` (by module/project/status/…); standalone group included (G2)
  - `completeTask(id)` → sets `status='completed'` + `completed_at` (TK-6); `reopenTask(id)` clears it
- **Sub-tasks:** `addSubtask(parentId, ...)` · `getSubtasks(parentId)` · `getRollup(parentId)` → `{done, total}` (TK-3)
- **Time tracking** (`TaskTimeLog` `[FACT: task.ts L42-49]`):
  - `startTimer(taskId)` / `stopTimer(logId)` open/close a **`sessions` sub-type** (ADR-004 S1); the ledger write is the **`log_time`** S4 effect (R2/R1), not a direct client write (TK-5)
  - `setTimeTrackingEnabled(taskId, bool)` (per-task opt-out, G4)
- **Obligations** (⚠ INTENDED): `setRecurrence(taskId, rule)` · completion auto-spawns next occurrence (TK-7)
- **Views** (⚠ INTENDED, G1): a saved view is a first-class **`views`** row (ADR-007 V1); config = filter × layout × grouping; global vs Space-owned via `views.space_id` (V2). Surface: `saveView(config)` · `listViews()` · `reorderViews()` · `pinView(id)`. *Cite-level — the full V1 anatomy is the deferred 007 pass.* `[INTENT G1; ADR-007 V1/V2]`
- **Presets** (⚠ INTENDED, T4): a preset = a saved `views` config + per-type defaults, bound to the module's `kind` discriminator (`standard`/`obligation`); the preset does not own its own discriminator. `[INTENT; ADR-009 T4]`

## What it consumes (outside dependencies)
- **Notes & Pages** — a task's notes are a `pages` row (`entity_type='task'`); a bound **pomodoro session** is a `sessions` sub-type whose `attach_pomodoro`/`log_time` S4 effects feed the ledger (TK-5, G9). Read/written through the documented contracts, not tables. `[FACT: Notes contract; ADR-004 S1/S4]`
- **Shared tag system** — tagging via the shared **`entity_tags`** primitive (`entity_type='task'`, SP1/SP2), not inline `tasks.tags` (TK-8). `[INTENT G7; ADR-006 SP1/SP2]`
- **Measurability (ADR-011)** — the Task type exposes `measurement_kind` (natural `milestone`) + `binding_mode` (M1/M2) as its pursuable axes; progress derives (M3/M4). `[INTENT; ADR-011 M1/M2]`

## Fed by (parent-module links — read via integration points, §6)
- **Projects** → `project_id`, `milestone_id` · **Learning** → `course_id` (homework/class tasks) · **Relationships** → `contact_id` (follow-up tasks). `[FACT: ADR-002 L1466-1470; CLAUDE.md §3]`
- These modules create/own the parent entity; Tasks references it and surfaces the task in the aggregated view, reading their data via the **R7** read seam (provider fan-out — the seam the aggregated `views` ride via V4). Tasks never reads their tables directly (TK-9). `[INTENT R7; ADR-007 V4]`

## Consumed by
- **Notes journal `/summary`** → "completed today" reads `completed_at` (TK-6) + due-today via `due_date`/`scheduled_date`. `[FACT: Notes /summary; INTENT G5,G6]`
- **Gamification** → the completion fires the `award_xp` S4 effect (ADR-004 §3.2.2) via R2/R1, which ADR-012 generalizes → **`grant_currency(XP)`** (E2) → the Gamification-owned `consequence_ledger` (E3); Tasks never writes XP directly. `[INTENT G5; ADR-004 S4/R1; ADR-012 E2/E3]`

## Contract error cases
- `createTask`/`updateTask` with two parent FKs → typed `MultipleParentError` (TK-2). `[INTENT G2]`
- `stopTimer` on an already-closed log → idempotent no-op. `startTimer` while one runs → typed `TimerAlreadyRunningError`. `[INTERP TK-5]`
- `completeTask` on an obligation whose recurrence rule is invalid → completes + typed `RecurrenceRegenError` (flag, no silent stop, TK-7). `[INTENT G8]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
