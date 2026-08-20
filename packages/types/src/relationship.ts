// ============================================================================
// Relationships / CRM Domain — @vida/types
// ADR-002 §5.9
// ============================================================================

import type { Id, Timestamp, Frequency } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const RELATIONSHIP_TYPE = [
  'family',
  'friend',
  'colleague',
  'mentor',
  'mentee',
  'romantic',
  'professional',
  'acquaintance',
  'other',
] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPE)[number]

export const INTERACTION_TYPE = [
  'call',
  'text',
  'email',
  'in_person',
  'video_call',
  'social_media',
  'letter',
  'other',
] as const
export type InteractionType = (typeof INTERACTION_TYPE)[number]

export const SENTIMENT = ['positive', 'neutral', 'negative'] as const
export type Sentiment = (typeof SENTIMENT)[number]

export const CONTACT_EVENT_TYPE = ['birthday', 'anniversary', 'holiday', 'custom'] as const
export type ContactEventType = (typeof CONTACT_EVENT_TYPE)[number]

/**
 * Reminder-group scheduling anchor (DB-4 #14, G11/RL-7).
 * `schedule` = the fixed frequency/time_of_day/days_of_week cadence (the pre-existing behaviour).
 * `birthday` = event-anchored: fire `anchor_days_before` days before each member's birthday (`contact_events`).
 */
export const REMINDER_GROUP_ANCHOR = ['schedule', 'birthday'] as const
export type ReminderGroupAnchor = (typeof REMINDER_GROUP_ANCHOR)[number]

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export interface SocialLinks {
  linkedin?: string
  twitter?: string
  instagram?: string
  whatsapp?: string
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Contact extends SyncableEntity {
  /** @encrypted — PII */
  first_name: string
  /** @encrypted — PII */
  last_name: string | null
  /** @encrypted — PII */
  nickname: string | null
  relationship_type: RelationshipType
  /** @encrypted — PII */
  email: string | null
  /** @encrypted — PII */
  phone: string | null
  /** @encrypted */
  avatar_url: string | null
  /** @encrypted — PII */
  company: string | null
  /** @encrypted — PII */
  job_title: string | null
  /** @encrypted — PII */
  location: string | null
  /** @encrypted — PII, YYYY-MM-DD */
  birthday: string | null
  /** @encrypted */
  tags: string[]
  /** @encrypted */
  social_links: SocialLinks | null
  stay_in_touch_frequency: Frequency | null
  stay_in_touch_days: number | null
  last_interaction_date: string | null
  next_contact_date: string | null
  interaction_count: number
  is_favorite: boolean
  deleted_at: Timestamp | null
}

export interface ContactEvent extends SyncableEntity {
  contact_id: Id
  event_type: ContactEventType
  /** YYYY-MM-DD or MM-DD for recurring year-agnostic */
  event_date: string
  /** @encrypted */
  title: string | null
  /** @encrypted */
  description: string | null
  is_recurring: boolean
  /** e.g. [1, 3, 7] — remind N days before */
  reminder_days: number[] | null
}

export interface Interaction extends SyncableEntity {
  contact_id: Id
  interaction_type: InteractionType
  /** YYYY-MM-DD */
  date: string
  duration_minutes: number | null
  /** @encrypted */
  summary: string | null
  sentiment: Sentiment | null
  follow_up_needed: boolean
  follow_up_date: string | null
  /** @encrypted */
  follow_up_notes: string | null
}

export interface ContactReminder extends SyncableEntity {
  contact_id: Id
  reminder_group_id: Id | null
  /** @encrypted */
  title: string
  reminder_date: string | null
  is_recurring: boolean
  frequency: Frequency | null
  is_completed: boolean
}

export interface ReminderGroup extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  message_template: string | null
  /** HH:MM */
  time_of_day: string | null
  frequency: Frequency | null
  /** [0-6] */
  days_of_week: number[] | null
  is_active: boolean
}

export interface ReminderGroupContact extends SyncMetadata {
  reminder_group_id: Id
  contact_id: Id
}
