import { z } from 'zod'
import {
  STUDY_TOPIC_STATUS,
  TOPIC_DIFFICULTY,
  FLASHCARD_RESOURCE_TYPE,
  PRESET_BLOCK,
  STUDY_PLAN_BATCH_STATUS,
  SCHEDULED_SESSION_TYPE,
  SCHEDULED_SESSION_STATUS,
  SCHEDULED_RESOURCE_TYPE,
  REVIEW_CURVE_KIND,
  METHOD_BINDING_TARGET_TYPE,
} from '@vida/types'

export const StudyTopicStatusSchema = z.enum(STUDY_TOPIC_STATUS)
export const TopicDifficultySchema = z.enum(TOPIC_DIFFICULTY)
export const FlashcardResourceTypeSchema = z.enum(FLASHCARD_RESOURCE_TYPE)
export const PresetBlockSchema = z.enum(PRESET_BLOCK)
export const StudyPlanBatchStatusSchema = z.enum(STUDY_PLAN_BATCH_STATUS)
export const ScheduledSessionTypeSchema = z.enum(SCHEDULED_SESSION_TYPE)
export const ScheduledSessionStatusSchema = z.enum(SCHEDULED_SESSION_STATUS)
export const ScheduledResourceTypeSchema = z.enum(SCHEDULED_RESOURCE_TYPE)
// DB-3: generic review engine (ADR-005)
export const ReviewCurveKindSchema = z.enum(REVIEW_CURVE_KIND)
export const MethodBindingTargetTypeSchema = z.enum(METHOD_BINDING_TARGET_TYPE)
