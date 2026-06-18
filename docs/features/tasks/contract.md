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
  - `startTimer(taskId)` / `stopTimer(logId)` → writes a log, recomputes `actual_minutes` (TK-5)
  - `setTimeTrackingEnabled(taskId, bool)` (per-task opt-out, G4)
- **Obligations** (⚠ INTENDED): `setRecurrence(taskId, rule)` · completion auto-spawns next occurrence (TK-7)
- **Views** (⚠ INTENDED, G1): `saveView(config)` · `listViews()` · `reorderViews()` · `pinView(id)` — config = {layout, grouping, filter, sort, fields, style}

## What it consumes (outside dependencies)
- **Notes & Pages** — a task's notes are a `pages` row (`entity_type='task'`); a **pomodoro session** bound to the task writes a `task_time_log` (TK-5, G9). Read/written through the Notes contract, not its tables. `[FACT: Notes contract; §5.2 pomodoro]`
- **Shared tag system** — tagging via `tags`/`page_tags` (TK-8). `[INTENT G7]`

## Fed by (parent-module links — read via integration points, §6)
- **Projects** → `project_id`, `milestone_id` · **Learning** → `course_id` (homework/class tasks) · **Relationships** → `contact_id` (follow-up tasks). `[FACT: ADR-002 L1466-1470; CLAUDE.md §3]`
- These modules create/own the parent entity; Tasks references it and surfaces the task in the aggregated view. Tasks never reads their tables directly (TK-9).

## Consumed by
- **Notes journal `/summary`** → "completed today" reads `completed_at` (TK-6) + due-today via `due_date`/`scheduled_date`. `[FACT: Notes /summary; INTENT G5,G6]`
- **Gamification** → completion events (XP/streaks) keyed on `completed_at`. `[INTENT G5]`

## Contract error cases
- `createTask`/`updateTask` with two parent FKs → typed `MultipleParentError` (TK-2). `[INTENT G2]`
- `stopTimer` on an already-closed log → idempotent no-op. `startTimer` while one runs → typed `TimerAlreadyRunningError`. `[INTERP TK-5]`
- `completeTask` on an obligation whose recurrence rule is invalid → completes + typed `RecurrenceRegenError` (flag, no silent stop, TK-7). `[INTENT G8]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
