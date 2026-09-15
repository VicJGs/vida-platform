// ============================================================================
// Notes & Pages — @vida/types
// ADR-002 §5.2
//
// REBUILT in P2 (backend-replan) — torn down at `eaf64f8`, re-authored (flat file,
// per the task.ts/session.ts/finance.ts convention; NOT under entities/). REDUCED
// vs the pre-teardown file: the pomodoro enums (POMODORO_TYPE/STATUS/ENTITY_TYPE +
// PomodoroSession) are RE-HOMED to session.ts (ADR-004: pomodoro is a sessions
// sub-type); Tag/PageTag are RETIRED (tags → the AR-6 Spaces entity_tags primitive);
// the `entity_links` table + its EntityLinkRow type live in foundation/spaces.ts
// (AR-6 Spaces) — a @vida/types EntityLink interface is DB-11's to reconcile, not
// here. This file owns only the pages surface: PAGE_TYPE, the ENTITY_LINK_TARGET
// reference set, and the Page / PageLink / NoteAttachment entities.
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Page enums
// ---------------------------------------------------------------------------

export const PAGE_TYPE = [
  'journal',
  'note',
  'task_note',
  'task_group_note',
  'milestone_note',
  'deliverable_note',
] as const
export type PageType = (typeof PAGE_TYPE)[number]

// The known page→entity link targets. This is a REFERENCE SET, not a SQL CHECK:
// NOT-20 retired the fixed 33-value CHECK to the OPEN taggable-type registry
// (`schema/_registry.ts`, ADR-006 SP2) — `entity_type` is validated at runtime
// against the injected registry, never this closed tuple.
export const ENTITY_LINK_TARGET = [
  'task',
  'task_time_log',
  'project',
  'milestone',
  'contact',
  'interaction',
  'habit',
  'habit_completion',
  'routine_action',
  'course',
  'book',
  'book_chapter',
  'study_session',
  'study_topic',
  'scheduled_study_session',
  'study_plan_batch',
  'flashcard_deck',
  'skill',
  'knowledge_note',
  'language',
  'language_practice_session',
  'language_recording',
  'purpose',
  'target',
  'purpose_metric_value',
  'account',
  'transaction',
  'asset',
  'liability',
  'investment',
  'income_stream',
  'bucket_list_item',
  'daily_check_in',
  'achievement',
] as const
export type EntityLinkTarget = (typeof ENTITY_LINK_TARGET)[number]

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
