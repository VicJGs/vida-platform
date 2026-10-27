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

import { and, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm'
import ICAL from 'ical.js'
import type { Routine, RoutineStep, RoutineCompletion, EffectType } from '@vida/types'
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
  RescheduleStepSchema,
  LinkRoutinePageSchema,
  EvaluateRoutineSchema,
  RoutineDateRangeSchema,
  SetRoutineLifecycleSchema,
  RoutineCalendarDateSchema,
} from '../../validators/routine'
import { UnknownEntityType, TagNotFound } from '../../foundation/spaces/types'
import { tags } from '../../db/schema/foundation/spaces'
import { utcDay, TaskNotFoundError, RecurrenceRegenError, TimerAlreadyRunningError, TimerNotWiredError } from '../tasks'
import { SessionTypeNotFound, type SessionTypeDef } from '../../foundation/sessions/types'
import type { Session, TimeRange, DueItem } from '../sessions'
import type { SectionData } from '../journals'
import type { PlannedBlockRow } from '../../db/schema/foundation/scheduling'
import type { HabitsService } from '../habits'
import type { TasksService } from '../tasks'
import { resolveProgress } from '../../foundation/measurement/engine'
import type { FocusSessionRow } from '../../db/schema/foundation/session-extensions'
import type { TaskRow } from '../../db/schema/tasks'
import {
  RoutineNotFoundError,
  StepNotFoundError,
  CompletionNotFoundError,
  InvalidRecurrenceRuleError,
  EntityUnavailableError,
  InvalidRoutinePolicyError,
  OutsideAcceptanceWindowError,
  NotMissedOccurrenceError,
  InvalidRescheduleSlotError,
  RoutineContributionError,
  type RoutineEvaluation,
  type RoutinePolicy,
  type RoutineAnalytics,
  type RoutineCompletionRate,
  type RoutineDateRange,
  type RoutineStepRank,
  type RoutineStreak,
  type OccurrenceStatus,
  type RoutineStepRef,
  type StepRunState,
  type StepTarget,
  type RoutineLinkTarget,
  type RoutineDaySummaryItem,
  ROUTINES_DATA_POINTS,
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
// S5 — a MINIMAL allowlist of the day-grain RRULE forms a routine's cadence needs (RT-11: "day · day+timeframe-of-week · day+time-of-month ·
// day+time-of-year"). ical.js 2.2.1 HANGS inside next() on valid RFC shapes, sometimes depending on DTSTART's weekday (probed 2026-10-22, e.g.
// DAILY;INTERVAL=7;BYDAY=MO from a Thursday), mis-expands ordinals and throws on others at iterator construction. Only these forms are accepted —
// each probed across 9 DTSTARTs (all 7 weekdays + month-ends) with no hang/error (137 + 8 shapes):
//   DAILY[;INTERVAL]                      — every n days
//   WEEKLY[;INTERVAL][;BYDAY=<weekdays>]   — days of the week (no ordinals)
//   MONTHLY[;INTERVAL][;BYMONTHDAY=±1..31 | ;BYDAY=<±1..5 ordinal weekdays>]   — day / nth weekday of the month
//   YEARLY[;INTERVAL][;BYMONTH=1..12[;BYMONTHDAY=±1..31 | ;BYDAY=<±1..5 ordinal weekdays>]]  — day / nth weekday of a month of the year
// plus COUNT / UNTIL / WKST. Checked at write AND before every expansion (a stored rule never freezes a read).
const MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // Feb = 29 (leap years exist)
const PLAIN_WEEKDAY = /^(MO|TU|WE|TH|FR|SA|SU)$/
const ORDINAL_WEEKDAY = /^([+-]?)([1-5])(MO|TU|WE|TH|FR|SA|SU)$/
function assertExpandable(rule: string): void {
  const recur = ICAL.Recur.fromString(rule)
  const fail = (): never => {
    throw new InvalidRecurrenceRuleError(rule)
  }
  const freq = String(recur.freq)
  const parts = Object.fromEntries(
    Object.entries(recur.parts as Record<string, unknown[] | undefined>).filter(([, v]) => v?.length),
  ) as Record<string, unknown[]>
  const keys = Object.keys(parts)
  const only = (...allowed: string[]) => keys.every((k) => allowed.includes(k))
  const byday = (parts.BYDAY ?? []).map(String)
  const mdays = (parts.BYMONTHDAY ?? []).map(Number)
  const months = (parts.BYMONTH ?? []).map(Number)
  const validMdays = () => mdays.every((d) => Number.isInteger(d) && d !== 0 && Math.abs(d) <= 31)
  if (freq === 'DAILY') {
    if (!only()) fail()
  } else if (freq === 'WEEKLY') {
    if (!only('BYDAY') || !byday.every((d) => PLAIN_WEEKDAY.test(d))) fail()
  } else if (freq === 'MONTHLY') {
    if (!only('BYMONTHDAY', 'BYDAY') || (mdays.length && byday.length)) fail()
    if (!validMdays() || !byday.every((d) => ORDINAL_WEEKDAY.test(d))) fail()
  } else if (freq === 'YEARLY') {
    if (!only('BYMONTH', 'BYMONTHDAY', 'BYDAY') || (mdays.length && byday.length)) fail()
    if ((mdays.length || byday.length) && !months.length) fail() // a day/nth-weekday needs its month (ordinal YEARLY mis-expands)
    if (!months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12)) fail()
    if (!validMdays() || !byday.every((d) => ORDINAL_WEEKDAY.test(d))) fail()
    // An impossible month/day pair (e.g. Feb 30, Feb −30) never yields.
    if (mdays.length && mdays.every((d) => months.every((m) => Math.abs(d) > MAX_DAYS[m - 1]))) fail()
  } else {
    fail() // sub-daily FREQs are outside a day-grain cadence (RT-11)
  }
  try {
    recur.iterator(ICAL.Time.fromDateString('2000-01-01')) // construction-time errors surface at write, typed
  } catch {
    fail()
  }
}

const pad2 = (n: number): string => String(n).padStart(2, '0')
const WEEKDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
// Calendar-day arithmetic on YYYY-MM-DD via UTC fields (never local time).
const addDays = (ymd: string, n: number): string => {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(0)
  t.setUTCFullYear(y, m - 1, d + n) // setUTCFullYear keeps years 0–99 literal (Date.UTC would map them to 1900–1999)
  return t.toISOString().slice(0, 10) // YYYY-MM-DD for years 0000–9999
}
const daysBetween = (from: string, to: string): number => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000

// The rule's explicit BY-parts as a date predicate: applied to EVERY yield (filters the phantom DTSTART and ical.js mis-yields; every
// real occurrence passes). BYDAY ordinals are ignored (weekday only); negative BYMONTHDAY is resolved against the month length.
function byPartsMatch(recur: InstanceType<typeof ICAL.Recur>, ymd: string): boolean {
  const parts = recur.parts as Record<string, unknown[] | undefined>
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (parts.BYDAY?.length) {
    const wd = WEEKDAY[date.getUTCDay()]
    const matchesToken = (v: unknown): boolean => {
      const t = String(v)
      const ord = /^([+-]?)(\d+)([A-Z]{2})$/.exec(t)
      if (!ord) return t === wd
      if (ord[3] !== wd) return false
      const n = Number(ord[2])
      // The nth weekday of the month, counted from the start (+) or the end (−).
      return ord[1] === '-' ? Math.ceil((dim - d + 1) / 7) === n : Math.ceil(d / 7) === n
    }
    if (!parts.BYDAY.some(matchesToken)) return false
  }
  if (parts.BYMONTHDAY?.length) {
    if (!parts.BYMONTHDAY.some((v) => (Number(v) < 0 ? dim + Number(v) + 1 : Number(v)) === d)) return false
  }
  if (parts.BYMONTH?.length && !parts.BYMONTH.some((v) => Number(v) === m)) return false
  return true
}

// S5 A1 — the routine's occurrence dates in [from, to] (YYYY-MM-DD), expanded from DTSTART with the canonical ical.js.
function occurrences(rule: string, dtstart: string, from: string, to: string): string[] {
  assertExpandable(rule)
  const run = (countBump: number): { dates: string[]; firstDropped: boolean } => {
    const recur = ICAL.Recur.fromString(rule)
    if (countBump && recur.count != null) recur.count = recur.count + countBump
    let it: ReturnType<typeof recur.iterator>
    try {
      it = recur.iterator(ICAL.Time.fromDateString(dtstart))
    } catch {
      throw new InvalidRecurrenceRuleError(rule) // ical.js rejects some parsed rules only when building the iterator
    }
    const seen = new Set<string>()
    let firstDropped = false
    let first = true
    let occ: InstanceType<typeof ICAL.Time> | null
    while ((occ = it.next())) {
      const ymd = `${occ.year}-${pad2(occ.month)}-${pad2(occ.day)}` // calendar fields, never toISOString (tasks g2 B1)
      if (ymd > to) break
      const ok = byPartsMatch(recur, ymd)
      if (first && !ok) firstDropped = true
      first = false
      if (ok && ymd >= from) seen.add(ymd)
    }
    return { dates: [...seen], firstDropped }
  }
  const once = run(0)
  // Dropping a phantom first yield would cost a COUNTed occurrence: rebuild with COUNT + 1 (probed). Defensive: no allowlisted form is known to
  // yield a phantom start (probed), but the every-yield filter + this rebuild keep COUNT exact if ical.js ever does.
  if (once.firstDropped && ICAL.Recur.fromString(rule).count != null) return run(1).dates.sort()
  return once.dates.sort()
}

function assertValidRrule(rule: string): void {
  let freq: string | null = null
  try {
    freq = ICAL.Recur.fromString(rule).freq ?? null
  } catch {
    throw new InvalidRecurrenceRuleError(rule)
  }
  if (freq == null) throw new InvalidRecurrenceRuleError(rule)
  assertExpandable(rule) // S5 — never store a rule ical.js would hang on
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
  const { db, deviceId, registry, tasks, sessions, sessionRegistry, habits, prefs, effects, spaces, notes } = deps
  const clock = deps.clock ?? (() => utcDay(Date.now())) // YYYY-MM-DD — the platform UTC-day convention (tasks' public utcDay)
  const cfg = { deviceId, encryptedFields: [] as string[] } // M1.0: [E] fields dormant (→ M3/DB-5)

  const routinesRepo = createRepository(db, routines, { ...cfg, softDelete: true })
  const stepsRepo = createRepository(db, routineStep, { ...cfg, softDelete: true })
  const completionsRepo = createRepository(db, routineCompletions, { ...cfg, softDelete: false }) // ledger — hard delete
  // S8 — READ-ONLY tag liveness: no Spaces tag-read contract exists (the codebase-wide exception: tasks/flashcards/books/knowledge).
  const tagsRepo = createRepository(db, tags, { ...cfg, softDelete: true })

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

  // ── S3 + S5c — run/drive (PLAN-S3-run-drive.md, PLAN-S5c-q1-d3-correction.md) ─────
  // Every step drives an entity (Q1/RT-4): a task (a check-off step IS a task), a habit, the focus timer, or a REGISTERED
  // session sub-type (routines registers none). Resolution (pin 1): focus → work (needs its task) → a registered sub-type
  // (exercise ⇒ workout) → task ref → habit ref → check-off (no ref; becomes a Task) → unavailable. An UNREGISTERED step_type
  // falls through to the ref (approved row 2).
  type Resolved =
    | { target: 'focus' }
    | { target: 'session'; subType: string; def: SessionTypeDef; about: { type: string; id: string } | null }
    | { target: 'task' | 'habit'; entityId: string }
    | { target: 'checkoff' }
    | null
  const resolveTarget = async (step: RoutineStepRow, rf: Reflection): Promise<Resolved> => {
    const st = step.step_type
    const ref = step.entity_type != null && step.entity_id != null ? { type: step.entity_type, id: step.entity_id } : null
    if (st === 'focus') return { target: 'focus' }
    if (st === 'work') return ref?.type === 'task' ? { target: 'task', entityId: ref.id } : null // a work timer is always task-attached
    if (st != null && st !== 'task' && st !== 'habit') {
      const subType = st === 'exercise' ? 'workout' : st // intake §D:94-98
      const def = await subTypeDef(rf, subType)
      if (def) return { target: 'session', subType, def, about: ref }
    }
    if (ref?.type === 'task') return { target: 'task', entityId: ref.id }
    if (ref?.type === 'habit') return { target: 'habit', entityId: ref.id }
    const noRef = step.entity_type == null && step.entity_id == null // the addStep predicate; a half ref is unresolvable
    if (noRef && (st == null || st === 'task')) return { target: 'checkoff' }
    return null
  }

  const findDone = async (stepId: string, date: string): Promise<RoutineCompletionRow | undefined> => {
    const row = await findCompletion(stepId, date)
    return row && !row.skipped ? row : undefined
  }

  // N7 — the stamp runs only AFTER a successful drive (the routine's own occurrence row; never the entity's effects).
  // It writes the ledger directly (the step was loaded before the drive), so a step deleted mid-drive can't surface as
  // StepNotFoundError AFTER the entity was driven (BR-RT-S3-4: that error only ever precedes a drive).
  // S7 (B1) — while a drive runs, each stamp records the step's PRIOR ledger row per date (keyed by step: the per-step lock makes one
  // drive per step in flight). The emission rebuilds a stamped date's before-state from it when that date isn't the requested one.
  const priorRows = new Map<string, Map<string, RoutineCompletionRow | undefined>>()
  const stamp = async (stepId: string, date: string, minutes: number | null): Promise<RoutineCompletion> => {
    const existing = await findCompletion(stepId, date)
    const probe = priorRows.get(stepId)
    if (probe && !probe.has(date)) probe.set(date, existing)
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

  const nowMinutesSince = (startedAt: number | null): number | null =>
    startedAt == null ? null : Math.max(0, Math.round((Date.now() - startedAt) / 60_000))

  // S3 (obligation, 3b) — TK-7 regeneration is the obligation's own occurrence engine: completeTask, TERMINAL reflection.
  const driveObligation = async (step: RoutineStepRow, task: TaskRow, date: string, minutes: number | null): Promise<StepRunState> => {
    if (task.status === 'cancelled') throw new EntityUnavailableError(step.id, `task ${task.id} is cancelled`)
    if (task.status === 'completed') {
      return state(step, date, 'task', { completion: await stamp(step.id, date, minutes) })
    }
    let flag: StepRunState['flag']
    try {
      await tasks.completeTask(task.id) // effect-idempotent re-drive (rule 17)
    } catch (e) {
      if (e instanceof TaskNotFoundError) throw new EntityUnavailableError(step.id, `task ${task.id} is missing or deleted`)
      if (!(e instanceof RecurrenceRegenError)) throw e
      flag = 'recurrence_regen_failed' // TAS-23: the completion is durable; only the next occurrence failed
    }
    const completion = await stamp(step.id, date, minutes)
    return state(step, date, 'task', { completion, ...(flag ? { flag } : {}) })
  }

  // ── S6 — SS-8 intent blocks (PLAN-S6 v3) ────────────────────────────
  // A rescheduled occurrence D is one `planned_blocks` row pointing at the step (SS-7), its D carried in the documented
  // provenance column (`source = 'routines:<D>'`; R3 forbids a new column, Q3 forbids same-day-only). One parser below.
  const BLOCK_SOURCE = 'routines:'
  const blockSource = (date: string): string => `${BLOCK_SOURCE}${date}`
  const blockDate = (source: string | null): string | null =>
    source?.startsWith(BLOCK_SOURCE) && /^\d{4}-\d{2}-\d{2}$/.test(source.slice(BLOCK_SOURCE.length))
      ? source.slice(BLOCK_SOURCE.length)
      : null
  const isPending = (b: PlannedBlockRow): boolean => b.status === 'planned' || b.status === 'scheduled'
  const pendingBlock = async (stepId: string, date: string): Promise<PlannedBlockRow | undefined> =>
    (await sessions.listPlannedBlocksForTarget('routine_step', stepId)).find((b) => b.source === blockSource(date) && isPending(b))
  // R5b — the occurrence day of a session linked to one of this step's blocks, or null (then the S5c day rules apply).
  const blockDay = async (stepId: string, plannedBlockId: string | null): Promise<string | null> => {
    if (plannedBlockId == null) return null
    const b = (await sessions.listPlannedBlocksForTarget('routine_step', stepId)).find((x) => x.id === plannedBlockId)
    return b ? blockDate(b.source) : null
  }
  // R5 — after a durable make-good: link the occurrence session to D's pending block, and fulfil it once D is done.
  const settleBlock = (stepId: string, st: StepRunState): Promise<void> =>
    bestEffort(async () => {
      const b = await pendingBlock(stepId, st.date)
      if (!b) return
      if (st.session_id) {
        const s = await sessions.getSession(st.session_id)
        if (s && s.session.planned_block_id == null) {
          await sessions.updateSession(st.session_id, { planned_block_id: b.id, scheduling_mode: 'planned' })
        }
      }
      if (st.status === 'done') await sessions.updatePlannedBlock(b.id, { status: 'fulfilled' })
    })
  // R6 — a skip of D cancels its pending block (best-effort after the durable skip write).
  const cancelBlock = (stepId: string, date: string): Promise<void> =>
    bestEffort(async () => {
      const b = await pendingBlock(stepId, date)
      if (b) await sessions.updatePlannedBlock(b.id, { status: 'skipped' })
    })

  // ── S9 — providers (PLAN-S9 v2: the due predicate rebuilt from S5/S6; the owner's live block drop) ──
  const byRoutineOrder = (a: RoutineRow, b: RoutineRow): number =>
    a.sort_order - b.sort_order || a.created_at - b.created_at || byCodepoint(a.id, b.id)
  const activeRoutines = async (): Promise<RoutineRow[]> =>
    (await routinesRepo.findWhere(and(isNull(routines.deleted_at), eq(routines.lifecycle, 'active')) as SQL)).sort(byRoutineOrder)
  type BlocksByStep = Map<string, PlannedBlockRow[]>
  const blocksOf = async (cache: BlocksByStep, stepId: string): Promise<PlannedBlockRow[]> => {
    let b = cache.get(stepId)
    if (!b) cache.set(stepId, (b = await sessions.listPlannedBlocksForTarget('routine_step', stepId)))
    return b
  }
  const hasPendingBlock = async (cache: BlocksByStep, stepId: string, date: string): Promise<boolean> =>
    (await blocksOf(cache, stepId)).some((b) => b.source === blockSource(date) && isPending(b))
  // BR-RT-S6-5 — a pending block with an open session linked to it is a make-good in flight (never dropped).
  const isRunningMakeGood = async (b: PlannedBlockRow, stepId: string): Promise<boolean> =>
    b.sub_type != null && (await sessions.findOpenSessionForEntity(b.sub_type, 'routine_step', stepId))?.planned_block_id === b.id
  const plannedSkips = (st: RoutineStepRow): readonly string[] => parseJsonArray<string>(st.skip_dates) ?? []

  // The due predicate for one active routine over [from, to] (UTC days): a routine-day D is due iff some step in stepsAsOf(D) —
  //  · D < today: is make-good-admissible (S6 BR-RT-S6-3: not done, not planned-skipped, window open/undefined) with no pending
  //    routines:<D> block (the block lists it in Sessions — SS-7), and the routine is not done on D;
  //  · D = today: the same without the window (S5 A2: today is pending);
  //  · D > today: is not planned-skipped (no reflection on future days — a completed obligation would read done forever).
  // Throws on a malformed policy / unexpandable rule / reflection failure → the caller isolates the routine (RT-13).
  const dueDays = async (routine: RoutineRow, from: string, to: string, today: string, cache: BlocksByStep): Promise<string[]> => {
    const rule = routine.recurrence_rule
    if (rule == null) return []
    const dates = occurrences(rule, utcDay(routine.created_at), from, to)
    if (dates.length === 0) return []
    const policy = prefs ? await prefs.policyFor(routine.id) : null
    const window = validWindow(routine.id, policy)
    const all = await stepsRepo.findWhere(eq(routineStep.routine_id, routine.id) as SQL) // incl. soft-deleted (stepsAsOf, rule 7)
    // Rows over the whole window: a future day's own (U1) done row counts (a completion stamped ahead), reflection never does.
    const rows = await completionsBetween(all.map((st) => st.id), from, to)
    const rf = newReflection()
    const due: string[] = []
    for (const date of dates) {
      const dayRows = rows.get(date) ?? new Map<string, RoutineCompletionRow>()
      const steps = stepsAsOf(all, date, new Set(dayRows.keys()))
      if (date > today) {
        const owed = (st: RoutineStepRow): boolean => {
          const own = dayRows.get(st.id)
          return st.deleted_at == null && !plannedSkips(st).includes(date) && !(own != null && !own.skipped)
        }
        if (steps.some(owed)) due.push(date)
        continue
      }
      if (date < today && window !== undefined && addDays(date, window) < today) continue // a real miss is final (RT-6)
      if ((await judgeDay(routine.id, all, dayRows, date, policy, rf)).status === 'done') continue
      for (const st of steps) {
        if (st.deleted_at != null) continue // a removed step can't be made good (BR-RT-S6-3: make-good paths need a live step)
        if (plannedSkips(st).includes(date)) continue
        if (await isDoneOn(st, dayRows.get(st.id), date, rf)) continue
        if (await hasPendingBlock(cache, st.id, date)) continue
        due.push(date)
        break
      }
    }
    return due
  }

  const dueItems = async (range: TimeRange, cache: BlocksByStep): Promise<DueItem[]> => {
    const MAX_MS = 8.64e15 // the Date range: beyond it utcDay's toISOString throws
    if (![range.start, range.end].every((x) => Number.isFinite(x) && Math.abs(x) <= MAX_MS) || range.start > range.end) return []
    const from = utcDay(range.start)
    const to = utcDay(range.end)
    const today = clock()
    const out: { date: string; item: DueItem }[] = []
    for (const routine of await activeRoutines()) {
      let days: string[]
      try {
        days = await dueDays(routine, from, to, today, cache)
      } catch {
        continue // per-routine isolation: one routine's failure never blanks the lane (RT-13, ProviderEmitFailed)
      }
      for (const date of days) {
        out.push({
          date,
          item: {
            source_module: 'routines',
            ref_id: `${routine.id}|${date}`,
            label: routine.name,
            est_minutes: 0, // no estimate/urgency algorithm in M1 (the sessions/relationships precedent)
            urgency: 0,
            hard_deadline: Date.parse(`${date}T00:00:00Z`), // the platform date→ms convention (UTC midnight)
          },
        })
      }
    }
    // Deterministic: by day, then routine order (Array.prototype.sort is stable; `out` is already in routine order).
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((x) => x.item)
  }

  // The owner's live read realizing "auto-dropped/flagged, never a dangling row" (sessions BR :72-74): a pending routines block
  // whose occurrence closed BY TIME — the window has closed, or D is done (step grain, as settleBlock fulfils) — goes to
  // `skipped`. Never a running make-good (BR-RT-S6-5), never by lifecycle (paused is reversible). Per routine, best-effort.
  const dropClosedBlocks = async (cache: BlocksByStep): Promise<void> => {
    const today = clock()
    for (const routine of await activeRoutines()) {
      try {
        const window = validWindow(routine.id, prefs ? await prefs.policyFor(routine.id) : null)
        const rf = newReflection()
        for (const st of await liveSteps(routine.id)) {
          const blocks = await blocksOf(cache, st.id)
          for (const [i, b] of blocks.entries()) {
            const date = blockDate(b.source)
            if (date == null || !isPending(b)) continue
            const closed =
              (window !== undefined && addDays(date, window) < today) ||
              (await isDoneOn(st, await findCompletion(st.id, date), date, rf))
            if (!closed || (await isRunningMakeGood(b, st.id))) continue // the cheap time check first
            await bestEffort(async () => {
              await sessions.updatePlannedBlock(b.id, { status: 'skipped' })
              blocks[i] = { ...b, status: 'skipped' }
            })
          }
        }
      } catch {
        /* per-routine isolation: a malformed policy / port failure skips this routine's drops only */
      }
    }
  }

  // S9 (2b) — removeStep / archiveRoutine cancel their pending blocks (the S6 → S8 hand-off, absorbed). Best-effort.
  const cancelStepBlocks = (stepId: string): Promise<void> =>
    bestEffort(async () => {
      for (const b of await sessions.listPlannedBlocksForTarget('routine_step', stepId)) {
        if (isPending(b) && blockDate(b.source) != null) await sessions.updatePlannedBlock(b.id, { status: 'skipped' })
      }
    })

  // ── S8 helpers ──
  // A tag write needs a LIVE tag (Spaces' tagEntity doesn't check it — the tasks guard): unknown/deleted ⇒ TagNotFound, no row.
  const tagLive = async (tagId: string, entityType: RoutineLinkTarget['type'], entityId: string) => {
    if ((await tagsRepo.findById(tagId)) == null) throw new TagNotFound(tagId)
    return spaces.tagEntity(tagId, entityType, entityId)
  }
  // Live junction rows (Notes' documented read) ∩ LIVE tags (deleteTag doesn't cascade the junction). findWhere skips the
  // soft-delete filter ⇒ isNull(deleted_at) is explicit.
  const liveTagRows = async (entityType: RoutineLinkTarget['type'], entityId: string) => {
    const rows = await notes.getTagsForEntity(entityType, entityId)
    if (rows.length === 0) return rows
    const live = await tagsRepo.findWhere(and(inArray(tags.id, rows.map((r) => r.tag_id)), isNull(tags.deleted_at)) as SQL)
    const liveIds = new Set(live.map((t) => t.id))
    return rows.filter((r) => liveIds.has(r.tag_id))
  }
  // Routines guards its own side of a page link (the page isn't validated anywhere — no FK), by the target's type.
  const assertLinkTarget = async (target: RoutineLinkTarget): Promise<void> => {
    if (target.type === 'routine') await loadRoutineOrThrow(target.id)
    else await loadStepOrThrow(target.id)
  }

  // ── S7 — routine-level effects (PLAN-S7-effects.md, D3 + rule 21) ──
  // The routine's `award_xp` + `contribute_purpose_metric` fire on the WRITE whose date goes not-done → done (never on a read), only for a
  // scheduled occurrence, guarded by registry.resolve (N8), post-commit + isolated (rule 13). Keyed routine.id + completed:<date>.
  const EMITTED: readonly EffectType[] = ['award_xp', 'contribute_purpose_metric']
  type EmitCtx = { routine: RoutineRow; policy: RoutinePolicy | null }
  // Guard FIRST: no effects dep / no handler / no routine ⇒ null with zero reads. Any read failure ⇒ null (the write still runs, N2).
  const emitContext = async (routineId: string | null): Promise<EmitCtx | null> => {
    if (!effects || !EMITTED.some((t) => effects.registry.resolve(t)) || routineId == null) return null
    try {
      const routine = await routinesRepo.findById(routineId)
      if (!routine || routine.recurrence_rule == null) return null // no rule ⇒ no occurrences ⇒ nothing emits (S5 A6)
      return { routine, policy: prefs ? await prefs.policyFor(routineId) : null }
    } catch {
      return null
    }
  }
  // Policy-done for D from FRESH reads (steps incl. soft-deleted, the day's rows, a new reflection — N1); null when D is not an
  // occurrence (S4 E8: the caller picks the occurrence). `swap` rebuilds a before-state: one step's row replaced by its prior row (B1).
  const evalDone = async (
    ctx: EmitCtx,
    date: string,
    swap?: { stepId: string; row: RoutineCompletionRow | undefined },
  ): Promise<boolean | null> => {
    const rule = ctx.routine.recurrence_rule
    if (rule == null || !occurrences(rule, utcDay(ctx.routine.created_at), date, date).includes(date)) return null
    const all = await stepsRepo.findWhere(eq(routineStep.routine_id, ctx.routine.id) as SQL)
    const rows = new Map((await completionsBetween(all.map((st) => st.id), date, date)).get(date) ?? [])
    if (swap) {
      if (swap.row) rows.set(swap.stepId, swap.row)
      else rows.delete(swap.stepId)
    }
    return (await judgeDay(ctx.routine.id, all, rows, date, ctx.policy, newReflection())).status === 'done'
  }
  const doneOn = async (...args: Parameters<typeof evalDone>): Promise<boolean | null> => {
    try {
      return await evalDone(...args)
    } catch {
      return null // e.g. a malformed policy: no emission; the error surfaces on reads (rule 13)
    }
  }
  // Fire both types for (routine, date); returns true when a handler threw (G8 — the caller flags it).
  const fire = async (routineId: string, date: string): Promise<boolean> => {
    let failed = false
    for (const effectType of EMITTED) {
      if (!effects?.registry.resolve(effectType)) continue // dormant per type (N8)
      try {
        await effects.rail.applyEffect({ subjectNaturalKey: routineId, transition: `completed:${date}`, effectType, targetRef: routineId })
      } catch {
        failed = true // post-commit, isolated: the write stands (rule 13); flagged on drives, re-drivable for the contribution
      }
    }
    return failed
  }
  // A non-drive write on known dates: before → write → after; emit each date that went not-done → done.
  const withEmission = async <T>(routineId: string | null, dates: readonly string[], write: () => Promise<T>): Promise<T> => {
    const ctx = dates.length ? await emitContext(routineId) : null
    if (!ctx) return write()
    const days = [...new Set(dates)]
    const before = new Map<string, boolean | null>()
    for (const d of days) before.set(d, await doneOn(ctx, d))
    const result = await write()
    for (const d of days) {
      if (before.get(d) !== false) continue // not an occurrence / unreadable / already done (done → done never emits)
      if ((await doneOn(ctx, d)) === true) await fire(ctx.routine.id, d)
    }
    return result
  }
  // A drive (completeStep/runStep): the requested D is read before (reflection may change); a stamped date ≠ D (R5b / cross-midnight
  // focus) is non-reflecting, so its before-state is the post-write day with this step's prior row swapped back in (exact, B1).
  const driveWithEmission = async (step: RoutineStepRow, date: string, drive: () => Promise<StepRunState>): Promise<StepRunState> => {
    const ctx = await emitContext(step.routine_id)
    if (!ctx) return drive()
    const beforeD = await doneOn(ctx, date)
    const probe = new Map<string, RoutineCompletionRow | undefined>()
    priorRows.set(step.id, probe)
    let st: StepRunState
    try {
      st = await drive()
    } finally {
      priorRows.delete(step.id)
    }
    if (st.completion == null) return st // nothing stamped (e.g. in_progress) ⇒ no date written
    const day = st.date
    const before = day === date ? beforeD : probe.has(day) ? await doneOn(ctx, day, { stepId: step.id, row: probe.get(day) }) : null
    if (before !== false || (await doneOn(ctx, day)) !== true) return st
    const failed = await fire(ctx.routine.id, day)
    return failed && st.flag == null ? { ...st, flag: 'effect_emit_failed' } : st // the entity's regen failure keeps precedence
  }

  // BR-RT-S6-5 — a make-good BEGUN in-window (a guarded runStep(D) linked to D's block) is still open: completing it is
  // not a new make-good, so the window guard doesn't apply to it (contract.md:55 rejects a make-good begun PAST the window).
  const runningMakeGood = async (stepId: string, date: string): Promise<boolean> => {
    const b = await pendingBlock(stepId, date)
    return b != null && isRunningMakeGood(b, stepId) // ONE BR-RT-S6-5 check (S9 g2/critique N2)
  }

  // W1–W3 — the acceptance-window guard. The user's window, validated ONCE here and by loadWindow (no drift).
  const validWindow = (routineId: string, policy: RoutinePolicy | null | undefined): number | undefined => {
    const w = policy?.miss?.acceptance_window_days
    if (w !== undefined && !(Number.isInteger(w) && w >= 0)) throw new InvalidRoutinePolicyError(routineId, policy?.miss)
    return w
  }
  // A step with no routine (nullable FK-less column) has no user policy → no window.
  const windowOf = async (routineId: string | null): Promise<number | undefined> =>
    routineId == null ? undefined : validWindow(routineId, prefs ? await prefs.policyFor(routineId) : null)
  // Only a PAST date is judged (a malformed window never blocks a today/future write); no window ⇒ no guard (none invented).
  const assertWritable = async (step: RoutineStepRow, date: string): Promise<void> => {
    const today = clock()
    if (date >= today) return
    const w = await windowOf(step.routine_id)
    if (w !== undefined && addDays(date, w) < today) throw new OutsideAcceptanceWindowError(step.id, date, w) // = S5's real miss
  }

  // A session the routine just created must not outlive a failed link/complete (an open `work` session would block the
  // user's next startTimer; a `scheduled` one is invisible to findOpenSessionForEntity) — the startAttachedFocus compensation.
  const settleOrDrop = async (sessionId: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn()
    } catch (e) {
      await bestEffort(() => sessions.softDeleteSession(sessionId))
      throw e
    }
  }

  // S5c (3a) — a standard task is the RESPONSIBILITY; each occurrence is a Tasks `work` session (Duties D3; ADR-004 work_sessions→Tasks).
  // The routine never completes the Task itself.
  const driveTask = async (
    step: RoutineStepRow,
    taskId: string,
    date: string,
    minutes: number | null,
    mode: 'run' | 'complete',
  ): Promise<StepRunState> => {
    const task = await tasks.getTask(taskId)
    if (!task) throw new EntityUnavailableError(step.id, `task ${taskId} is missing or deleted`)
    if (task.kind === 'obligation') return driveObligation(step, task, date, minutes)
    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new EntityUnavailableError(step.id, `task ${taskId} is ${task.status} (the responsibility is closed)`)
    }
    const openOnStep = await sessions.findOpenSessionForEntity('work', 'routine_step', step.id)
    if (mode === 'run') {
      if (openOnStep) {
        // R5b — a linked make-good is D's; an unlinked re-entered occurrence reports its own start day (g2 N2: never re-linked)
        const day = (await blockDay(step.id, openOnStep.planned_block_id)) ?? (openOnStep.started_at != null ? utcDay(openOnStep.started_at) : date)
        return state(step, day, 'task', { status: 'in_progress', session_id: openOnStep.id })
      }
      const done = await findDone(step.id, date) // one occurrence per day: a done day starts nothing (the runFocus rule)
      if (done) return state(step, date, 'task', { completion: toRoutineCompletion(done) })
      let sessionId: string
      try {
        sessionId = (await tasks.startTimer(taskId)).id
      } catch (e) {
        if (e instanceof TimerAlreadyRunningError) {
          // A timer the user started in Tasks: adopt it as this occurrence (the N9 adoption pattern).
          const open = await sessions.findOpenSessionForEntity('work', 'task', taskId)
          if (!open) throw e
          sessionId = open.id
        } else if (e instanceof TimerNotWiredError || e instanceof SessionTypeNotFound) {
          throw new EntityUnavailableError(step.id, 'the tasks timer is not wired')
        } else if (e instanceof TaskNotFoundError) {
          throw new EntityUnavailableError(step.id, `task ${taskId} is missing or deleted`)
        } else throw e
      }
      // No drop on failure: the timer is the Task's own occurrence (fresh or adopted); the next runStep re-adopts + re-attaches it.
      await sessions.attach(sessionId, 'routine_step', step.id, 'instance')
      return state(step, date, 'task', { status: 'in_progress', session_id: sessionId })
    }
    // complete: stop the running occurrence (incl. one started in Tasks), else a bare check = a completed work occurrence.
    const open = openOnStep ?? (await sessions.findOpenSessionForEntity('work', 'task', taskId))
    if (open) {
      await sessions.attach(open.id, 'routine_step', step.id, 'instance') // link a Tasks-started occurrence before stopping (pin 10)
      const elapsed = nowMinutesSince(open.started_at)
      try {
        await tasks.stopTimer(open.id) // Tasks logs the time via its own log_time, then completes the session
      } catch (e) {
        if (e instanceof TimerNotWiredError) throw new EntityUnavailableError(step.id, 'the tasks timer is not wired')
        throw e
      }
      const day = (await blockDay(step.id, open.planned_block_id)) ?? date // R5b — a linked make-good stamps its D
      const completion = await stamp(step.id, day, minutes ?? elapsed)
      return state(step, day, 'task', { completion, session_id: open.id })
    }
    // One occurrence per day: re-checking a done day creates no session; the row still upserts (BR-RT-S3-1 minutes).
    if (await findDone(step.id, date)) return state(step, date, 'task', { completion: await stamp(step.id, date, minutes) })
    if ((await subTypeDef(newReflection(), 'work')) == null) {
      throw new EntityUnavailableError(step.id, 'the tasks timer is not wired (no work sub-type)')
    }
    const blk = await pendingBlock(step.id, date) // SS-8: a make-good is created carrying its block
    const created = await sessions.createSession({
      sub_type: 'work',
      scheduling_mode: blk ? 'planned' : 'ad_hoc',
      planned_block_id: blk?.id ?? null,
      status: 'in_progress',
      started_at: Date.now(),
    })
    await settleOrDrop(created.session.id, async () => {
      await sessions.attach(created.session.id, 'task', taskId, 'instance')
      await sessions.attach(created.session.id, 'routine_step', step.id, 'instance')
      await sessions.completeSession(created.session.id) // `work` declares effects:[] → no time log for a bare check
    })
    const completion = await stamp(step.id, date, minutes)
    return state(step, date, 'task', { completion, session_id: created.session.id })
  }

  // S5c (row 4) — any REGISTERED session sub-type, lifecycle-aware (pin 3); the session's about-entity is attached alongside.
  const driveSession = async (
    step: RoutineStepRow,
    r: Extract<Resolved, { target: 'session' }>,
    date: string,
    minutes: number | null,
    mode: 'run' | 'complete',
  ): Promise<StepRunState> => {
    const transitions = r.def.lifecycle.transitions
    const runningCapable = transitions.some((t) => t.from === 'in_progress' && t.event === 'complete')
    const open = runningCapable ? await sessions.findOpenSessionForEntity(r.subType, 'routine_step', step.id) : null
    const attachAll = async (id: string) => {
      await sessions.attach(id, 'routine_step', step.id, 'instance')
      if (r.about) await sessions.attach(id, r.about.type, r.about.id, 'instance')
    }
    if (mode === 'run' && runningCapable) {
      if (open) {
        const day = (await blockDay(step.id, open.planned_block_id)) ?? (open.started_at != null ? utcDay(open.started_at) : date) // R5b · g2 N2
        return state(step, day, 'session', { status: 'in_progress', session_id: open.id })
      }
      const done = await findDone(step.id, date)
      if (done) return state(step, date, 'session', { completion: toRoutineCompletion(done) })
      const blk = await pendingBlock(step.id, date) // SS-8
      const created = await sessions.createSession({
        sub_type: r.subType,
        scheduling_mode: blk ? 'planned' : 'ad_hoc',
        planned_block_id: blk?.id ?? null,
        status: 'in_progress',
        started_at: Date.now(),
      })
      await settleOrDrop(created.session.id, () => attachAll(created.session.id))
      return state(step, date, 'session', { status: 'in_progress', session_id: created.session.id })
    }
    if (open) {
      const elapsed = nowMinutesSince(open.started_at)
      await sessions.completeSession(open.id) // fires the owner's declared effects
      const day = (await blockDay(step.id, open.planned_block_id)) ?? date // R5b
      const completion = await stamp(step.id, day, minutes ?? elapsed)
      return state(step, day, 'session', { completion, session_id: open.id })
    }
    // One occurrence per day (as for a task): no second session; the row still upserts (BR-RT-S3-1).
    if (await findDone(step.id, date)) return state(step, date, 'session', { completion: await stamp(step.id, date, minutes) })
    const from = transitions.find((t) => t.event === 'complete')?.from
    if (from !== 'in_progress' && from !== 'scheduled') {
      throw new EntityUnavailableError(step.id, `session sub-type ${r.subType} declares no completable state`)
    }
    const blk = await pendingBlock(step.id, date) // SS-8
    const created = await sessions.createSession({
      sub_type: r.subType,
      scheduling_mode: blk ? 'planned' : 'ad_hoc',
      planned_block_id: blk?.id ?? null,
      status: from,
      ...(from === 'in_progress' ? { started_at: Date.now() } : {}),
    })
    await settleOrDrop(created.session.id, async () => {
      await attachAll(created.session.id)
      await sessions.completeSession(created.session.id)
    })
    const completion = await stamp(step.id, date, minutes)
    return state(step, date, 'session', { completion, session_id: created.session.id })
  }

  // S5c (row 8 / pin 7b) — a check-off step (or a legacy null-entity row) IS a Task: create + link it, cleaning up on failure.
  const linkCheckoffTask = async (step: RoutineStepRow): Promise<string> => {
    const task = await tasks.createTask({ title: step.title })
    try {
      await stepsRepo.update(step.id, { entity_type: 'task', entity_id: task.id })
    } catch (e) {
      await bestEffort(() => tasks.softDeleteTask(task.id))
      throw e
    }
    return task.id
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
  // attach() is idempotent and returns the existing row; detach() hard-deletes it. (Spine close = sessions-rescope #63.)
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
    const finishedDay = (await blockDay(step.id, s.session.planned_block_id)) ?? utcDay(f.updated_at) // R5b
    if (f.status === 'completed' && finishedDay === date) {
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

  // R5b (g2 B1/N1) — an attached focus linked to D's block makes this call about D, decided BEFORE the done check.
  const focusContext = async (step: RoutineStepRow, date: string) => {
    const attached = await attachedFocus(step.id)
    const linked = attached ? await blockDay(step.id, attached.session.planned_block_id) : null
    return { attached, linked, day: linked ?? date }
  }

  const runFocus = async (step: RoutineStepRow, requested: string): Promise<StepRunState> => {
    const { attached, linked, day: date } = await focusContext(step, requested)
    const done = await findDone(step.id, date)
    if (done) {
      // A finished focus linked to an already-stamped D (its earlier detach was swallowed) must not capture later runs.
      if (attached && linked && !isRunning(attached.extension)) {
        await bestEffort(() => detachFocus(attached.session.id, step.id))
        return runFocus(step, requested)
      }
      return state(step, date, 'focus', { completion: toRoutineCompletion(done) })
    }
    if (attached && isRunning(attached.extension) && (await dropIfAbandoned(attached, step.id))) {
      return startAttachedFocus(step, date)
    }
    if (attached) {
      if (isRunning(attached.extension)) {
        // A re-entered UNLINKED focus reports its own day (g2 N2): it is never re-linked to another date's block.
        return state(step, linked ?? focusDay(attached), 'focus', {
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

  const completeFocusStep = async (step: RoutineStepRow, requested: string): Promise<StepRunState> => {
    const { attached, day: date } = await focusContext(step, requested)
    const done = await findDone(step.id, date)
    if (done) return state(step, date, 'focus', { completion: toRoutineCompletion(done) })
    if (attached && isRunning(attached.extension) && (await dropIfAbandoned(attached, step.id))) {
      throw new EntityUnavailableError(step.id, 'the running focus session was abandoned (started before yesterday; cancelled)')
    }
    if (attached && isRunning(attached.extension)) {
      // R5b — a make-good linked to D's block is D's; else the day it started (may differ from `date` across UTC midnight)
      const occurrence = (await blockDay(step.id, attached.session.planned_block_id)) ?? focusDay(attached)
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

  // Shared drive for runStep/completeStep. Runs INSIDE the per-step lock on a step re-loaded there (pin 7b).
  const driveStep = async (
    step: RoutineStepRow,
    date: string,
    minutes: number | null,
    mode: 'run' | 'complete',
  ): Promise<StepRunState> => {
    const r = await resolveTarget(step, newReflection())
    switch (r?.target) {
      case 'task':
        return driveTask(step, r.entityId, date, minutes, mode)
      case 'checkoff':
        return driveTask(step, await linkCheckoffTask(step), date, minutes, mode) // legacy null-entity row: migrate on touch
      case 'habit':
        return driveHabit(step, r.entityId, date, minutes)
      case 'focus':
        return mode === 'run' ? runFocus(step, date) : completeFocusStep(step, date)
      case 'session':
        return driveSession(step, r, date, minutes, mode)
      default:
        throw new EntityUnavailableError(
          step.id,
          step.step_type === 'work'
            ? 'a work step needs a task ref (a work occurrence is always task-attached)'
            : `target not drivable (step_type=${String(step.step_type)}, entity_type=${String(step.entity_type)}): an unregistered session sub-type is a borrowed leg of its owner, and a half ref resolves to nothing`,
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

  // One query for the ledger rows of [from, to] across the routine's steps → date → (step → row). UNIQUE(step,date) ⇒ ≤1 row per step/day.
  type RowsByDate = Map<string, Map<string, RoutineCompletionRow>>
  const completionsBetween = async (stepIds: string[], from: string, to: string): Promise<RowsByDate> => {
    const byDate: RowsByDate = new Map()
    if (stepIds.length === 0) return byDate // perf shortcut (drizzle's inArray([]) would be a no-match, not an error)
    const rows = await completionsRepo.findWhere(
      and(
        gte(routineCompletions.completed_date, from),
        lte(routineCompletions.completed_date, to),
        inArray(routineCompletions.routine_step_id, stepIds),
      ) as SQL,
    )
    for (const r of rows) {
      let day = byDate.get(r.completed_date)
      if (!day) byDate.set(r.completed_date, (day = new Map()))
      day.set(r.routine_step_id, r)
    }
    return byDate
  }

  // E2 — done for `date` = the routine's own occurrence row (U1: the record of that occurrence, RT-5) OR the driven entity done AS OF
  // `date` in its own module (RT-3 reflects). Reflection only ADDS dones; a later change in the entity never rewrites D (a backfilled
  // stamp counts; a task reopened later doesn't erase D). Focus and session steps have no reflection source (only their own row).
  type CalendarCache = Map<string, Promise<{ date: string; done: boolean }[] | null>>
  // One reflection context per read call: task rows memoised per id, habit calendars per (habit, month) — S5 bounded queries.
  interface Reflection {
    calendars: CalendarCache
    tasks: Map<string, ReturnType<TasksService['getTask']>>
    subTypes: Map<string, Promise<SessionTypeDef | null>>
  }
  const newReflection = (): Reflection => ({ calendars: new Map(), tasks: new Map(), subTypes: new Map() })
  // A sub-type's registered def, or null when unregistered (SessionTypeNotFound); any other registry error propagates.
  const subTypeDef = (rf: Reflection, subType: string): Promise<SessionTypeDef | null> => {
    let p = rf.subTypes.get(subType)
    if (!p) {
      p = sessionRegistry.get(subType).catch((e: unknown) => {
        if (e instanceof SessionTypeNotFound) return null
        throw e
      })
      rf.subTypes.set(subType, p)
    }
    return p
  }
  const taskOnce = (rf: Reflection, id: string): ReturnType<TasksService['getTask']> => {
    let p = rf.tasks.get(id)
    if (!p) rf.tasks.set(id, (p = tasks.getTask(id)))
    return p
  }
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
    rf: Reflection,
  ): Promise<boolean> => {
    if (row != null && !row.skipped) return true
    const r = await resolveTarget(step, rf)
    if (r?.target === 'task') {
      // S5c — only an OBLIGATION reflects its own completion (TK-7, 3b); a standard task's occurrences are its work sessions,
      // recorded by the routine's own row (D3).
      const task = await taskOnce(rf, r.entityId)
      return (
        task?.kind === 'obligation' &&
        task.status === 'completed' &&
        task.completed_at != null &&
        utcDay(task.completed_at) <= date
      )
    }
    if (r?.target === 'habit' && habits) {
      const days = await habitMonth(habits, rf.calendars, r.entityId, date.slice(0, 7))
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

  // S4 E1b–E6 as ONE pure-over-loaded-data day judgment (shared by evaluateRoutine and the S5 occurrence walk).
  const judgeDay = async (
    routineId: string,
    all: RoutineStepRow[],
    rows: ReadonlyMap<string, RoutineCompletionRow>,
    date: string,
    policy: RoutinePolicy | null,
    rf: Reflection,
  ): Promise<RoutineEvaluation> => {
    const steps = stepsAsOf(all, date, new Set(rows.keys()))
    const doneFlags = await Promise.all(steps.map((st) => isDoneOn(st, rows.get(st.id), date, rf)))
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
  }

  // ── S5 — progress + analytics (PLAN-S5-progress-analytics.md) ──────
  // One load per call: routine, policy (window validated), all steps, the ledger rows for [from, to], one reflection context.
  const loadWindow = async (routine: RoutineRow, from: string, to: string) => {
    const routineId = routine.id
    const policy = prefs ? await prefs.policyFor(routineId) : null
    validWindow(routineId, policy)
    if (routine.recurrence_rule == null) return { routine, policy, all: [], rows: new Map() as RowsByDate, rf: newReflection() } // nothing to read
    const all = await stepsRepo.findWhere(eq(routineStep.routine_id, routineId) as SQL)
    const rows = await completionsBetween(all.map((st) => st.id), from, to)
    return { routine, policy, all, rows, rf: newReflection() }
  }
  type Window = Awaited<ReturnType<typeof loadWindow>>

  // A2–A4 — one occurrence's status. Today undone is pending (the day isn't over); paused/off neutralise only not-yet-real misses (A3);
  // a past undone day is pending inside the user's window, missed beyond it, unjudged when the user set no window (none invented).
  const classify = (ev: RoutineEvaluation, date: string, today: string, win: Window): OccurrenceStatus => {
    if (ev.status === 'done') return 'done'
    if (ev.applicable === 0) return 'neutral'
    const window = win.policy?.miss?.acceptance_window_days
    const cannotJudgeDone = ev.status === 'partial' && ev.policy_source === 'undefined'
    const realMiss = date !== today && window !== undefined && addDays(date, window) < today && !cannotJudgeDone
    // A3 — paused/off generate no misses: everything that is not ALREADY a real (final) miss is neutral.
    if (win.routine.lifecycle !== 'active') return realMiss ? 'missed' : 'neutral'
    if (date === today) return 'pending' // the day isn't over (RT-5 "at the timeframe's end")
    if (cannotJudgeDone || window === undefined) return 'unjudged' // no window/policy ⇒ never invent one
    return realMiss ? 'missed' : 'pending' // a real miss is final (RT-6, business-rules.md:120)
  }

  type Judged = { date: string; status: OccurrenceStatus; ev: RoutineEvaluation }
  // Expand once over [from, min(to, today)] and judge every occurrence; day judgments run in parallel (shared memo/caches).
  const judgeOccurrences = async (win: Window, from: string, to: string, today: string): Promise<Judged[]> => {
    const rule = win.routine.recurrence_rule
    if (rule == null) return []
    const upto = to < today ? to : today
    if (from > upto) return []
    const dates = occurrences(rule, utcDay(win.routine.created_at), from, upto)
    const evs = await Promise.all(
      dates.map((date) => judgeDay(win.routine.id, win.all, win.rows.get(date) ?? new Map(), date, win.policy, win.rf)),
    )
    return dates.map((date, i) => ({ date, status: classify(evs[i], date, today, win), ev: evs[i] }))
  }

  const rateOf = (js: Judged[]): RoutineCompletionRate => {
    const c = { scheduled: js.length, done: 0, missed: 0, pending: 0, neutral: 0, unjudged: 0 }
    for (const j of js) c[j.status] += 1
    const denom = c.done + c.missed
    return { ...c, rate: denom ? c.done / denom : null }
  }
  const sourceOf = (win: Window, js: Judged[]): 'user' | 'undefined' =>
    win.policy == null || js.some((j) => j.status === 'unjudged') ? 'undefined' : 'user'

  // A5 — the policy-derived streak.
  const streakOf = (js: Judged[]): Pick<RoutineStreak, 'current' | 'longest' | 'total'> => {
    let current = 0
    for (let i = js.length - 1; i >= 0; i--) {
      const st = js[i].status
      if (st === 'done') current += 1
      else if (st === 'missed' || st === 'unjudged') break
    }
    let longest = 0
    let run = 0
    for (const j of js) {
      if (j.status === 'done') longest = Math.max(longest, (run += 1))
      else if (j.status === 'missed' || j.status === 'unjudged') run = 0
    }
    return { current, longest, total: js.filter((j) => j.status === 'done').length }
  }

  // A8 — steps ranked over the judged (done/missed) days.
  const rankSteps = (win: Window, js: Judged[]): RoutineStepRank[] => {
    const byId = new Map(win.all.map((st) => [st.id, st]))
    const tally = new Map<string, { step: RoutineStepRow; done: number; applicable: number }>()
    for (const j of js) {
      if (j.status !== 'done' && j.status !== 'missed') continue
      const doneIds = new Set(j.ev.done.map((r) => r.step_id))
      for (const r of [...j.ev.done, ...j.ev.not_done]) {
        const step = byId.get(r.step_id)
        if (!step) continue
        const t = tally.get(r.step_id) ?? { step, done: 0, applicable: 0 }
        t.applicable += 1
        if (doneIds.has(r.step_id)) t.done += 1
        tally.set(r.step_id, t)
      }
    }
    return [...tally.values()]
      .map((t) => ({ ...t, rate: t.applicable ? t.done / t.applicable : null }))
      .sort((a, b) => {
        if (a.rate !== b.rate) return a.rate == null ? 1 : b.rate == null ? -1 : b.rate - a.rate
        if (a.done !== b.done) return b.done - a.done
        return bySequence(a.step, b.step)
      })
      .map((t) => ({ step_id: t.step.id, title: t.step.title, done: t.done, applicable: t.applicable, rate: t.rate }))
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
      for (const s of steps) await cancelStepBlocks(s.id) // S9 2b
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
      // S5c (row 1, Q1/RT-4) — a check-off step (no ref; step_type null or 'task') IS a Task: created only after every check passed.
      const isCheckoff = p.entity_type == null && p.entity_id == null && (p.step_type == null || p.step_type === 'task')
      if (!isCheckoff) return toRoutineStep(await stepsRepo.create(serializeStep(routineId, { ...p, step_order })))
      const task = await tasks.createTask({ title: p.title })
      try {
        return toRoutineStep(
          await stepsRepo.create(serializeStep(routineId, { ...p, step_order, entity_type: 'task', entity_id: task.id })),
        )
      } catch (e) {
        await bestEffort(() => tasks.softDeleteTask(task.id)) // no orphan responsibility
        throw e
      }
    },

    updateStep: async (stepId, patch) => {
      const p = UpdateStepSchema.parse(patch)
      assertEntityType(p.entity_type) // ignores null/undefined
      return serialized(stepId, async () => {
        // Incl. soft-deleted: updateStep on a removed step still succeeds (ratified, g2 N1 twin-repo behaviour, BR §4); only a truly
        // missing step is StepNotFoundError (was the repo's generic 'Row not found'), before any window error (S6 W1).
        const step = (await stepsRepo.findWhere(eq(routineStep.id, stepId) as SQL))[0]
        if (!step) throw new StepNotFoundError(stepId)
        // S7 — skip_dates is the planned-skip half of the occurrence record (RT-8): newly ADDED past dates take the S6 window guard
        // (the whole array is replaced, so an old past date already in it must not block an unrelated edit), then emission.
        const had = new Set(parseJsonArray<string>(step.skip_dates) ?? [])
        const added = p.skip_dates ? [...new Set(p.skip_dates)].filter((d) => !had.has(d)) : []
        for (const d of added) await assertWritable(step, d)
        return toRoutineStep(await withEmission(step.routine_id, added, () => stepsRepo.update(stepId, serializeStepUpdate(p))))
      })
    },

    removeStep: async (stepId) => {
      await stepsRepo.delete(stepId) // soft-delete; completion ledger cascade is S3/S8
      await cancelStepBlocks(stepId) // S9 2b — its pending reschedule blocks can no longer be made good
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
      // RT-3 — every step drives its entity FIRST, then stamps the routine's own occurrence row (N7). Re-load inside the lock.
      return serialized(stepId, async () => {
        const fresh = await loadStepOrThrow(step.id)
        if (!(await runningMakeGood(fresh.id, date))) await assertWritable(fresh, date) // S6 W3 — before any drive
        const st = await driveWithEmission(fresh, date, () => driveStep(fresh, date, minutes, 'complete')) // S7
        await settleBlock(fresh.id, st) // S6 R5 — inside the lock, keyed on the occurrence actually stamped
        return st
      })
    },

    runStep: async (stepId, input = {}) => {
      const p = RunStepSchema.parse(input)
      const step = await loadStepOrThrow(stepId)
      const date = p.date ?? clock()
      return serialized(stepId, async () => {
        const fresh = await loadStepOrThrow(step.id)
        if (!(await runningMakeGood(fresh.id, date))) await assertWritable(fresh, date) // S6 W3
        const st = await driveWithEmission(fresh, date, () => driveStep(fresh, date, null, 'run')) // S7
        await settleBlock(fresh.id, st) // S6 R5 — a started make-good is linked to D's block at once (R5b)
        return st
      })
    },

    rescheduleStep: async (stepId, input) => {
      const p = RescheduleStepSchema.parse(input)
      const date = p.date
      return serialized(stepId, async () => {
        const step = await loadStepOrThrow(stepId)
        const today = clock()
        if (date > today) throw new NotMissedOccurrenceError(stepId, date, 'future')
        await assertWritable(step, date) // W1–W2: beyond the window ⇒ OutsideAcceptanceWindowError
        const window = await windowOf(step.routine_id) // the slot's upper bound needs the user's window (R2)
        // R3 — what the make-good will drive (the S5c resolution); nothing is written before this passes.
        const rf = newReflection()
        const r = await resolveTarget(step, rf)
        const needWork = async () => {
          if ((await subTypeDef(rf, 'work')) == null) throw new EntityUnavailableError(stepId, 'the tasks timer is not wired')
        }
        let target: StepTarget
        let subType: string | null
        switch (r?.target) {
          case 'task': {
            const task = await taskOnce(rf, r.entityId)
            if (!task) throw new EntityUnavailableError(stepId, `task ${r.entityId} is missing or deleted`)
            target = 'task'
            if (task.kind === 'obligation') {
              if (task.status === 'cancelled') throw new EntityUnavailableError(stepId, `task ${task.id} is cancelled`)
              subType = null // TK-7: an obligation's occurrence is its own completion, no session
            } else {
              if (task.status === 'completed' || task.status === 'cancelled') {
                throw new EntityUnavailableError(stepId, `task ${task.id} is ${task.status} (the responsibility is closed)`)
              }
              await needWork()
              subType = 'work'
            }
            break
          }
          case 'checkoff':
            await needWork()
            target = 'task'
            subType = 'work'
            break
          case 'habit':
            if (!habits) throw new EntityUnavailableError(stepId, 'the habits service is not wired')
            target = 'habit'
            subType = null
            break
          case 'focus':
            target = 'focus'
            subType = 'focus'
            break
          case 'session':
            target = 'session'
            subType = r.subType
            break
          default:
            throw new EntityUnavailableError(stepId, 'target not drivable (see runStep)')
        }
        // R1 — make-good admissible at STEP level.
        if (step.routine_id == null) throw new NotMissedOccurrenceError(stepId, date, 'not_an_occurrence') // no routine, no cadence
        const routine = await loadRoutineOrThrow(step.routine_id)
        if (routine.lifecycle !== 'active') throw new NotMissedOccurrenceError(stepId, date, 'inactive') // A3 (S5 precedent)
        const rule = routine.recurrence_rule
        if (rule == null || !occurrences(rule, utcDay(routine.created_at), date, date).includes(date)) {
          throw new NotMissedOccurrenceError(stepId, date, 'not_an_occurrence')
        }
        const row = await findCompletion(stepId, date)
        if (stepsAsOf([step], date, new Set(row ? [stepId] : [])).length === 0) {
          throw new NotMissedOccurrenceError(stepId, date, 'not_in_step_set')
        }
        if ((parseJsonArray<string>(step.skip_dates) ?? []).includes(date)) {
          throw new NotMissedOccurrenceError(stepId, date, 'planned_skip')
        }
        if (await isDoneOn(step, row, date, rf)) throw new NotMissedOccurrenceError(stepId, date, 'done')
        // R2 — the slot: not before now, not before D's day, not past the last make-good day.
        const slotDay = utcDay(p.slot.start)
        if (p.slot.start < Date.now()) throw new InvalidRescheduleSlotError(stepId, 'before_now')
        if (slotDay < date) throw new InvalidRescheduleSlotError(stepId, 'before_occurrence') // defence-in-depth: start ≥ now and D ≤ today imply it
        if (window !== undefined && slotDay > addDays(date, window)) throw new InvalidRescheduleSlotError(stepId, 'past_window')
        if (r.target === 'checkoff') await linkCheckoffTask(step) // S5c migrate-on-touch (self-compensating)
        // R4 — one pending block per (step, D): a re-reschedule moves it.
        const existing = await pendingBlock(stepId, date)
        const block = existing
          ? await sessions.updatePlannedBlock(existing.id, { scheduled_start: p.slot.start, scheduled_end: p.slot.end ?? null })
          : await sessions.planBlock({
              scheduled_start: p.slot.start,
              scheduled_end: p.slot.end ?? null,
              sub_type: subType,
              target_type: 'routine_step',
              target_id: stepId,
              source: blockSource(date),
            })
        return state(step, date, target, { status: 'scheduled', planned_block_id: block.id })
      })
    },

    // ── S4 ──────────────────────────────────────────────────────────
    evaluateRoutine: async (routineId, input = {}) => {
      const p = EvaluateRoutineSchema.parse(input)
      await loadRoutineOrThrow(routineId) // archived/missing → RoutineNotFoundError (known limit for past-date reads, S5/S9)
      const date = p.date ?? clock()
      const all = await stepsRepo.findWhere(eq(routineStep.routine_id, routineId) as SQL) // one read (incl. soft-deleted, E1b)
      const rows = await completionsBetween(all.map((st) => st.id), date, date)
      const policy = prefs ? await prefs.policyFor(routineId) : null // a port throw propagates (fail loud)
      return judgeDay(routineId, all, rows.get(date) ?? new Map(), date, policy, newReflection())
    },

    // ── S5 ──────────────────────────────────────────────────────────
    getStreak: async (routineId) => {
      const today = clock()
      const routine = await loadRoutineOrThrow(routineId)
      const dtstart = utcDay(routine.created_at)
      const win = await loadWindow(routine, dtstart, today)
      if (win.routine.recurrence_rule == null) {
        return { current: 0, longest: 0, total: 0, policy_source: win.policy ? 'user' : 'undefined', unscheduled: true }
      }
      const js = await judgeOccurrences(win, dtstart, today, today)
      return { ...streakOf(js), policy_source: sourceOf(win, js) }
    },

    getAnalytics: async (routineId, range) => {
      const r: RoutineDateRange = RoutineDateRangeSchema.parse(range)
      const today = clock()
      const n = daysBetween(r.from, r.to) + 1
      const previous: RoutineDateRange = { from: addDays(r.from, -n), to: addDays(r.from, -1) }
      const routine = await loadRoutineOrThrow(routineId)
      const win = await loadWindow(routine, previous.from, r.to) // one load covers the range + the comparison range
      const both = await judgeOccurrences(win, previous.from, r.to, today) // ONE expansion, split at r.from
      const js = both.filter((j) => j.date >= r.from)
      const prev = both.filter((j) => j.date < r.from)
      const completion = rateOf(js)
      const prevCompletion = rateOf(prev)
      const out: RoutineAnalytics = {
        range: r,
        completion,
        ranking: rankSteps(win, js),
        comparison: {
          previous,
          completion: prevCompletion,
          rate_delta: completion.rate != null && prevCompletion.rate != null ? completion.rate - prevCompletion.rate : null,
        },
        policy_source: sourceOf(win, both),
      }
      if (win.routine.recurrence_rule == null) out.unscheduled = true
      return out
    },

    progress: async (routineId) => {
      const routine = await loadRoutineOrThrow(routineId)
      const stored = routine.progress == null ? null : routine.progress / 100 // the 0–100 override (projects precedent)
      if (stored != null) return resolveProgress(stored, () => null) // the override always wins (ADR-011 M3) — no derive needed
      const today = clock()
      const dtstart = utcDay(routine.created_at)
      const win = await loadWindow(routine, dtstart, today)
      const js = await judgeOccurrences(win, dtstart, today, today)
      return resolveProgress(null, () => rateOf(js).rate) // A10: the all-time completion rate; null when nothing judged
    },

    skipStep: async (stepId, input = {}) => {
      const p = SkipStepSchema.parse(input)
      const date = p.date ?? clock()
      return serialized(stepId, async () => {
        const step = await loadStepOrThrow(stepId)
        await assertWritable(step, date) // S6 — a skip is a miss write (BR:120)
        // RT-8 — a LOGGED skip on the day (completion row, skipped=true + reason). Distinct from a pre-planned skip.
        const row = await withEmission(step.routine_id, [date], () =>
          upsertCompletion(stepId, date, { skipped: true, skip_reason: p.reason ?? null, actual_duration_minutes: null }),
        ) // S7 — a neutral skip can reach policy-done
        await cancelBlock(stepId, date) // S6 R6
        return row
      })
    },

    planSkipDates: async (stepId, dates) => {
      const { dates: parsed } = PlanSkipDatesSchema.parse({ dates })
      return serialized(stepId, async () => {
        const step = await loadStepOrThrow(stepId)
        for (const d of parsed) await assertWritable(step, d) // S6 — any past date beyond the window rejects the whole list
        // RT-8 — pre-planned skips live in step.skip_dates (declared ahead, may be future). Merge, dedupe, sort.
        const had = new Set(parseJsonArray<string>(step.skip_dates) ?? [])
        const merged = [...new Set([...had, ...parsed])].sort()
        const added = parsed.filter((d) => !had.has(d))
        const row = await withEmission(step.routine_id, added, () => stepsRepo.update(stepId, { skip_dates: JSON.stringify(merged) })) // S7
        for (const d of parsed) await cancelBlock(stepId, d) // S6 R6
        return toRoutineStep(row)
      })
    },

    editCompletion: async (stepId, date, patch) => {
      RoutineCalendarDateSchema.parse(date) // S2c (B1) — a malformed date is a ZodError, not CompletionNotFoundError
      const p = EditRoutineCompletionSchema.parse(patch)
      return serialized(stepId, async () => {
        const step = await loadStepOrThrow(stepId)
        if ('skipped' in p) await assertWritable(step, date) // S6 — a skip/un-skip is a miss write (BR:120); other edits are free (RT-14)
        const existing = await findCompletion(stepId, date)
        if (!existing) throw new CompletionNotFoundError(stepId, date) // fail-loud (RT-5 edit path)
        const out: UpdateInput<typeof routineCompletions> = {}
        if ('skipped' in p) out.skipped = p.skipped
        if ('skip_reason' in p) out.skip_reason = p.skip_reason
        if ('actual_duration_minutes' in p) out.actual_duration_minutes = p.actual_duration_minutes
        const row = toRoutineCompletion(await withEmission(step.routine_id, [date], () => completionsRepo.update(existing.id, out))) // S7
        if (p.skipped === true) await cancelBlock(stepId, date) // S6 R6
        return row
      })
    },

    deleteCompletion: async (stepId, date) => {
      RoutineCalendarDateSchema.parse(date) // S2c (B1)
      return serialized(stepId, async () => {
        const existing = await findCompletion(stepId, date)
        if (!existing) throw new CompletionNotFoundError(stepId, date)
        // S7 (B2) — the step may be soft-deleted (its row keeps it in D's set); the unfiltered read is the rule-7 exception. Absent ⇒ no emission.
        const step = (await stepsRepo.findWhere(eq(routineStep.id, stepId) as SQL))[0]
        // HARD delete (softDelete:false — ledger has no deleted_at). Removing a skipped row can drop a step from D's set → done.
        await withEmission(step?.routine_id ?? null, [date], () => completionsRepo.delete(existing.id))
      })
    },

    contributeToPurposeMetrics: async (routineId, date) => {
      RoutineCalendarDateSchema.parse(date)
      const routine = await loadRoutineOrThrow(routineId)
      if (!effects || !effects.registry.resolve('contribute_purpose_metric')) return // dormant (the habits precedent)
      if (routine.recurrence_rule == null) return
      const ctx: EmitCtx = { routine, policy: prefs ? await prefs.policyFor(routineId) : null }
      if ((await evalDone(ctx, date)) !== true) return // not an occurrence / not done ⇒ nothing to contribute
      try {
        await effects.rail.applyEffect({
          subjectNaturalKey: routineId,
          transition: `completed:${date}`,
          effectType: 'contribute_purpose_metric',
          targetRef: routineId,
        })
      } catch (e) {
        throw new RoutineContributionError(routineId, date, e instanceof Error ? e.message : String(e)) // HAB-19 precedent
      }
    },

    // ── S8 — tags · notes · links (PLAN-S8, D2 / ROU-23/26). Writes via Spaces/Notes only (T1); fail loud on writes, never on reads (T2).
    tagRoutine: async (routineId, tagId) => {
      await loadRoutineOrThrow(routineId)
      return tagLive(tagId, 'routine', routineId)
    },
    untagRoutine: async (routineId, tagId) => {
      await loadRoutineOrThrow(routineId)
      await spaces.untagEntity(tagId, 'routine', routineId) // a deleted tag stays cleanable (no tag guard)
    },
    getRoutineTags: (routineId) => liveTagRows('routine', routineId),
    tagStep: async (stepId, tagId) => {
      await loadStepOrThrow(stepId)
      return tagLive(tagId, 'routine_step', stepId)
    },
    untagStep: async (stepId, tagId) => {
      await loadStepOrThrow(stepId)
      await spaces.untagEntity(tagId, 'routine_step', stepId)
    },
    getStepTags: (stepId) => liveTagRows('routine_step', stepId),

    getRoutineNote: async (routineId) => {
      const routine = await loadRoutineOrThrow(routineId) // a find-or-create is a write (T2)
      return notes.ensureEntityNote('note', 'routine', routineId, { title: routine.name }) // rule 19; seed is creation-only
    },
    getStepNote: async (stepId) => {
      const step = await loadStepOrThrow(stepId)
      return notes.ensureEntityNote('note', 'routine_step', stepId, { title: step.title })
    },

    linkPage: async (pageId, target, context) => {
      const p = LinkRoutinePageSchema.parse({ pageId, target, context })
      await assertLinkTarget(p.target)
      return spaces.createLink(p.pageId, p.target.type, p.target.id, p.context ?? null)
    },
    unlinkPage: async (pageId, target) => {
      const p = LinkRoutinePageSchema.parse({ pageId, target })
      await assertLinkTarget(p.target)
      await spaces.removeLink(p.pageId, p.target.type, p.target.id)
    },

    // ── S9 — providers (PLAN-S9 v2) ──
    dueIn: (range) => dueItems(range, new Map()),

    getDueReminders: async (range) => {
      const cache: BlocksByStep = new Map()
      try {
        await dropClosedBlocks(cache)
      } catch {
        /* the drop never fails the lane */
      }
      return dueItems(range, cache) // the same block lists (updated in memory after a drop)
    },

    summary: async (date) => {
      RoutineCalendarDateSchema.parse(date)
      const empty: SectionData = { sectionKey: 'summary', module: 'routines', dataPoints: ROUTINES_DATA_POINTS, state: 'empty', items: [] }
      const rows = await completionsRepo.findWhere(eq(routineCompletions.completed_date, date) as SQL)
      if (rows.length === 0) return empty
      // Unfiltered reads: steps/routines removed or archived since still carry their ledger (RT-17).
      const steps = await stepsRepo.findWhere(inArray(routineStep.id, [...new Set(rows.map((r) => r.routine_step_id))]) as SQL)
      const stepById = new Map(steps.map((st) => [st.id, st]))
      const routineIds = [...new Set(steps.map((st) => st.routine_id).filter((x): x is string => x != null))]
      if (routineIds.length === 0) return empty
      const owners = (await routinesRepo.findWhere(inArray(routines.id, routineIds) as SQL)).sort(byRoutineOrder)
      const items: RoutineDaySummaryItem[] = []
      for (const routine of owners) {
        const mine = rows
          .map((row) => ({ row, step: stepById.get(row.routine_step_id) }))
          .filter((x): x is { row: RoutineCompletionRow; step: RoutineStepRow } => x.step?.routine_id === routine.id)
          .sort((a, b) => bySequence(a.step, b.step))
        if (mine.length === 0) continue
        const item: RoutineDaySummaryItem = {
          routine_id: routine.id,
          name: routine.name,
          steps: mine.map(({ row, step }) => ({
            step_id: step.id,
            title: step.title,
            skipped: row.skipped,
            skip_reason: row.skip_reason,
            duration_minutes: row.actual_duration_minutes,
          })),
        }
        try {
          const all = await stepsRepo.findWhere(eq(routineStep.routine_id, routine.id) as SQL)
          const dayRows = new Map(mine.map(({ row, step }) => [step.id, row]))
          const policy = prefs ? await prefs.policyFor(routine.id) : null
          const ev = await judgeDay(routine.id, all, dayRows, date, policy, newReflection())
          item.status = ev.status
          item.policy_source = ev.policy_source
          item.not_done = ev.not_done
        } catch {
          /* per-routine isolation: the recap still lists what was done; the evaluation is omitted (RT-13) */
        }
        items.push(item)
      }
      return items.length ? { ...empty, state: 'success', items } : empty
    },

    listCompletions: async (stepId) => {
      // No soft-delete filter needed — the ledger has no deleted_at (RT-14 hard-delete table).
      const rows = await completionsRepo.findWhere(eq(routineCompletions.routine_step_id, stepId) as SQL)
      return rows.sort((a, b) => a.completed_date.localeCompare(b.completed_date)).map(toRoutineCompletion)
    },
  }

  return service
}
