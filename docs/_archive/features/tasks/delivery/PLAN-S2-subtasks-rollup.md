<!-- Forward spec — Tasks ① S2 · Per-Step Build Gate (§XXVI) · authored before implementation -->

# PLAN S2 — Sub-tasks + M4 rollup

> Slice-map S2. TAS-08,09,10,11. Composes `foundation/measurement` (normalize + rollup). Closes with the live-store Verification Gate.

## Operations (added to the S1 surface)

- `addSubtask(parentId, input): TaskRow`
- `getSubtasks(parentId): TaskRow[]`
- `getRollup(parentId): { done: number; total: number; progress: number | null }`

## Operation flow + invariants

- **addSubtask(parentId, input)** — `findById(parentId)` → `TaskNotFoundError`; **single-level guard (TK-3):** the
  parent must itself be top-level (`parent.parent_task_id == null`) else `SubtaskNestingError` (a child may not have
  children). Then delegate to the S1 create path with `parent_task_id = parentId` (so the ≤1-parent-module guard +
  NN-backfill still apply; `input` may carry its own module FK — a different axis). `input` = `CreateTaskInput` minus
  `parent_task_id` (set internally).
- **getSubtasks(parentId)** — direct children only: `findWhere(and(eq(parent_task_id, parentId), isNull(deleted_at)))`
  (findWhere skips the soft-delete filter → pass `isNull` explicitly). Ordered by `sort_order` then `created_at`.
- **getRollup(parentId)** — DERIVATION, **no stored column** (TK-11/M3):
  - `done` = children with `status === 'completed'`; `total` = child count.
  - `progress` = `rollup(children.map(c => ({ progress: leafProgress(c), weight: c.nesting_weight })))` where
    `leafProgress(c) = normalize({ kind: 'milestone', done: c.status === 'completed' })` (a task's only measurable
    signal in M1 is completion — binary; richer per-kind task measures are S6). `rollup` excludes null children,
    NULL/0 weight ⇒ equal-weight, **empty children ⇒ `progress: null`** (unmeasured, BR-2 — never 0).
  - **Completing a parent never force-completes children and vice-versa** — `getRollup` is a read-only display
    derivation; it writes nothing.

## Composition (no re-implementation)

`import { normalize, rollup } from '../../foundation/measurement'`. Do NOT hand-roll the weighted average.

## Types / validators

- `types.ts`: `AddSubtaskInput = Omit<CreateTaskInput, 'parent_task_id'>`; `TaskRollup = { done; total; progress }`;
  `SubtaskNestingError`. Extend `TasksService` with the 3 methods.
- `validators`: reuse `CreateTaskSchema` for the subtask body (parse then force `parent_task_id`).

## Verification Gate (blocking — live store, Node 24)

1. addSubtask under a top-level parent → child row with `parent_task_id=parentId`; getSubtasks returns it.
2. addSubtask under a parent that is itself a sub-task → `SubtaskNestingError`; under a missing parent → `TaskNotFoundError`.
3. addSubtask may still carry one module FK (a different axis); two module FKs → `MultipleParentError` (S1 guard still applies).
4. getRollup: 0 children → `{done:0,total:0,progress:null}`; 2 children 1 completed (equal weight) → `{done:1,total:2,progress:0.5}`.
5. getRollup weighted: children weights 3/1, the weight-3 completed → `progress: 0.75`; NULL weight ⇒ equal-weight.
6. completing the parent does not change children; completing a child does not change the parent (independence).
7. soft-deleted children excluded from getSubtasks + getRollup.

## Out of scope

completeTask/effects (S3) · per-kind task measure beyond milestone (S6) · timer (S4).
