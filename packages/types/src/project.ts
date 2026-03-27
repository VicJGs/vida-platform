// ============================================================================
// Projects, Purpose & Goals, Bucket List — @vida/types
// ADR-002 §5.4, §5.7, §5.14
// ============================================================================

import type { Id, Timestamp, Status, Priority, Frequency, LifeDomain, Money } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Project enums
// ---------------------------------------------------------------------------

export type ProjectScope = 'personal' | 'professional' | 'academic' | 'community'

export type ProjectComplexity = 'simple' | 'moderate' | 'complex' | 'enterprise'

// ---------------------------------------------------------------------------
// Purpose & Goals enums
// ---------------------------------------------------------------------------

export type TargetType = 'quantitative' | 'qualitative' | 'milestone' | 'habit_based'

export type CalculationMethod = 'sum' | 'average' | 'latest' | 'max' | 'min' | 'count'

// ---------------------------------------------------------------------------
// Bucket List enums
// ---------------------------------------------------------------------------

export type BucketListCategory =
  | 'travel'
  | 'adventure'
  | 'career'
  | 'creative'
  | 'education'
  | 'financial'
  | 'health'
  | 'relationship'
  | 'spiritual'
  | 'other'

export type BucketListStatus = 'dream' | 'planned' | 'in_progress' | 'completed' | 'abandoned'

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

export interface Purpose extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  vision: string | null
  /** @encrypted */
  why: string | null
  domain: LifeDomain | null
  status: Status
  /** 0–100 */
  progress: number
  start_date: string | null
  target_date: string | null
  is_primary: boolean
  sort_order: number
  deleted_at: Timestamp | null
}

export interface Target extends SyncableEntity {
  purpose_id: Id
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  target_type: TargetType
  target_value: number | null
  current_value: number | null
  /** @encrypted */
  unit: string | null
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
  purpose_id: Id
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  unit: string | null
  target_value: number | null
  current_value: number | null
  calculation_method: CalculationMethod
}

export interface PurposeMetricValue extends SyncMetadata {
  id: Id
  metric_id: Id
  value: number
  recorded_at: Timestamp
}

export interface TargetReview extends SyncMetadata {
  id: Id
  target_id: Id
  /** 1–10 */
  progress_rating: number | null
  /** @encrypted */
  reflection: string | null
  /** @encrypted */
  next_actions: string | null
  reviewed_at: Timestamp
}

export interface Dream extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  domain: LifeDomain | null
  target_age: number | null
  /** @encrypted — in cents */
  estimated_cost: Money | null
  purpose_id: Id | null
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Bucket List
// ---------------------------------------------------------------------------

export interface BucketListItem extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  category: BucketListCategory
  status: BucketListStatus
  priority: Priority
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
  tags: string[]
  /** 0–100 */
  progress_percentage: number
  /** @encrypted */
  steps: BucketListStep[]
  purpose_id: Id | null
  project_id: Id | null
  /** @encrypted */
  inspiration_url: string | null
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Cross-domain junctions
// ---------------------------------------------------------------------------

export interface PurposeHabit extends SyncMetadata {
  purpose_id: Id
  habit_id: Id
}

export interface PurposeRoutine extends SyncMetadata {
  purpose_id: Id
  routine_action_id: Id
}

export interface PurposeProject extends SyncMetadata {
  purpose_id: Id
  project_id: Id
}

export interface ProjectHabit extends SyncMetadata {
  project_id: Id
  habit_id: Id
}
