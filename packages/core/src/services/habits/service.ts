// ============================================================================
// services/habits — the service (mod-habits #49 ①)
//
// S1 (definition CRUD + @vida/types reconcile) + S2 (completion ledger + streak-recompute engine).
// Factory-object, hoisted closures, no `this.` (the ② destructure shape; the finance/checkins precedent).
// Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through (HAB-26 → M3/DB-5).
//   habits           → softDelete:true  (HB-11 soft-delete preserves the ledger; no hard-delete surface in M1.0)
//   habit_completions → softDelete:false (ledger — no deleted_at; a delete is a hard delete)
//
// create() ECHOES the input row (not a DB re-read), so serialize*() backfills every notNull-default column +
// coalesces nullables to null → the returned row is FAITHFUL (repository-create-returns-input-row seam).
// The streak cache (current/longest/total_completions) is a PROJECTION recomputed from the ledger on every
// completion mutation (HB-2) — never hand-incremented; a stale cache self-heals on the next recompute.
// ============================================================================

import { and, eq, gte, isNull, lte, type SQL } from 'drizzle-orm'
import type { Habit, HabitCompletion, EffectType, ProjectHabit } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  habits,
  habitCompletions,
  projectHabits,
  type HabitRow,
  type HabitCompletionRow,
  type ProjectHabitRow,
} from '../../db/schema/habits'
import { CreateHabitSchema, UpdateHabitSchema, LogCompletionSchema, EditCompletionSchema } from '../../validators/habit'
import {
  HabitScheduleError,
  BackfillWindowError,
  MetricContributionError,
  type HabitsService,
  type HabitsServiceDeps,
  type CreateHabitInput,
  type UpdateHabitInput,
  type LogCompletionInput,
  type EditCompletionInput,
  type HabitDateRange,
  type StreakSummary,
  type CompletionRate,
  type MoodPoint,
  type CalendarDay,
  type HabitGridDay,
  type HabitGridRow,
} from './types'

// The 3 S4-catalogue effects a DONE completion fans out (HAB-16). Producer-only — habits emits, never handles.
const COMPLETION_EFFECTS: readonly EffectType[] = ['complete_habit_occurrence', 'contribute_purpose_metric', 'award_xp']

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

// --- Row → @vida/types interface ---
const toHabit = (r: HabitRow): Habit => ({
  ...r,
  days_of_week: parseJsonArray<number>(r.days_of_week),
  times_of_day: parseJsonArray<string>(r.times_of_day),
  time_of_day: (r.time_of_day ?? 'anytime') as Habit['time_of_day'], // DB default guarantees a value (BR-S1-3)
  _sync_status: r._sync_status as Habit['_sync_status'],
})
const toCompletion = (r: HabitCompletionRow): HabitCompletion => ({
  ...r,
  _sync_status: r._sync_status as HabitCompletion['_sync_status'],
})
const toProjectHabit = (r: ProjectHabitRow): ProjectHabit => ({
  ...r,
  _sync_status: r._sync_status as ProjectHabit['_sync_status'],
})

// --- S2 streak engine (pure) -------------------------------------------------
const DAY_MS = 86_400_000
const toDayNum = (d: string): number => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY_MS)
const fromDayNum = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10)
const weekday = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay() // 0=Sun … 6=Sat (schema [0-6], 0=Sun)

/** BR-S2-4 — a scheduled occurrence: daily → every day; else → weekday ∈ days_of_week. The weekly/biweekly/
 *  monthly PERIOD is NOT modeled here (the `rate`-derivation design-pass, rerun §5:146). Shared with S4's today-list. */
const isScheduledOn = (habit: HabitRow, date: string): boolean => {
  if (habit.frequency === 'daily') return true
  const dow = parseJsonArray<number>(habit.days_of_week) ?? []
  return dow.includes(weekday(date))
}

interface StreakCache {
  current_streak: number
  longest_streak: number
  total_completions: number
}

/** BR-S2-5 — deterministic recompute from the ledger (HB-2). Generalizes checkins.computeStreak from
 *  consecutive-days to consecutive-scheduled-occurrences. `asOf` injected for determinism.
 *  total_completions = ALL done rows (incl. off-schedule, BR-S2-6); the streak counts only scheduled done dates. */
const recomputeStreak = (habit: HabitRow, completions: HabitCompletionRow[], asOf: string): StreakCache => {
  const target = habit.target_count
  const doneDates = new Set(completions.filter((c) => c.count >= target).map((c) => c.completed_date))
  if (doneDates.size === 0) return { current_streak: 0, longest_streak: 0, total_completions: 0 }

  // Future-dated done rows (> asOf) count in total_completions (doneDates.size) but are EXCLUDED from the walk
  // (the loop ends at asOf) — a completion that hasn't happened yet cannot advance a streak. So an all-future
  // ledger yields {current:0, longest:0, total:n>0} by construction. S3's backfill window rejects future dates. (g2 NIT-1)
  const earliest = [...doneDates].sort()[0] as string
  const end = toDayNum(asOf)
  let run = 0
  let longest = 0
  for (let n = toDayNum(earliest); n <= end; n++) {
    const d = fromDayNum(n)
    if (!isScheduledOn(habit, d)) continue // off-schedule days are transparent (BR-S2-4)
    if (doneDates.has(d)) {
      run += 1 // done-branch FIRST — a scheduled-AND-done asOf counts (NIT-1)
      if (run > longest) longest = run
    } else if (d === asOf) {
      // today scheduled but not yet done → not a miss yet (grace, the checkins gap≤1 analog) — skip
    } else {
      run = 0 // a missed elapsed scheduled occurrence resets (no grace, HB-2)
    }
  }
  return { current_streak: run, longest_streak: longest, total_completions: doneDates.size }
}

export function createHabitsService(deps: HabitsServiceDeps): HabitsService {
  const { db, deviceId } = deps
  const clock = deps.clock ?? (() => new Date().toISOString().slice(0, 10))
  // S3 — permissive (fail-OPEN) default: no port → no window limit (a user convenience policy, NOT a
  // fail-closed security gate; the OPPOSITE of the effects/contributions security ports). BR-S3-4.
  const prefs = deps.prefs ?? { backfillWindowDays: async (): Promise<number | null> => null }
  const cfg = { deviceId, encryptedFields: [] as string[] }

  const habitsRepo = createRepository(db, habits, { ...cfg, softDelete: true })
  const completionsRepo = createRepository(db, habitCompletions, { ...cfg, softDelete: false }) // ledger — hard delete
  const projectHabitsRepo = createRepository(db, projectHabits, { ...cfg, softDelete: true }) // KEPT junction (C1)
  const { effects, associations } = deps

  // BR-S5-1 — a DONE completion fans out the 3 S4 effects, each GUARDED (no handler → no-op) and POST-COMMIT.
  // The rail dedups by (subjectNaturalKey|transition|effectType|targetRef) → re-firing the same (habit,date) is a
  // safe no-op (R1). Emitted from every done-leaving mutation (log/detailed/backfill/edit), gated on done-state.
  const emitCompletionEffect = async (habit: HabitRow, date: string, effectType: EffectType): Promise<void> => {
    if (!effects || !effects.registry.resolve(effectType)) return // dormant
    await effects.rail.applyEffect({
      subjectNaturalKey: habit.id,
      transition: `completed:${date}`,
      effectType,
      targetRef: habit.id,
    })
  }
  const emitCompletionEffects = async (habit: HabitRow, completion: HabitCompletionRow): Promise<void> => {
    if (completion.count < habit.target_count) return // only DONE completions fan out (HB-5)
    for (const t of COMPLETION_EFFECTS) {
      try {
        await emitCompletionEffect(habit, completion.completed_date, t)
      } catch {
        // post-commit, failure-isolated (BR-S5-2): the persisted completion stands; a handler throw is non-fatal.
      }
    }
  }

  // --- S1 serialize (faithful echo) ---
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

  const serializeHabitUpdate = (p: UpdateHabitInput): UpdateInput<typeof habits> => {
    const { days_of_week, times_of_day, ...rest } = p
    const out: UpdateInput<typeof habits> = { ...rest }
    if ('days_of_week' in p) out.days_of_week = days_of_week == null ? null : JSON.stringify(days_of_week)
    if ('times_of_day' in p) out.times_of_day = times_of_day == null ? null : JSON.stringify(times_of_day)
    return out
  }

  // --- S2 serialize (completion) ---
  const serializeCompletionCreate = (
    habitId: string,
    date: string,
    p: LogCompletionInput,
  ): CreateInput<typeof habitCompletions> => ({
    habit_id: habitId,
    completed_date: date,
    count: p.count ?? 1,
    value: p.value ?? null,
    mood_before: p.mood_before ?? null,
    mood_after: p.mood_after ?? null,
    ease_rating: p.ease_rating ?? null,
    satisfaction: p.satisfaction ?? null,
    location: p.location ?? null,
    completion_time: p.completion_time ?? null,
  })
  // re-log / edit patch: only the keys the caller sent (never null-blanks an unpassed field).
  const serializeCompletionPatch = (p: LogCompletionInput | EditCompletionInput): UpdateInput<typeof habitCompletions> => {
    const out: UpdateInput<typeof habitCompletions> = {}
    for (const k of ['count', 'value', 'mood_before', 'mood_after', 'ease_rating', 'satisfaction', 'location', 'completion_time'] as const) {
      if (k in p) (out as Record<string, unknown>)[k] = (p as Record<string, unknown>)[k]
    }
    return out
  }

  const assertSchedule = (frequency: string | undefined, daysOfWeek: number[] | null | undefined): void => {
    if (frequency === 'custom' && (daysOfWeek == null || daysOfWeek.length === 0)) {
      throw new HabitScheduleError('a custom-frequency habit requires days_of_week')
    }
  }

  const loadHabitOrThrow = async (habitId: string): Promise<HabitRow> => {
    const habit = await habitsRepo.findById(habitId) // excludes soft-deleted
    if (!habit) throw new Error(`Habit not found: ${habitId}`) // fail-loud — no orphan completion (no FK guards this)
    return habit
  }

  // BR-S2-5/7 — recompute the cache from the ledger + schedule, write it to the habit row.
  const recomputeAndCache = async (habit: HabitRow): Promise<void> => {
    const comps = await completionsRepo.findWhere(eq(habitCompletions.habit_id, habit.id) as SQL)
    await habitsRepo.update(habit.id, recomputeStreak(habit, comps, clock()))
  }

  const findCompletion = async (habitId: string, date: string): Promise<HabitCompletionRow | undefined> => {
    const rows = await completionsRepo.findWhere(
      and(eq(habitCompletions.habit_id, habitId), eq(habitCompletions.completed_date, date)) as SQL,
    )
    return rows[0]
  }

  // BR-S3-3/4 — guard a NEW dated write: reject a future date (lexical) or a past date beyond the window
  // (day-math). Today (date === asOf) passes both. Runs BEFORE any write (BR-S3-5: reject → no row).
  const assertDateWritable = async (date: string, asOf: string): Promise<void> => {
    if (date > asOf) throw new BackfillWindowError(`date ${date} is in the future`)
    if (date < asOf) {
      const w = await prefs.backfillWindowDays() // null = no limit (permissive default)
      if (w != null && toDayNum(date) < toDayNum(asOf) - w) {
        throw new BackfillWindowError(`date ${date} is beyond the ${w}-day backfill window`)
      }
    }
  }

  // shared log/detailed/backfill path — UPSERT per (habit,date) (HB-3) then recompute.
  const upsertCompletion = async (habitId: string, input: LogCompletionInput): Promise<HabitCompletion> => {
    const p = LogCompletionSchema.parse(input)
    const habit = await loadHabitOrThrow(habitId)
    const asOf = clock() // read once (avoids a UTC-midnight straddle between the default-date and the guard, g2 N2)
    const date = p.date ?? asOf
    await assertDateWritable(date, asOf) // BR-S3-2 — on the shared path so logCompletion can't bypass it
    const existing = await findCompletion(habitId, date)
    const row = existing
      ? await completionsRepo.update(existing.id, serializeCompletionPatch(p))
      : await completionsRepo.create(serializeCompletionCreate(habitId, date, p))
    await recomputeAndCache(habit)
    await emitCompletionEffects(habit, row) // BR-S5-1 — fan out on done (guarded, post-commit, idempotent)
    return toCompletion(row)
  }

  const service: HabitsService = {
    // ── S1 ──────────────────────────────────────────────────────────
    createHabit: async (input) => {
      const p = CreateHabitSchema.parse(input)
      assertSchedule(p.frequency, p.days_of_week) // BR-S1-2
      return toHabit(await habitsRepo.create(serializeHabit(p)))
    },

    updateHabit: async (id, patch) => {
      const p = UpdateHabitSchema.parse(patch)
      if (p.frequency === 'custom') assertSchedule(p.frequency, p.days_of_week)
      return toHabit(await habitsRepo.update(id, serializeHabitUpdate(p)))
    },

    softDeleteHabit: async (id) => {
      await habitsRepo.delete(id) // softDelete:true → sets deleted_at; ledger untouched (HB-11)
    },

    getHabit: async (id) => {
      const r = await habitsRepo.findById(id)
      return r ? toHabit(r) : null
    },

    listHabits: async (filter = {}) => {
      const conds: SQL[] = [isNull(habits.deleted_at)] // findWhere skips the soft-delete filter (IR-3)
      if (filter.is_active !== undefined) conds.push(eq(habits.is_active, filter.is_active))
      if (filter.domain !== undefined) conds.push(eq(habits.domain, filter.domain))
      if (filter.habit_type !== undefined) conds.push(eq(habits.habit_type, filter.habit_type))
      const rows = await habitsRepo.findWhere(and(...conds) as SQL)
      return rows.map(toHabit)
    },

    // ── S2 ──────────────────────────────────────────────────────────
    logCompletion: (habitId, input = {}) => upsertCompletion(habitId, input),
    logDetailedCompletion: (habitId, input) => upsertCompletion(habitId, input),

    editCompletion: async (habitId, date, patch) => {
      const p = EditCompletionSchema.parse(patch)
      const habit = await loadHabitOrThrow(habitId)
      const existing = await findCompletion(habitId, date)
      if (!existing) throw new Error(`Completion not found: ${habitId} @ ${date}`) // fail-loud (HB-2 edit path)
      const row = await completionsRepo.update(existing.id, serializeCompletionPatch(p))
      await recomputeAndCache(habit)
      await emitCompletionEffects(habit, row) // B1 — an edit that flips partial→done must fire (idempotent on re-edit)
      return toCompletion(row)
    },

    deleteCompletion: async (habitId, date) => {
      const habit = await loadHabitOrThrow(habitId)
      const existing = await findCompletion(habitId, date)
      if (!existing) throw new Error(`Completion not found: ${habitId} @ ${date}`)
      await completionsRepo.delete(existing.id) // hard delete (softDelete:false)
      await recomputeAndCache(habit)
    },

    // ── S3 ──────────────────────────────────────────────────────────
    // A backfill IS a dated completion in the past → the same upsert path (which carries the window guard).
    backfillCompletion: (habitId, pastDate, input = {}) => upsertCompletion(habitId, { ...input, date: pastDate }),

    // ── S4: derived reads (read-only) ─────────────────────────────────
    getTodayHabits: async () => {
      const today = clock()
      // read ROWS directly (isScheduledOn takes a HabitRow — one predicate, no Habit overload; g1 NIT-1/2)
      const rows = await habitsRepo.findWhere(and(isNull(habits.deleted_at), eq(habits.is_active, true)) as SQL)
      return rows.filter((r) => isScheduledOn(r, today)).map(toHabit) // IR-8: custom w/ empty days_of_week never matches
    },

    getStreak: async (habitId): Promise<StreakSummary> => {
      const habit = await loadHabitOrThrow(habitId)
      return { current: habit.current_streak, longest: habit.longest_streak, total: habit.total_completions }
    },

    getCompletionRate: async (habitId, range: HabitDateRange): Promise<CompletionRate> => {
      const habit = await loadHabitOrThrow(habitId)
      const comps = await completionsRepo.findWhere(eq(habitCompletions.habit_id, habitId) as SQL)
      const doneDates = new Set(comps.filter((c) => c.count >= habit.target_count).map((c) => c.completed_date))
      let scheduled = 0
      let done = 0
      for (let n = toDayNum(range.from); n <= toDayNum(range.to); n++) {
        const d = fromDayNum(n)
        if (!isScheduledOn(habit, d)) continue
        scheduled += 1
        if (doneDates.has(d)) done += 1
      }
      return { scheduled, done, rate: scheduled === 0 ? null : done / scheduled } // null = nothing due (BR-S4-3)
    },

    getMoodTrend: async (habitId, range: HabitDateRange): Promise<MoodPoint[]> => {
      await loadHabitOrThrow(habitId)
      const comps = await completionsRepo.findWhere(
        and(
          eq(habitCompletions.habit_id, habitId),
          gte(habitCompletions.completed_date, range.from),
          lte(habitCompletions.completed_date, range.to),
        ) as SQL,
      )
      return comps
        .sort((a, b) => a.completed_date.localeCompare(b.completed_date))
        .map((c) => ({
          date: c.completed_date,
          mood_before: c.mood_before,
          mood_after: c.mood_after,
          ease_rating: c.ease_rating,
          satisfaction: c.satisfaction,
        }))
    },

    getCalendar: async (habitId, month): Promise<CalendarDay[]> => {
      const habit = await loadHabitOrThrow(habitId)
      // month = 'YYYY-MM' → lexical [month-01, month-31] covers all valid days (28/30/31-day months alike)
      const comps = await completionsRepo.findWhere(
        and(
          eq(habitCompletions.habit_id, habitId),
          gte(habitCompletions.completed_date, `${month}-01`),
          lte(habitCompletions.completed_date, `${month}-31`),
        ) as SQL,
      )
      return comps
        .sort((a, b) => a.completed_date.localeCompare(b.completed_date))
        .map((c) => ({ date: c.completed_date, count: c.count, done: c.count >= habit.target_count }))
    },

    // ── fe-calendar S6 (EC-7): the cross-habit completion grid ──────────
    getCompletionGrid: async (range: HabitDateRange): Promise<HabitGridRow[]> => {
      const rows = await habitsRepo.findWhere(and(isNull(habits.deleted_at), eq(habits.is_active, true)) as SQL)
      // findWhere has no orderBy → a deterministic JS sort (code-unit id compare, never localeCompare)
      rows.sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      // ONE ledger query for every habit (indexed completed_date range; UNIQUE(habit_id, completed_date) → one per day)
      const comps = await completionsRepo.findWhere(
        and(gte(habitCompletions.completed_date, range.from), lte(habitCompletions.completed_date, range.to)) as SQL,
      )
      const countOf = new Map<string, number>()
      for (const c of comps) countOf.set(`${c.habit_id}|${c.completed_date}`, c.count)
      return rows.map((r) => {
        const days: HabitGridDay[] = []
        // the getCompletionRate day loop — a NaN bound (malformed range) or from > to walks zero days
        for (let n = toDayNum(range.from); n <= toDayNum(range.to); n++) {
          const date = fromDayNum(n)
          const count = countOf.get(`${r.id}|${date}`) ?? 0
          days.push({ date, scheduled: isScheduledOn(r, date), count, done: count >= r.target_count })
        }
        return { habit: toHabit(r), days } // the predicate runs on the ROW before toHabit (getTodayHabits)
      })
    },

    // ── S5: cross-module seams ────────────────────────────────────────
    contributeToPurposeMetrics: async (habitId, completion) => {
      const habit = await loadHabitOrThrow(habitId)
      if (!effects || !effects.registry.resolve('contribute_purpose_metric')) return // dormant (no handler)
      try {
        await emitCompletionEffect(habit, completion.completed_date, 'contribute_purpose_metric')
      } catch (e) {
        // HAB-19 — the re-drivable path: surface a typed error (the completion already persisted elsewhere).
        throw new MetricContributionError(e instanceof Error ? e.message : String(e))
      }
    },

    getEntityTags: async (entityType, entityId) => {
      if (!associations) return [] // deny-safe: no resolver → no tags (finance FIN-35 precedent)
      const r = await associations.resolveAssociations({ entityType, entityId }, 'separate')
      return r.mode === 'separate' ? r.tags : []
    },

    linkProject: async (habitId, projectId) => {
      // one row per pair (UNIQUE); findWhere does NOT filter soft-deletes (IR-3) → we see a soft-deleted pair too.
      const existing = (
        await projectHabitsRepo.findWhere(
          and(eq(projectHabits.habit_id, habitId), eq(projectHabits.project_id, projectId)) as SQL,
        )
      )[0]
      if (existing) {
        if (existing.deleted_at == null) return toProjectHabit(existing) // live → idempotent return
        return toProjectHabit(await projectHabitsRepo.update(existing.id, { deleted_at: null })) // resurrect
      }
      return toProjectHabit(await projectHabitsRepo.create({ project_id: projectId, habit_id: habitId, deleted_at: null }))
    },

    unlinkProject: async (habitId, projectId) => {
      const existing = (
        await projectHabitsRepo.findWhere(
          and(
            eq(projectHabits.habit_id, habitId),
            eq(projectHabits.project_id, projectId),
            isNull(projectHabits.deleted_at),
          ) as SQL,
        )
      )[0]
      if (existing) await projectHabitsRepo.delete(existing.id) // soft-delete
    },

    listProjectsForHabit: async (habitId) => {
      const rows = await projectHabitsRepo.findWhere(
        and(eq(projectHabits.habit_id, habitId), isNull(projectHabits.deleted_at)) as SQL,
      )
      return rows.map((r) => r.project_id)
    },

    // HB-6 — the day digest the Journal /summary consumes. Reuses isScheduledOn (no duplicate predicate).
    getDayCompletionDigest: async (date) => {
      const dueRows = (
        await habitsRepo.findWhere(and(isNull(habits.deleted_at), eq(habits.is_active, true)) as SQL)
      ).filter((r) => isScheduledOn(r, date))
      if (dueRows.length === 0) return { due: 0, done: 0 }
      const comps = await completionsRepo.findWhere(eq(habitCompletions.completed_date, date) as SQL)
      const countByHabit = new Map<string, number>()
      for (const c of comps) countByHabit.set(c.habit_id, c.count)
      const done = dueRows.filter((r) => (countByHabit.get(r.id) ?? 0) >= r.target_count).length
      return { due: dueRows.length, done }
    },
  }

  return service
}
