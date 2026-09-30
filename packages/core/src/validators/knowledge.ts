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

// ---------------------------------------------------------------------------
// mod-knowledge S2 — Containers + References (input validators)
// ---------------------------------------------------------------------------

/** knowledge_containers create (KNO-12). container_type FIXED (module|area|subject); name [E]/required.
 *  Nesting is NOT a parent_id — membership rides entity_tags (KN-7, BR-S2-1/2). */
export const CreateKnowledgeContainerSchema = z.object({
  container_type: KnowledgeContainerTypeSchema,
  name: z.string().min(1),
})

/** references add (KNO-29). object_id is the separate call arg; the body carries the first-class Reference
 *  fields that replace resource_urls[E] (title required; source/url/type nullable/OPEN — BR-S2-3). */
export const AddReferenceSchema = z.object({
  title: z.string().min(1),
  source: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// mod-knowledge S3 — Review engine ① (methods + curves + bindings) input validators
// ---------------------------------------------------------------------------

/** defineCurve (KNO-18). curve_kind FIXED (decay|review|test); name [E]/required; params = free-form tuning
 *  (JSON-as-TEXT, BR-S3-8). `is_preset` is NOT a user input — user curves are never presets (seed defers to S4). */
export const DefineCurveSchema = z.object({
  name: z.string().min(1),
  curve_kind: ReviewCurveKindSchema,
  params: z.record(z.string(), z.unknown()).nullable().optional(),
})

/** registerMethod (KNO-16). A study_method capability carries only an id + optional config; the empty privilege
 *  envelope (render_targets/effects/bindings/terminal_states) is supplied by the engine (BR-S3-2), not the caller. */
export const RegisterMethodSchema = z.object({
  id: z.string().min(1),
  config_schema: z.record(z.string(), z.unknown()).optional(),
})

/** bindMethod (KNO-19). Polymorphic target (area|subject|unit|topic|kind); method_id/curve_id are no-FK refs
 *  (BR-S3-6 — not asserted to exist). daily_cap optional throttle. */
export const BindMethodSchema = z.object({
  targetType: MethodBindingTargetTypeSchema,
  targetId: z.string().min(1),
  methodId: z.string().min(1),
  curveId: z.string().nullable().optional(),
  dailyCap: z.number().int().nullable().optional(),
})

// ---------------------------------------------------------------------------
// mod-knowledge S4 — Review engine ② (record) input validator
// ---------------------------------------------------------------------------

/** recordReview (KNO-22). Appends a review_events row; `quality` is the 0–5 signal (nullable — a method may emit a
 *  non-graded signal). `objectId`/`methodId` are no-FK refs (BR-S4-1, mirrors bindMethod). reviewed_at is stamped
 *  by the engine (Date.now()), not a caller input. */
export const RecordReviewSchema = z.object({
  objectId: z.string().min(1),
  methodId: z.string().min(1),
  quality: z.number().int().min(0).max(5).nullable().optional(),
})

// ---------------------------------------------------------------------------
// mod-knowledge S6 — Compound sets + Lab (input validators)
// ---------------------------------------------------------------------------

/** buildCompoundSet (KNO-31, BR-S6-3). `consumer_module` OPEN (no CHECK — [[open-vocab-columns-take-no-sql-check]]);
 *  `spec` = the structured rules/methods/params blob, serialized to the [E] opaque-JSON TEXT column at the service
 *  boundary (@vida/types keeps it `string` at rest); `name` [E]/optional. */
export const BuildCompoundSetSchema = z.object({
  consumer_module: z.string().min(1),
  spec: z.record(z.string(), z.unknown()).nullable().optional(),
  name: z.string().nullable().optional(),
})

/** createLabEntry (KNO-34, BR-S6-7). `hypothesis` [E]/required; `data_refs` = own-module ref ids (json<string[]>
 *  boundary, the key_concepts precedent). snake_case mirrors the columns (CreateKnowledgeObjectSchema convention). */
export const CreateLabEntrySchema = z.object({
  hypothesis: z.string().min(1),
  data_refs: z.array(z.string()).nullable().optional(),
})

/** concludeLabEntry (KNO-35, BR-S6-8). `conclusion` [E]/required (a conclusion is the point of concluding). */
export const ConcludeLabEntrySchema = z.object({
  conclusion: z.string().min(1),
})

/** promoteToObject (KNO-36, BR-S6-9). The promoted catalog object needs a `kind_id` (every object has one, KNO-04);
 *  optional `parent_object_id` (createObject validates both refs). */
export const PromoteToObjectSchema = z.object({
  kind_id: z.string().min(1),
  parent_object_id: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// mod-knowledge S7 — Flashcards (input validators)
// ---------------------------------------------------------------------------

/** createCard (FC-01/05, BR-S7-1/2). `front`/`back` `[E]` required; `hint`/`explanation` `[E]` nullable;
 *  `media` = `json<string[]>` boundary. `card_type` is accepted as a string here and validated in the SERVICE
 *  against CARD_TYPE → `InvalidCardType` (a typed author-time error, not a raw ZodError) + the cloze-mask check →
 *  `MalformedCloze` (FC-5). snake_case mirrors the columns (the module create-schema convention). */
export const CreateCardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  card_type: z.string().min(1),
  media: z.array(z.string()).nullable().optional(),
  is_suspended: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})
export const UpdateCardSchema = CreateCardSchema.partial()

/** generateCards (FC-04, BR-S7-10). A `sourceRef` (kept as an `entity_links` provenance ref) + the extracted card
 *  contents (each validated as a card). The live-object → content extraction is the caller's (headline #5, decoupled). */
export const GenerateCardsSchema = z.object({
  sourceRef: z.object({ entityType: z.string().min(1), entityId: z.string().min(1) }),
  items: z.array(CreateCardSchema).min(1),
})
