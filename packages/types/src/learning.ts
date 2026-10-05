// ============================================================================
// Learning, Languages & ICS Sync — @vida/types
// ADR-002 §5.10, §5.12, §5.18
// ============================================================================

import type { Id, Timestamp, BasisPoints } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'
import type { MeasurementKind, BindingMode } from './measurement'

// ---------------------------------------------------------------------------
// Course & Book enums
// ---------------------------------------------------------------------------

export const COURSE_TYPE = ['online', 'in_person', 'hybrid', 'self_paced'] as const
export type CourseType = (typeof COURSE_TYPE)[number]

export const COURSE_STATUS = ['not_started', 'in_progress', 'completed', 'dropped'] as const
export type CourseStatus = (typeof COURSE_STATUS)[number]

export const BOOK_FORMAT = ['physical', 'ebook', 'audiobook'] as const
export type BookFormat = (typeof BOOK_FORMAT)[number]

export const BOOK_STATUS = ['want_to_read', 'reading', 'completed', 'dropped'] as const
export type BookStatus = (typeof BOOK_STATUS)[number]

// DB-4 group #11 — Books reframe (ADR-002 §Books reshaped roster). BOOK_FORMAT above is now
// STALE (single-format → per-asset) — retained for the DB-11 row-interface reconcile; `book_assets`
// uses BOOK_ASSET_FORMAT below (BK-2). `books.status` reuses BOOK_STATUS.

/** A per-format book copy's format (BK-2; supersedes the single BOOK_FORMAT). */
export const BOOK_ASSET_FORMAT = ['physical', 'pdf', 'epub', 'audiobook', 'braille', 'other'] as const
export type BookAssetFormat = (typeof BOOK_ASSET_FORMAT)[number]

/** A reading plan's book arrangement (BK-11): one after another, or quota-split in parallel. */
export const READING_PLAN_ARRANGEMENT = ['sequenced', 'parallel'] as const
export type ReadingPlanArrangement = (typeof READING_PLAN_ARRANGEMENT)[number]

/** A reading plan's goal source (BK-11): user-set, or auto-calculated to a target. */
export const READING_PLAN_GOAL_TYPE = ['manual', 'auto'] as const
export type ReadingPlanGoalType = (typeof READING_PLAN_GOAL_TYPE)[number]

export const MASTERY_LEVEL = [
  'novice',
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'master',
] as const
export type MasteryLevel = (typeof MASTERY_LEVEL)[number]

export const SKILL_RESOURCE_TYPE = ['course', 'book'] as const
export type SkillResourceType = (typeof SKILL_RESOURCE_TYPE)[number]

export const STUDY_SESSION_RESOURCE_TYPE = [
  'course',
  'book',
  'topic',
  'homework',
  'article',
  'video',
  'podcast',
] as const
export type StudySessionResourceType = (typeof STUDY_SESSION_RESOURCE_TYPE)[number]

// ---------------------------------------------------------------------------
// Language enums
// ---------------------------------------------------------------------------

export const LANGUAGE_PROFICIENCY = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const
export type LanguageProficiency = (typeof LANGUAGE_PROFICIENCY)[number]

export const LANGUAGE_STATUS = ['active', 'paused', 'completed', 'dropped'] as const
export type LanguageStatus = (typeof LANGUAGE_STATUS)[number]

export const LEARNING_PHASE = ['foundation', 'building', 'fluency'] as const
export type LearningPhase = (typeof LEARNING_PHASE)[number]

export const LANGUAGE_SKILL_TYPE = [
  'listening',
  'speaking',
  'reading',
  'writing',
  'vocabulary',
  'grammar',
] as const
export type LanguageSkillType = (typeof LANGUAGE_SKILL_TYPE)[number]

export const PRACTICE_ACTIVITY_TYPE = [
  'flashcards',
  'reading',
  'writing',
  'listening',
  'speaking',
  'conversation',
  'media',
  'class',
  'app',
  'other',
] as const
export type PracticeActivityType = (typeof PRACTICE_ACTIVITY_TYPE)[number]

export const VOCABULARY_MASTERY = ['new', 'learning', 'familiar', 'proficient', 'mastered'] as const
export type VocabularyMastery = (typeof VOCABULARY_MASTERY)[number]

export const RECORDING_TYPE = ['bible', 'song', 'pronunciation', 'conversation'] as const
export type RecordingType = (typeof RECORDING_TYPE)[number]

export const WEEKLY_TOPIC = [
  'greetings_basics',
  'food_cooking',
  'daily_routine',
  'family_relationships',
  'travel_directions',
  'shopping_money',
  'health_body',
  'hobbies_entertainment',
] as const
export type WeeklyTopic = (typeof WEEKLY_TOPIC)[number]

export const BASE_WORD_CATEGORY = [
  'greetings',
  'numbers',
  'pronouns',
  'common_verbs',
  'common_nouns',
  'adjectives',
  'prepositions',
  'conjunctions',
  'question_words',
  'daily_phrases',
] as const
export type BaseWordCategory = (typeof BASE_WORD_CATEGORY)[number]

// ---------------------------------------------------------------------------
// DB-4 group #12 — Learning: Education (+ICS) reframe enums
// (ADR-002 §5.10/§5.18 + intake §Resolution WHOLE + Part-1.2 rerun). All FIXED
// (closed vocabularies fixed by the docs) → SQL CHECK + Zod parity.
// ---------------------------------------------------------------------------

/** Degree difficulty tier — a FIELD on `subjects`, not a table (conventions L31). */
export const DEGREE_TIER = ['high_school', 'bachelor', 'master', 'doctorate'] as const
export type DegreeTier = (typeof DEGREE_TIER)[number]

/** Hierarchical time container level: year ⊃ semester ⊃ term (ED-12, conventions L31). */
export const TERM_LEVEL = ['year', 'semester', 'term'] as const
export type TermLevel = (typeof TERM_LEVEL)[number]

/** A program parents to an institution OR a self_taught row (ED-2, separate tables). */
export const PROGRAM_PARENT_TYPE = ['institution', 'self_taught'] as const
export type ProgramParentType = (typeof PROGRAM_PARENT_TYPE)[number]

/** The three schedule-feed methods for one `subject_schedule` (ED-5). */
export const SCHEDULE_SOURCE = ['ics', 'document', 'manual'] as const
export type ScheduleSource = (typeof SCHEDULE_SOURCE)[number]

/** A grading system's scope (ED-7, contract L24). */
export const GRADING_SCOPE = ['institution', 'program', 'subject'] as const
export type GradingScope = (typeof GRADING_SCOPE)[number]

/** The grading scale kind (ED-7 — A–F / 0–10 / pass-fail / custom, intake H3). */
export const GRADING_SCALE_TYPE = ['letter', 'numeric', 'pass_fail', 'custom'] as const
export type GradingScaleType = (typeof GRADING_SCALE_TYPE)[number]

/** A weighted grading-system component's type (ED-7 component enumeration). */
export const GRADING_COMPONENT_TYPE = [
  'homework',
  'task',
  'exam',
  'quiz',
  'test',
  'presentation',
  'work',
] as const
export type GradingComponentType = (typeof GRADING_COMPONENT_TYPE)[number]

/** A user-shaped grading system (ED-7). Scoped to an institution/program/subject (`scope`+`scope_id`, no FK); a
 *  subject-scoped system OVERRIDES the broader one (resolution is the consumer's, not stored). `scale_config` holds
 *  the custom-scale definition as JSON (parsed service-side; `[E]`). */
export interface GradingSystem extends SyncableEntity {
  scope: GradingScope
  scope_id: Id
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  scale_type: GradingScaleType
  /** @encrypted — custom scale definition (parsed from JSON-as-text) */
  scale_config: Record<string, unknown> | null
  deleted_at: Timestamp | null
}

/** A weighted component of a grading system (ED-7). A component is either weight-based (`weight` in basis points,
 *  10000 = 100%) OR points-based (`max_points`) — both nullable. The weights that ARE set must sum to 100%
 *  (never normalized; `GradingWeightError`). */
export interface GradingComponent extends SyncableEntity {
  grading_system_id: Id
  component_type: GradingComponentType
  /** @encrypted */
  name: string | null
  weight: BasisPoints | null
  max_points: number | null
  deleted_at: Timestamp | null
}

/** A subject-attached assessment's type (ED-8, conventions L31). */
export const ASSESSMENT_TYPE = ['exam', 'quiz', 'test', 'presentation', 'work'] as const
export type AssessmentType = (typeof ASSESSMENT_TYPE)[number]

/** Assessment modality — online vs requiring physical presence (ED-8, conventions L32). */
export const ASSESSMENT_MODALITY = ['online', 'in_person'] as const
export type AssessmentModality = (typeof ASSESSMENT_MODALITY)[number]

/** What an `education_measurements` row measures — a subject or a program (ED-10). */
export const MEASUREMENT_REF_TYPE = ['subject', 'program'] as const
export type MeasurementRefType = (typeof MEASUREMENT_REF_TYPE)[number]

/** Provenance of an auto-recordable row — `ai` = AI6 authorship (ADR-015 §3.6). */
export const RECORD_SOURCE = ['manual', 'ai', 'import'] as const
export type RecordSource = (typeof RECORD_SOURCE)[number]

// ---------------------------------------------------------------------------
// Education hierarchy — DB-4 #12 (mod-learning-education ① S1). Rows map to
// institutions / self_taught / programs / curricula / terms (schema/learning.ts).
// No FK anywhere — refs are plain Id (app/sync-layer integrity, ADR-016 §3.4).
// ---------------------------------------------------------------------------

/** A formal institution (ED-2) — the parent of institution-granted programs. */
export interface Institution extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  deleted_at: Timestamp | null
}

/** The self-taught mode container (ED-2/H2 — a SEPARATE table from institutions, never one mode flag). */
export interface SelfTaughtPath extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  deleted_at: Timestamp | null
}

/** The pursuit (ED-2) — parents to an institution OR a self_taught row via `parent_type` + `parent_id`. */
export interface Program extends SyncableEntity {
  parent_type: ProgramParentType
  parent_id: Id
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  deleted_at: Timestamp | null
}

/** The shaped plan (ED-11) — forkable: `forked_from_id` is the lineage pointer (null = built from scratch). */
export interface Curriculum extends SyncableEntity {
  program_id: Id
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  forked_from_id: Id | null
  is_template: boolean
  deleted_at: Timestamp | null
}

/** A hierarchical time container (ED-12) — year ⊃ semester ⊃ term via `level` + optional `parent_term_id`. */
export interface Term extends SyncableEntity {
  curriculum_id: Id
  level: TermLevel
  parent_term_id: Id | null
  /** @encrypted */
  name: string
  start_date: string | null
  end_date: string | null
  deleted_at: Timestamp | null
}

// ---------------------------------------------------------------------------
// Subject (= `courses` reinterpreted — DB-4 #12 / mod-learning-education ① S2).
// DB-11 reconcile of the stale `Course` interface to `schema/learning.ts` subjects:
//   - inline `tags: string[]` RETIRED → `entity_tags` (SP1, entity_type='subject')
//   - `progress` → nullable DERIVED override (M3; NULL ⇒ derive, never a stored counter)
//   - `total_modules`/`completed_modules` → nullable (schema has no NOT NULL/default)
//   - +routing (`curriculum_id`/`term_id`, nullable per A1) + `degree_tier` field (ED-3)
//   - `course_type` kept as a nullable subject-level modality (R6, conventions L71)
// The `CourseType`/`CourseStatus` enum TUPLES are retained (used by the schema + validators).
// ---------------------------------------------------------------------------

export interface Subject extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  /** @encrypted */
  provider: string | null
  /** @encrypted */
  instructor: string | null
  /** @encrypted */
  url: string | null
  /** Subject-level modality (not the Institution/Self-taught mode) — R6. */
  course_type: CourseType | null
  status: CourseStatus
  /** DERIVED override (M3) — NULL ⇒ derive on read; never settable directly. */
  progress: number | null
  total_modules: number | null
  completed_modules: number | null
  start_date: string | null
  end_date: string | null
  target_completion: string | null
  /** In minutes */
  estimated_hours: number | null
  /** 1–5 */
  rating: number | null
  /** Routing (ED-3) — nullable per A1 optional depth; no FK. */
  curriculum_id: Id | null
  term_id: Id | null
  degree_tier: DegreeTier | null
  /** @encrypted — generic slot (v1 college-data superseded by the structured entities). */
  metadata: Record<string, unknown> | null
  deleted_at: Timestamp | null
}

// --- Schedule & class sessions (S4 — ED-4/ED-5; DB-11 net-new interfaces) -----
// `subject_schedules` = one row per subject (UNIQUE(subject_id)), recording the schedule's SOURCE; the
// `class_sessions` rows ARE the schedule content (ED-5). `class_sessions` is a base-`sessions` sub-type='class'
// 1:1 extension keyed `session_id` — the base owns lifecycle/timing, so it carries NO `deleted_at` (BR-ED-7).

/** One per subject (UNIQUE) — the single schedule source, fed by ics/document/manual (ED-5). */
export interface SubjectSchedule extends SyncableEntity {
  subject_id: Id
  source: ScheduleSource
  deleted_at: Timestamp | null
}

/** A class meeting = base `sessions` (sub_type='class') + this 1:1 extension keyed `session_id` (ED-4, BR-ED-7).
 *  NO `deleted_at` — the base session owns lifecycle. The meeting TIME lives on the base `sessions.started_at`. */
export interface ClassSession extends SyncableEntity {
  session_id: Id
  subject_id: Id
  /** Nullable, no FK — the `subject_schedules` row this meeting derives from. */
  schedule_id: Id | null
  /** Nullable, no FK — the `ics_synced_event` this meeting maps from (S5 forward-link). */
  source_event_id: Id | null
  /** @encrypted */
  location: string | null
}

/** A subject-attached assessment (ED-8, mod-learning-education ① S7). Mirrors `assessments` (schema/learning.ts).
 *  `score` is the raw recorded result; the subject's grade is DERIVED from scores via the grading system
 *  (`computeGrade`) — never stored (BR-LE-S7-2). `grading_component_id` is nullable, no FK (which weighted component
 *  it counts toward; an unmapped assessment is excluded + flagged at compute time, BR-LE-S7-4). */
export interface Assessment extends SyncableEntity {
  subject_id: Id
  type: AssessmentType
  /** Nullable, no FK — which `grading_components` row this counts toward. */
  grading_component_id: Id | null
  /** @encrypted */
  title: string | null
  /** @encrypted */
  description: string | null
  /** Calendar date `YYYY-MM-DD`, nullable. */
  date: string | null
  weight: BasisPoints | null
  max_points: number | null
  modality: AssessmentModality | null
  /** The raw recorded result; grade derives via the grading system. Nullable = not yet recorded. */
  score: number | null
  source: RecordSource
  deleted_at: Timestamp | null
}

/** The Education-forged measure entity (ED-10, mod-learning-education ① S8). Mirrors `education_measurements`
 *  (schema/learning.ts). Separate storage from Projects (C-M5, never mixed). `progress` is a nullable DERIVED
 *  override (integer 0–100; NULL ⇒ derive-on-read via `getProgress`, M3) — never a stored counter. */
export interface EducationMeasurement extends SyncableEntity {
  ref_type: MeasurementRefType
  ref_id: Id
  measurement_kind: MeasurementKind
  binding_mode: BindingMode | null
  progress: number | null
  deleted_at: Timestamp | null
}

// mod-learning-education ① S9 — the per-subject vault document (ED-13, the PJ-8 / `project_documents` pattern).
// Inline small file (`encrypted_blob`) OR R2 `storage_ref`; NO `deleted_at` (the vault pattern, faithful §5.4).
// `doc_type` is an OPEN vocab (syllabus/schedule/material catch-all — no CHECK). `[FACT: schema learning.ts:310-322]`
export interface SubjectDocument extends SyncableEntity {
  subject_id: Id
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  doc_type: string | null
  /** inline small blob (client-encrypted bytes); null when stored in R2 (`storage_ref`) */
  encrypted_blob: Uint8Array | null
  /** R2 ref for a large file; null when stored inline (`encrypted_blob`) */
  storage_ref: string | null
}

// ---------------------------------------------------------------------------
// Book, Skill
// ---------------------------------------------------------------------------

// DB-4 group #11 (mod-books ① S1) — reshaped to the reframed `books` table (schema/books.ts). RETIRED from the
// stale ADR-002 floor: `format`→`book_assets` (BK-2) · `current_page`→per-asset `native_position` (BR-BK-2) ·
// `genre`/`tags`→`entity_tags` (BK-16). `progress` → nullable derived-override (BR-BK-2; NULL ⇒ derive, never a
// stored counter). `total_pages` nullable (work-level, TOC-only planning, BK-17). `BOOK_FORMAT`/`BookFormatSchema`
// intentionally kept (P-6 — other consumers). `[FACT: schema/books.ts:43-63; db-4-books/_index.md:68-72]`
export interface Book extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  author: string | null
  /** @encrypted */
  isbn: string | null
  status: BookStatus
  /** work-level page count, for TOC-only planning (BK-17); nullable */
  total_pages: number | null
  /** DERIVED override, nullable (BR-BK-2) — NULL ⇒ derive; never a stored counter */
  progress: number | null
  start_date: string | null
  end_date: string | null
  /** 1–5 */
  rating: number | null
  /** @encrypted */
  review: string | null
  /** @encrypted */
  cover_url: string | null
  deleted_at: Timestamp | null
}

// DB-4 group #11 (mod-books ① S3, N1 fold) — the per-format copy of a WORK (BK-2). Mirrors the reshaped
// `book_assets` row (schema/books.ts:88-100): `file_ref` [E] (encrypted R2 ref, physical/braille have none),
// `native_position` plaintext (page/epub-location/audio-timestamp, format-interpreted, BK-1). Replaces the raw
// `BookAssetRow` in the `BookView` seam (the Book/BookChapter DB-11 reconcile precedent). `[FACT: schema/books.ts:88-100]`
export interface BookAsset extends SyncableEntity {
  book_id: Id
  format: BookAssetFormat
  /** @encrypted — encrypted R2 file ref; null for physical/braille (no stored file) */
  file_ref: string | null
  /** the single native position per asset (SSOT, BK-2); plaintext */
  native_position: string | null
  deleted_at: Timestamp | null
}

export interface BookChapter extends SyncableEntity {
  book_id: Id
  /** @encrypted */
  title: string
  chapter_number: number
  start_page: number | null
  end_page: number | null
  estimated_reading_minutes: number | null
  actual_reading_minutes: number | null
  is_completed: boolean
  completed_at: Timestamp | null
  sort_order: number
}

// DB-4 group #11 (mod-books ① S4, N-fold) — the three annotation natures (BK-6). Mirror the reshaped rows
// (schema/books.ts:103-145). Highlights are deliberately light (no notes/links — enforced by the entity-type
// registry excluding `book_highlight`); bookmarks + quotes take notes via `pages` and inter-link (bookmark↔quote).
export interface BookBookmark extends SyncableEntity {
  book_id: Id // work-anchored (BK-5), no asset FK
  position: string | null
  /** @encrypted */
  label: string | null
  deleted_at: Timestamp | null
}

export interface BookHighlight extends SyncableEntity {
  book_id: Id
  /** digital-content source asset (BK-6); nullable, no FK */
  asset_id: Id | null
  /** @encrypted */
  captured_text: string | null
  position: string | null
  deleted_at: Timestamp | null
}

export interface BookQuote extends SyncableEntity {
  book_id: Id
  /** @encrypted */
  text: string
  position: string | null
  deleted_at: Timestamp | null
}

/**
 * The `reading` Session sub-type's Books-owned 1:1 extension (BK-10, BR-BK-4). Keyed `session_id` → the base
 * `sessions.id` (UNIQUE, no FK); the shared timer/scheduling/lifecycle rides the base, these columns are the
 * mode-adaptive capture. NO `deleted_at` — the base `sessions` owns lifecycle (F1). `statistics` is the dormant
 * M2 granular-capture seam (a `json<Record>` column, parsed on read; M1 never writes it).
 * `[FACT: schema/books.ts:147-162; db-4-books/_index.md:49,91,125]`
 */
export interface ReadingSession extends SyncableEntity {
  session_id: Id
  book_id: Id
  asset_id: Id | null
  pages_read: number | null
  position_delta: string | null
  stop_point: string | null
  statistics: Record<string, unknown> | null
}

/**
 * A reading plan — the Quota Planner (BK-11). Covers one or many books (via `reading_plan_books`). Holds
 * `arrangement`/`goal_type`/target dates + the computed `quota_distribution` + `recalculation_state` (both stored
 * json). **NO `measurement_kind`/`binding_mode`** — the pursuable goal is Purpose/target-owned, Books stores no axis
 * (C-M1). `[FACT: schema/books.ts:165-174; rerun C-M1 books.md:71]`
 */
export interface ReadingPlan extends SyncableEntity {
  arrangement: ReadingPlanArrangement
  goal_type: ReadingPlanGoalType
  target_date: string | null
  target_completion_date: string | null
  quota_distribution: Record<string, unknown> | null
  recalculation_state: Record<string, unknown> | null
  deleted_at: Timestamp | null
}

/** The plan↔books arrangement junction (BK-11). `sequence` orders `sequenced` plans; `quota` is the per-book target. */
export interface ReadingPlanBook extends SyncableEntity {
  plan_id: Id
  book_id: Id
  sequence: number | null
  quota: number | null
  deleted_at: Timestamp | null
}

export interface Skill extends SyncableEntity {
  parent_skill_id: Id | null
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  mastery_level: MasteryLevel
  /** In minutes */
  practice_hours: number
  last_practiced: Timestamp | null
  proficiency_test_score: number | null
  deleted_at: Timestamp | null
}

export interface SkillResource extends SyncMetadata {
  id: Id
  skill_id: Id
  resource_type: SkillResourceType
  resource_id: Id
}

export interface StudySession extends SyncMetadata {
  id: Id
  resource_type: StudySessionResourceType
  resource_id: Id
  duration_minutes: number
  /** 1–5 */
  focus_rating: number | null
  /** 1–5 */
  energy_level: number | null
  distraction_count: number
  pages_read: number | null
  lessons_completed: number | null
  /** @encrypted */
  key_learnings: string | null
  started_at: Timestamp
  ended_at: Timestamp | null
  created_at: Timestamp
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export interface Language extends SyncableEntity {
  language_name: string
  language_code: string
  flag_emoji: string | null
  target_proficiency: LanguageProficiency | null
  current_proficiency: LanguageProficiency | null
  status: LanguageStatus
  start_date: string | null
  listening_level: LanguageProficiency | null
  speaking_level: LanguageProficiency | null
  reading_level: LanguageProficiency | null
  writing_level: LanguageProficiency | null
  daily_goal_minutes: number
  weekly_goal_sessions: number
  current_streak: number
  longest_streak: number
  total_practice_minutes: number
  total_sessions: number
  vocabulary_count: number
  current_day_number: number
  learning_phase: LearningPhase
  phase_started_at: Timestamp | null
  /** @encrypted */
  resources: string[]
  deleted_at: Timestamp | null
}

export interface LanguagePracticeSession extends SyncMetadata {
  id: Id
  language_id: Id
  skill_type: LanguageSkillType
  activity_type: PracticeActivityType
  duration_minutes: number
  new_words_learned: number
  accuracy_percentage: number | null
  /** 1–5 */
  focus_rating: number | null
  /** 1–5 */
  energy_level: number | null
  /** @encrypted */
  content: string | null
  created_at: Timestamp
}

export interface LanguageVocabulary extends SyncableEntity {
  language_id: Id
  /** @encrypted */
  word: string
  /** @encrypted */
  translation: string
  /** @encrypted */
  pronunciation: string | null
  part_of_speech: string | null
  /** @encrypted */
  example_sentence: string | null
  /** @encrypted */
  meaning_in_target_language: string | null
  /** @encrypted */
  source_activity: string | null
  mastery: VocabularyMastery
  review_count: number
  next_review_date: string | null
}

export interface LanguageDailySession extends SyncableEntity {
  language_id: Id
  /** YYYY-MM-DD — unique per language + date */
  session_date: string
  day_number: number | null
  weekly_plan_id: Id | null
  weekly_topic: WeeklyTopic | null
  grammar_video: boolean
  vocabulary_video: boolean
  conversation_video: boolean
  music: boolean
  bible_listening: boolean
  bible_recording: boolean
  vocabulary_journal: boolean
  /** @encrypted */
  grammar_video_url: string | null
  /** @encrypted */
  vocabulary_video_url: string | null
  /** @encrypted */
  conversation_video_url: string | null
  song_day_number: number | null
  bible_recording_id: Id | null
  song_recording_id: Id | null
}

export interface LanguageDailyProgress extends SyncMetadata {
  id: Id
  language_id: Id
  /** YYYY-MM-DD — unique per language + date */
  date: string
  listening_minutes: number
  speaking_minutes: number
  reading_minutes: number
  writing_minutes: number
  vocabulary_minutes: number
  grammar_minutes: number
  total_minutes: number
  sessions_count: number
  goal_met: boolean
}

export interface LanguageRecording extends SyncMetadata {
  id: Id
  language_id: Id
  recording_type: RecordingType
  /** @encrypted */
  title: string
  /** @encrypted */
  audio_blob: Uint8Array | null
  duration_seconds: number | null
  /** @encrypted */
  transcript: string | null
  compare_with_id: Id | null
  weekly_plan_id: Id | null
  /** @encrypted */
  metadata: Record<string, unknown> | null
  created_at: Timestamp
}

export interface LanguageWeeklyPlan extends SyncableEntity {
  language_id: Id
  /** Always Sunday, YYYY-MM-DD — unique per language */
  week_start_date: string
  week_number: number
  is_planned: boolean
  topic: WeeklyTopic | null
  /** @encrypted */
  song_title: string | null
  /** @encrypted */
  song_artist: string | null
  /** @encrypted */
  song_url: string | null
  /** @encrypted */
  song_lyrics: string | null
  current_song_day: number
  /** @encrypted */
  bible_book: string | null
  bible_chapter: number | null
  bible_verses_start: number | null
  bible_verses_end: number | null
  /** @encrypted */
  planned_videos: string[]
  videos_watched: number
  days_completed: number
  /** @encrypted */
  weekly_reflection: string | null
  /** @encrypted */
  highlight_moments: string[]
  /** @encrypted */
  challenges_faced: string[]
}

export interface LanguageBaseWord extends SyncMetadata {
  id: Id
  language_id: Id
  category: BaseWordCategory
  /** @encrypted */
  english_word: string
  /** @encrypted */
  translation: string | null
  /** @encrypted */
  meaning_in_target_language: string | null
  /** @encrypted */
  pronunciation: string | null
  is_learned: boolean
  learned_at: Timestamp | null
  linked_vocabulary_id: Id | null
  display_order: number | null
  created_at: Timestamp
}

export interface LanguageVideoPlaylist extends SyncableEntity {
  language_id: Id
  /** @encrypted */
  playlist_url: string
  /** @encrypted */
  title: string | null
  total_videos: number
  watched_count: number
  current_video_index: number
}

// ---------------------------------------------------------------------------
// ICS Calendar Sync
// ---------------------------------------------------------------------------

export interface IcsFeedConfig extends SyncableEntity {
  /** @encrypted */
  feed_url: string
  /** @encrypted */
  feed_name: string | null
  is_active: boolean
  auto_create_sessions: boolean
  // DB-11 reframe (F3): was `default_course_id` — the schema column is `default_subject_id` (no FK).
  default_subject_id: Id | null
  sync_interval_hours: number
  last_synced_at: Timestamp | null
  /** @encrypted */
  last_error: string | null
  /** @encrypted */
  metadata: Record<string, unknown> | null
}

export interface IcsSyncedEvent extends SyncableEntity {
  feed_id: Id
  uid: string
  /** @encrypted */
  summary: string | null
  /** @encrypted */
  description: string | null
  /** @encrypted */
  location: string | null
  start_time: Timestamp
  end_time: Timestamp | null
  recurrence_rule: string | null
  // DB-11 reframe (F3): was `matched_course_id` — the schema column is `matched_subject_id` (no FK).
  matched_subject_id: Id | null
  created_session_id: Id | null
  is_ignored: boolean
  /** @encrypted — full ICS event data */
  raw_event: string | null
}
