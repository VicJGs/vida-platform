<!-- Forward spec — Tasks ① S1 · Per-Step Build Gate (§XXVI) · authored before implementation -->

# PLAN S1 — Foundation: CRUD, ≤1-parent guard, enums, DB-11 reconcile

> Slice-map S1. TAS-01,02,03,04,33,34,35,37,38. Closes with the blocking live-store Verification Gate.

## Operations (the S1 surface)

`createTasksService({ db, deviceId })` → `{ createTask, updateTask, softDeleteTask, getTask, listTasks }`.

## DB-11 reconcile (step 0 of S1 — `@vida/types/task.ts`)

- `Task`: **drop `tags: string[]`** (0 src consumers — verified; now `entity_tags`); **add** `scheduled_date: string | null`,
  `completed_at: Timestamp | null`, `kind: TaskKind`, `recurrence_rule: string | null`, `measurement_kind: MeasurementKind`,
  `binding_mode: BindingMode | null`, `nesting_weight: number | null`. (`project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id` already present.)
- `TaskTimeLog`: **add `updated_at: Timestamp`** (schema uses full `baseColumns`). Import `MeasurementKind`/`BindingMode` from `@vida/types`.
- Mirror-only (no `$inferSelect`↔interface assertion exists → compiles). Rebuild `@vida/types` dist before core typecheck.
- `validators/task.ts`: add `CreateTaskSchema`, `UpdateTaskSchema`, `ListTasksFilterSchema` (Status/Priority/Difficulty/Kind/Measurement/Binding enums + date/int fields).

## Operation flow + invariants

- **createTask(input)** — `CreateTaskSchema.parse`; **≤1-parent guard** (TAS-34/TK-2): at most one of
  `project_id`/`milestone_id`/`course_id`/`contact_id` non-null ⇒ else `MultipleParentError`. `parent_task_id` is the
  **sub-task** link (separate axis, NOT a parent-module FK) — not counted in the guard. **Backfill NN-defaults**
  (create() echoes input): `status:'not_started'`, `priority:'medium'`, `difficulty:'medium'` (schema `DEFAULT 'medium'` — the repo inserts every col so the SQL default never fires; the echo must carry what it would produce), `kind:'standard'`,
  `measurement_kind:'milestone'`, `binding_mode:null`, `sort_order:0`, `actual_minutes:null`, `completed_at:null`,
  `nesting_weight:null`, all dates/estimates `?? null`, `deleted_at:null`. Return `TaskRow`.
- **updateTask(id, patch)** — `UpdateTaskSchema.parse`; `findById` → `TaskNotFoundError`; re-run the ≤1-parent guard on the
  **merged** parent set (existing ⊕ patch); build the sparse `data` (only provided keys); no-op patch ⇒ return existing
  (skip the wasted `updated_at`/sync row). **S1 does NOT set `completed_at`/fire effects** — that is S3 (completeTask).
  A raw `status:'completed'` patch here is a plain column write (completion semantics live in S3).
- **softDeleteTask(id)** — `findById` → `TaskNotFoundError`; **app-layer cascade (no FK, TK-4):**
  (1) soft-delete direct sub-tasks (`parent_task_id = id`, single level — children have no children);
  (2) **hard-delete** the task's `task_time_logs` (ledger, no `deleted_at`) AND each deleted sub-task's time_logs;
  (3) soft-delete the task. Order: children + logs before the parent.
- **getTask(id)** — `findById` (applies `isNull(deleted_at)`); returns `TaskRow | null`.
- **listTasks(filter?)** — `findAll` (soft-delete filtered) + JS filter by `status`/`priority`/`parent_task_id`/
  `project_id`/`completion`/`due`. (findWhere skips the soft-delete filter — never use it for lists.)

## Repos

`tasksRepo = createRepository(db, tasks, { deviceId, softDelete: true, encryptedFields: [] })` ·
`timeLogsRepo = createRepository(db, taskTimeLogs, { deviceId, softDelete: false, encryptedFields: [] })` (hard-delete ledger).
`'task'` is pre-seeded in `ENTITY_TYPES` → no registry dep / no register() at S1.

## Typed errors (S1)

`TaskNotFoundError(id)` · `MultipleParentError(message)`. (`TimerAlreadyRunningError`/`RecurrenceRegenError` = S4/S5.)

## Verification Gate (blocking — live better-sqlite3 store, Node 24, migrate() applies 015)

1. create: minimal (title only) → NN-defaults backfilled (status/priority/kind/measurement_kind present, not undefined).
2. create: two parent FKs → `MultipleParentError`; one parent OK; standalone (none) OK; `parent_task_id` + a module FK OK (different axes).
3. update: patch status/priority; no-op patch returns existing unchanged (version not bumped); not-found → `TaskNotFoundError`; update that would set 2 parents → `MultipleParentError`.
4. softDelete: cascades — sub-tasks soft-deleted, parent+child time_logs hard-deleted, getTask→null, not-found→error.
5. list: filter by status/parent; soft-deleted excluded.
6. persistence probe: re-read via a fresh service over the same db → row present + decrypted (empty [E] pass-through).

## Out of scope (later slices)

completeTask/effects (S3) · rollup (S2) · timer (S4) · recurrence (S5) · aggregation (S7) · tags/notes/views (S8).
