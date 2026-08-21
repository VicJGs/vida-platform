// ============================================================================
// Domain tables: Routines (DB-4 · group #7) — the ORCHESTRATION REFRAME
//
// The OS's cross-module orchestration cockpit: a named, ordered, recurring
// sequence (`routines`) of polymorphic `routine_step`s, each DRIVING a real
// entity elsewhere (a Session sub-type, task, habit) — composes, never
// duplicates. `routine_completions` is the per-step ledger. The reframe design
// LANDED (docs/intake/routines.md §E 2026-07-14, RT-1…RT-19); only the DDL was
// deferred "→ build phase" = this session. Supersedes the flat 2-table POC
// (`routine_actions` retired → `routine_step`).
// [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]
//
// DDL model (ADR-016 §3.5): CHECK + the partial index + UNIQUE live in the hand-
// written SQL migration (migrations/018_routines.ts). These Drizzle objects are
// only the type-safe QUERY mirror.
//
// Shape (spec docs/specs/foundation/db-4-routines/):
// - NO hard cross-table FK (routine_id/routine_step_id/entity_id plain TEXT —
//   cascade is the app/sync layer's, RT-17/BR-DB3-1).
// - `routines` is a pursuable → measurement_kind NN DEFAULT 'rate' (RT-19 natural)
//   + binding_mode nullable, no default (NULL ⇒ derive derived-pull, the override-
//   slot grain). NO cached streak columns; `progress` is a nullable override slot
//   (RT-14, analytics derive from routine_completions).
// - `routine_step.step_type` is an OPEN vocab (user-extensible, §E Q1) → plain TEXT,
//   NO CHECK (session sub_type precedent, [[open-vocab-columns-take-no-sql-check]]).
//   The driven entity is a polymorphic entity_type+entity_id ref (nullable — an
//   actionable step may have none, RT-4).
// - cadence = `recurrence_rule` (RRULE, the platform canon — tasks precedent;
//   "broad schedule" RT-11, consumed by the Scheduler).
// - Doc-decided BOUNDARIES (NOT authored here): completion/miss/acceptance POLICY
//   (→ Preferences/Spaces); routine_step_membership/step-scoping (→ Spaces, design-
//   pass, non-blocking); the Scheduler; tags → entity_tags; notes → pages; purpose
//   → contributions; XP → consequence_ledger.
//
// @vida/types interface reconcile (new Routine/RoutineStep; RoutineCompletion re-key
// +updated_at; retire RoutineAction/ROUTINE_ACTION_TYPE/ROUTINE_RECURRENCE_FREQUENCY)
// → DB-11 (mirror-only; group #1/#3/#4/#5/#6 precedent).
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { ROUTINE_LIFECYCLE, ROUTINE_TIME_OF_DAY, MEASUREMENT_KIND, BINDING_MODE } from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate, timestampMs } from './_shared'

// --- routines: the named ordered sequence (pursuable) -----------------------
export const routines = sqliteTable(
  'routines',
  {
    ...baseColumns,
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    recurrence_rule: text('recurrence_rule'), // RRULE (broad schedule, RT-11; Scheduler-consumed)
    lifecycle: enumText('lifecycle', ROUTINE_LIFECYCLE).notNull().default('active'), // FIXED → SQL CHECK
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull().default('rate'), // ADR-011 M1 (RT-19 natural)
    binding_mode: enumText('binding_mode', BINDING_MODE), // ADR-011 M2; nullable, no default (NULL ⇒ derive derived-pull)
    progress: integer('progress'), // nullable override slot (RT-14 — no cached streak)
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
    // NOTE: NO policy columns (completion/miss/acceptance → Preferences/Spaces).
  },
  () => [
    // NOTE: idx_routines_lifecycle (partial, WHERE deleted_at IS NULL) is SQL-migration-only.
  ],
)

// --- routine_step: the polymorphic step (replaces routine_actions) ----------
export const routineStep = sqliteTable(
  'routine_step',
  {
    ...baseColumns,
    routine_id: text('routine_id'), // no FK (parent; app-layer cascade, RT-17)
    step_order: integer('step_order').notNull().default(0),
    step_type: text('step_type'), // OPEN vocab (user-extensible, §E Q1) — NO CHECK, registry-validated
    entity_type: text('entity_type'), // polymorphic driven-entity ref (nullable — RT-4)
    entity_id: text('entity_id'),
    is_required: boolInt('is_required').notNull().default(false), // required-node policy support (RT-5)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    time_of_day: enumText('time_of_day', ROUTINE_TIME_OF_DAY), // FIXED → SQL CHECK (nullable)
    skip_dates: text('skip_dates'), // JSON array of YYYY-MM-DD (RT-8 planned skips) — plain text, NEVER json<T>()
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_routine_step_routine').on(t.routine_id)],
)

// --- routine_completions: per-step ledger (retained, re-keyed to the step) --
export const routineCompletions = sqliteTable(
  'routine_completions',
  {
    ...baseColumns, // adds updated_at vs §5.6 (task_time_logs precedent)
    routine_step_id: text('routine_step_id').notNull(), // no FK (was routine_action_id CASCADE; app-layer)
    completed_date: calendarDate('completed_date').notNull(), // YYYY-MM-DD
    completed_at: timestampMs('completed_at').notNull(),
    skipped: boolInt('skipped').notNull().default(false),
    /** @encrypted [E] */
    skip_reason: text('skip_reason'),
    actual_duration_minutes: integer('actual_duration_minutes'),
    // NO deleted_at — ledger; hard-deletes with the step (RT-17).
  },
  (t) => [
    unique('uq_routine_completions_date').on(t.routine_step_id, t.completed_date), // RT-3/RT-18
    index('idx_routine_comp_date').on(t.completed_date),
  ],
)

// --- inferred row types ------------------------------------------------------
export type RoutineRow = typeof routines.$inferSelect
export type RoutineInsert = typeof routines.$inferInsert
export type RoutineStepRow = typeof routineStep.$inferSelect
export type RoutineStepInsert = typeof routineStep.$inferInsert
export type RoutineCompletionRow = typeof routineCompletions.$inferSelect
export type RoutineCompletionInsert = typeof routineCompletions.$inferInsert
