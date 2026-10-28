// ============================================================================
// Health Domain — @vida/types
// DB-4 group #17 — Health: Core · ADR-002 additions (recovered domain, no v2 schema)
//
// Net-new canonical enum tuples for the shared Health spine (Metrics · Monitoring ·
// Goals · Adaptation · Physical Roles · Safety & Medical). Reused vocabs live
// elsewhere and are NOT redefined here:
//   • MEASUREMENT_KIND · BINDING_MODE  → measurement.ts (health_goals — ADR-011 M1/M2)
//   • STATUS · FREQUENCY               → common.ts (health_goals status / review_frequency)
// Row interfaces (HealthMetric / HealthGoal / …) → DB-11 interface reconcile.
// OPEN vocabs (physical_roles.type modality · experiment.type · exam.kind · metric
// category/body_part · response scales · severity · medical.status · winner) are
// user-extensible / under-specified → NO tuple, NO CHECK (plain TEXT).
// Spec: docs/specs/foundation/db-4-health-core/_index.md
// ============================================================================

// Metric data-taxonomy — the C2 guard: this is the metric's KIND, NOT the goal's
// ADR-011 measurement_kind (structure-data.md:15).
export const HEALTH_METRIC_KIND = ['body-measure', 'performance-capacity', 'test-result', 'biomarker'] as const
export type HealthMetricKind = (typeof HEALTH_METRIC_KIND)[number]

// Mandatory trend direction so progress %/trend is computable (structure-data.md:16;
// conventions.md:12 "direction is mandatory").
export const METRIC_DIRECTION = ['higher-better', 'lower-better'] as const
export type MetricDirection = (typeof METRIC_DIRECTION)[number]

// Paired-measure / per-limb side (structure-data.md:17; nullable on the metric).
export const METRIC_SIDE = ['left', 'right', 'bilateral'] as const
export type MetricSide = (typeof METRIC_SIDE)[number]

// Value PROVENANCE (structure-data.md:24) — distinct from a goal's binding_mode
// (ADR-011 M2). `ai` = AI6 provenance (ADR-015 §3.6); wearable/import = device-mediated
// ingestion (ADR-014 X1) under external_in_ok (X5).
export const HEALTH_METRIC_VALUE_SOURCE = ['manual', 'photo', 'wearable', 'derived', 'exam', 'import', 'ai'] as const
export type HealthMetricValueSource = (typeof HEALTH_METRIC_VALUE_SOURCE)[number]

// Goal time-horizon (structure-data.md:42).
export const HEALTH_GOAL_HORIZON = ['short', 'med', 'long'] as const
export type HealthGoalHorizon = (typeof HEALTH_GOAL_HORIZON)[number]

// Scheduled exam-instance lifecycle (structure-data.md:37).
export const ASSIGNED_EXAM_STATUS = ['scheduled', 'due', 'overdue', 'logged', 'skipped'] as const
export type AssignedExamStatus = (typeof ASSIGNED_EXAM_STATUS)[number]

// N-of-1 experiment pillar (structure-data.md:60).
export const HEALTH_EXPERIMENT_PILLAR = ['training', 'nutrition', 'cross'] as const
export type HealthExperimentPillar = (typeof HEALTH_EXPERIMENT_PILLAR)[number]

// Experiment A/B lifecycle phase (structure-data.md:62).
export const HEALTH_EXPERIMENT_PHASE = ['A', 'B', 'analysis', 'done'] as const
export type HealthExperimentPhase = (typeof HEALTH_EXPERIMENT_PHASE)[number]

// Hypothesis origin (structure-data.md:63). `prescription` = imported doctor input
// (untrusted ADR-014-ingested → AI5 provenance when it feeds an LLM).
export const HEALTH_EXPERIMENT_SOURCE = ['self', 'claim', 'prescription'] as const
export type HealthExperimentSource = (typeof HEALTH_EXPERIMENT_SOURCE)[number]

// Medical-profile entry kind (structure-data.md:71) — the fast medical set read module-wide.
export const MEDICAL_PROFILE_KIND = [
  'condition',
  'allergy',
  'intolerance',
  'injury',
  'limitation',
  'medication',
  'supplement',
  'prescription',
  'clearance',
  'contraindication',
] as const
export type MedicalProfileKind = (typeof MEDICAL_PROFILE_KIND)[number]

// Medical-entry provenance (structure-data.md:73). `imported-doctor` = extension-model
// device-mediated import (ADR-014 X1).
export const MEDICAL_PROFILE_SOURCE = ['manual', 'imported-doctor'] as const
export type MedicalProfileSource = (typeof MEDICAL_PROFILE_SOURCE)[number]

// Safety-flag trigger (structure-data.md:74) — advisory danger signals, never blocking.
export const SAFETY_FLAG_TRIGGER = [
  'overtraining',
  'extreme-deficit',
  'rapid-weight-change',
  'biomarker',
  'injury-pattern',
  'warning-response',
] as const
export type SafetyFlagTrigger = (typeof SAFETY_FLAG_TRIGGER)[number]

// Safety-flag lifecycle (structure-data.md:76) — dismissible/acknowledgeable, advisory.
export const SAFETY_FLAG_STATUS = ['active', 'dismissed', 'acknowledged'] as const
export type SafetyFlagStatus = (typeof SAFETY_FLAG_STATUS)[number]

// Physical-Role authoring mode (structure-data.md:57). `ai` = the AI-draft leg;
// `import` = the curated OS-owned Role library (locale-varying). Canonical provenance
// triad `manual|ai|import` (unified with MEAL_SOURCE/HEALTH_METRIC_VALUE_SOURCE, P2 O4 2026-09-14).
export const PHYSICAL_ROLE_AUTHORING_SOURCE = ['manual', 'ai', 'import'] as const
export type PhysicalRoleAuthoringSource = (typeof PHYSICAL_ROLE_AUTHORING_SOURCE)[number]
