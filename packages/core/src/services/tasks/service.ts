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
import ICAL from 'ical.js'
import type { EffectType } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import { normalize, rollup } from '../../foundation/measurement'
import { tasks, taskTimeLogs } from '../../db/schema/tasks'
import type { DrizzleDb } from '../../db/adapter'
import type { EffectHandler, EffectRegistry } from '../../foundation/effects'
import { SessionTypeNotFound, type SessionRegistry, type SessionTypeDef } from '../../foundation/sessions'
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
  TimerAlreadyRunningError,
  TimerNotFoundError,
  TimerNotWiredError,
  RecurrenceNotAllowedError,
  RecurrenceRegenError,
} from './types'
import type { TaskRow } from '../../db/schema/tasks'
import type { SessionRow } from '../../db/schema/foundation/sessions'

/** The `'work'` session sub-type — the task-timer timed-run reference (G-S1). Spine-only (no 1:1 extension; C4 keeps
 *  `task_time_logs` as the ledger). `effects: []` — the timer does NOT auto-fire on completion; tasks fires `log_time`
 *  itself on `stopTimer` (TAS-16 "tasks service (emit)"). Modeled on the shipped `focus` def. */
export const WORK_SESSION_TYPE: SessionTypeDef = {
  sub_type: 'work',
  owner_module: 'tasks',
  attachment_defaults: {},
  effects: [],
  lifecycle: {
    transitions: [
      { from: 'scheduled', to: 'in_progress', event: 'start' },
      { from: 'in_progress', to: 'completed', event: 'complete' },
    ],
    hooks: {},
  },
  permissions: { allowed_effects: [] },
  default_purpose: 'maintenance',
}

/** The tasks-owned `log_time` effect handler (XCU-23 — the single documented writer of `task_time_logs`; never a
 *  direct client write, G-S4). Co-writes through the rail tx (F1 §3B). `payload` carries the run's start/end. */
function createLogTimeHandler(db: DrizzleDb, deviceId: string): EffectHandler {
  const repo = createRepository(db, taskTimeLogs, { deviceId, softDelete: false, encryptedFields: [] })
  return async (event, tx) => {
    // `log_time` is a GLOBAL one-handler-per-type slot; this tasks handler also receives any OTHER producer's
    // `log_time` (e.g. a future focus/pomodoro auto-fire, TAS-17). Those are fired by the session lifecycle WITHOUT a
    // payload — writing then would create a bogus 0-minute row. Guard: act ONLY on a well-formed tasks-timer emission
    // (numeric start/end payload). A payload-less `log_time` is not ours → skip (g2 F1; also closes the unsafe cast).
    const p = event.payload as { started_at?: unknown; ended_at?: unknown } | undefined
    if (!p || typeof p.started_at !== 'number' || typeof p.ended_at !== 'number') return
    const duration = Math.max(0, Math.round((p.ended_at - p.started_at) / 60000))
    await repo.createInTx(tx, {
      task_id: event.targetRef,
      start_time: p.started_at,
      end_time: p.ended_at,
      duration_minutes: duration,
    })
  }
}

/** Composition wiring (NOT a service method, SS-5): register the `'work'` session sub-type (into the SESSION registry,
 *  persisted — guard re-registration) + the tasks `log_time` handler (into the EFFECT registry, in-memory). Call once
 *  at the composition root with the SAME registries `SessionsService` + `TasksService` are built against. */
export async function registerTasksTimer(deps: {
  sessionRegistry: SessionRegistry
  effectRegistry: EffectRegistry
  db: DrizzleDb
  deviceId: string
}): Promise<void> {
  try {
    await deps.sessionRegistry.get('work') // resolves shipped ∪ persisted; throws SessionTypeNotFound if absent
  } catch (err) {
    if (!(err instanceof SessionTypeNotFound)) throw err // g2 F3: only register on genuine absence, not a DB error
    await deps.sessionRegistry.register(WORK_SESSION_TYPE)
  }
  if (!deps.effectRegistry.resolve('log_time')) {
    deps.effectRegistry.register('log_time', createLogTimeHandler(deps.db, deps.deviceId))
  }
}

/** The four mutually-exclusive parent-module FKs (TK-2). `parent_task_id` is a separate (sub-task) axis. */
const PARENT_MODULE_KEYS = ['project_id', 'milestone_id', 'course_id', 'contact_id'] as const

/** Only an obligation may carry a recurrence rule (TK-7 / TAS-21). Enforced at EVERY write path (create/update/
 *  setRecurrence), like the ≤1-parent guard — no stray inert rule on a standard task. Clearing to null is always ok. */
function assertRecurrenceAllowed(kind: string | undefined, rule: string | null | undefined, taskId: string): void {
  if (rule != null && kind !== 'obligation') throw new RecurrenceNotAllowedError(taskId)
}

/** Next occurrence (YYYY-MM-DD) STRICTLY after `fromYmd`, from an RFC-5545 RRULE (ADR-002:1160), via the canonical
 *  `ical.js` parser (ADR-001:137). THREE channels (PLAN-S5 outcomes): a date ⇒ outcome 1 (spawn); `null` ⇒ outcome 2
 *  (valid rule, exhausted — legitimate end, no spawn); THROWS ⇒ outcome 3 (invalid rule — RecurrenceRegenError). The
 *  iterator yields DTSTART first, so we advance strictly past the anchor. */
function nextOccurrence(rule: string, fromYmd: string): string | null {
  const recur = ICAL.Recur.fromString(rule) // throws on an invalid rule → outcome 3
  const iter = recur.iterator(ICAL.Time.fromDateString(fromYmd))
  let occ: InstanceType<typeof ICAL.Time> | null = iter.next()
  while (occ) {
    // Build YYYY-MM-DD from the ICAL.Time's OWN calendar fields (month is 1-based) — NOT toJSDate()/toISOString(),
    // which renders local-midnight in UTC and drifts one day early in any UTC-positive zone (g2 B1: silently wrong on
    // Victor's BRT machine + UTC CI, which is exactly why the live gate can't see it).
    const ymd = `${occ.year}-${pad2(occ.month)}-${pad2(occ.day)}`
    if (ymd > fromYmd) return ymd
    occ = iter.next() // null when exhausted → outcome 2
  }
  return null
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Today as YYYY-MM-DD in LOCAL time (the anchor fallback for a null `due_date`; g2 N4 — local, not UTC). */
function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function createTasksService(deps: TasksServiceDeps): TasksService {
  const { db, deviceId, effects, sessions } = deps

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
    assertRecurrenceAllowed(v.kind, v.recurrence_rule, '(new task)') // N1 — recurrence_rule ⇒ obligation (TK-7)
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
    // N1 — recurrence_rule ⇒ obligation, on the MERGED kind/rule (a patch may change either).
    const mergedKind = (v.kind ?? existing.kind) as string
    const mergedRule = v.recurrence_rule !== undefined ? v.recurrence_rule : existing.recurrence_rule
    assertRecurrenceAllowed(mergedKind, mergedRule, id)

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
    // S5 — obligation regeneration (TAS-22): a FRESH completion of an obligation WITH a rule spawns the next
    // occurrence. The completion above is already durable (TAS-23 complete-but-flag); a regen failure throws AFTER.
    // NB: a reopen→re-complete is a fresh transition (wasCompleted=false) so it regenerates again — a known M1 edge
    // (BR-TK-S5-7); there is no spawn-dedup ledger. Standard tasks + ruleless obligations never regenerate.
    if (!wasCompleted && existing.kind === 'obligation' && existing.recurrence_rule != null) {
      await regenerateObligation(existing)
    }
    return updated
  }

  /** Spawn the next occurrence of a completed obligation (TAS-22). Outcome 1 ⇒ a new task; outcome 2 (exhausted) ⇒
   *  no-op; outcome 3 (invalid rule) ⇒ `RecurrenceRegenError` (the completion stands — TAS-23). */
  async function regenerateObligation(src: TaskRow): Promise<void> {
    const anchor = src.due_date ?? todayYmd()
    let next: string | null
    try {
      next = nextOccurrence(src.recurrence_rule!, anchor) // src is an obligation with a rule (caller-guarded)
    } catch {
      throw new RecurrenceRegenError(src.id, `unparseable recurrence rule: ${src.recurrence_rule}`)
    }
    if (next == null) return // outcome 2 — valid rule, no future instance: the recurrence legitimately ended
    // Outcome 1 — spawn a fresh occurrence (carry-over table, PLAN-S5 R2). createTask resets status/completed_at/
    // actual_minutes (NN-backfill) and re-checks the ≤1-parent + recurrence-allowed guards. parent_task_id is NOT
    // carried — recurrence is top-level only.
    await createTask({
      title: src.title,
      description: src.description,
      project_id: src.project_id,
      milestone_id: src.milestone_id,
      course_id: src.course_id,
      contact_id: src.contact_id,
      priority: src.priority,
      difficulty: src.difficulty,
      due_date: next,
      estimated_minutes: src.estimated_minutes,
      kind: 'obligation',
      recurrence_rule: src.recurrence_rule,
      measurement_kind: src.measurement_kind,
      binding_mode: src.binding_mode,
      nesting_weight: src.nesting_weight,
      sort_order: src.sort_order,
    })
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

  // ---- S5: obligations + recurrence ----------------------------------------
  /** Attach/clear an obligation's recurrence rule (TAS-21). Obligation-only (TK-7) — a non-obligation ⇒
   *  `RecurrenceNotAllowedError`; `null` clears it (the obligation then behaves standard). */
  async function setRecurrence(taskId: string, rule: string | null): Promise<TaskRow> {
    const existing = await tasksRepo.findById(taskId)
    if (!existing) throw new TaskNotFoundError(taskId)
    assertRecurrenceAllowed(existing.kind, rule, taskId)
    return tasksRepo.update(taskId, { recurrence_rule: rule })
  }

  // ---- S4: timer + log_time + actual_minutes -------------------------------
  // The timer is a `'work'` sessions sub-type referencing the task (G-S1); on stop, tasks fires `log_time` through the
  // rail (TAS-16 "tasks service (emit)"), and the tasks-owned handler writes the kept `task_time_logs` ledger
  // (G-S4 — never a direct write). `actual_minutes` derives via getActualMinutes (TAS-15). The `log_time` handler is
  // tasks' OWN (registerTasksTimer), so these methods assert the deps are wired (fail-loud, not S3-dormant).
  function assertTimerWired(): { sessions: NonNullable<typeof sessions>; effects: NonNullable<typeof effects> } {
    if (!sessions || !effects) throw new TimerNotWiredError()
    return { sessions, effects }
  }

  async function startTimer(taskId: string): Promise<SessionRow> {
    const t = assertTimerWired()
    if (!(await tasksRepo.findById(taskId))) throw new TaskNotFoundError(taskId)
    // Running-timer guard (TAS-12): the running state lives only in the open session (no running ledger row).
    if (await t.sessions.findOpenSessionForEntity('work', 'task', taskId)) {
      throw new TimerAlreadyRunningError(taskId)
    }
    const created = await t.sessions.createSession({
      sub_type: 'work',
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      started_at: Date.now(),
    })
    await t.sessions.attach(created.session.id, 'task', taskId, 'instance')
    return created.session
  }

  async function stopTimer(sessionId: string): Promise<void> {
    const t = assertTimerWired()
    const found = await t.sessions.getSession(sessionId)
    if (!found || found.session.sub_type !== 'work') throw new TimerNotFoundError(sessionId)
    if (found.session.status === 'completed') return // idempotent no-op
    // Resolve the attached task (a `'work'` timer is always task-attached via startTimer).
    const targets = await t.sessions.resolveTargets(sessionId)
    const taskTarget = targets.find((x) => x.entityType === 'task')
    if (!taskTarget) throw new TimerNotFoundError(sessionId)
    const startedAt = found.session.started_at ?? found.session.created_at
    const endedAt = Date.now()
    // FIRE-FIRST, COMMIT-LAST (lifecycle.ts discipline): write the ledger via the rail, THEN complete the session.
    // A throw/crash between leaves the session in_progress → a re-stopTimer retries; the rail dedups the written row.
    await t.effects.rail.applyEffect({
      subjectNaturalKey: sessionId,
      transition: 'time_logged',
      effectType: 'log_time',
      targetRef: taskTarget.entityId,
      payload: { started_at: startedAt, ended_at: endedAt },
    })
    await t.sessions.completeSession(sessionId) // 'work' declares effects:[] → fires nothing here
  }

  async function getActualMinutes(taskId: string): Promise<number> {
    const logs = await timeLogsRepo.findWhere(eq(taskTimeLogs.task_id, taskId))
    return logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)
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
    startTimer,
    stopTimer,
    getActualMinutes,
    setRecurrence,
  }
}
