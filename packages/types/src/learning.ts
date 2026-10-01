// ============================================================================
// Learning, Languages & ICS Sync — @vida/types
// ADR-002 §5.10, §5.12, §5.18
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

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
// Course, Book, Skill
// ---------------------------------------------------------------------------

export interface Course extends SyncableEntity {
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
  course_type: CourseType | null
  status: CourseStatus
  /** 0–100 */
  progress: number
  total_modules: number
  completed_modules: number
  start_date: string | null
  end_date: string | null
  target_completion: string | null
  /** In minutes */
  estimated_hours: number | null
  /** 1–5 */
  rating: number | null
  /** @encrypted */
  tags: string[]
  /** @encrypted — course-specific data (e.g. college class schedule) */
  metadata: Record<string, unknown> | null
  deleted_at: Timestamp | null
}

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
  default_course_id: Id | null
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
  matched_course_id: Id | null
  created_session_id: Id | null
  is_ignored: boolean
  /** @encrypted — full ICS event data */
  raw_event: string | null
}
