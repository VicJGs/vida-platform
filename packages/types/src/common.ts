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

export const STATUS = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'] as const
export type Status = (typeof STATUS)[number]

export const PRIORITY = ['critical', 'high', 'medium', 'low', 'none'] as const
export type Priority = (typeof PRIORITY)[number]

export const FREQUENCY = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
export type Frequency = (typeof FREQUENCY)[number]

export const LIFE_DOMAIN = [
  'health',
  'career',
  'finance',
  'relationships',
  'personal_growth',
  'spiritual',
  'recreation',
  'environment',
] as const
export type LifeDomain = (typeof LIFE_DOMAIN)[number]

/** Canonical cross-module daypart — the Calendar's Agenda/Living grouping axis (fe-calendar slice-map D1).
 *  Supersedes nothing: habits/routines keep their own `time_of_day`; modules MAP onto this at the calendar
 *  seam. Backs no column → no SQL CHECK / enum-parity row. */
export const DAYPART = ['morning', 'afternoon', 'evening'] as const
export type Daypart = (typeof DAYPART)[number]

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

export const NOTIFICATION_TYPE = ['info', 'success', 'warning', 'error', 'reminder', 'achievement'] as const
export type NotificationType = (typeof NOTIFICATION_TYPE)[number]

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
  // --- build-phase AMENDMENTs (RESOLUTION N4) — delivery-audit + optional payload (DB-11 reconcile, mod-notifications S1) ---
  /** which channels this row fired on — multi-device delivery dedup (NF-8). Structural (plaintext). */
  delivered_in_app: boolean
  delivered_push: boolean
  delivered_email: boolean
  /** @encrypted — optional entity-specific payload (stringified JSON TEXT; parsed by the reader). */
  metadata: string | null
  /** ADR-012 Additive cross-device convergence key — event-driven rows only; null for time-driven fires (NF-8). */
  effect_event_id: string | null
  created_at: Timestamp
}
