// ============================================================================
// services/habits — types (mod-habits #49 ① · S1 definition CRUD)
//
// Deps + the HabitsService interface + input types + typed errors. Factory-object
// shape, hoisted closures, no `this.` (the ② destructure-consumption shape; the
// finance/checkins precedent). S1 declares the definition-CRUD surface; S2–S5 append
// (completion ledger + streak engine · backfill · derivations · effect/seams) per
// docs/features/habits/delivery/slice-map.md.
// ============================================================================

import type { z } from 'zod'
import type { Habit, HabitCompletion, HabitType, LifeDomain } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type {
  CreateHabitSchema,
  UpdateHabitSchema,
  LogCompletionSchema,
  EditCompletionSchema,
} from '../../validators/habit'

export interface HabitsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** S2 — `asOf` clock for the streak recompute (YYYY-MM-DD); default = today. Injected for deterministic tests. */
  clock?: () => string
  // ── later slices append optional, deny-safe cross-module ports ──
  // effects? (S5 rail+registry) · contributions? (S5 Purpose ladder) · prefs? (S3 backfill window /
  // S5 push_habits) · associations? (S5 entity_tags) · notes? (S5 pages) — each defaults deny-safe.
}

// --- Zod-inferred input shapes (validators/habit.ts) ------------------------
export type CreateHabitInput = z.infer<typeof CreateHabitSchema>
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>
export type LogCompletionInput = z.infer<typeof LogCompletionSchema>
export type EditCompletionInput = z.infer<typeof EditCompletionSchema>

/** listHabits filter (HAB-04) — narrow the Dashboard / All-Habits read (M1). */
export interface HabitFilter {
  is_active?: boolean
  domain?: LifeDomain
  habit_type?: HabitType
}

/** HAB-01 / BR-S1-2 — a `custom` frequency with no `days_of_week` has no schedule (would never
 *  appear in the today-list); the create is refused, not silently persisted. */
export class HabitScheduleError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid habit schedule: ${reason}`)
    this.name = 'HabitScheduleError'
  }
}

export interface HabitsService {
  // ── S1: habit definition CRUD ────────────────────────────────────
  createHabit(input: CreateHabitInput): Promise<Habit>
  updateHabit(id: string, patch: UpdateHabitInput): Promise<Habit>
  softDeleteHabit(id: string): Promise<void>
  getHabit(id: string): Promise<Habit | null>
  listHabits(filter?: HabitFilter): Promise<Habit[]>

  // ── S2: completion ledger + streak recompute ─────────────────────
  /** HAB-07 — quick-check completion; UPSERT per (habit,date) (HB-3); recomputes the streak cache. */
  logCompletion(habitId: string, input?: LogCompletionInput): Promise<HabitCompletion>
  /** HAB-09 — detailed completion (mood/ratings/quantity); same upsert + recompute (HB-7). */
  logDetailedCompletion(habitId: string, input: LogCompletionInput): Promise<HabitCompletion>
  /** HAB-11 — edit an existing (habit,date) completion; re-derives the counters (HB-2). */
  editCompletion(habitId: string, date: string, patch: EditCompletionInput): Promise<HabitCompletion>
  /** HAB-12 — delete a completion (hard — ledger has no deleted_at); re-derives the counters (HB-2). */
  deleteCompletion(habitId: string, date: string): Promise<void>
}
