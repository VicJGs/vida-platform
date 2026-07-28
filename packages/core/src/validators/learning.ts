import { z } from 'zod'
import {
  COURSE_TYPE,
  COURSE_STATUS,
  BOOK_FORMAT,
  BOOK_STATUS,
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
} from '@vida/types'

export const CourseTypeSchema = z.enum(COURSE_TYPE)
export const CourseStatusSchema = z.enum(COURSE_STATUS)
export const BookFormatSchema = z.enum(BOOK_FORMAT)
export const BookStatusSchema = z.enum(BOOK_STATUS)
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
