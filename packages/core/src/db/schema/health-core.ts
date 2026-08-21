// ============================================================================
// Domain tables: Health — Core  (DB-4 · group #17 · ADR-002 additions)
//
// The shared Health spine (recovered domain, NO v2 schema → every table is net-new).
// 12 owned tables: Metrics + Monitoring (health_metrics · health_metric_values ·
// health_domains · health_factors · health_exams · assigned_exams) · Goals
// (health_goals) · Adaptation (health_experiments · health_responses) · Physical
// Roles (physical_roles) · Safety & Medical (medical_profile_entries · safety_flags).
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/027_health_core.ts). These Drizzle objects are the query mirror.
//
// Shape (spec docs/specs/foundation/db-4-health-core/_index.md):
// - Enums: REUSE MEASUREMENT_KIND/BINDING_MODE (measurement.ts) + STATUS/FREQUENCY
//   (common.ts); 14 net-new FIXED tuples → @vida/types health.ts (SQL CHECK). OPEN
//   vocabs (physical_roles.type modality · experiment.type · exam.kind · metric
//   category/body_part · response scales · severity · medical.status · winner) = plain
//   TEXT, NO CHECK (user-extensible / under-specified — [[open-vocab-columns-take-no-sql-check]]).
// - deleted_at on `health_goals` ONLY (the documented floor, structure-data.md:45); the
//   other 11 omit it (entities → status/end_date/phase lifecycle; 4 ledgers → append).
// - Goal `type` NOT authored — decomposed into measurement_kind × binding_mode × subject
//   (ADR-011 M1/M2). progress/mastery = nullable NULL⇒derive override slots (M3), no DEFAULT.
// - binding_mode NULLABLE, no default (ADR-011 §3.2 override; tasks gate-2 precedent).
// - photo_blob = blob(buffer) [E] (note_attachments precedent), not TEXT.
// - source enum includes `ai` (AI6). NO cross-table FK (plain TEXT ids, ADR-016 §3.4).
//
// C-guards (rerun): physical_roles.type = modality kept OPEN (C1) · health_metrics.kind =
// data-taxonomy kept FIXED, NOT measurement_kind (C2) · no economy columns — XP via
// Sessions S4 (C3). X*/AI*/M4/M5 = cite-not-author (only source/authoring_source provenance).
//
// M1.0 encryption (BR-DB6-3): [E] fields are the M3 target — EMPTY [E] set in M1.0
// (pass-through); marked via @encrypted JSDoc.
// ============================================================================

import { sqliteTable, text, integer, real, blob, index } from 'drizzle-orm/sqlite-core'
import {
  MEASUREMENT_KIND,
  BINDING_MODE,
  STATUS,
  FREQUENCY,
  HEALTH_METRIC_KIND,
  METRIC_DIRECTION,
  METRIC_SIDE,
  HEALTH_METRIC_VALUE_SOURCE,
  HEALTH_GOAL_HORIZON,
  ASSIGNED_EXAM_STATUS,
  HEALTH_EXPERIMENT_PILLAR,
  HEALTH_EXPERIMENT_PHASE,
  HEALTH_EXPERIMENT_SOURCE,
  MEDICAL_PROFILE_KIND,
  MEDICAL_PROFILE_SOURCE,
  SAFETY_FLAG_TRIGGER,
  SAFETY_FLAG_STATUS,
  PHYSICAL_ROLE_AUTHORING_SOURCE,
} from '@vida/types'
import { baseColumns, enumText, json, calendarDate, timestampMs } from './_shared'

// --- health_metrics: metric definitions (the M5 read-seam source) ----------
export const healthMetrics = sqliteTable('health_metrics', {
  ...baseColumns,
  kind: enumText('kind', HEALTH_METRIC_KIND).notNull(), // FIXED → CHECK (C2 taxonomy, NOT measurement_kind)
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  unit: text('unit').notNull(),
  direction: enumText('direction', METRIC_DIRECTION).notNull(), // FIXED → CHECK ("direction is mandatory")
  category: text('category').notNull(), // OPEN no-CHECK
  body_part: text('body_part'), // OPEN no-CHECK; nullable
  side: enumText('side', METRIC_SIDE), // FIXED → CHECK; nullable
  formula: text('formula'), // nullable — declares a derived metric (HC-21)
  factor_id: text('factor_id'), // no-FK; nullable → monitoring grouping
  protocol_id: text('protocol_id'), // no-FK; nullable → Knowledge protocol
  catalog_ref: text('catalog_ref'), // no-FK; nullable → Knowledge reference catalog
  // NO deleted_at (floor L20)
})

// --- health_metric_values: time-series ledger ------------------------------
export const healthMetricValues = sqliteTable(
  'health_metric_values',
  {
    ...baseColumns,
    metric_id: text('metric_id').notNull(), // no-FK
    value: real('value').notNull(),
    recorded_at: timestampMs('recorded_at').notNull(),
    source: enumText('source', HEALTH_METRIC_VALUE_SOURCE).notNull().default('manual'), // FIXED → CHECK (incl. `ai`, AI6)
    exam_id: text('exam_id'), // no-FK; nullable → HC-20
    /** @encrypted [E] — life-context */
    context: text('context'),
    /** @encrypted [E] */
    photo_blob: blob('photo_blob', { mode: 'buffer' }), // nullable inline encrypted binary (note_attachments precedent)
    // NO deleted_at (ledger, floor L26)
  },
  (t) => [
    index('idx_health_metric_values_metric').on(t.metric_id),
    index('idx_health_metric_values_recorded').on(t.recorded_at),
  ],
)

// --- health_domains: monitoring top level ----------------------------------
export const healthDomains = sqliteTable('health_domains', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  order: integer('order').notNull().default(0),
  // NO deleted_at (floor L31)
})

// --- health_factors: measurable sub-indicators (group metrics) -------------
export const healthFactors = sqliteTable(
  'health_factors',
  {
    ...baseColumns,
    domain_id: text('domain_id').notNull(), // no-FK
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    // NO deleted_at (floor L33)
  },
  (t) => [index('idx_health_factors_domain').on(t.domain_id)],
)

// --- health_exams: user-configured medical exams ---------------------------
export const healthExams = sqliteTable('health_exams', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  kind: text('kind'), // OPEN no-CHECK (user-configured exam type)
  schedule: json<unknown>('schedule'), // JSON recurrence
  produces_metrics: json<string[]>('produces_metrics'), // JSON metric_ids
  /** @encrypted [E] */
  provider_note: text('provider_note'), // nullable
  // NO deleted_at (floor L36)
})

// --- assigned_exams: scheduled exam instances (ledger) ---------------------
export const assignedExams = sqliteTable(
  'assigned_exams',
  {
    ...baseColumns,
    exam_id: text('exam_id').notNull(), // no-FK
    due_date: calendarDate('due_date').notNull(),
    status: enumText('status', ASSIGNED_EXAM_STATUS).notNull().default('scheduled'), // FIXED → CHECK
    logged_at: timestampMs('logged_at'), // nullable
    // NO deleted_at (ledger, floor L38)
  },
  (t) => [
    index('idx_assigned_exams_exam').on(t.exam_id),
    index('idx_assigned_exams_due').on(t.due_date),
  ],
)

// --- health_goals: the pursuable (ADR-011 measure) — the ONLY soft-deleted table ---
export const healthGoals = sqliteTable(
  'health_goals',
  {
    ...baseColumns,
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull(), // FIXED → CHECK (M1)
    binding_mode: enumText('binding_mode', BINDING_MODE), // FIXED → CHECK; NULLABLE override (M2, §3.2)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    metric_id: text('metric_id'), // no-FK; nullable → subject
    target_value: real('target_value'),
    /** @encrypted [E] */
    unit: text('unit'),
    horizon: enumText('horizon', HEALTH_GOAL_HORIZON).notNull(), // FIXED → CHECK
    start_date: calendarDate('start_date'),
    target_date: calendarDate('target_date'),
    status: enumText('status', STATUS).notNull().default('not_started'), // FIXED → CHECK
    progress: real('progress'), // nullable override — NULL ⇒ derive (M3), no DEFAULT
    review_frequency: enumText('review_frequency', FREQUENCY), // FIXED → CHECK; nullable
    purpose_id: text('purpose_id'), // no-FK; nullable → M7-kept ladder to a life Purpose
    role_id: text('role_id'), // no-FK; nullable → physical_role subject
    deleted_at: integer('deleted_at'), // the documented floor (L45) — goals ONLY
  },
  (t) => [index('idx_health_goals_status').on(t.status)], // partial WHERE deleted_at IS NULL in the migration
)

// --- physical_roles: the trainable-capability unit -------------------------
export const physicalRoles = sqliteTable('physical_roles', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  type: text('type'), // OPEN no-CHECK — MODALITY (C1 guard, NOT a measurement axis)
  /** @encrypted [E] */
  objectives: text('objectives'),
  /** @encrypted [E] — the capability definition */
  can_do: text('can_do'),
  mastery: real('mastery'), // nullable override — NULL ⇒ derive (M3/M4 per-child rollup), no DEFAULT
  knowledge_subject_id: text('knowledge_subject_id'), // no-FK; nullable → Knowledge
  skill_id: text('skill_id'), // no-FK; nullable → Skills #2
  exercise_refs: json<string[]>('exercise_refs'), // JSON → linked/generated exercises
  session_sub_types: json<string[]>('session_sub_types'), // JSON
  authoring_source: enumText('authoring_source', PHYSICAL_ROLE_AUTHORING_SOURCE)
    .notNull()
    .default('manual'), // FIXED → CHECK
  locale_variant: text('locale_variant'), // nullable — geo/lang/culture (curated import)
  /** @encrypted [E] */
  approach: text('approach'),
  // NO deleted_at (floor L58)
})

// --- health_experiments: N-of-1 --------------------------------------------
export const healthExperiments = sqliteTable('health_experiments', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  pillar: enumText('pillar', HEALTH_EXPERIMENT_PILLAR).notNull(), // FIXED → CHECK
  /** @encrypted [E] */
  hypothesis: text('hypothesis'),
  type: text('type'), // OPEN no-CHECK
  /** @encrypted [E] — control */
  arm_a: text('arm_a'),
  /** @encrypted [E] — test */
  arm_b: text('arm_b'),
  metrics: json<string[]>('metrics'), // JSON metric_ids measured
  duration: integer('duration'), // day-count
  phase: enumText('phase', HEALTH_EXPERIMENT_PHASE).notNull().default('A'), // FIXED → CHECK
  winner: text('winner'), // OPEN no-CHECK; nullable
  /** @encrypted [E] */
  key_learning: text('key_learning'),
  source: enumText('source', HEALTH_EXPERIMENT_SOURCE).notNull().default('self'), // FIXED → CHECK
  // NO deleted_at (floor L63)
})

// --- health_responses: observation logs (ledger) ---------------------------
export const healthResponses = sqliteTable(
  'health_responses',
  {
    ...baseColumns,
    subject_ref: text('subject_ref').notNull(), // poly ref: metric/exercise/food
    energy_response: text('energy_response'), // OPEN no-CHECK (subjective scale)
    digestion_response: text('digestion_response'), // OPEN no-CHECK
    overall_feeling: text('overall_feeling'), // OPEN no-CHECK
    pattern_type: text('pattern_type'), // OPEN no-CHECK
    life_context: json<unknown>('life_context'), // JSON
    /** @encrypted [E] */
    notes: text('notes'),
    recorded_at: timestampMs('recorded_at').notNull(),
    // NO deleted_at (ledger, floor L66)
  },
  (t) => [index('idx_health_responses_recorded').on(t.recorded_at)],
)

// --- medical_profile_entries: the fast medical set (module-wide provider) ---
export const medicalProfileEntries = sqliteTable('medical_profile_entries', {
  ...baseColumns,
  kind: enumText('kind', MEDICAL_PROFILE_KIND).notNull(), // FIXED → CHECK
  /** @encrypted [E] */
  label: text('label').notNull(),
  severity: text('severity'), // OPEN no-CHECK; nullable
  status: text('status'), // OPEN no-CHECK; nullable
  /** @encrypted [E] */
  details: text('details'),
  affected_refs: json<string[]>('affected_refs'), // JSON → exercises/muscles/ingredients constrained
  source: enumText('source', MEDICAL_PROFILE_SOURCE).notNull().default('manual'), // FIXED → CHECK
  start_date: calendarDate('start_date'), // nullable
  end_date: calendarDate('end_date'), // nullable — lifecycle (resolved), NOT deletion
  // NO deleted_at (floor L73; status/end_date model clinical lifecycle)
})

// --- safety_flags: advisory warnings (ledger) — never blocks ---------------
export const safetyFlags = sqliteTable(
  'safety_flags',
  {
    ...baseColumns,
    trigger: enumText('trigger', SAFETY_FLAG_TRIGGER).notNull(), // FIXED → CHECK
    severity: text('severity'), // OPEN no-CHECK
    /** @encrypted [E] */
    message: text('message'),
    source_ref: text('source_ref'), // poly ref; nullable
    raised_at: timestampMs('raised_at').notNull(),
    status: enumText('status', SAFETY_FLAG_STATUS).notNull().default('active'), // FIXED → CHECK
    // NO deleted_at (ledger, floor L76)
  },
  (t) => [index('idx_safety_flags_status').on(t.status)],
)
