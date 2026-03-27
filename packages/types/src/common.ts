// ============================================================================
// Common / Shared Types — @vida/types
// Base primitives, shared enums, notifications
// ============================================================================

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** UUIDv7 string — client-generated, time-sortable */
export type Id = string

/** Unix milliseconds (Date.now()) */
export type Timestamp = number

/** YYYY-MM-DD */
export type CalendarDate = string

/** HH:MM */
export type TimeString = string

/** Integer in cents — $12.50 = 1250 */
export type Money = number

/** Integer in basis points — 2.5% = 250 */
export type BasisPoints = number

// ---------------------------------------------------------------------------
// Shared enums (used across 2+ domains)
// ---------------------------------------------------------------------------

export type Status =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none'

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'

export type LifeDomain =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'personal_growth'
  | 'spiritual'
  | 'recreation'
  | 'environment'

// ---------------------------------------------------------------------------
// Base interfaces
// ---------------------------------------------------------------------------

export interface BaseEntity {
  id: Id
  created_at: Timestamp
  updated_at: Timestamp
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'reminder'
  | 'achievement'

export interface Notification {
  id: Id
  type: NotificationType
  /** @encrypted */
  title: string
  /** @encrypted */
  message: string | null
  action_url: string | null
  /** @encrypted */
  action_label: string | null
  entity_type: string | null
  entity_id: Id | null
  is_read: boolean
  read_at: Timestamp | null
  is_archived: boolean
  archived_at: Timestamp | null
  expires_at: Timestamp | null
  created_at: Timestamp
}

