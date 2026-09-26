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
  KNOWLEDGE_CONTAINER_TYPE,
  CARD_TYPE,
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
// DB-4 group #10: Knowledge Universe reframe
export const KnowledgeContainerTypeSchema = z.enum(KNOWLEDGE_CONTAINER_TYPE)
export const CardTypeSchema = z.enum(CARD_TYPE)

// ---------------------------------------------------------------------------
// mod-knowledge S1 — Object kinds + Objects (input validators)
// ---------------------------------------------------------------------------

/** object_kinds create. FLAT registry (no parent_kind_id). learning_realm OPEN/nullable. */
export const CreateObjectKindSchema = z.object({
  name: z.string().min(1),
  learning_realm: z.string().nullable().optional(),
  default_method_id: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})
export const UpdateObjectKindSchema = CreateObjectKindSchema.partial()

/** knowledge_objects create. NOTE: `mastery_level` is DERIVED (KN-9) — deliberately ABSENT so it can
 *  never be hand-set on create or update (`.partial()` inherits the omission). */
export const CreateKnowledgeObjectSchema = z.object({
  kind_id: z.string().min(1),
  parent_object_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  key_concepts: z.array(z.string()).nullable().optional(),
  status: StudyTopicStatusSchema.nullable().optional(),
  difficulty: TopicDifficultySchema.nullable().optional(),
  is_exam_topic: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})
export const UpdateKnowledgeObjectSchema = CreateKnowledgeObjectSchema.partial()
