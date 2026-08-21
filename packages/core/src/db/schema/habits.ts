// ============================================================================
// Domain tables: Habits (DB-4 · group #6) — ADR-002 §5.5
//
// An independent Wave-1 domain: habit definitions + a per-date completion ledger
// + a denormalized streak cache, plus the KEPT `project_habits` junction (deferred
// here from group #5). `habits`/`habit_completions` are the §5.5 FACT floor;
// measurability (HB-13), the restored v1 fields (G8), and the shared-tag migration
// are build-phase INTENDED ([[build-phase-flags-mean-resolve-now-not-defer]]).
//
// DDL model (ADR-016 §3.5): CHECK + the partial index + UNIQUE live in the hand-
// written SQL migration (migrations/017_habits.ts). These Drizzle objects are only
// the type-safe QUERY mirror — `enumText` gives the TS union, not a SQL CHECK.
//
// Shape (spec docs/specs/foundation/db-4-habits/):
// - NO hard cross-table FK (habit_id/project_id plain TEXT — cascade is the app/sync
//   layer's, HB-11/BR-DB3-1).
// - habits is a pursuable → measurement_kind NN DEFAULT 'rate' (HB-13 doc-licensed
//   natural) + binding_mode nullable, no default (NULL ⇒ derive event-trigger, the
//   Tasks-gate-2 override-slot grain). NO stored progress / nesting_weight — the rate
//   derives, the streak cache is derived-from-ledger (HB-2).
// - Streak cache (current/longest/total) is a DERIVED cache (HB-2), never hand-set.
// - Inline `tags` RETIRED → entity_tags (`entity_type='habit'`, ADR-006 SP1); notes →
//   pages. No purpose junction (purpose_habits retired → contributions, Purpose/DB-3).
// - G8 restored fields authored: habits.success_criteria[E]/difficulty (HABIT_DIFFICULTY
//   net-new); habit_completions.location[E]/completion_time.
// - habit_completions: full baseColumns (adds updated_at — task_time_logs precedent),
//   NO deleted_at (ledger); value REAL; ratings 1-5 range CHECK (SQL-only, not enums);
//   UNIQUE(habit_id, completed_date) (HB-3).
// - project_habits: reconciled to the entity_tags v2 junction shape — synthetic id PK
//   (NOT §5.5's composite PK) + UNIQUE(project_id, habit_id) to preserve pair-uniqueness.
//
// @vida/types interface reconcile (Habit +4 −tags; HabitCompletion +updated_at/location/
// completion_time; new ProjectHabit) → DB-11 (mirror-only; group #1/#3/#4/#5 precedent).
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — the Repository
// registers an EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, real, index, unique } from 'drizzle-orm/sqlite-core'
import {
  HABIT_TYPE,
  HABIT_FREQUENCY,
  HABIT_TIME_OF_DAY,
  HABIT_DIFFICULTY,
  LIFE_DOMAIN,
  MEASUREMENT_KIND,
  BINDING_MODE,
} from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate, timestampMs } from './_shared'

// --- habits: the habit definition + streak cache — ADR-002 §5.5 -------------
export const habits = sqliteTable(
  'habits',
  {
    ...baseColumns,
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    habit_type: enumText('habit_type', HABIT_TYPE).notNull().default('build'), // FIXED → SQL CHECK
    frequency: enumText('frequency', HABIT_FREQUENCY).notNull().default('daily'), // FIXED → SQL CHECK
    days_of_week: text('days_of_week'), // JSON array [0-6], 0=Sun (plain text, NEVER json<T>())
    target_count: integer('target_count').notNull().default(1),
    /** @encrypted [E] — user-defined unit, e.g. "glasses of water" */
    unit: text('unit'),
    time_of_day: enumText('time_of_day', HABIT_TIME_OF_DAY).default('anytime'), // FIXED → SQL CHECK (nullable)
    times_of_day: text('times_of_day'), // JSON array for multiple reminder times
    /** @encrypted [E] — behavioral trigger */
    cue: text('cue'),
    /** @encrypted [E] */
    reward: text('reward'),
    domain: enumText('domain', LIFE_DOMAIN), // FIXED → SQL CHECK (nullable, no default)
    current_streak: integer('current_streak').notNull().default(0), // derived cache (HB-2)
    longest_streak: integer('longest_streak').notNull().default(0), // derived cache
    total_completions: integer('total_completions').notNull().default(0), // derived cache
    is_active: boolInt('is_active').notNull().default(true),
    sort_order: integer('sort_order').notNull().default(0),
    // INTENDED (build-phase → now):
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull().default('rate'), // ADR-011 M1 (HB-13 natural)
    binding_mode: enumText('binding_mode', BINDING_MODE), // ADR-011 M2; nullable, no default (NULL ⇒ derive event-trigger)
    /** @encrypted [E] — definition of done (G8, restored v1) */
    success_criteria: text('success_criteria'),
    difficulty: enumText('difficulty', HABIT_DIFFICULTY), // G8; FIXED → SQL CHECK (nullable)
    deleted_at: integer('deleted_at'),
    // NOTE: inline `tags` RETIRED → entity_tags (ADR-006 SP1).
  },
  () => [
    // NOTE: idx_habits_active (partial, WHERE deleted_at IS NULL) is SQL-migration-only.
  ],
)

// --- habit_completions: per-date completion ledger — ADR-002 §5.5 -----------
export const habitCompletions = sqliteTable(
  'habit_completions',
  {
    ...baseColumns, // adds updated_at vs §5.5 (task_time_logs precedent)
    habit_id: text('habit_id').notNull(), // no FK (was CASCADE; app-layer, HB-11)
    completed_date: calendarDate('completed_date').notNull(), // YYYY-MM-DD
    count: integer('count').notNull().default(1),
    value: real('value'), // measured value, e.g. miles run (first REAL col in v2)
    mood_before: integer('mood_before'), // 1-5 range CHECK (SQL-only)
    mood_after: integer('mood_after'), // 1-5 range CHECK
    ease_rating: integer('ease_rating'), // 1-5 range CHECK
    satisfaction: integer('satisfaction'), // 1-5 range CHECK
    /** @encrypted [E] — where the completion happened (G8, restored v1) */
    location: text('location'),
    completion_time: timestampMs('completion_time'), // G8; full completion moment (Unix ms), not a time-of-day
    // NO deleted_at — ledger; hard-deletes with the habit (HB-11).
  },
  (t) => [
    unique('uq_habit_completions_date').on(t.habit_id, t.completed_date), // HB-3
    index('idx_habit_comp_date').on(t.completed_date),
  ],
)

// --- project_habits: kept Projects↔Habits junction (deferred from #5) --------
// v2 reconcile to the entity_tags junction shape: synthetic id PK (NOT §5.5's
// composite PK) + UNIQUE(project_id, habit_id) to preserve pair-uniqueness.
export const projectHabits = sqliteTable(
  'project_habits',
  {
    ...baseColumns,
    project_id: text('project_id').notNull(), // no FK (was CASCADE)
    habit_id: text('habit_id').notNull(), // no FK (was CASCADE)
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    unique('uq_project_habits').on(t.project_id, t.habit_id),
    index('idx_project_habits_habit').on(t.habit_id), // reverse lookup (project_id covered by the UNIQUE)
  ],
)

// --- inferred row types ------------------------------------------------------
export type HabitRow = typeof habits.$inferSelect
export type HabitInsert = typeof habits.$inferInsert
export type HabitCompletionRow = typeof habitCompletions.$inferSelect
export type HabitCompletionInsert = typeof habitCompletions.$inferInsert
export type ProjectHabitRow = typeof projectHabits.$inferSelect
export type ProjectHabitInsert = typeof projectHabits.$inferInsert
