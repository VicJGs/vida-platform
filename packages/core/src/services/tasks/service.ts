// services/tasks — service (mod-tasks #65 · LIF-142 ①)
//
// createTasksService over the 2 DB-4 tables (tasks · task_time_logs).
// Built PER SLICE (Entity Delivery Flow); S1 = tasks CRUD + queries + the ≤1-parent guard + app-layer cascade.
//
// Patterns (precedent: services/projects):
// - factory → object literal; intra-service calls hoist to closures, NOT `this.`.
// - validating methods are async (reject, not sync throw).
// - Repository.create() RETURNS THE INPUT ROW (not DB defaults) → backfill NN-default cols in the create input
//   (status/priority/kind/measurement_kind/difficulty/sort_order) [[repository-create-returns-input-row]].
// - findWhere skips the soft-delete filter → list via findAll (which applies isNull(deleted_at)) + JS filter.
// - M1.0 encryptedFields:[] (the [E] title/description pass through; real field encryption = M3).
// - NO FK: parent-module links + cascade are the app layer's (TK-2/TK-4). `'task'` is pre-seeded in ENTITY_TYPES.

import { and, eq, isNull } from 'drizzle-orm'
import type { EffectType } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import { normalize, rollup } from '../../foundation/measurement'
import { tasks, taskTimeLogs } from '../../db/schema/tasks'
import { CreateTaskSchema, UpdateTaskSchema, ListTasksFilterSchema } from '../../validators/task'
import {
  type TasksService,
  type TasksServiceDeps,
  type CreateTaskInput,
  type UpdateTaskInput,
  type ListTasksFilter,
  type AddSubtaskInput,
  type TaskRollup,
  TaskNotFoundError,
  MultipleParentError,
  SubtaskNestingError,
} from './types'
import type { TaskRow } from '../../db/schema/tasks'

/** The four mutually-exclusive parent-module FKs (TK-2). `parent_task_id` is a separate (sub-task) axis. */
const PARENT_MODULE_KEYS = ['project_id', 'milestone_id', 'course_id', 'contact_id'] as const

export function createTasksService(deps: TasksServiceDeps): TasksService {
  const { db, deviceId, effects } = deps

  // S3 — completion fan-out catalogue (TAS-19). The KEYED/ADDITIVE subset is PUSHED through the rail; the two
  // PROJECTION effects are realized by their class, not a push (PLAN-S3 D-S3-1):
  //   • award_xp (additive) — Tasks IS an economy feeder (framework §4 L242; TAS-20), unlike Projects (C-E2).
  //   • contribute_purpose_metric (keyed, TAS-26) — dormant: no M7 purpose handler at M1 (guard C2).
  //   • emit_measurement_signal (keyed) — completion advances the measure (binding_mode='event-trigger', TAS-06).
  //   • surface_journal (projection) — NOT pushed; realized by the S9 pull registry (rail no-ops projections, BR-6).
  //   • surface_calendar (projection) — D1: a valid EffectType but Tasks does NOT emit it (calendar = read-seam).
  const COMPLETION_EFFECTS: readonly EffectType[] = [
    'award_xp',
    'contribute_purpose_metric',
    'emit_measurement_signal',
  ]
  // The projects completion-fan-out pattern (services/projects/service.ts:72). DORMANT without a wired rail/handler;
  // post-commit, failure-isolated — the completed task stands even if a handler throws. Rail-idempotent via
  // effect_event_id = derive(taskId‖transition‖type) (PLAN-S3 D-S3-2 — one task, one completion grant).
  async function fanOutCompletion(taskId: string, transition: string): Promise<void> {
    if (!effects) return // M1 default: no rail wired → dormant
    for (const effectType of COMPLETION_EFFECTS) {
      if (!effects.registry.resolve(effectType)) continue // dormant guard: no handler ⇒ skip (would throw NoEffectHandler)
      try {
        await effects.rail.applyEffect({ subjectNaturalKey: taskId, transition, effectType, targetRef: taskId })
      } catch {
        // post-commit, failure-isolated: the completed task stands; a handler throw is non-fatal.
      }
    }
  }

  // `tasks` has deleted_at → softDelete:true. `task_time_logs` is a ledger (no deleted_at) → hard delete.
  const tasksRepo = createRepository(db, tasks, { deviceId, softDelete: true, encryptedFields: [] })
  const timeLogsRepo = createRepository(db, taskTimeLogs, { deviceId, softDelete: false, encryptedFields: [] })

  /** Reject if more than one parent-module FK is non-null (TK-2 / TAS-34). */
  function assertSingleParent(row: Record<string, unknown>): void {
    const set = PARENT_MODULE_KEYS.filter((k) => row[k] != null)
    if (set.length > 1) {
      throw new MultipleParentError(
        `A task may set at most one parent module; got: ${set.join(', ')}`,
      )
    }
  }

  // ---- S1: tasks CRUD + queries --------------------------------------------
  async function createTask(input: CreateTaskInput): Promise<TaskRow> {
    const v = CreateTaskSchema.parse(input)
    assertSingleParent(v)
    // Backfill NN-default cols (create() echoes the input row, not SQL defaults).
    return tasksRepo.create({
      project_id: v.project_id ?? null,
      milestone_id: v.milestone_id ?? null,
      course_id: v.course_id ?? null,
      contact_id: v.contact_id ?? null,
      parent_task_id: v.parent_task_id ?? null,
      title: v.title,
      description: v.description ?? null,
      status: v.status ?? 'not_started',
      priority: v.priority ?? 'medium',
      difficulty: v.difficulty !== undefined ? v.difficulty : 'medium', // nullable w/ SQL default 'medium'
      due_date: v.due_date ?? null,
      scheduled_date: v.scheduled_date ?? null,
      estimated_minutes: v.estimated_minutes ?? null,
      actual_minutes: null, // derived via log_time (S4); never create-set
      completed_at: null, // set on completion (S3)
      kind: v.kind ?? 'standard',
      recurrence_rule: v.recurrence_rule ?? null, // obligations only (enforced S5)
      measurement_kind: v.measurement_kind ?? 'milestone',
      binding_mode: v.binding_mode ?? null, // NULL ⇒ derive-natural
      nesting_weight: v.nesting_weight ?? null, // NULL ⇒ equal-weight (M4)
      sort_order: v.sort_order ?? 0,
      deleted_at: null,
    } satisfies CreateInput<typeof tasks>)
  }

  async function updateTask(id: string, patch: UpdateTaskInput): Promise<TaskRow> {
    const v = UpdateTaskSchema.parse(patch)
    const existing = await tasksRepo.findById(id)
    if (!existing) throw new TaskNotFoundError(id)

    // Re-enforce ≤1-parent on the MERGED parent set (existing ⊕ patch; a patch may null one out).
    const merged = { ...(existing as Record<string, unknown>) }
    for (const k of PARENT_MODULE_KEYS) {
      if (v[k] !== undefined) merged[k] = v[k]
    }
    assertSingleParent(merged)

    const data = {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.project_id !== undefined ? { project_id: v.project_id ?? null } : {}),
      ...(v.milestone_id !== undefined ? { milestone_id: v.milestone_id ?? null } : {}),
      ...(v.course_id !== undefined ? { course_id: v.course_id ?? null } : {}),
      ...(v.contact_id !== undefined ? { contact_id: v.contact_id ?? null } : {}),
      ...(v.parent_task_id !== undefined ? { parent_task_id: v.parent_task_id ?? null } : {}),
      ...(v.status !== undefined ? { status: v.status } : {}),
      ...(v.priority !== undefined ? { priority: v.priority } : {}),
      ...(v.difficulty !== undefined ? { difficulty: v.difficulty } : {}),
      ...(v.due_date !== undefined ? { due_date: v.due_date ?? null } : {}),
      ...(v.scheduled_date !== undefined ? { scheduled_date: v.scheduled_date ?? null } : {}),
      ...(v.estimated_minutes !== undefined ? { estimated_minutes: v.estimated_minutes ?? null } : {}),
      ...(v.kind !== undefined ? { kind: v.kind } : {}),
      ...(v.recurrence_rule !== undefined ? { recurrence_rule: v.recurrence_rule ?? null } : {}),
      ...(v.measurement_kind !== undefined ? { measurement_kind: v.measurement_kind } : {}),
      ...(v.binding_mode !== undefined ? { binding_mode: v.binding_mode ?? null } : {}),
      ...(v.nesting_weight !== undefined ? { nesting_weight: v.nesting_weight ?? null } : {}),
      ...(v.sort_order !== undefined ? { sort_order: v.sort_order } : {}),
    }
    // No-op patch ⇒ skip the write (avoid a wasted updated_at bump + sync_queue row).
    // NOTE: S1 is a plain column writer — `actual_minutes` (S4) and `completed_at`/completion effects (S3) are NOT here.
    if (Object.keys(data).length === 0) return existing
    return tasksRepo.update(id, data)
  }

  async function softDeleteTask(id: string): Promise<void> {
    if (!(await tasksRepo.findById(id))) throw new TaskNotFoundError(id)
    // App-layer cascade (no FK, TK-4): direct sub-tasks (single level) + time_logs of the task AND its sub-tasks.
    const subtasks = await tasksRepo.findWhere(
      and(eq(tasks.parent_task_id, id), isNull(tasks.deleted_at))!,
    )
    for (const sub of subtasks) {
      await hardDeleteTimeLogs(sub.id)
      await tasksRepo.delete(sub.id) // soft delete
    }
    await hardDeleteTimeLogs(id)
    await tasksRepo.delete(id) // soft delete
  }

  /** Hard-delete a task's time_logs ledger (no deleted_at — TK-4 hard cascade). */
  async function hardDeleteTimeLogs(taskId: string): Promise<void> {
    const logs = await timeLogsRepo.findWhere(eq(taskTimeLogs.task_id, taskId))
    for (const log of logs) {
      await timeLogsRepo.hardDelete(log.id)
    }
  }

  async function getTask(id: string): Promise<TaskRow | null> {
    return tasksRepo.findById(id)
  }

  async function listTasks(filter?: ListTasksFilter): Promise<TaskRow[]> {
    const f = ListTasksFilterSchema.parse(filter)
    // findAll applies the soft-delete filter (findWhere does not) → filter in JS.
    const all = await tasksRepo.findAll()
    if (!f) return all
    return all.filter((t) => {
      if (f.status !== undefined && t.status !== f.status) return false
      if (f.priority !== undefined && t.priority !== f.priority) return false
      if (f.parent_task_id !== undefined && t.parent_task_id !== f.parent_task_id) return false
      if (f.project_id !== undefined && t.project_id !== f.project_id) return false
      if (f.completed !== undefined) {
        const isCompleted = t.status === 'completed'
        if (isCompleted !== f.completed) return false
      }
      if (f.due_before != null) {
        if (t.due_date == null || t.due_date > f.due_before) return false
      }
      return true
    })
  }

  // ---- S2: sub-tasks + M4 rollup -------------------------------------------
  async function addSubtask(parentId: string, input: AddSubtaskInput): Promise<TaskRow> {
    const parent = await tasksRepo.findById(parentId)
    if (!parent) throw new TaskNotFoundError(parentId)
    // Single-level nesting (TK-3): a sub-task may not have sub-tasks of its own.
    if (parent.parent_task_id != null) throw new SubtaskNestingError(parentId)
    // Delegate to the S1 create path — the ≤1-parent-module guard + NN-default backfill still apply.
    return createTask({ ...input, parent_task_id: parentId })
  }

  async function getSubtasks(parentId: string): Promise<TaskRow[]> {
    // findWhere skips the soft-delete filter → pass isNull(deleted_at) explicitly.
    const rows = await tasksRepo.findWhere(
      and(eq(tasks.parent_task_id, parentId), isNull(tasks.deleted_at))!,
    )
    return rows.sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
  }

  /** Sub-task rollup (TAS-10) — DERIVED on read (no stored progress, TK-11/M3). A task's measurable leaf signal in
   *  M1 is completion (binary milestone); richer per-kind task measures are S6. Completing a parent never
   *  force-completes children — this is a read-only display derivation. */
  async function getRollup(parentId: string): Promise<TaskRollup> {
    const children = await getSubtasks(parentId)
    const done = children.filter((c) => c.status === 'completed').length
    const progress = rollup(
      children.map((c) => ({
        progress: normalize({ kind: 'milestone', done: c.status === 'completed' }),
        weight: c.nesting_weight,
      })),
    )
    return { done, total: children.length, progress }
  }

  // ---- S3: completion + effect fan-out -------------------------------------
  // completeTask/reopenTask are `completed_at`'s SOLE writers (TK-6) — they write via the repo primitive, NOT the
  // service `updateTask` (whose UpdateTaskInput has no `completed_at` and whose BR-TK-S1-5 contract forbids it).
  async function completeTask(id: string): Promise<TaskRow> {
    const existing = await tasksRepo.findById(id)
    if (!existing) throw new TaskNotFoundError(id)
    const wasCompleted = existing.status === 'completed'
    const updated = await tasksRepo.update(id, { status: 'completed', completed_at: Date.now() })
    // Post-commit fan-out, only on the not-completed → completed transition (a plain re-complete skips it; PLAN-S3
    // D-S3-2 guard (a)). The rail dedup is the backstop on the reopen→re-complete path (guard (b)).
    if (!wasCompleted) await fanOutCompletion(id, 'task_completed')
    return updated
  }

  async function reopenTask(id: string): Promise<TaskRow> {
    const existing = await tasksRepo.findById(id)
    if (!existing) throw new TaskNotFoundError(id)
    // No-op guard: already non-completed with no timestamp ⇒ skip the write (avoid a wasted updated_at/sync bump).
    if (existing.status !== 'completed' && existing.completed_at == null) return existing
    // Reset to the neutral non-completed state (PLAN-S3 R3 — 'not_started' over 'in_progress': reopen conveys no
    // progress info; the user re-sets it). TAS-07 mandates only clearing completed_at. Fires NO effects.
    return tasksRepo.update(id, { status: 'not_started', completed_at: null })
  }

  return {
    createTask,
    updateTask,
    softDeleteTask,
    getTask,
    listTasks,
    addSubtask,
    getSubtasks,
    getRollup,
    completeTask,
    reopenTask,
  }
}
