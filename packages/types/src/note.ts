// ============================================================================
// Notes, Pages & Pomodoro — @vida/types
// ADR-002 §5.2
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Page enums
// ---------------------------------------------------------------------------

export type PageType =
  | 'journal'
  | 'note'
  | 'task_note'
  | 'task_group_note'
  | 'milestone_note'
  | 'deliverable_note'

export type EntityLinkTarget =
  | 'task'
  | 'task_time_log'
  | 'project'
  | 'milestone'
  | 'contact'
  | 'interaction'
  | 'habit'
  | 'habit_completion'
  | 'routine_action'
  | 'course'
  | 'book'
  | 'book_chapter'
  | 'study_session'
  | 'study_topic'
  | 'scheduled_study_session'
  | 'study_plan_batch'
  | 'flashcard_deck'
  | 'skill'
  | 'knowledge_note'
  | 'language'
  | 'language_practice_session'
  | 'language_recording'
  | 'purpose'
  | 'target'
  | 'purpose_metric_value'
  | 'account'
  | 'transaction'
  | 'asset'
  | 'liability'
  | 'investment'
  | 'income_stream'
  | 'bucket_list_item'
  | 'daily_check_in'
  | 'achievement'

// ---------------------------------------------------------------------------
// Pomodoro enums
// ---------------------------------------------------------------------------

export type PomodoroType = 'focus' | 'short_break' | 'long_break'
export type PomodoroStatus = 'running' | 'paused' | 'completed' | 'cancelled'

export type PomodoroEntityType =
  | 'task'
  | 'task_group'
  | 'class_note'
  | 'note'
  | 'study_session'

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export interface JournalSummaryConfig {
  showHabits?: boolean
  showTasks?: boolean
  showStudySessions?: boolean
  showTransactions?: boolean
  showInteractions?: boolean
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Page extends SyncableEntity {
  type: PageType
  /** @encrypted */
  title: string | null
  /** @encrypted — TipTap JSON document, synced via Yjs CRDT */
  content: string | null
  parent_id: Id | null
  entity_type: string | null
  entity_id: Id | null
  /** YYYY-MM-DD — type='journal' only, unique per date */
  journal_date: string | null
  is_favorite: boolean
  is_archived: boolean
  icon: string | null
  /** @encrypted */
  cover_image: string | null
  /** @encrypted */
  summary_config: JournalSummaryConfig | null
  has_pomodoro: boolean
  word_count: number
  deleted_at: Timestamp | null
}

export interface PageLink extends SyncMetadata {
  id: Id
  source_page_id: Id
  target_page_id: Id
  /** @encrypted — surrounding text snippet for backlink preview */
  context: string | null
  created_at: Timestamp
}

export interface EntityLink extends SyncMetadata {
  id: Id
  page_id: Id
  entity_type: EntityLinkTarget
  entity_id: Id
  /** @encrypted */
  context: string | null
  created_at: Timestamp
}

export interface Tag extends SyncableEntity {
  /** @encrypted */
  name: string
  color: string | null
}

export interface PageTag extends SyncMetadata {
  page_id: Id
  tag_id: Id
}

export interface NoteAttachment extends SyncMetadata {
  id: Id
  page_id: Id
  /** @encrypted */
  filename: string
  mime_type: string
  /** @encrypted */
  encrypted_blob: Uint8Array
  /** @encrypted */
  thumbnail_blob: Uint8Array | null
  size_bytes: number
  created_at: Timestamp
}

export interface PomodoroSession extends SyncableEntity {
  page_id: Id | null
  entity_type: PomodoroEntityType | null
  entity_id: Id | null
  started_at: Timestamp
  ended_at: Timestamp | null
  duration_seconds: number | null
  type: PomodoroType
  status: PomodoroStatus
  completed_count: number
}
