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

import { and, eq, isNull, type SQL } from 'drizzle-orm'
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
  SetRoutineLifecycleSchema,
  RoutineCalendarDateSchema,
} from '../../validators/routine'
import { UnknownEntityType } from '../../foundation/spaces/types'
import {
  RoutineNotFoundError,
  StepNotFoundError,
  CompletionNotFoundError,
  InvalidRecurrenceRuleError,
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
  const { db, deviceId, registry } = deps
  const clock = deps.clock ?? (() => new Date().toISOString().slice(0, 10)) // YYYY-MM-DD, default today
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
    return rows.sort(
      (a, b) => a.step_order - b.step_order || a.created_at - b.created_at || byCodepoint(a.id, b.id),
    )
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
      // RT-5 — a DONE occurrence. skipped=false; a prior logged-skip on the same date flips to done (upsert).
      return upsertCompletion(stepId, p.date ?? clock(), {
        skipped: false,
        skip_reason: null,
        actual_duration_minutes: p.actual_duration_minutes ?? null,
      })
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
