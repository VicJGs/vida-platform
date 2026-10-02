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
