<!-- CURRENT SPEC — tasks context · durable doc (§XXIX Currency Rule). Reflects what IS BUILT, not the full design. -->
<!-- Born: mod-tasks #65 · LIF-142 · S1 (2026-10-14). Updated per slice. -->

# Tasks — Current Spec

> **Context:** `@vida/core` tasks service tier (`packages/core/src/services/tasks/`). The OS-wide task primitive +
> its time ledger. Built PER SLICE (Entity Delivery Flow ①). **Pulled ahead of mod-routines** (routines drives
> task-type steps). Design authority: `docs/features/tasks/` + `docs/specs/foundation/backend-intent/parts/tasks.md`.

## Build status — slices
| Slice | State | Surface |
|-------|-------|---------|
| **S1 Foundation** | ✅ BUILT (2026-10-14) | CRUD · ≤1-parent guard · app-layer cascade · list filters · DB-11 reconcile |
| **S2 Sub-tasks + M4 rollup** | ✅ BUILT (2026-10-14) | `addSubtask` (single-level) · `getSubtasks` · `getRollup` derived-on-read |
| S3 Completion + effects | ⬜ designed | `completeTask`/`reopenTask` + S4 effect fan-out |
| S4 Timer + log_time | ⬜ designed | `startTimer`/`stopTimer`, `actual_minutes` |
| S5 Obligations + recurrence | ⬜ designed | `setRecurrence`, regenerate (the routines RT-4 seam) |
| S6 Measurability + contribution | ⬜ designed | axes + `contribute_purpose_metric` |
| S7 Aggregation | ⬜ designed | `getAggregatedTasks` R7 fan-out |
| S8 Tags + Notes + Views | ⬜ designed | `entity_tags` · pages · `views` |
| S9 Journal + DueProvider | ⬜ designed | `summary`/`getDueReminders` closer |

## Persistence (built floor — migration 015)
- `tasks` — 5 parent refs (`project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id`, plain TEXT no FK),
  `status`/`priority`/`difficulty` (CHECK enums), `due_date`/`scheduled_date`, `estimated_minutes`, `actual_minutes`
  (derived, S4), `completed_at` (S3), `kind`, `recurrence_rule`, `measurement_kind` (NN `milestone`), `binding_mode`
  (nullable), `nesting_weight`, `sort_order`, `deleted_at`. Soft-delete.
- `task_time_logs` — `task_id` (no FK), `start_time`/`end_time` (NULL=running), `duration_minutes`. **Ledger — no
  `deleted_at`** (hard-deletes with the task).

## S1 surface — `createTasksService(deps)`
- **Deps (S1):** `{ db, deviceId }`. (Grows per slice — `sessions`/`effects`/`spaces`/`notes`/`registry`/`providers` land later.)
- `createTask(input): TaskRow` — validates (Zod); **≤1 parent-module FK** or `MultipleParentError`; backfills every
  NN-default col (create() echoes input, not SQL defaults).
- `updateTask(id, patch): TaskRow` — `TaskNotFoundError` if absent; re-enforces ≤1-parent on the **merged** set;
  sparse write; no-op patch returns existing unchanged. **Plain column writer** — does NOT set `completed_at` or
  compute `actual_minutes` (S3/S4).
- `softDeleteTask(id)` — app-layer cascade: sub-tasks soft-deleted (single level), task + sub-task `task_time_logs`
  **hard-deleted**, children before parent.
- `getTask(id): TaskRow | null` — soft-delete filtered.
- `listTasks(filter?): TaskRow[]` — `findAll` (soft-delete filtered) + JS filter by status/priority/parent/project/
  completed/due_before. (Pagination is ② P6.)
- **Returns Drizzle `TaskRow`** (not `@vida/types.Task` — the interface is the mirror; `_sync_status` string≠union).

## S2 surface — sub-tasks + rollup
- `addSubtask(parentId, input): TaskRow` — `TaskNotFoundError` if parent absent; **single-level** (`SubtaskNestingError`
  if the parent is itself a sub-task, TK-3); delegates to `createTask` with `parent_task_id=parentId` (S1 guards apply).
- `getSubtasks(parentId): TaskRow[]` — direct children, soft-delete filtered, ordered `sort_order` then `created_at`.
- `getRollup(parentId): { done, total, progress }` — DERIVED (no stored column): `done`/`total` = completed/child
  counts; `progress` = ADR-011 M4 `rollup()` over each child's milestone-from-status leaf (`normalize`), weighted by
  `nesting_weight` (NULL ⇒ equal); **no children ⇒ `progress:null`** (unmeasured, never 0). Read-only — a parent's
  completion never force-completes children.

## DB-11 reconcile (shipped S1)
`@vida/types/task.ts`: `Task` dropped `tags`, gained `scheduled_date`/`completed_at`/`kind`/`recurrence_rule`/
`measurement_kind`/`binding_mode`/`nesting_weight`; `TaskTimeLog` gained `updated_at`. `validators/task.ts` gained
`CreateTaskSchema`/`UpdateTaskSchema`/`ListTasksFilterSchema`.

## Verification (S1)
tsc 0 · eslint clean · tasks suite **11/11** live-store (better-sqlite3, Node 24) · full `@vida/core` **1918/1918** · g2 SHIP · /critique SHIP.

## Deferred / downstream
Completion effects (S3) · rollup (S2) · timer (S4) · recurrence/obligations (S5) · aggregation R7 (S7) · tags/notes/
views (S8) · Journal/DueProvider (S9). `[E]` field encryption → M3/DB-5 (M1.0 empty-set pass-through). ② UI → P6.
