// ============================================================================
// Knowledge: Flashcards, Study Topics, Knowledge Notes, Study Planner
// @vida/types — ADR-002 §5.10 (partial), §5.11
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Study Topic enums
// ---------------------------------------------------------------------------

export const STUDY_TOPIC_STATUS = ['not_started', 'in_progress', 'reviewing', 'mastered'] as const
export type StudyTopicStatus = (typeof STUDY_TOPIC_STATUS)[number]

export const TOPIC_DIFFICULTY = ['easy', 'medium', 'hard', 'very_hard'] as const
export type TopicDifficulty = (typeof TOPIC_DIFFICULTY)[number]

// ---------------------------------------------------------------------------
// Flashcard enums
// ---------------------------------------------------------------------------

export const FLASHCARD_RESOURCE_TYPE = ['course', 'book', 'topic'] as const
export type FlashcardResourceType = (typeof FLASHCARD_RESOURCE_TYPE)[number]

// ---------------------------------------------------------------------------
// Study Planner enums
// ---------------------------------------------------------------------------

export const PRESET_BLOCK = [
  'early_morning',
  'morning',
  'late_morning',
  'afternoon',
  'late_afternoon',
  'evening',
  'night',
] as const
export type PresetBlock = (typeof PRESET_BLOCK)[number]

export const STUDY_PLAN_BATCH_STATUS = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'completed',
] as const
export type StudyPlanBatchStatus = (typeof STUDY_PLAN_BATCH_STATUS)[number]

export const SCHEDULED_SESSION_TYPE = ['study', 'review', 'practice', 'exam_prep', 'homework'] as const
export type ScheduledSessionType = (typeof SCHEDULED_SESSION_TYPE)[number]

export const SCHEDULED_SESSION_STATUS = [
  'scheduled',
  'in_progress',
  'completed',
  'skipped',
  'rescheduled',
] as const
export type ScheduledSessionStatus = (typeof SCHEDULED_SESSION_STATUS)[number]

export const SCHEDULED_RESOURCE_TYPE = ['topic', 'flashcard_deck', 'book', 'course', 'homework'] as const
export type ScheduledResourceType = (typeof SCHEDULED_RESOURCE_TYPE)[number]

// ---------------------------------------------------------------------------
// Generic review engine (ADR-005 · DB-3 substrate) — structure-data.md:39-41.
// Cross-domain (Education/Skills/Finance consume via compound_sets), hence substrate.
// ---------------------------------------------------------------------------

/** A `review_curves` scheduling curve kind — SM-2 is one preset (KN-8/KN-9, user-tunable). */
export const REVIEW_CURVE_KIND = ['decay', 'review', 'test'] as const
export type ReviewCurveKind = (typeof REVIEW_CURVE_KIND)[number]

/** A `method_bindings` polymorphic target level — which knowledge object a method+curve applies to (KN-4). */
export const METHOD_BINDING_TARGET_TYPE = ['area', 'subject', 'unit', 'topic', 'kind'] as const
export type MethodBindingTargetType = (typeof METHOD_BINDING_TARGET_TYPE)[number]

// ---------------------------------------------------------------------------
// Study Topics (with SM-2 spaced repetition)
// ---------------------------------------------------------------------------

export interface StudyTopic extends SyncableEntity {
  course_id: Id | null
  linked_book_id: Id | null
  reading_chapter_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  status: StudyTopicStatus
  /** 0–100 */
  mastery_level: number
  difficulty: TopicDifficulty | null
  due_date: string | null
  is_exam_topic: boolean
  study_time_minutes: number
  estimated_study_minutes: number
  /** @encrypted */
  key_concepts: string[]
  /** @encrypted */
  resource_urls: string[]
  sort_order: number
  /** SM-2 — default 2.5 */
  easiness_factor: number
  /** SM-2 */
  repetition_number: number
  /** SM-2 */
  interval_days: number
  next_review_date: string | null
  last_reviewed_at: Timestamp | null
  class_date: string | null
  reading_start_page: number | null
  reading_end_page: number | null
  deleted_at: Timestamp | null
}

export interface TopicReview extends SyncMetadata {
  id: Id
  topic_id: Id
  /** 0–5 (SM-2 quality) */
  quality: number
  response_time_seconds: number | null
  reviewed_at: Timestamp
}

// ---------------------------------------------------------------------------
// Flashcards (SM-2)
// ---------------------------------------------------------------------------

export interface FlashcardDeck extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  resource_type: FlashcardResourceType | null
  resource_id: Id | null
  new_cards_per_day: number
  reviews_per_day: number
  is_active: boolean
  total_cards: number
  mastered_cards: number
  deleted_at: Timestamp | null
}

export interface Flashcard extends SyncableEntity {
  deck_id: Id
  /** @encrypted */
  front: string
  /** @encrypted */
  back: string
  /** @encrypted */
  hint: string | null
  /** @encrypted */
  explanation: string | null
  /** SM-2 — default 2.5 */
  easiness_factor: number
  /** SM-2 */
  repetitions: number
  /** SM-2 */
  interval_days: number
  next_review_date: string | null
  last_reviewed_at: Timestamp | null
  times_reviewed: number
  times_correct: number
  is_mastered: boolean
  is_suspended: boolean
}

export interface FlashcardReview extends SyncMetadata {
  id: Id
  flashcard_id: Id
  /** 0–5 (SM-2 quality) */
  quality: number
  response_time_ms: number | null
  previous_interval: number | null
  new_interval: number | null
  previous_easiness: number | null
  new_easiness: number | null
  reviewed_at: Timestamp
}

// ---------------------------------------------------------------------------
// Knowledge Notes
// ---------------------------------------------------------------------------

export interface KnowledgeNote extends SyncableEntity {
  parent_note_id: Id | null
  resource_type: FlashcardResourceType | null
  resource_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  content: string | null
  /** @encrypted */
  topic: string | null
  /** @encrypted */
  subtopic: string | null
  /** @encrypted */
  tags: string[]
  is_pinned: boolean
  is_archived: boolean
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Study Planner
// ---------------------------------------------------------------------------

export interface StudyAvailability extends SyncableEntity {
  /** 0 = Sun, 6 = Sat */
  day_of_week: number
  /** HH:MM */
  start_time: string
  /** HH:MM */
  end_time: string
  is_available: boolean
  /** 1–5 */
  preference_score: number | null
  preset_block: PresetBlock | null
  max_session_minutes: number | null
}

export interface AvailabilityException extends SyncMetadata {
  id: Id
  /** YYYY-MM-DD */
  exception_date: string
  is_available: boolean
  /** @encrypted */
  reason: string | null
  /** HH:MM */
  start_time: string | null
  end_time: string | null
  created_at: Timestamp
}

export interface StudyPlanBatch extends SyncableEntity {
  course_id: Id | null
  /** @encrypted */
  name: string | null
  status: StudyPlanBatchStatus
  total_sessions: number
  generated_at: Timestamp | null
  approved_at: Timestamp | null
}

export interface ScheduledStudySession extends SyncableEntity {
  batch_id: Id | null
  resource_type: ScheduledResourceType
  resource_id: Id
  session_type: ScheduledSessionType
  status: ScheduledSessionStatus
  /** YYYY-MM-DD */
  scheduled_date: string
  /** HH:MM */
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  urgency_score: number | null
  start_page: number | null
  end_page: number | null
  chapter_id: Id | null
}

export interface SessionTemplate extends SyncableEntity {
  /** @encrypted */
  name: string
  work_minutes: number
  short_break_minutes: number
  long_break_minutes: number
  intervals_before_long_break: number
  auto_start_breaks: boolean
  auto_start_work: boolean
  is_default: boolean
}
