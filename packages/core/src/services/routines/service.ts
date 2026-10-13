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
import type { Routine, RoutineStep } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { routines, routineStep, type RoutineRow, type RoutineStepRow } from '../../db/schema/routines'
import {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  AddStepSchema,
  UpdateStepSchema,
} from '../../validators/routine'
import {
  RoutineNotFoundError,
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

export function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[] } // M1.0: [E] fields dormant (→ M3/DB-5)

  const routinesRepo = createRepository(db, routines, { ...cfg, softDelete: true })
  const stepsRepo = createRepository(db, routineStep, { ...cfg, softDelete: true })

  const loadRoutineOrThrow = async (routineId: string): Promise<RoutineRow> => {
    const r = await routinesRepo.findById(routineId) // excludes soft-deleted
    if (!r) throw new RoutineNotFoundError(routineId) // fail-loud — no orphan step (no FK guards this, IR-3)
    return r
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
    step_order: p.step_order ?? 0,
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
      return toRoutine(await routinesRepo.create(serializeRoutine(p)))
    },

    updateRoutine: async (id, patch) => {
      const p = UpdateRoutineSchema.parse(patch)
      return toRoutine(await routinesRepo.update(id, serializeRoutineUpdate(p)))
    },

    archiveRoutine: async (id) => {
      // RT-17 / IR-3 app-cascade: soft-delete the routine, then its steps (no FK). The step→completion
      // hard-delete closer lands in S8 (the ledger ships in S3). Idempotent: already-deleted steps re-stamp.
      await routinesRepo.delete(id) // softDelete:true → sets deleted_at; ledger untouched
      const steps = await stepsRepo.findWhere(
        and(eq(routineStep.routine_id, id), isNull(routineStep.deleted_at)) as SQL,
      )
      for (const s of steps) await stepsRepo.delete(s.id)
    },

    getRoutine: async (id) => {
      const r = await routinesRepo.findById(id)
      return r ? toRoutine(r) : null
    },

    listRoutines: async (filter = {}) => {
      const conds: SQL[] = [isNull(routines.deleted_at)] // findWhere skips the soft-delete filter (IR-10)
      if (filter.lifecycle !== undefined) conds.push(eq(routines.lifecycle, filter.lifecycle))
      const rows = await routinesRepo.findWhere(and(...conds) as SQL)
      return rows.map(toRoutine)
    },

    // ── S2 ──────────────────────────────────────────────────────────
    addStep: async (routineId, step) => {
      const p = AddStepSchema.parse(step)
      await loadRoutineOrThrow(routineId) // RT-3 — fail-loud; no orphan step
      return toRoutineStep(await stepsRepo.create(serializeStep(routineId, p)))
    },

    updateStep: async (stepId, patch) => {
      const p = UpdateStepSchema.parse(patch)
      return toRoutineStep(await stepsRepo.update(stepId, serializeStepUpdate(p)))
    },

    removeStep: async (stepId) => {
      await stepsRepo.delete(stepId) // soft-delete; completion ledger cascade is S3/S8
    },

    reorderSteps: async (routineId, orderedStepIds) => {
      // Only steps that actually belong to this routine are reordered; foreign/unknown ids are ignored (IR-3).
      const live = await stepsRepo.findWhere(
        and(eq(routineStep.routine_id, routineId), isNull(routineStep.deleted_at)) as SQL,
      )
      const owned = new Set(live.map((s) => s.id))
      let order = 0
      for (const id of orderedStepIds) {
        if (!owned.has(id)) continue
        await stepsRepo.update(id, { step_order: order })
        order += 1
      }
    },

    listSteps: async (routineId) => {
      const rows = await stepsRepo.findWhere(
        and(eq(routineStep.routine_id, routineId), isNull(routineStep.deleted_at)) as SQL,
      )
      return rows.sort((a, b) => a.step_order - b.step_order).map(toRoutineStep)
    },
  }

  return service
}
