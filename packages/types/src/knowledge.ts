// ============================================================================
// Knowledge Universe (+ generic review engine) + Study Planner
// @vida/types — ADR-002 §5.10 reshaped (DB-4 group #10) + §5.11
//
// Entity interfaces mirror the shipped schema 1:1:
//   knowledge_objects · object_kinds · knowledge_containers · references ·
//   compound_sets · knowledge_lab_entries · flashcards      (schema/knowledge.ts)
//   review_curves · method_bindings · review_events         (schema/foundation/knowledge-review.ts)
// RETIRED (pre-DB-4 shape): StudyTopic → knowledge_objects; TopicReview/FlashcardReview →
//   review_events (ADR-005); FlashcardDeck → retired; KnowledgeNote → pages (KN-5).
// Enums + Study-Planner interfaces below are UNCHANGED (imported by schema + validators + sessions).
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
  // DB-4 group #3 — 'failed' is a documented terminal state (no availability / nothing to
  // schedule → explicit, never a silent empty plan). sessions-and-scheduling/business-rules.md:89.
  'failed',
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

// DB-4 group #10 — the Knowledge Universe reframe (ADR-002 §5.10 reshaped roster).
// `object_kinds.name`/`learning_realm` are OPEN (user-extensible, KN-4) — no tuple here.

/** A `knowledge_containers` level — the fixed Module ⊃ Area ⊃ Subject org spine (KN-7). */
export const KNOWLEDGE_CONTAINER_TYPE = ['module', 'area', 'subject'] as const
export type KnowledgeContainerType = (typeof KNOWLEDGE_CONTAINER_TYPE)[number]

/** A content-only flashcard's rendering type (ADR-005 — the card is a reviewable, no scheduling). */
export const CARD_TYPE = ['basic', 'reversed', 'cloze', 'image_occlusion'] as const
export type CardType = (typeof CARD_TYPE)[number]

// ---------------------------------------------------------------------------
// DB-4 group #10 — Knowledge Universe entities (ADR-002 §5.10 reshaped roster)
// 1:1 mirrors of schema/knowledge.ts (7 owned tables). [E] = M3 target
// (M1.0 empty encryptedFields set, BR-DB6-3).
// ---------------------------------------------------------------------------

/** A knowledge object — generalizes study_topics; `parent_object_id` self-ref IS the
 *  Subject›Unit›Topic + user-kinds hierarchy (KN-3). `mastery_level` is DERIVED (KN-9),
 *  never hand-set. [FACT: schema/knowledge.ts knowledge_objects] */
export interface KnowledgeObject extends SyncableEntity {
  kind_id: Id
  parent_object_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  key_concepts: string[] | null
  /** DERIVED — read-only (KN-9); nullable, no default */
  mastery_level: number | null
  status: StudyTopicStatus | null
  difficulty: TopicDifficulty | null
  is_exam_topic: boolean
  sort_order: number
  deleted_at: Timestamp | null
}

/** The user-extensible kind registry (FLAT — no parent_kind_id). Seeds topic/concept/definition
 *  as editable/removable defaults; `learning_realm` drives the default study method (KN-4). */
export interface ObjectKind extends SyncableEntity {
  name: string
  /** OPEN — understand | memorize | user-defined */
  learning_realm: string | null
  default_method_id: Id | null
  is_default: boolean
  deleted_at: Timestamp | null
}

/** Module ⊃ Area ⊃ Subject organization; membership is many-to-many via entity_tags (KN-7). */
export interface KnowledgeContainer extends SyncableEntity {
  container_type: KnowledgeContainerType
  /** @encrypted */
  name: string
  deleted_at: Timestamp | null
}

/** First-class Reference (K6) — replaces study_topics.resource_urls[]. */
export interface Reference extends SyncableEntity {
  object_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  source: string | null
  /** @encrypted — a saved URL is knowledge content (KN-1) */
  url: string | null
  /** OPEN — un-enumerated label */
  type: string | null
  deleted_at: Timestamp | null
}

/** Per-consumer personalization bundle (KN-11) — one per consumer module; a default ships. */
export interface CompoundSet extends SyncableEntity {
  /** OPEN — education | skills | finance | health | … */
  consumer_module: string
  /** @encrypted */
  name: string | null
  /** @encrypted — JSON rules/methods/params (opaque blob at rest) */
  spec: string | null
  is_default: boolean
  deleted_at: Timestamp | null
}

/** Knowledge Lab entry — generate NEW knowledge: hypothesis + own-module data → conclusion → promote. */
export interface KnowledgeLabEntry extends SyncableEntity {
  /** @encrypted */
  hypothesis: string
  /** JSON own-module ref IDs (plain) */
  data_refs: string[] | null
  /** @encrypted */
  conclusion: string | null
  promoted_object_id: Id | null
  deleted_at: Timestamp | null
}

/** Content-only reviewable card (ADR-005, BR-KN-7) — no deck_id, no SM-2 cols, no is_mastered. */
export interface Flashcard extends SyncableEntity {
  /** @encrypted */
  front: string
  /** @encrypted */
  back: string
  /** @encrypted */
  hint: string | null
  /** @encrypted */
  explanation: string | null
  card_type: CardType
  /** image/audio refs (JSON) */
  media: string[] | null
  is_suspended: boolean
  sort_order: number
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Generic review engine (DB-3 · ADR-005) — 1:1 mirrors of
// schema/foundation/knowledge-review.ts. Knowledge-owned, cross-consumed.
// ---------------------------------------------------------------------------

/** A personalizable scheduling curve; SM-2 is one preset (KN-8/KN-9). */
export interface ReviewCurve extends SyncableEntity {
  /** @encrypted */
  name: string
  curve_kind: ReviewCurveKind
  /** @encrypted — curve tuning params (JSON-as-TEXT) */
  params: Record<string, unknown> | null
  is_preset: boolean
  deleted_at: Timestamp | null
}

/** Which method+curve applies where (polymorphic target level, KN-4). */
export interface MethodBinding extends SyncableEntity {
  /** → capability registry (kind=study_method) */
  method_id: string
  curve_id: Id | null
  target_type: MethodBindingTargetType
  /** polymorphic knowledge-object/level ref */
  target_id: string
  daily_cap: number | null
  deleted_at: Timestamp | null
}

/** Append-only outcome log; generalizes topic_reviews/flashcard_reviews.
 *  NO `deleted_at` — immutable ledger (mirrors consequence_ledger / AvailabilityException). */
export interface ReviewEvent extends SyncableEntity {
  object_id: string
  method_id: string
  /** signal/grade (SM-2 quality 0–5); nullable */
  quality: number | null
  /** Unix ms */
  reviewed_at: Timestamp
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
