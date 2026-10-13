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
import type { Routine } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { routines, type RoutineRow } from '../../db/schema/routines'
import { CreateRoutineSchema, UpdateRoutineSchema } from '../../validators/routine'
import type {
  RoutinesService,
  RoutinesServiceDeps,
  CreateRoutineInput,
  UpdateRoutineInput,
} from './types'

// --- Row → @vida/types interface (DB-11; _sync_status string → union cast) ---
const toRoutine = (r: RoutineRow): Routine => ({
  ...r,
  _sync_status: r._sync_status as Routine['_sync_status'],
})

export function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[] } // M1.0: [E] fields dormant (→ M3/DB-5)

  const routinesRepo = createRepository(db, routines, { ...cfg, softDelete: true })

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
      await routinesRepo.delete(id) // softDelete:true → sets deleted_at; ledger untouched (RT-17)
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
  }

  return service
}
