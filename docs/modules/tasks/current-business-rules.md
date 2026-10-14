<!-- CURRENT BUSINESS RULES — tasks context · durable doc (§XXIX). The invariants the CODE enforces today. -->
<!-- Born: mod-tasks #65 · S1 (2026-10-14). BR-TK-S<n>-<k>. Updated per slice. -->

# Tasks — Current Business Rules (enforced)

> The rules the shipped code **actually enforces**, traced to the feature invariants (TK-*) + backend-intent (TAS-*).
> Design-but-not-yet-built rules live in `docs/features/tasks/business-rules.md`, not here.

## S1 — Foundation (BUILT 2026-10-14)
- **BR-TK-S1-1 (≤1 parent module, TK-2/TAS-34).** A task sets at most one of `project_id`/`milestone_id`/`course_id`/
  `contact_id`; >1 ⇒ `MultipleParentError`, on create AND on the merged set at update. `parent_task_id` is a separate
  (sub-task) axis and is NOT counted. Enforced: `service.ts` `assertSingleParent` + `PARENT_MODULE_KEYS`.
- **BR-TK-S1-2 (NN-default backfill).** Because `Repository.create()` echoes the input row (not SQL defaults), every
  NOT-NULL-with-default column is backfilled in the create input: `status='not_started'`, `priority='medium'`,
  `difficulty='medium'`, `kind='standard'`, `measurement_kind='milestone'`, `sort_order=0`; nullable-no-default
  (`binding_mode`/`nesting_weight`/`completed_at`/`actual_minutes`) = `null`. The echoed row == the persisted row.
- **BR-TK-S1-3 (app-layer cascade, TK-4).** No FK ⇒ `softDeleteTask` cascades in code: direct sub-tasks (single level)
  soft-deleted; the task's AND each sub-task's `task_time_logs` **hard-deleted** (ledger, no `deleted_at`); children
  before parent. A missing id ⇒ `TaskNotFoundError`.
- **BR-TK-S1-4 (soft delete + hidden reads).** `tasks.deleted_at` hides a task from `getTask`/`listTasks`
  (`findAll`/`findById` apply `isNull(deleted_at)`; `findWhere` does not, so cascade queries pass an explicit
  `isNull`). The completions/time ledger is hard state, not soft.
- **BR-TK-S1-5 (S1 is a plain column writer).** `updateTask` never sets `completed_at`, never fires completion
  effects, never computes `actual_minutes` — completion semantics (TK-6) are S3, the time ledger (TK-5) is S4. A raw
  `status:'completed'` patch writes only the column. A no-op patch (no provided keys) returns the existing row
  without bumping `_sync_version`.
- **BR-TK-S1-6 (enum validation, TK-33).** `status`/`priority`/`difficulty`/`kind`/`measurement_kind`/`binding_mode`
  validated via Zod (`z.enum` over the `@vida/types` canonical tuples) at the service boundary; out-of-set rejected.
- **BR-TK-S1-7 (local-first / sync, TK-10).** Every create/update/delete succeeds locally and enqueues a
  co-transactional `sync_queue` row via the generic Repository; no bespoke sync.
- **BR-TK-S1-8 (M1.0 encryption seam).** `[E]` `title`/`description` pass through (`encryptedFields:[]`); real
  field encryption is M3/DB-5. The seam is present but dormant.

## Not yet enforced (designed, downstream)
TK-3 single-level sub-task nesting-at-create + M4 rollup (S2) · TK-6 completion effects (S3) · TK-5 timer/`log_time`/
`actual_minutes` (S4) · TK-7 obligation recurrence (S5) · TK-11 contribution emit (S6) · TK-9 aggregation R7 (S7) ·
TK-8 tags (S8).
