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
import type { Habit, HabitCompletion, HabitType, LifeDomain, ProjectHabit } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type { AssociationResolver, TagAssociation } from '../../foundation/spaces'
import type {
  CreateHabitSchema,
  UpdateHabitSchema,
  LogCompletionSchema,
  EditCompletionSchema,
} from '../../validators/habit'

/** The `entity_type` habits registers in the shared taggable/pages registries (ADR-006 SP1 / Notes `pages`).
 *  A forward export consumed by tag reads + the ② page-linking surface (HAB-21/22). */
export const HABIT_ENTITY_TYPE = 'habit'

/** S5 HAB-16 — the effect rail + registry (the registry gates the guarded emit). Injected by M1.2 Gamification;
 *  dormant without a registered handler. Mirrors the checkins EffectsPort. */
export interface EffectsPort {
  rail: EffectRail
  registry: EffectRegistry
}

/** S3 — the Preferences window port (Preferences owns `habit_backfill_window_days`). `null` = no limit.
 *  PERMISSIVE / fail-OPEN by default (a user convenience policy, NOT a fail-closed security gate). */
export interface HabitsPrefsPort {
  backfillWindowDays(): Promise<number | null>
}

export interface HabitsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** S2 — `asOf` clock for the streak recompute (YYYY-MM-DD); default = today. Injected for deterministic tests. */
  clock?: () => string
  /** S3 — backfill window source (Preferences-owned). Absent → permissive (fail-OPEN): no limit. */
  prefs?: HabitsPrefsPort
  /** S5 — the effect rail (guarded completion fan-out; dormant without a registered handler). */
  effects?: EffectsPort
  /** S5 — the entity_tags resolver (Spaces-owned); absent → getEntityTags returns []. */
  associations?: AssociationResolver
}

// --- Zod-inferred input shapes (validators/habit.ts) ------------------------
export type CreateHabitInput = z.infer<typeof CreateHabitSchema>
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>
export type LogCompletionInput = z.infer<typeof LogCompletionSchema>
export type EditCompletionInput = z.infer<typeof EditCompletionSchema>

// --- S4 derived-read DTOs (service-local; @vida/types untouched — the finance-S3 precedent) -----------------
export interface HabitDateRange {
  from: string // YYYY-MM-DD (inclusive)
  to: string // YYYY-MM-DD (inclusive)
}
/** HAB-15 — the streak cache read (S2 keeps it fresh; HB-2). */
export interface StreakSummary {
  current: number
  longest: number
  total: number
}
/** HAB-15 — done ÷ scheduled over a range; `rate` null when `scheduled==0` (nothing due — not a silent 0). */
export interface CompletionRate {
  scheduled: number
  done: number
  rate: number | null
}
/** HAB-15 — a per-completion mood point over a range (charts are ②). */
export interface MoodPoint {
  date: string
  mood_before: number | null
  mood_after: number | null
  ease_rating: number | null
  satisfaction: number | null
}
/** HAB-15 — a completion in the calendar month (render is ②). */
export interface CalendarDay {
  date: string
  count: number
  done: boolean
}

/** fe-calendar S6 (EC-7) — one day of the cross-habit completion grid: `scheduled` = the BR-S2-4 predicate; `count`
 *  = that day's ledger count (0 when none); `done = count >= target_count`. An off-schedule completion keeps
 *  `scheduled:false` with its count/done (BR-HB-14). Mapping to a thread state is the consumer's (fe-calendar S7). */
export interface HabitGridDay {
  date: string
  scheduled: boolean
  count: number
  done: boolean
}
/** fe-calendar S6 (EC-7) — an active habit with one `HabitGridDay` per day of the range (inclusive, ascending). */
export interface HabitGridRow {
  habit: Habit
  days: HabitGridDay[]
}

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

/** HAB-13 / BR-S3-3/4 — a completion write for a future date, or a past date beyond the user's configured
 *  backfill window, is refused (no row written). */
export class BackfillWindowError extends Error {
  constructor(public readonly reason: string) {
    super(`Backfill rejected: ${reason}`)
    this.name = 'BackfillWindowError'
  }
}

/** HAB-19 — a purpose-metric contribution emit failed. Thrown from the standalone `contributeToPurposeMetrics`
 *  (the re-drivable path); the auto-fan-out catches it non-fatally (the completion already persisted, BR-S5-2). */
export class MetricContributionError extends Error {
  constructor(public readonly reason: string) {
    super(`Purpose-metric contribution failed: ${reason}`)
    this.name = 'MetricContributionError'
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

  // ── S3: backfill + window ────────────────────────────────────────
  /** HAB-13 — log/edit a completion for a PAST date; recomputes streaks (HB-2). Rejects a future date or a
   *  date beyond the user's configured backfill window with `BackfillWindowError` (HB-10). */
  backfillCompletion(
    habitId: string,
    pastDate: string,
    input?: Omit<LogCompletionInput, 'date'>,
  ): Promise<HabitCompletion>

  // ── S4: derived reads (read-only; the M5 measure seam) ───────────
  /** HAB-05 — active habits scheduled for today (grouping into display modes is ②). */
  getTodayHabits(): Promise<Habit[]>
  /** HAB-15 — the streak cache; also the M5 read seam (R7). */
  getStreak(habitId: string): Promise<StreakSummary>
  /** HAB-15 — completion-rate over a range (done ÷ scheduled); also the M5 read seam (R7). */
  getCompletionRate(habitId: string, range: HabitDateRange): Promise<CompletionRate>
  /** HAB-15 — per-completion mood points over a range. */
  getMoodTrend(habitId: string, range: HabitDateRange): Promise<MoodPoint[]>
  /** HAB-15 — the month's completions for the calendar view. */
  getCalendar(habitId: string, month: string): Promise<CalendarDay[]>

  // ── S5: cross-module seams (emit-only producer + associations) ────
  /** HAB-17 — emit the `contribute_purpose_metric` effect (Purpose owns the write, R2); throws
   *  `MetricContributionError` on emit failure (the re-drivable path). */
  contributeToPurposeMetrics(habitId: string, completion: HabitCompletion): Promise<void>
  /** HAB-21 — a habit's tags via the shared `entity_tags` primitive; deny-safe → [] without a resolver. */
  getEntityTags(entityType: string, entityId: string): Promise<TagAssociation[]>
  /** HAB-27 — associate a habit with a project (KEPT junction, C1); idempotent/resurrect-aware. */
  linkProject(habitId: string, projectId: string): Promise<ProjectHabit>
  /** HAB-27 — soft-delete a habit↔project association. */
  unlinkProject(habitId: string, projectId: string): Promise<void>
  /** HAB-27 — the project_ids a habit is associated with. */
  listProjectsForHabit(habitId: string): Promise<string[]>

  /** HB-6 journal-support — the day's due-habit count + how many are done (the Journal `/summary` consumption
   *  shape; used by the registered JournalContribution). */
  getDayCompletionDigest(date: string): Promise<{ due: number; done: number }>

  /** BR-HB-35 · fe-calendar S6 (EC-7) — the cross-habit completion grid the Global Calendar's habit threads read:
   *  every active, non-deleted habit (sort_order, then id) × every day of `[from, to]`. One ledger query. An inverted or
   *  malformed range walks zero days (the S4 range reads don't validate — BR-HB-28 throws only for a missing habit). */
  getCompletionGrid(range: HabitDateRange): Promise<HabitGridRow[]>
}
