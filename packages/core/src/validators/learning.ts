import { z } from 'zod'
import {
  COURSE_TYPE,
  COURSE_STATUS,
  BOOK_FORMAT,
  BOOK_STATUS,
  BOOK_ASSET_FORMAT,
  READING_PLAN_ARRANGEMENT,
  READING_PLAN_GOAL_TYPE,
  MASTERY_LEVEL,
  SKILL_RESOURCE_TYPE,
  STUDY_SESSION_RESOURCE_TYPE,
  LANGUAGE_PROFICIENCY,
  LANGUAGE_STATUS,
  LEARNING_PHASE,
  LANGUAGE_SKILL_TYPE,
  PRACTICE_ACTIVITY_TYPE,
  VOCABULARY_MASTERY,
  RECORDING_TYPE,
  WEEKLY_TOPIC,
  BASE_WORD_CATEGORY,
  // DB-4 group #12 — Learning: Education (+ICS)
  DEGREE_TIER,
  TERM_LEVEL,
  PROGRAM_PARENT_TYPE,
  SCHEDULE_SOURCE,
  GRADING_SCOPE,
  GRADING_SCALE_TYPE,
  GRADING_COMPONENT_TYPE,
  ASSESSMENT_TYPE,
  ASSESSMENT_MODALITY,
  MEASUREMENT_REF_TYPE,
  RECORD_SOURCE,
  // S4 — base `sessions` spine enums (class-session boundary validation)
  SESSION_STATUS,
  SCHEDULING_MODE,
} from '@vida/types'

export const CourseTypeSchema = z.enum(COURSE_TYPE)
export const CourseStatusSchema = z.enum(COURSE_STATUS)
export const BookFormatSchema = z.enum(BOOK_FORMAT)
export const BookStatusSchema = z.enum(BOOK_STATUS)
// DB-4 group #11 — Books reframe
export const BookAssetFormatSchema = z.enum(BOOK_ASSET_FORMAT)
export const ReadingPlanArrangementSchema = z.enum(READING_PLAN_ARRANGEMENT)
export const ReadingPlanGoalTypeSchema = z.enum(READING_PLAN_GOAL_TYPE)
export const MasteryLevelSchema = z.enum(MASTERY_LEVEL)
export const SkillResourceTypeSchema = z.enum(SKILL_RESOURCE_TYPE)
export const StudySessionResourceTypeSchema = z.enum(STUDY_SESSION_RESOURCE_TYPE)
export const LanguageProficiencySchema = z.enum(LANGUAGE_PROFICIENCY)
export const LanguageStatusSchema = z.enum(LANGUAGE_STATUS)
export const LearningPhaseSchema = z.enum(LEARNING_PHASE)
export const LanguageSkillTypeSchema = z.enum(LANGUAGE_SKILL_TYPE)
export const PracticeActivityTypeSchema = z.enum(PRACTICE_ACTIVITY_TYPE)
export const VocabularyMasterySchema = z.enum(VOCABULARY_MASTERY)
export const RecordingTypeSchema = z.enum(RECORDING_TYPE)
export const WeeklyTopicSchema = z.enum(WEEKLY_TOPIC)
export const BaseWordCategorySchema = z.enum(BASE_WORD_CATEGORY)
// DB-4 group #12 — Learning: Education (+ICS)
export const DegreeTierSchema = z.enum(DEGREE_TIER)
export const TermLevelSchema = z.enum(TERM_LEVEL)
export const ProgramParentTypeSchema = z.enum(PROGRAM_PARENT_TYPE)
export const ScheduleSourceSchema = z.enum(SCHEDULE_SOURCE)
export const GradingScopeSchema = z.enum(GRADING_SCOPE)
export const GradingScaleTypeSchema = z.enum(GRADING_SCALE_TYPE)
export const GradingComponentTypeSchema = z.enum(GRADING_COMPONENT_TYPE)
export const AssessmentTypeSchema = z.enum(ASSESSMENT_TYPE)
export const AssessmentModalitySchema = z.enum(ASSESSMENT_MODALITY)
export const MeasurementRefTypeSchema = z.enum(MEASUREMENT_REF_TYPE)
export const RecordSourceSchema = z.enum(RECORD_SOURCE)

// ---------------------------------------------------------------------------
// Education hierarchy — create/update (mod-learning-education ① S1).
// Structure fields validated here; [E] free-text (name/description) carried
// as plain strings (M1.0 encryptedFields:[] pass-through). Fork (forked_from_id)
// is set by forkCurriculum in S3 — never a create input.
// ---------------------------------------------------------------------------

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
})
export const UpdateInstitutionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
})

export const CreateSelfTaughtPathSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
})
export const UpdateSelfTaughtPathSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
})

export const CreateProgramSchema = z.object({
  parent_type: ProgramParentTypeSchema,
  parent_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
})
export const UpdateProgramSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
})

export const CreateCurriculumSchema = z.object({
  program_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  is_template: z.boolean().optional(),
})
export const UpdateCurriculumSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  is_template: z.boolean().optional(),
})
// Fork (S3): the only input is an optional name override for the copy; the deep-copy + lineage is service logic.
export const ForkCurriculumSchema = z.object({
  name: z.string().min(1).optional(),
})

export const CreateTermSchema = z.object({
  curriculum_id: z.string().min(1),
  level: TermLevelSchema,
  parent_term_id: z.string().nullish(),
  name: z.string().min(1),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
})
export const UpdateTermSchema = z.object({
  name: z.string().min(1).optional(),
  level: TermLevelSchema.optional(),
  parent_term_id: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
})

// --- Subjects (mod-learning-education ① S2) — `progress` is NEVER an input (R2/M3,
// derived override) and inline `tags` do not exist (SP1 → entity_tags). `metadata` is a
// superseded generic slot, not exposed as a write input at S2. ---
export const CreateSubjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  provider: z.string().nullish(),
  instructor: z.string().nullish(),
  url: z.string().nullish(),
  course_type: CourseTypeSchema.nullish(),
  status: CourseStatusSchema.optional(), // notNull — defaults to 'not_started' on create
  total_modules: z.number().int().nonnegative().nullish(),
  completed_modules: z.number().int().nonnegative().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  target_completion: z.string().nullish(),
  estimated_hours: z.number().int().nonnegative().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  curriculum_id: z.string().nullish(), // routing (ED-3); resolved via resolveParentChain
  term_id: z.string().nullish(),
  degree_tier: DegreeTierSchema.nullish(),
})
export const UpdateSubjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  provider: z.string().nullish(),
  instructor: z.string().nullish(),
  url: z.string().nullish(),
  course_type: CourseTypeSchema.nullish(),
  status: CourseStatusSchema.optional(),
  total_modules: z.number().int().nonnegative().nullish(),
  completed_modules: z.number().int().nonnegative().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  target_completion: z.string().nullish(),
  estimated_hours: z.number().int().nonnegative().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  curriculum_id: z.string().nullish(), // re-routing re-validates via resolveParentChain
  term_id: z.string().nullish(),
  degree_tier: DegreeTierSchema.nullish(),
})

// ---------------------------------------------------------------------------
// Schedule & class sessions (mod-learning-education ① S4 — ED-4/ED-5).
// `ScheduleSourceSchema` already defined above (L60). Class-session spine fields
// (status/scheduling_mode) are validated at the boundary here AND re-validated by
// `sessions.createSession` (defense-in-depth). `started_at` = the meeting time (B1),
// required; a scheduled class supplies its future meeting time explicitly.
// ---------------------------------------------------------------------------
// `SchedulingModeSchema`/`SessionStatusSchema` already live in validators/session.ts — reuse the tuples inline here
// to avoid a duplicate export (they collide at the validators barrel).
export const SetScheduleSchema = z.object({
  source: ScheduleSourceSchema,
})
export const CreateClassSessionSchema = z.object({
  /** The meeting time (Unix ms) — required so the weekly schedule renders scheduled meetings (B1/BR-LE-S4-4). */
  started_at: z.number().int().positive(),
  ended_at: z.number().int().positive().nullish(),
  schedule_id: z.string().nullish(),
  source_event_id: z.string().nullish(),
  location: z.string().nullish(),
  scheduling_mode: z.enum(SCHEDULING_MODE).optional(), // defaults to 'attended' (ED-4) in the service
  status: z.enum(SESSION_STATUS).optional(), // defaults to 'scheduled' in the service
})

// ---------------------------------------------------------------------------
// S5 — ICS feeds + events (ED-6 · X1/X2/X5/X8/X9/X10). `feed_url` is a free-form [E] string — min(1), NOT
// `.url()` (no doc mandates URL-format validation at M1; preflight A1). `is_active`/`auto_create_sessions`
// default at the DB column (not re-asserted here — the S1–S4 column-fidelity pattern, preflight N2).
// ---------------------------------------------------------------------------
export const AddFeedSchema = z.object({
  url: z.string().min(1),
  default_subject_id: z.string().nullish(),
  auto_create_sessions: z.boolean().optional(),
  feed_name: z.string().nullish(),
})
export const MatchEventSchema = z.object({
  subject_id: z.string().min(1),
})

// ---------------------------------------------------------------------------
// S6 — grading systems + components (ED-7 · H3). A component is weight-based (`weight` in BasisPoints, 10000 = 100%)
// OR points-based (`max_points`) — both nullable. The weight-sum rule (non-null weights must total 100%) is enforced
// in the SERVICE (`GradingWeightError`), not here — a cross-field sum is a service invariant, not per-row validation.
// `scale_config` is the custom-scale definition; serialized `[E]` JSON service-side (R10).
// ---------------------------------------------------------------------------
export const CreateGradingComponentSchema = z.object({
  component_type: GradingComponentTypeSchema,
  name: z.string().nullish(),
  weight: z.number().int().nonnegative().nullish(), // BasisPoints
  max_points: z.number().int().positive().nullish(),
})
export const CreateGradingSystemSchema = z.object({
  scale_type: GradingScaleTypeSchema,
  scale_config: z.record(z.string(), z.unknown()).nullish(),
  name: z.string().min(1),
  description: z.string().nullish(),
  components: z.array(CreateGradingComponentSchema),
})
