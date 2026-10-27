// ============================================================================
// Domain tables: Health — Training  (DB-4 · group #19 · ADR-002 additions)
//
// The exercise pillar (recovered domain, NO v2 schema → all net-new). 5 owned tables
// on the five-layer spine (Catalog → Plan → Template → Instance → Log):
// exercises · exercise_plans · workout_templates · workout_sessions · workout_sets.
// A workout IS a Session: workout_sessions = the `sessions` `workout` sub-type 1:1
// extension (ADR-004). Composes Core #17 (goals/metrics/roles/adaptation/medical),
// Sessions (runtime/scheduler), Knowledge (technique/protocols).
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in migrations/029_health_training.ts.
//
// Shape (spec docs/specs/foundation/db-4-health-training/_index.md):
// - Enums: REUSE METRIC_SIDE (workout_sets.side) + PHYSICAL_ROLE_AUTHORING_SOURCE
//   (exercise_plans.authoring_source) from health.ts (#17); 3 net-new FIXED tuples
//   (MOVEMENT_PATTERN, WORKOUT_SET_CATEGORY, BURN_SOURCE → training.ts). Everything else
//   OPEN (modality per conventions L16) = plain TEXT, NO CHECK.
// - deleted_at on `exercises` + `exercise_plans` (the floor, structure-data.md:13,18).
// - workout_sessions = session extension: own id + session_id UNIQUE (1:1, no FK), NO
//   deleted_at (base `sessions` owns lifecycle — the skill_actions/reading_sessions precedent).
// - [E] numeric (planned_reps/actual_reps INTEGER, planned_weight REAL) = typed + @encrypted
//   (money[E] pattern). Performance → Core health_metric_values (no local KPI store, HT-5).
// - NO cross-table FK (plain TEXT ids, ADR-016 §3.4).
//
// M1.0 encryption (BR-DB6-3): [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import {
  METRIC_SIDE,
  PHYSICAL_ROLE_AUTHORING_SOURCE,
  MOVEMENT_PATTERN,
  WORKOUT_SET_CATEGORY,
  BURN_SOURCE,
} from '@vida/types'
import { baseColumns, enumText, json, calendarDate, boolInt } from './_shared'

// --- exercises: the movement catalog ----------------------------------------
export const exercises = sqliteTable('exercises', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  movement_pattern: enumText('movement_pattern', MOVEMENT_PATTERN), // FIXED → CHECK; nullable (cardio/mobility have none)
  primary_muscle: text('primary_muscle'), // OPEN no-CHECK
  secondary_muscles: json<string[]>('secondary_muscles'), // JSON
  equipment: json<string[]>('equipment'), // JSON
  difficulty: text('difficulty'), // OPEN no-CHECK
  risk_level: text('risk_level'), // OPEN no-CHECK
  /** @encrypted [E] */
  form_cues: text('form_cues'),
  /** @encrypted [E] */
  common_errors: text('common_errors'),
  /** @encrypted [E] */
  instructions: text('instructions'),
  /** @encrypted [E] */
  variations: text('variations'),
  /** @encrypted [E] */
  video_url: text('video_url'),
  knowledge_object_id: text('knowledge_object_id'), // no-FK; nullable → Knowledge technique
  deleted_at: integer('deleted_at'), // the documented floor (L13)
})

// --- exercise_plans: periodization ------------------------------------------
export const exercisePlans = sqliteTable(
  'exercise_plans',
  {
    ...baseColumns,
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    progression_model: text('progression_model'), // OPEN no-CHECK
    deload_frequency: text('deload_frequency'), // OPEN no-CHECK
    energy_system_focus: text('energy_system_focus'), // OPEN no-CHECK
    training_focus: json<string[]>('training_focus'), // JSON
    frequency: integer('frequency'), // sessions/week; nullable
    rest_days: json<number[]>('rest_days'), // JSON [0-6]
    start_date: calendarDate('start_date'),
    end_date: calendarDate('end_date'),
    status: text('status'), // OPEN no-CHECK
    goal_ids: json<string[]>('goal_ids'), // no-FK JSON → Core health_goals
    role_id: text('role_id'), // no-FK; nullable → Core physical_roles
    authoring_source: enumText('authoring_source', PHYSICAL_ROLE_AUTHORING_SOURCE).notNull().default('manual'), // FIXED → CHECK (reused)
    deleted_at: integer('deleted_at'), // the documented floor (L18)
  },
  (t) => [index('idx_exercise_plans_status').on(t.status)], // partial WHERE deleted_at IS NULL in migration
)

// --- workout_templates: reusable session defs (no deleted_at, floor L20) ----
export const workoutTemplates = sqliteTable('workout_templates', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  workout_type: text('workout_type'), // OPEN no-CHECK
  set_structure: text('set_structure'), // OPEN no-CHECK
  primary_muscle_groups: json<string[]>('primary_muscle_groups'), // JSON
  expected_duration: integer('expected_duration'), // minutes; nullable
  ai_generated: boolInt('ai_generated').notNull().default(false), // 0/1
  exercise_refs: json<string[]>('exercise_refs'), // no-FK JSON → exercises
})

// --- workout_sessions: the Sessions `workout` sub-type EXTENSION (ADR-004) ---
// Own id (baseColumns) + session_id UNIQUE (1:1 → sessions.id, no FK). NO deleted_at
// (base `sessions` owns lifecycle — the skill_actions/reading_sessions precedent).
export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    ...baseColumns,
    session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
    plan_id: text('plan_id'), // no-FK; nullable
    template_id: text('template_id'), // no-FK; nullable
    location: text('location'), // OPEN no-CHECK
    pre_energy: integer('pre_energy'), // 1-10; nullable
    satisfaction: integer('satisfaction'), // 1-10; nullable
    completion_pct: real('completion_pct'), // nullable
    /** @encrypted [E] */
    performance_notes: text('performance_notes'),
    /** @encrypted [E] */
    issues: text('issues'),
    /** @encrypted [E] */
    recovery_needs: text('recovery_needs'),
    calories_burned: real('calories_burned'), // nullable
    burn_source: enumText('burn_source', BURN_SOURCE), // FIXED → CHECK; nullable
    // NO deleted_at — session extension; base `sessions` owns lifecycle
  },
  (t) => [index('idx_workout_sessions_plan').on(t.plan_id)],
)

// --- workout_sets: per-exercise, per-set log (child of a workout) -----------
export const workoutSets = sqliteTable(
  'workout_sets',
  {
    ...baseColumns,
    workout_session_id: text('workout_session_id').notNull(), // no-FK
    exercise_id: text('exercise_id').notNull(), // no-FK
    category: enumText('category', WORKOUT_SET_CATEGORY), // FIXED → CHECK; nullable
    order: integer('order').notNull().default(0), // ordering (sibling precedent health_domains.order)
    side: enumText('side', METRIC_SIDE), // FIXED → CHECK (reused); nullable (per-limb)
    planned_sets: integer('planned_sets'), // nullable
    /** @encrypted [E] */
    planned_reps: integer('planned_reps'), // [E]; nullable
    /** @encrypted [E] */
    planned_weight: real('planned_weight'), // [E]; nullable
    sets_done: integer('sets_done'), // nullable
    /** @encrypted [E] */
    actual_reps: integer('actual_reps'), // [E]; nullable
    weight_used: real('weight_used'), // nullable (plaintext, floor P)
    rpe: real('rpe'), // 1-10, .5 increments; nullable
    form_quality: text('form_quality'), // OPEN no-CHECK
    is_pr: boolInt('is_pr').notNull().default(false), // 0/1
    // NO deleted_at (child log)
  },
  (t) => [
    index('idx_workout_sets_session').on(t.workout_session_id),
    index('idx_workout_sets_exercise').on(t.exercise_id),
  ],
)
