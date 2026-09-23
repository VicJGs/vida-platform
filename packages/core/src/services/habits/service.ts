// ============================================================================
// services/habits — the service (mod-habits #49 ① · S1 definition CRUD)
//
// CRUD over the finished DB-4 `017_habits` `habits` table. Factory-object, hoisted
// closures, no `this.` (the ② destructure shape; the finance/checkins precedent).
// Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through (HAB-26 → M3/DB-5).
// habits carries deleted_at → softDelete:true (HB-11 soft-delete preserves the ledger;
// the hard-delete cascade is not an M1.0 op — no hard-delete surface here).
//
// create() ECHOES the input row (not a DB re-read), so serializeHabit backfills every
// notNull-default column + coalesces nullables to null → the returned row is FAITHFUL
// (repository-create-returns-input-row seam). The derived streak cache is written at its
// 0-defaults only; recompute is S2 (never here — the cache is derived-from-ledger, HB-2).
// Row → @vida/types: parse the JSON arrays + a single `_sync_status` string→union cast +
// coalesce the nullable-with-default time_of_day (drizzle-row-not-assignable seam).
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { Habit } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { habits, type HabitRow } from '../../db/schema/habits'
import { CreateHabitSchema, UpdateHabitSchema } from '../../validators/habit'
import {
  HabitScheduleError,
  type HabitsService,
  type HabitsServiceDeps,
  type CreateHabitInput,
  type UpdateHabitInput,
} from './types'

// Defensive JSON read (the checkins parseJson boundary): the service is the only writer, but a future
// sync row / manual DB edit could carry malformed JSON — degrade to the fallback, never throw an opaque
// SyntaxError out of a read. `[FACT: services/checkins/service.ts:66-73]`
function parseJsonArray<T>(value: string | null): T[] | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as T[]
  } catch {
    return null
  }
}

// --- Row → @vida/types interface (JSON arrays parsed; time_of_day coalesced; _sync_status cast) ---
const toHabit = (r: HabitRow): Habit => ({
  ...r,
  days_of_week: parseJsonArray<number>(r.days_of_week),
  times_of_day: parseJsonArray<string>(r.times_of_day),
  time_of_day: (r.time_of_day ?? 'anytime') as Habit['time_of_day'], // DB default guarantees a value (BR-S1-3)
  _sync_status: r._sync_status as Habit['_sync_status'],
})

export function createHabitsService(deps: HabitsServiceDeps): HabitsService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }

  const habitsRepo = createRepository(db, habits, cfg)

  // --- serialize create: backfill notNull-defaults + coalesce nullables to null (faithful echo) ---
  const serializeHabit = (p: CreateHabitInput): CreateInput<typeof habits> => ({
    name: p.name,
    description: p.description ?? null,
    habit_type: p.habit_type ?? 'build',
    frequency: p.frequency ?? 'daily',
    days_of_week: p.days_of_week == null ? null : JSON.stringify(p.days_of_week),
    target_count: p.target_count ?? 1,
    unit: p.unit ?? null,
    time_of_day: p.time_of_day ?? 'anytime',
    times_of_day: p.times_of_day == null ? null : JSON.stringify(p.times_of_day),
    cue: p.cue ?? null,
    reward: p.reward ?? null,
    domain: p.domain ?? null,
    current_streak: 0, // derived cache — 0 at birth; recompute is S2 (HB-2)
    longest_streak: 0,
    total_completions: 0,
    is_active: p.is_active ?? true,
    sort_order: p.sort_order ?? 0,
    measurement_kind: p.measurement_kind ?? 'rate', // ADR-011 M1 natural (HB-13)
    binding_mode: p.binding_mode ?? null, // null ⇒ derive event-trigger (nullable enum — do not drop, g1 NIT-1)
    success_criteria: p.success_criteria ?? null,
    difficulty: p.difficulty ?? null,
    deleted_at: null,
  })

  // --- serialize update: only the keys the caller sent; JSON-encode the arrays if present ---
  const serializeUpdate = (p: UpdateHabitInput): UpdateInput<typeof habits> => {
    const { days_of_week, times_of_day, ...rest } = p
    const out: UpdateInput<typeof habits> = { ...rest }
    if ('days_of_week' in p) out.days_of_week = days_of_week == null ? null : JSON.stringify(days_of_week)
    if ('times_of_day' in p) out.times_of_day = times_of_day == null ? null : JSON.stringify(times_of_day)
    return out
  }

  const assertSchedule = (frequency: string | undefined, daysOfWeek: number[] | null | undefined): void => {
    if (frequency === 'custom' && (daysOfWeek == null || daysOfWeek.length === 0)) {
      throw new HabitScheduleError('a custom-frequency habit requires days_of_week')
    }
  }

  const service: HabitsService = {
    createHabit: async (input) => {
      const p = CreateHabitSchema.parse(input)
      assertSchedule(p.frequency, p.days_of_week) // BR-S1-2
      return toHabit(await habitsRepo.create(serializeHabit(p)))
    },

    updateHabit: async (id, patch) => {
      const p = UpdateHabitSchema.parse(patch)
      // Re-validate the schedule if the patch changes frequency to custom without clearing days_of_week
      // in the same patch (an existing schedule on the row is left to the caller — S1 guards the patch itself).
      if (p.frequency === 'custom') assertSchedule(p.frequency, p.days_of_week)
      return toHabit(await habitsRepo.update(id, serializeUpdate(p)))
    },

    softDeleteHabit: async (id) => {
      await habitsRepo.delete(id) // softDelete:true → sets deleted_at; ledger untouched (HB-11)
    },

    getHabit: async (id) => {
      const r = await habitsRepo.findById(id) // excludes soft-deleted
      return r ? toHabit(r) : null
    },

    listHabits: async (filter = {}) => {
      // findWhere skips the soft-delete filter (IR-3) → add isNull(deleted_at) explicitly.
      const conds: SQL[] = [isNull(habits.deleted_at)]
      if (filter.is_active !== undefined) conds.push(eq(habits.is_active, filter.is_active))
      if (filter.domain !== undefined) conds.push(eq(habits.domain, filter.domain))
      if (filter.habit_type !== undefined) conds.push(eq(habits.habit_type, filter.habit_type))
      const rows = await habitsRepo.findWhere(and(...conds) as SQL)
      return rows.map(toHabit)
    },
  }

  return service
}
