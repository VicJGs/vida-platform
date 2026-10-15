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
| **S3 Completion + effects** | ✅ BUILT (2026-10-14) | `completeTask`/`reopenTask` + deny-safe completion effect fan-out |
| **S4 Timer + log_time** | ✅ BUILT (2026-10-15) | `startTimer`/`stopTimer`/`getActualMinutes` over a `'work'` session sub-type; `log_time` → kept ledger |
| **S5 Obligations + recurrence** | ✅ BUILT (2026-10-15) | `setRecurrence` (obligation-only) + `completeTask` regen hook; RRULE via `ical.js` |
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
- **Deps (as of S3):** `{ db, deviceId, effects? }` where `effects?: { rail: EffectRail; registry: EffectRegistry }`
  (deny-safe, S3). (Still grows — `sessions`/`spaces`/`notes`/`registry`/`providers` land later.)
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

## S3 surface — completion + effect fan-out
- `completeTask(id): TaskRow` — `TaskNotFoundError` if absent. Sets `status='completed'` + `completed_at=Date.now()`
  via **`tasksRepo.update`** (the repo primitive — `updateTask` cannot write `completed_at`, BR-TK-S1-5). On the
  not-completed→completed transition, **post-commit**, fans out the completion catalogue (below). Sole writer of
  `completed_at` (TK-6).
- `reopenTask(id): TaskRow` — `TaskNotFoundError` if absent. Resets `status='not_started'` + `completed_at=null`;
  **no-op guard** (already non-completed with `completed_at==null` ⇒ returns existing, no write); fires **no** effects.
- **Completion catalogue** = `[award_xp, contribute_purpose_metric, emit_measurement_signal]` — the keyed/additive
  subset, pushed through the rail. The two **projection** effects are realized by their class, not a push:
  `surface_journal` ⇒ S9 pull registry; `surface_calendar` ⇒ read-seam (D1). `award_xp` is legitimate because Tasks
  **is** a framework §4 economy feeder (unlike Projects/Books/Education, C-E2).
- **Deny-safe + dormant:** no `effects` dep ⇒ no-op; dep present but handler unregistered ⇒ skipped (no
  `NoEffectHandler`); handler throws ⇒ swallowed, the completed task stands (post-commit, failure-isolated). Rail
  dedups via `effect_event_id = derive(taskId‖'task_completed'‖type)` — complete→reopen→re-complete grants once ever.

## S4 surface — timer + log_time + actual_minutes (the decided model: G-S1/G-S4/C4)
- **Deps (as of S4):** `+ sessions?: SessionsService` (required for the timer — the timer composes it) and `effects?`
  (S3's optional rail; the timer **asserts both are wired** → `TimerNotWiredError`, fail-loud, not S3-dormant).
- `registerTasksTimer({ sessionRegistry, effectRegistry, db, deviceId })` — **composition wiring** (not a service
  method, SS-5): registers the `'work'` `SessionTypeDef` (`effects:[]`, spine-only; into the SESSION registry,
  persisted, guarded by `SessionTypeNotFound`) + the tasks `log_time` **handler** (into the EFFECT registry, in-memory).
- `startTimer(taskId): SessionRow` — `TaskNotFoundError` if absent; `TimerAlreadyRunningError` if an open `'work'`
  session is attached (via `sessions.findOpenSessionForEntity`); else opens a `'work'` session (`in_progress`) + attaches
  the task. The timer is a **sessions sub-type referencing the task** (G-S1) — no bespoke task timer, no running ledger row.
- `stopTimer(sessionId): void` — `TimerNotFoundError` if missing/non-`work`; already-completed ⇒ idempotent no-op; else
  **fire-first, commit-last**: fire `log_time` through the rail (`payload:{started_at,ended_at}`, `targetRef`=the
  attached task) → the tasks handler writes ONE `task_time_logs` row → then `completeSession`. A crash between leaves the
  session `in_progress` (recoverable; rail dedups the written row).
- `getActualMinutes(taskId): number` — SUM of the task's `task_time_logs.duration_minutes` (TAS-15, derived; opt-out
  deferred — no sanctioned column).
- **G-S4 — never a direct write:** the ONLY writer of `task_time_logs` is the rail-invoked `log_time` handler (XCU-23).
- **Sessions addition (read-only):** `SessionsService.findOpenSessionForEntity(subType, entityType, entityId)` — the one
  substrate touch (the `fireCompletionEffects`-payload edit was rejected for write-side blast radius).

## S5 surface — obligations + recurrence (TAS-21/22/23; the routines RT-4 seam)
- `setRecurrence(taskId, rule): TaskRow` — obligation-only (`RecurrenceNotAllowedError` on a non-obligation, TK-7);
  `null` clears it (the obligation then behaves standard). The `recurrence_rule ⇒ kind='obligation'` invariant is
  enforced at **every** write path (create/update/setRecurrence).
- `completeTask` **regen hook (extends S3):** a fresh completion of an obligation WITH a rule computes the next
  occurrence (`nextOccurrence`, below) and spawns one. **Three outcomes:** (1) next instance → spawn a fresh
  `not_started` occurrence (exhaustive carry-over; `parent_task_id` dropped — top-level only; `completed_at`/
  `actual_minutes`/`scheduled_date` reset); (2) valid rule, **exhausted** (`COUNT`/`UNTIL`) → complete, no spawn, no
  error; (3) **invalid** rule → complete + `RecurrenceRegenError` (the task IS completed — complete-but-flag, TAS-23;
  do not retry). Completion commits BEFORE regen (durable).
- **`nextOccurrence(rule, fromYmd)`** — RFC-5545 RRULE (ADR-002:1160) via the **canonical `ical.js`** (ADR-001:137;
  `@vida/core` dep, verified v2.2.1). Anchors a DTSTART at the current `due_date` (null ⇒ local today), iterates past
  the anchor, returns the next `YYYY-MM-DD`. **Built from `ICAL.Time`'s own calendar fields, NOT `toJSDate()/UTC`** —
  the latter drifts one day early in UTC-positive zones (g2 B1; a `TZ=Asia/Tokyo` test guards it).

## DB-11 reconcile (shipped S1)
`@vida/types/task.ts`: `Task` dropped `tags`, gained `scheduled_date`/`completed_at`/`kind`/`recurrence_rule`/
`measurement_kind`/`binding_mode`/`nesting_weight`; `TaskTimeLog` gained `updated_at`. `validators/task.ts` gained
`CreateTaskSchema`/`UpdateTaskSchema`/`ListTasksFilterSchema`.

## Verification (through S5)
tsc 0 · eslint clean · tasks suite **54/54** + sessions **41/41** live-store (better-sqlite3, Node 24; incl. a
`TZ=Asia/Tokyo` recurrence regression) · full `@vida/core` **1962/1962** · g2 SHIP (S5: B1 timezone-drift fixed +
proven; S4 F1/F3 fixed) · /critique SHIP. New dep: `ical.js@2.2.1` (ADR-001-canonical RRULE parser).

## Deferred / downstream
Measurability axes + contribution (S6) · aggregation R7 (S7) · tags/notes/views (S8) · Journal/DueProvider (S9). The
S3 completion catalogue's **handlers** are registered by consumer modules later (M1 = dormant seam). **S4 deferrals:**
`work_session` extension table (P2 schema-reconcile), `setTimeTrackingEnabled` (no column), `attach_pomodoro` (TAS-17).
**S5 deferrals:** TAS-24 `duty`/open-vocab type registry (ADR-002 amendment); reopen→re-complete spawn-dedup
(BR-TK-S5-7 M1 edge). `[E]` field encryption → M3/DB-5. ② UI → P6.
