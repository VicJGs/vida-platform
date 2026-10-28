// ============================================================================
// Projects, Purpose & Goals, Bucket List — @vida/types
// ADR-002 §5.4, §5.7, §5.14
// ============================================================================

import type { Id, Timestamp, Status, Priority, Frequency, LifeDomain, Money } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'
import type { MeasurementKind, BindingMode } from './measurement'
import type { MetricValueSource, ContributionGoalType, ContributionContributorType, PlanStepOwnerType } from './purpose'

// ---------------------------------------------------------------------------
// Project enums
// ---------------------------------------------------------------------------

export const PROJECT_SCOPE = ['personal', 'professional', 'academic', 'community'] as const
export type ProjectScope = (typeof PROJECT_SCOPE)[number]

export const PROJECT_COMPLEXITY = ['simple', 'moderate', 'complex', 'enterprise'] as const
export type ProjectComplexity = (typeof PROJECT_COMPLEXITY)[number]

// ---------------------------------------------------------------------------
// Purpose & Goals enums
// ---------------------------------------------------------------------------

// TARGET_TYPE retired (DB-11, ADR-011) → `measurement_kind` (MEASUREMENT_KIND, measurement.ts) splits the
// v1 target_type's conflated how-measured/what-feeds axes; `habit_based` = `rate` + a contribution to the habit.

export const CALCULATION_METHOD = ['sum', 'average', 'latest', 'max', 'min', 'count'] as const
export type CalculationMethod = (typeof CALCULATION_METHOD)[number]

// ---------------------------------------------------------------------------
// Bucket List enums
// ---------------------------------------------------------------------------

export const BUCKET_LIST_CATEGORY = [
  'travel',
  'adventure',
  'career',
  'creative',
  'education',
  'financial',
  'health',
  'relationship',
  'spiritual',
  'other',
] as const
export type BucketListCategory = (typeof BUCKET_LIST_CATEGORY)[number]

export const BUCKET_LIST_STATUS = ['dream', 'planned', 'in_progress', 'completed', 'abandoned'] as const
export type BucketListStatus = (typeof BUCKET_LIST_STATUS)[number]

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export interface BucketListStep {
  id: string
  text: string
  completed: boolean
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface Project extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  vision: string | null
  scope: ProjectScope | null
  complexity: ProjectComplexity | null
  status: Status
  priority: Priority
  /** 0–100 */
  progress: number
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  /** In minutes (despite column name) */
  estimated_hours: number | null
  actual_hours: number | null
  /** @encrypted */
  tags: string[]
  color: string | null
  icon: string | null
  deleted_at: Timestamp | null
}

export interface Milestone extends SyncableEntity {
  project_id: Id
  parent_milestone_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  status: Status
  /** 0–100 */
  progress: number
  due_date: string | null
  sort_order: number
  deleted_at: Timestamp | null
}

export interface ProjectDocument extends SyncableEntity {
  project_id: Id
  milestone_id: Id | null
  /** @encrypted */
  name: string
  file_type: string | null
  file_size: number | null
  /** @encrypted */
  encrypted_blob: Uint8Array | null
}

// ---------------------------------------------------------------------------
// Purpose & Goals
// ---------------------------------------------------------------------------

/** A first-class core-belief above purposes (PG-9, DB-3 `values`). */
export interface Value extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  sort_order: number
  deleted_at: Timestamp | null
}

export interface Purpose extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  vision: string | null
  /** @encrypted */
  why: string | null
  value_id: Id | null
  domain: LifeDomain | null
  status: Status
  /** 0–100 override slot — NULL ⇒ derive (PG-4) */
  progress: number | null
  start_date: string | null
  target_date: string | null
  is_primary: boolean
  sort_order: number
  deleted_at: Timestamp | null
}

export interface Target extends SyncableEntity {
  /** nullable spine joint — SR-003 relaxed (PG-9) */
  purpose_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  measurement_kind: MeasurementKind
  /** NULL ⇒ derive (ADR-011 M2) */
  binding_mode: BindingMode | null
  target_value: number | null
  /** override slot — NULL ⇒ derive (PG-4) */
  current_value: number | null
  /** @encrypted */
  unit: string | null
  /** @encrypted — PG-11 (restored) */
  success_criteria: string | null
  /** PG-11 (restored) — how it is measured */
  measurement_method: string | null
  status: Status
  priority: Priority
  start_date: string | null
  target_date: string | null
  review_frequency: Frequency | null
  next_review_date: string | null
  sort_order: number
  deleted_at: Timestamp | null
}

export interface PurposeMetric extends SyncableEntity {
  purpose_id: Id | null
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  unit: string | null
  target_value: number | null
  current_value: number | null
  calculation_method: CalculationMethod
  /** PG-15 (restored) — progress direction */
  is_higher_better: boolean | null
  /** PG-15 (restored) */
  baseline_value: number | null
}

export interface PurposeMetricValue extends SyncableEntity {
  metric_id: Id
  value: number
  recorded_at: Timestamp
  /** PG-15 — value provenance (distinct from a measurable's binding_mode) */
  source: MetricValueSource
  /** @encrypted — PG-15 */
  context_notes: string | null
}

export interface TargetReview extends SyncableEntity {
  target_id: Id
  /** 1–10 */
  progress_rating: number | null
  /** @encrypted */
  reflection: string | null
  /** @encrypted */
  next_actions: string | null
  reviewed_at: Timestamp
}

/** The alignment/fulfillment loop, distinct from a target review (PG-12, DB-3 `purpose_reviews`). */
export interface PurposeReview extends SyncableEntity {
  purpose_id: Id
  still_aligned: boolean
  /** @encrypted */
  alignment_notes: string | null
  /** 0–100 */
  overall_progress: number | null
  /** @encrypted */
  key_achievements: string | null
  /** @encrypted */
  obstacles_faced: string | null
  /** @encrypted */
  adjustments_needed: string | null
  renewed_commitment: boolean | null
  fulfillment_rating: number | null
  clarity_rating: number | null
  reviewed_at: Timestamp
  deleted_at: Timestamp | null
}

/** A weighted polymorphic goal-edge — Purpose-domain, NOT a Spaces primitive (PG-10, DB-3 `contributions`). */
export interface Contribution extends SyncableEntity {
  goal_type: ContributionGoalType
  goal_id: Id
  contributor_type: ContributionContributorType
  contributor_id: Id
  /** 0–100 weight; never a copied progress value (PG-10) */
  contribution_percentage: number
  /** @encrypted */
  contribution_notes: string | null
  deleted_at: Timestamp | null
}

/** A lightweight DOC checklist on a task/target — NOT a tracked entity (PG-11, DB-3 `plan_steps`). */
export interface PlanStep extends SyncableEntity {
  owner_type: PlanStepOwnerType
  owner_id: Id
  /** @encrypted */
  title: string
  /** @encrypted */
  note: string | null
  sort_order: number
  is_completed: boolean
  completed_at: Timestamp | null
  deleted_at: Timestamp | null
}

export interface Dream extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  domain: LifeDomain | null
  category: BucketListCategory | null
  status: BucketListStatus
  priority: Priority
  target_age: number | null
  target_date: string | null
  completed_date: string | null
  /** @encrypted — in cents */
  estimated_cost: Money | null
  /** @encrypted */
  location: string | null
  /** @encrypted */
  image_url: string | null
  /** @encrypted */
  cover_image_url: string | null
  /** @encrypted */
  inspiration_url: string | null
  /** 0–100 override slot — NULL ⇒ derive (PG-4) */
  progress_percentage: number | null
  /** @encrypted — JSON [{id,text,completed}] (stored as TEXT) */
  steps: BucketListStep[]
  purpose_id: Id | null
  project_id: Id | null
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Bucket List — RETIRED (DB-11, PG-16): `bucket_list_items` collapsed into `Dream`
// (category/status/priority/imagery/steps/location/progress/project_id absorbed above).
// "Bucket List" is now a Space over `dreams` (a `#before-i-die` tag + Gallery view), not a table.
// `BUCKET_LIST_CATEGORY`/`BUCKET_LIST_STATUS`/`BucketListStep` are retained — `Dream` uses them.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cross-domain junctions
// ---------------------------------------------------------------------------

// PurposeHabit / PurposeRoutine / PurposeProject RETIRED (DB-11, PG-10) → the weighted polymorphic
// `Contribution` edge (above) supersedes the three bare FK-pair junctions.

export interface ProjectHabit extends SyncMetadata {
  project_id: Id
  habit_id: Id
}
