// ============================================================================
// services/routines — the service (mod-routines #64 ①)
//
// S1 (routine definition CRUD + @vida/types DB-11 reconcile) over the shipped DB-4
// reframe schema (migration 018: routines · routine_step · routine_completions).
// Factory-object, hoisted closures, no `this.` (the habits/finance/checkins precedent).
// Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through ([E] on name/
// description → M3/DB-5). routines → softDelete:true (RT-17 preserves the ledger).
//
// create() ECHOES the input row (not a DB re-read), so serializeRoutine backfills every
// notNull-default column (lifecycle 'active', measurement_kind 'rate', sort_order 0) +
// coalesces nullables → the returned row is FAITHFUL (repository-create-returns-input-row
// seam). No cached streak/progress counter — `progress` is a nullable override slot
// (RT-14/RT-19); routine-level done/streak DERIVES on read from the ledger (S5).
// ============================================================================

import { and, eq, inArray, isNull, type SQL } from 'drizzle-orm'
import ICAL from 'ical.js'
import type { Routine, RoutineStep, RoutineCompletion } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  routines,
  routineStep,
  routineCompletions,
  type RoutineRow,
  type RoutineStepRow,
  type RoutineCompletionRow,
} from '../../db/schema/routines'
import {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  AddStepSchema,
  UpdateStepSchema,
  CompleteStepSchema,
  SkipStepSchema,
  EditRoutineCompletionSchema,
  PlanSkipDatesSchema,
  RunStepSchema,
  EvaluateRoutineSchema,
  SetRoutineLifecycleSchema,
  RoutineCalendarDateSchema,
} from '../../validators/routine'
import { UnknownEntityType } from '../../foundation/spaces/types'
import { utcDay, TaskNotFoundError, RecurrenceRegenError } from '../tasks'
import type { Session } from '../sessions'
import type { HabitsService } from '../habits'
import type { FocusSessionRow } from '../../db/schema/foundation/session-extensions'
import {
  RoutineNotFoundError,
  StepNotFoundError,
  CompletionNotFoundError,
  InvalidRecurrenceRuleError,
  EntityUnavailableError,
  InvalidRoutinePolicyError,
  type RoutineEvaluation,
  type RoutinePolicy,
  type RoutineStepRef,
  type StepRunState,
  type StepTarget,
  type RoutinesService,
  type RoutinesServiceDeps,
  type CreateRoutineInput,
  type UpdateRoutineInput,
  type AddStepInput,
  type UpdateStepInput,
} from './types'

// Defensive JSON read (the checkins/habits parseJson boundary): the service is the only writer, but a future
// sync row / manual DB edit could carry malformed JSON — degrade to null, never throw an opaque SyntaxError.
function parseJsonArray<T>(value: string | null): T[] | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as T[]
  } catch {
    return null
  }
}

// Sequence order for steps: step_order, then created_at, then id (S2c; shared by liveSteps and the S4 as-of set).
const bySequence = (a: RoutineStepRow, b: RoutineStepRow): number =>
  a.step_order - b.step_order || a.created_at - b.created_at || byCodepoint(a.id, b.id)

// Deterministic, platform-independent tie-break (the tasks precedent, services/tasks/service.ts:237 — private there).
const byCodepoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

// S2c (B3) — a usable RFC-5545 RRULE. Verified against ical.js 2.2.1: invalid part VALUES throw, but a missing FREQ
// parses silently with `freq = null` ('', 'NOT A RULE', 'BYDAY=MO', 'RRULE:FREQ=DAILY'), and a later iterator throws.
// So both legs are checked. INTERVAL<=0 is coerced to 1 by the parser (accepted).
function assertValidRrule(rule: string): void {
  let freq: string | null = null
  try {
    freq = ICAL.Recur.fromString(rule).freq ?? null
  } catch {
    throw new InvalidRecurrenceRuleError(rule)
  }
  if (freq == null) throw new InvalidRecurrenceRuleError(rule)
}

// Habits throws an UNTYPED Error when a habit is missing/deleted (services/habits/service.ts loadHabitOrThrow). One matcher, used by
// the S3 drive and the S4 reflection, so a future typed HabitNotFoundError changes one place.
const isHabitNotFound = (e: unknown): boolean => e instanceof Error && e.message.startsWith('Habit not found')

// S3 — `Session.extension` is a non-discriminated FocusSessionRow | StudySessionRow | null; narrow on the spine's sub_type.
const hasFocusExtension = (s: Session): s is Session & { extension: FocusSessionRow } =>
  s.session.sub_type === 'focus' && s.extension != null

// --- Row → @vida/types interface (DB-11; _sync_status string → union cast) ---
const toRoutine = (r: RoutineRow): Routine => ({
  ...r,
  _sync_status: r._sync_status as Routine['_sync_status'],
})
const toRoutineStep = (r: RoutineStepRow): RoutineStep => ({
  ...r,
  skip_dates: parseJsonArray<string>(r.skip_dates), // JSON TEXT → string[] | null (IR-6)
  _sync_status: r._sync_status as RoutineStep['_sync_status'],
})
const toRoutineCompletion = (r: RoutineCompletionRow): RoutineCompletion => ({
  ...r,
  _sync_status: r._sync_status as RoutineCompletion['_sync_status'],
})

export function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService {
  const { db, deviceId, registry, tasks, sessions, habits, prefs } = deps
  const clock = deps.clock ?? (() => utcDay(Date.now())) // YYYY-MM-DD — the platform UTC-day convention (tasks' public utcDay)
  const cfg = { deviceId, encryptedFields: [] as string[] } // M1.0: [E] fields dormant (→ M3/DB-5)

  const routinesRepo = createRepository(db, routines, { ...cfg, softDelete: true })
  const stepsRepo = createRepository(db, routineStep, { ...cfg, softDelete: true })
  const completionsRepo = createRepository(db, routineCompletions, { ...cfg, softDelete: false }) // ledger — hard delete

  const loadRoutineOrThrow = async (routineId: string): Promise<RoutineRow> => {
    const r = await routinesRepo.findById(routineId) // excludes soft-deleted
    if (!r) throw new RoutineNotFoundError(routineId) // fail-loud — no orphan step (no FK guards this, IR-3)
    return r
  }

  const loadStepOrThrow = async (stepId: string): Promise<RoutineStepRow> => {
    const s = await stepsRepo.findById(stepId) // excludes soft-deleted
    if (!s) throw new StepNotFoundError(stepId) // fail-loud — no orphan completion (no FK guards this, IR-3)
    return s
  }

  // S2c (A10, R2) — a non-null entity_type must be registered (sessions precedent, services/sessions/service.ts:393).
  const assertEntityType = (entityType: string | null | undefined): void => {
    if (entityType != null && !registry.isRegistered(entityType)) throw new UnknownEntityType(entityType)
  }

  // Live steps of a routine (rule 7: findWhere skips the soft-delete filter, so filter explicitly), in sequence order:
  // step_order, then created_at, then id (the tasks 3-key precedent).
  const liveSteps = async (routineId: string): Promise<RoutineStepRow[]> => {
    const rows = await stepsRepo.findWhere(
      and(eq(routineStep.routine_id, routineId), isNull(routineStep.deleted_at)) as SQL,
    )
    return rows.sort(bySequence)
  }

  const findCompletion = async (stepId: string, date: string): Promise<RoutineCompletionRow | undefined> => {
    const rows = await completionsRepo.findWhere(
      and(eq(routineCompletions.routine_step_id, stepId), eq(routineCompletions.completed_date, date)) as SQL,
    )
    return rows[0]
  }

  // Shared complete/skip path — UPSERT per (step,date) (RT-18 UNIQUE); the step must exist (fail-loud).
  const upsertCompletion = async (
    stepId: string,
    date: string,
    fields: { skipped: boolean; skip_reason: string | null; actual_duration_minutes: number | null },
  ): Promise<RoutineCompletion> => {
    await loadStepOrThrow(stepId)
    const existing = await findCompletion(stepId, date)
    const row = existing
      ? await completionsRepo.update(existing.id, {
          skipped: fields.skipped,
          skip_reason: fields.skip_reason,
          actual_duration_minutes: fields.actual_duration_minutes,
          completed_at: Date.now(),
        })
      : await completionsRepo.create({
          routine_step_id: stepId,
          completed_date: date,
          completed_at: Date.now(),
          skipped: fields.skipped,
          skip_reason: fields.skip_reason,
          actual_duration_minutes: fields.actual_duration_minutes,
        })
    return toRoutineCompletion(row)
  }

  // --- S1 serialize (faithful echo — backfill every notNull-default column) ---
  const serializeRoutine = (p: CreateRoutineInput): CreateInput<typeof routines> => ({
    name: p.name,
    description: p.description ?? null,
    recurrence_rule: p.recurrence_rule ?? null,
    lifecycle: p.lifecycle ?? 'active', // NN DEFAULT 'active'
    measurement_kind: p.measurement_kind ?? 'rate', // NN DEFAULT 'rate' (RT-19 natural)
    binding_mode: p.binding_mode ?? null, // nullable (null ⇒ derive derived-pull) — do not drop
    progress: p.progress ?? null, // nullable override slot (RT-14)
    sort_order: p.sort_order ?? 0,
    deleted_at: null,
  })

  const serializeRoutineUpdate = (p: UpdateRoutineInput): UpdateInput<typeof routines> => ({ ...p })

  // --- S2 serialize (step; faithful echo + skip_dates JSON) ---
  const serializeStep = (routineId: string, p: AddStepInput): CreateInput<typeof routineStep> => ({
    routine_id: routineId,
    step_order: p.step_order ?? 0, // addStep always supplies it (max+1 append, S2c A11); the fallback only types the input
    step_type: p.step_type ?? null, // OPEN vocab — no enum validation (RT-3)
    entity_type: p.entity_type ?? null, // nullable driven ref (RT-4)
    entity_id: p.entity_id ?? null,
    is_required: p.is_required ?? false,
    title: p.title,
    description: p.description ?? null,
    time_of_day: p.time_of_day ?? null,
    skip_dates: p.skip_dates == null ? null : JSON.stringify(p.skip_dates), // IR-6 — plain TEXT, service-serialized
    deleted_at: null,
  })
  // patch: only the keys the caller sent (never null-blanks an unpassed field); skip_dates re-serialized if present.
  const serializeStepUpdate = (p: UpdateStepInput): UpdateInput<typeof routineStep> => {
    const { skip_dates, ...rest } = p
    const out: UpdateInput<typeof routineStep> = { ...rest }
    if ('skip_dates' in p) out.skip_dates = skip_dates == null ? null : JSON.stringify(skip_dates)
    return out
  }

  // ── S3 — run/drive (PLAN-S3-run-drive.md) ───────────────────────────
  // Target precedence (first match wins): focus step_type → task/habit ref → actionable (no ref, no type) → unavailable.
  type Resolved = { target: 'focus' | 'actionable' } | { target: 'task' | 'habit'; entityId: string } | null
  const resolveTarget = (step: RoutineStepRow): Resolved => {
    if (step.step_type === 'focus') return { target: 'focus' } // a step entity ref is ignored for focus in M1 (R2)
    if (step.entity_type === 'task' && step.entity_id != null) return { target: 'task', entityId: step.entity_id }
    if (step.entity_type === 'habit' && step.entity_id != null) return { target: 'habit', entityId: step.entity_id }
    if (step.entity_type == null && step.step_type == null) return { target: 'actionable' }
    return null // workout/other session sub-types, a type without a ref, an undrivable registered type (rule 15, R5)
  }

  const findDone = async (stepId: string, date: string): Promise<RoutineCompletionRow | undefined> => {
    const row = await findCompletion(stepId, date)
    return row && !row.skipped ? row : undefined
  }

  // N7 — the stamp runs only AFTER a successful drive (the routine's own occurrence row; never the entity's effects).
  // It writes the ledger directly (the step was loaded before the drive), so a step deleted mid-drive can't surface as
  // StepNotFoundError AFTER the entity was driven (BR-RT-S3-4: that error only ever precedes a drive).
  const stamp = async (stepId: string, date: string, minutes: number | null): Promise<RoutineCompletion> => {
    const existing = await findCompletion(stepId, date)
    const reRun = existing != null && !existing.skipped // re-stamping an already-done occurrence keeps its record
    const row = existing
      ? await completionsRepo.update(existing.id, {
          skipped: false,
          skip_reason: null,
          actual_duration_minutes: minutes ?? (reRun ? existing.actual_duration_minutes : null),
          completed_at: reRun ? existing.completed_at : Date.now(),
        })
      : await completionsRepo.create({
          routine_step_id: stepId,
          completed_date: date,
          completed_at: Date.now(),
          skipped: false,
          skip_reason: null,
          actual_duration_minutes: minutes,
        })
    return toRoutineCompletion(row)
  }

  // Best-effort side effect after a durable write: it must never turn a persisted success into a thrown failure.
  const bestEffort = async (fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn()
    } catch {
      /* the drive + stamp already persisted; a retry/next run re-settles */
    }
  }

  const state = (step: RoutineStepRow, date: string, target: StepTarget, extra: Partial<StepRunState>): StepRunState => ({
    step_id: step.id,
    date,
    target,
    status: 'done',
    completion: null,
    ...extra,
  })

  const driveTask = async (
    step: RoutineStepRow,
    taskId: string,
    date: string,
    minutes: number | null,
  ): Promise<StepRunState> => {
    const task = await tasks.getTask(taskId)
    if (!task) throw new EntityUnavailableError(step.id, `task ${taskId} is missing or deleted`)
    // The platform TERMINAL convention {completed, cancelled} (services/tasks/service.ts:185-188): a cancelled task was
    // abandoned, so it is never force-completed; an already-completed task is REFLECTED (no completeTask call, which would
    // rewrite its completed_at). Open or on_hold tasks are driven (a reopened task is re-driven, RT-3).
    if (task.status === 'cancelled') throw new EntityUnavailableError(step.id, `task ${taskId} is cancelled`)
    if (task.status === 'completed') {
      return state(step, date, 'task', { completion: await stamp(step.id, date, minutes) })
    }
    let flag: StepRunState['flag']
    try {
      await tasks.completeTask(taskId) // re-drive is effect-idempotent (fan-out only on a fresh transition, rule 17)
    } catch (e) {
      if (e instanceof TaskNotFoundError) throw new EntityUnavailableError(step.id, `task ${taskId} is missing or deleted`)
      if (!(e instanceof RecurrenceRegenError)) throw e
      flag = 'recurrence_regen_failed' // TAS-23: the completion is durable; only the next occurrence failed
    }
    const completion = await stamp(step.id, date, minutes)
    return state(step, date, 'task', { completion, ...(flag ? { flag } : {}) })
  }

  const driveHabit = async (
    step: RoutineStepRow,
    habitId: string,
    date: string,
    minutes: number | null,
  ): Promise<StepRunState> => {
    if (!habits) throw new EntityUnavailableError(step.id, 'the habits service is not wired')
    const habit = await habits.getHabit(habitId)
    if (!habit) throw new EntityUnavailableError(step.id, `habit ${habitId} is missing or deleted`)
    let c: Awaited<ReturnType<HabitsService['logCompletion']>>
    try {
      c = await habits.logCompletion(habitId, { date }) // one native tick (BackfillWindowError propagates, no stamp)
    } catch (e) {
      // habits throws an untyped Error when the habit vanished between getHabit and the write (the race tasks maps too)
      if (isHabitNotFound(e)) {
        throw new EntityUnavailableError(step.id, `habit ${habitId} is missing or deleted`)
      }
      throw e
    }
    if (c.count < habit.target_count) {
      // HB-5: not done. The step REFLECTS the habit (RT-3), so a stale done stamp for this occurrence is removed.
      const stale = await findDone(step.id, date)
      if (stale) await completionsRepo.delete(stale.id)
      return state(step, date, 'habit', { status: 'advanced' })
    }
    const completion = await stamp(step.id, date, minutes)
    return state(step, date, 'habit', { completion })
  }

  // The routine_step attachment of a session, or null. Re-entry rides findOpenSessionForEntity (spine in_progress only).
  const attachedFocus = async (stepId: string): Promise<(Session & { extension: FocusSessionRow }) | null> => {
    const spine = await sessions.findOpenSessionForEntity('focus', 'routine_step', stepId)
    if (!spine) return null
    const s = await sessions.getSession(spine.id)
    return s && hasFocusExtension(s) ? s : null
  }

  // N9 workaround: completeFocus leaves the spine in_progress, so drop the step's attachment once the focus is finished.
  // attach() is idempotent and returns the existing row; detach() hard-deletes it. (Spine close = sessions-rescope #62.)
  const detachFocus = async (sessionId: string, stepId: string): Promise<void> => {
    const att = await sessions.attach(sessionId, 'routine_step', stepId, 'instance')
    await sessions.detach(att.id)
  }

  const focusMinutes = (f: FocusSessionRow): number => Math.round((f.duration_seconds ?? 0) / 60)

  // A completed focus is stamped only for the day it completed (the stamp-retry path); a cancel is never a done.
  const settleFinishedFocus = async (
    step: RoutineStepRow,
    date: string,
    s: Session & { extension: FocusSessionRow },
  ): Promise<StepRunState | null> => {
    const f = s.extension
    if (f.status === 'completed' && utcDay(f.updated_at) === date) {
      const completion = await stamp(step.id, date, focusMinutes(f))
      await bestEffort(() => detachFocus(s.session.id, step.id))
      return state(step, date, 'focus', { completion, session_id: s.session.id, focus_id: f.id })
    }
    await detachFocus(s.session.id, step.id) // cancelled, or completed on another day → not this occurrence (pre-write)
    return null
  }

  const isRunning = (f: FocusSessionRow): boolean => f.status === 'running' || f.status === 'paused'

  // A running focus belongs to the occurrence of the UTC day it STARTED (completing it stamps that day, so a session that
  // crosses UTC midnight — 21:00 in Brasília — keeps its work). It is abandoned only when it started before YESTERDAY,
  // judged against now, never against a caller-supplied date. An abandoned focus is cancelled, then detached; if the
  // cancel fails nothing is detached (no orphan running focus that re-entry can't find) and the error propagates.
  const focusDay = (s: Session & { extension: FocusSessionRow }): string =>
    utcDay(s.session.started_at ?? s.extension.created_at)
  const dropIfAbandoned = async (s: Session & { extension: FocusSessionRow }, stepId: string): Promise<boolean> => {
    const yesterday = utcDay(Date.now() - 86_400_000)
    if (focusDay(s) >= yesterday) return false
    await sessions.cancelFocus(s.extension.id) // pre-write: nothing has been stamped yet
    await detachFocus(s.session.id, stepId)
    return true
  }

  const runFocus = async (step: RoutineStepRow, date: string): Promise<StepRunState> => {
    const done = await findDone(step.id, date)
    if (done) return state(step, date, 'focus', { completion: toRoutineCompletion(done) })
    const attached = await attachedFocus(step.id)
    if (attached && isRunning(attached.extension) && (await dropIfAbandoned(attached, step.id))) {
      return startAttachedFocus(step, date)
    }
    if (attached) {
      if (isRunning(attached.extension)) {
        return state(step, date, 'focus', {
          status: 'in_progress',
          session_id: attached.session.id,
          focus_id: attached.extension.id,
        })
      }
      const settled = await settleFinishedFocus(step, date, attached)
      if (settled) return settled
    }
    return startAttachedFocus(step, date)
  }

  const startAttachedFocus = async (step: RoutineStepRow, date: string): Promise<StepRunState> => {
    const timer = await sessions.startFocus({}) // fresh path; startFocus({attach}) needs a pre-existing sessionId
    try {
      await sessions.attach(timer.session_id, 'routine_step', step.id, 'instance') // ADR-004 §3.2.1 instance link
    } catch (e) {
      try {
        await sessions.cancelFocus(timer.id) // best-effort: never leave an orphan running focus re-entry can't find
      } catch {
        /* the original error is what matters */
      }
      throw e
    }
    return state(step, date, 'focus', { status: 'in_progress', session_id: timer.session_id, focus_id: timer.id })
  }

  const completeFocusStep = async (step: RoutineStepRow, date: string): Promise<StepRunState> => {
    const done = await findDone(step.id, date)
    if (done) return state(step, date, 'focus', { completion: toRoutineCompletion(done) })
    const attached = await attachedFocus(step.id)
    if (attached && isRunning(attached.extension) && (await dropIfAbandoned(attached, step.id))) {
      throw new EntityUnavailableError(step.id, 'the running focus session was abandoned (started before yesterday; cancelled)')
    }
    if (attached && isRunning(attached.extension)) {
      const occurrence = focusDay(attached) // the day it started — may differ from `date` across UTC midnight
      const f = await sessions.completeFocus(attached.extension.id) // no effects; never completeSession (N9)
      const completion = await stamp(step.id, occurrence, focusMinutes(f)) // focus duration overrides a caller's (declared)
      await bestEffort(() => detachFocus(attached.session.id, step.id))
      return state(step, occurrence, 'focus', { completion, session_id: attached.session.id, focus_id: f.id })
    }
    if (attached) {
      const settled = await settleFinishedFocus(step, date, attached)
      if (settled) return settled
    }
    throw new EntityUnavailableError(step.id, 'no running focus session')
  }

  // Per-step in-flight lock: overlapping drives of the SAME step (a UI double-tap) run one after the other, so a focus
  // step can't start two attached sessions (check-then-act). Single-user local-first: an in-process lock is sufficient.
  const inFlight = new Map<string, Promise<unknown>>()
  const serialized = async <T>(stepId: string, fn: () => Promise<T>): Promise<T> => {
    const prev = inFlight.get(stepId) ?? Promise.resolve()
    const run = prev.catch(() => undefined).then(fn)
    inFlight.set(stepId, run)
    try {
      return await run
    } finally {
      if (inFlight.get(stepId) === run) inFlight.delete(stepId)
    }
  }

  // Shared drive for runStep/completeStep's driven targets (task/habit are identical in both).
  const driveStep = async (
    step: RoutineStepRow,
    date: string,
    minutes: number | null,
    mode: 'run' | 'complete',
  ): Promise<StepRunState> => {
    const r = resolveTarget(step)
    switch (r?.target) {
      case 'task':
        return driveTask(step, r.entityId, date, minutes)
      case 'habit':
        return driveHabit(step, r.entityId, date, minutes)
      case 'focus':
        return mode === 'run' ? runFocus(step, date) : completeFocusStep(step, date)
      case 'actionable':
        return state(step, date, 'actionable', { completion: await stamp(step.id, date, minutes) })
      default:
        throw new EntityUnavailableError(
          step.id,
          `target not drivable in M1 (step_type=${String(step.step_type)}, entity_type=${String(step.entity_type)})`,
        )
    }
  }

  // ── S4 — policy evaluation (PLAN-S4-policy-evaluation.md) ───────────
  // E1b — the step set AS OF `date`: created on/before it and not deleted on/before it, plus any step with a ledger row that day
  // (RT-5 never discarded; no retroactive change). findWhere without the soft-delete filter is deliberate here (rule-7 exception).
  const stepsAsOf = (all: RoutineStepRow[], date: string, withRow: ReadonlySet<string>): RoutineStepRow[] =>
    all
      .filter(
        (st) =>
          withRow.has(st.id) ||
          (utcDay(st.created_at) <= date && (st.deleted_at == null || utcDay(st.deleted_at) > date)),
      )
      .sort(bySequence)

  // One query for the day's ledger rows across the routine's steps (UNIQUE(step,date) ⇒ ≤1 row per step).
  const completionsOn = async (stepIds: string[], date: string): Promise<Map<string, RoutineCompletionRow>> => {
    if (stepIds.length === 0) return new Map() // perf shortcut (drizzle's inArray([]) would be a no-match, not an error)
    const rows = await completionsRepo.findWhere(
      and(eq(routineCompletions.completed_date, date), inArray(routineCompletions.routine_step_id, stepIds)) as SQL,
    )
    return new Map(rows.map((r) => [r.routine_step_id, r]))
  }

  // E2 — done for `date` = the routine's own occurrence row (U1: the record of that occurrence, RT-5) OR the driven entity done AS OF
  // `date` in its own module (RT-3 reflects). Reflection only ADDS dones; a later change in the entity never rewrites D (a backfilled
  // stamp counts; a task reopened later doesn't erase D). Focus / actionable steps have no reflection source.
  type CalendarCache = Map<string, Promise<{ date: string; done: boolean }[] | null>>
  const habitMonth = (svc: HabitsService, cache: CalendarCache, habitId: string, month: string) => {
    const key = `${habitId}|${month}`
    let p = cache.get(key)
    if (!p) {
      p = svc.getCalendar(habitId, month).catch((e: unknown) => {
        if (isHabitNotFound(e)) return null // entity gone → no reflection (the ledger row still counts)
        throw e // never swallow a real failure
      })
      cache.set(key, p)
    }
    return p
  }
  const isDoneOn = async (
    step: RoutineStepRow,
    row: RoutineCompletionRow | undefined,
    date: string,
    cache: CalendarCache,
  ): Promise<boolean> => {
    if (row != null && !row.skipped) return true
    const r = resolveTarget(step)
    if (r?.target === 'task') {
      const task = await tasks.getTask(r.entityId)
      return task?.status === 'completed' && task.completed_at != null && utcDay(task.completed_at) <= date
    }
    if (r?.target === 'habit' && habits) {
      const days = await habitMonth(habits, cache, r.entityId, date.slice(0, 7))
      return days?.some((d) => d.date === date && d.done) ?? false
    }
    return false
  }

  const ref = (st: RoutineStepRow): RoutineStepRef => ({ step_id: st.id, title: st.title })

  // E4–E6 — the judgment. `percent` is display-only; the threshold compares the exact ratio.
  type Judgment = Pick<RoutineEvaluation, 'status' | 'policy_source' | 'policy_note'>
  const judge = (
    routineId: string,
    policy: RoutinePolicy | null,
    done: RoutineStepRow[],
    notDone: RoutineStepRow[],
    neutral: RoutineStepRow[],
    applicable: number,
  ): Judgment => {
    // E6 — no (applicable) policy: only the judgments every doc policy agrees on; everything in between is flagged.
    const undefinedJudgment = (note?: RoutineEvaluation['policy_note']): Judgment => ({
      status: applicable === 0 || done.length === 0 ? 'not_started' : notDone.length === 0 ? 'done' : 'partial',
      policy_source: 'undefined',
      ...(note ? { policy_note: note } : {}),
    })
    if (!policy) return undefinedJudgment()
    const rule = policy.completion
    // E4.1 first: no applicable steps ⇒ not_started under the user's policy (before any rule-specific note).
    if (applicable === 0) return { status: 'not_started', policy_source: 'user' }
    let met: boolean
    switch (rule.kind) {
      case 'all_or_nothing':
        met = notDone.length === 0
        break
      case 'threshold':
        // A type check only (the range is the policy owner's): a missing/NaN/non-number percent fails loud, never a silent verdict.
        if (typeof rule.percent !== 'number' || !Number.isFinite(rule.percent)) {
          throw new InvalidRoutinePolicyError(routineId, rule)
        }
        met = done.length * 100 >= rule.percent * applicable // exact ratio (2/3 vs 67 ⇒ not met)
        break
      case 'required_node': {
        const required = [...done, ...notDone].filter((st) => st.is_required)
        if (required.length === 0) {
          // E5 — the rule can't be applied: tell a configuration gap apart from "required steps are neutral today".
          return undefinedJudgment(
            neutral.some((st) => st.is_required) ? 'required_steps_all_neutral' : 'no_required_steps',
          )
        }
        const doneIds = new Set(done.map((st) => st.id))
        met = required.every((st) => doneIds.has(st.id))
        break
      }
      default: {
        const unknownRule: never = rule // compile-time exhaustiveness over the three doc kinds
        throw new InvalidRoutinePolicyError(routineId, (unknownRule as { kind?: unknown }).kind)
      }
    }
    // E4 precedence: the user's rule decides; an unmet rule with nothing done ⇒ not_started.
    if (met) return { status: 'done', policy_source: 'user' }
    return { status: done.length === 0 ? 'not_started' : 'partial', policy_source: 'user' }
  }

  const service: RoutinesService = {
    // ── S1 ──────────────────────────────────────────────────────────
    createRoutine: async (input) => {
      const p = CreateRoutineSchema.parse(input)
      if (p.recurrence_rule != null) assertValidRrule(p.recurrence_rule) // != null, not truthiness: '' is validated (B3)
      return toRoutine(await routinesRepo.create(serializeRoutine(p)))
    },

    updateRoutine: async (id, patch) => {
      const p = UpdateRoutineSchema.parse(patch)
      if (p.recurrence_rule != null) assertValidRrule(p.recurrence_rule) // null clears; absent leaves untouched
      return toRoutine(await routinesRepo.update(id, serializeRoutineUpdate(p)))
    },

    archiveRoutine: async (id) => {
      // RT-17 app-cascade (interp rule 6): soft-delete the routine, then its LIVE steps (no FK). Already-deleted steps
      // are not re-touched (the read filters deleted_at). The ledger is preserved: completions hard-delete only with a
      // hard purge of their step, and no purge op exists (ledger B13).
      await routinesRepo.delete(id) // softDelete:true → sets deleted_at; ledger untouched
      const steps = await liveSteps(id)
      for (const s of steps) await stepsRepo.delete(s.id)
    },

    getRoutine: async (id) => {
      const r = await routinesRepo.findById(id)
      return r ? toRoutine(r) : null
    },

    listRoutines: async (filter = {}) => {
      const conds: SQL[] = [isNull(routines.deleted_at)] // findWhere skips the soft-delete filter (rule 7)
      if (filter.lifecycle !== undefined) conds.push(eq(routines.lifecycle, filter.lifecycle))
      const rows = await routinesRepo.findWhere(and(...conds) as SQL)
      // S2c (A8) — sort_order, then created_at, then id (tasks precedent).
      rows.sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at || byCodepoint(a.id, b.id))
      return rows.map(toRoutine)
    },

    setLifecycle: async (id, lifecycle) => {
      const p = SetRoutineLifecycleSchema.parse({ lifecycle })
      await loadRoutineOrThrow(id) // typed — no write on a missing/archived routine
      return toRoutine(await routinesRepo.update(id, { lifecycle: p.lifecycle }))
    },

    // ── S2 ──────────────────────────────────────────────────────────
    addStep: async (routineId, step) => {
      const p = AddStepSchema.parse(step)
      assertEntityType(p.entity_type)
      await loadRoutineOrThrow(routineId) // RT-3 — fail-loud; no orphan step
      // S2c (A11) — append: step_order = max(live) + 1 unless given. One extra read, skipped when step_order is given.
      const step_order =
        p.step_order ?? (await liveSteps(routineId)).reduce((m, s) => Math.max(m, s.step_order), -1) + 1
      return toRoutineStep(await stepsRepo.create(serializeStep(routineId, { ...p, step_order })))
    },

    updateStep: async (stepId, patch) => {
      const p = UpdateStepSchema.parse(patch)
      assertEntityType(p.entity_type) // ignores null/undefined
      return toRoutineStep(await stepsRepo.update(stepId, serializeStepUpdate(p)))
    },

    removeStep: async (stepId) => {
      await stepsRepo.delete(stepId) // soft-delete; completion ledger cascade is S3/S8
    },

    reorderSteps: async (routineId, orderedStepIds) => {
      // Only steps that actually belong to this routine are reordered; foreign/unknown ids are ignored (BR-RT-S2-6).
      const owned = new Set((await liveSteps(routineId)).map((s) => s.id))
      let order = 0
      for (const id of orderedStepIds) {
        if (!owned.has(id)) continue
        await stepsRepo.update(id, { step_order: order })
        order += 1
      }
      return (await liveSteps(routineId)).map(toRoutineStep) // S2c (A12) — the seam returns the reordered steps
    },

    listSteps: async (routineId) => (await liveSteps(routineId)).map(toRoutineStep),

    // ── S3 ──────────────────────────────────────────────────────────
    completeStep: async (stepId, input = {}) => {
      const p = CompleteStepSchema.parse(input)
      const step = await loadStepOrThrow(stepId) // BR-RT-S3-4 — before any drive
      const date = p.date ?? clock()
      const minutes = p.actual_duration_minutes ?? null
      // RT-5 — an actionable step is a DONE occurrence in the ledger (as built; upsert, so a re-complete updates the row).
      if (resolveTarget(step)?.target === 'actionable') return stamp(stepId, date, minutes)
      // RT-3 — a driven step drives its entity FIRST, then stamps the routine's own occurrence row (N7).
      return serialized(stepId, () => driveStep(step, date, minutes, 'complete'))
    },

    runStep: async (stepId, input = {}) => {
      const p = RunStepSchema.parse(input)
      const step = await loadStepOrThrow(stepId)
      return serialized(stepId, () => driveStep(step, p.date ?? clock(), null, 'run'))
    },

    // ── S4 ──────────────────────────────────────────────────────────
    evaluateRoutine: async (routineId, input = {}) => {
      const p = EvaluateRoutineSchema.parse(input)
      await loadRoutineOrThrow(routineId) // archived/missing → RoutineNotFoundError (known limit for past-date reads, S5/S9)
      const date = p.date ?? clock()
      const all = await stepsRepo.findWhere(eq(routineStep.routine_id, routineId) as SQL) // one read (incl. soft-deleted, E1b)
      const rows = await completionsOn(all.map((st) => st.id), date)
      const steps = stepsAsOf(all, date, new Set(rows.keys()))
      const policy = prefs ? await prefs.policyFor(routineId) : null // a port throw propagates (fail loud)
      const cache: CalendarCache = new Map()
      const doneFlags = await Promise.all(steps.map((st) => isDoneOn(st, rows.get(st.id), date, cache)))
      const done: RoutineStepRow[] = []
      const notDone: RoutineStepRow[] = []
      const neutral: RoutineStepRow[] = []
      steps.forEach((st, i) => {
        // Done first: work actually done on a planned-skip day still counts (RT-5 never discarded).
        if (doneFlags[i]) {
          done.push(st)
          return
        }
        const row = rows.get(st.id)
        const planned = (parseJsonArray<string>(st.skip_dates) ?? []).includes(date) // RT-8 planned skip = neutral
        const loggedNeutral = row?.skipped === true && policy?.miss?.logged_skip === 'neutral'
        if (planned || loggedNeutral) neutral.push(st)
        else notDone.push(st)
      })
      const applicable = done.length + notDone.length
      return {
        routine_id: routineId,
        date,
        ...judge(routineId, policy, done, notDone, neutral, applicable),
        percent: applicable ? Math.round((100 * done.length) / applicable) : 0,
        applicable,
        done: done.map(ref),
        not_done: notDone.map(ref),
        neutral: neutral.map(ref),
      }
    },

    skipStep: async (stepId, input = {}) => {
      const p = SkipStepSchema.parse(input)
      // RT-8 — a LOGGED skip on the day (completion row, skipped=true + reason). Distinct from a pre-planned skip.
      return upsertCompletion(stepId, p.date ?? clock(), {
        skipped: true,
        skip_reason: p.reason ?? null,
        actual_duration_minutes: null,
      })
    },

    planSkipDates: async (stepId, dates) => {
      const { dates: parsed } = PlanSkipDatesSchema.parse({ dates })
      const step = await loadStepOrThrow(stepId)
      // RT-8 — pre-planned skips live in step.skip_dates (declared ahead, may be future). Merge, dedupe, sort.
      const merged = [...new Set([...(parseJsonArray<string>(step.skip_dates) ?? []), ...parsed])].sort()
      const row = await stepsRepo.update(stepId, { skip_dates: JSON.stringify(merged) })
      return toRoutineStep(row)
    },

    editCompletion: async (stepId, date, patch) => {
      RoutineCalendarDateSchema.parse(date) // S2c (B1) — a malformed date is a ZodError, not CompletionNotFoundError
      const p = EditRoutineCompletionSchema.parse(patch)
      await loadStepOrThrow(stepId)
      const existing = await findCompletion(stepId, date)
      if (!existing) throw new CompletionNotFoundError(stepId, date) // fail-loud (RT-5 edit path)
      const out: UpdateInput<typeof routineCompletions> = {}
      if ('skipped' in p) out.skipped = p.skipped
      if ('skip_reason' in p) out.skip_reason = p.skip_reason
      if ('actual_duration_minutes' in p) out.actual_duration_minutes = p.actual_duration_minutes
      return toRoutineCompletion(await completionsRepo.update(existing.id, out))
    },

    deleteCompletion: async (stepId, date) => {
      RoutineCalendarDateSchema.parse(date) // S2c (B1)
      const existing = await findCompletion(stepId, date)
      if (!existing) throw new CompletionNotFoundError(stepId, date)
      await completionsRepo.delete(existing.id) // HARD delete (softDelete:false — ledger has no deleted_at)
    },

    listCompletions: async (stepId) => {
      // No soft-delete filter needed — the ledger has no deleted_at (RT-14 hard-delete table).
      const rows = await completionsRepo.findWhere(eq(routineCompletions.routine_step_id, stepId) as SQL)
      return rows.sort((a, b) => a.completed_date.localeCompare(b.completed_date)).map(toRoutineCompletion)
    },
  }

  return service
}
