import { z } from 'zod'
import {
  CONTRIBUTION_GOAL_TYPE,
  CONTRIBUTION_CONTRIBUTOR_TYPE,
  PLAN_STEP_OWNER_TYPE,
  STATUS,
  PRIORITY,
  LIFE_DOMAIN,
  FREQUENCY,
  MEASUREMENT_KIND,
  BINDING_MODE,
  BUCKET_LIST_CATEGORY,
  BUCKET_LIST_STATUS,
} from '@vida/types'

// Canonical validators for the Purpose & Goals substrate enums (DB-3 · ADR-011).
// z.enum over the @vida/types tuple — the single source (DB-9). No cast, no spread.
export const ContributionGoalTypeSchema = z.enum(CONTRIBUTION_GOAL_TYPE)
export const ContributionContributorTypeSchema = z.enum(CONTRIBUTION_CONTRIBUTOR_TYPE)
export const PlanStepOwnerTypeSchema = z.enum(PLAN_STEP_OWNER_TYPE)

// ============================================================================
// mod-purposes-and-goals #55 · ① service validators (co-located, one file per domain
// — the projects/project.ts precedent). S1 = the spine (values · purposes · targets);
// later slices append (metrics S3, dreams S2, …). The 0–100 progress columns are OVERRIDE
// SLOTS — omit/null ⇒ derive on read (PG-4).
// ============================================================================

const StatusSchema = z.enum(STATUS)
const PrioritySchema = z.enum(PRIORITY)
const DomainSchema = z.enum(LIFE_DOMAIN)
const FrequencySchema = z.enum(FREQUENCY)
const MeasurementKindSchema = z.enum(MEASUREMENT_KIND)
const BindingModeSchema = z.enum(BINDING_MODE)
/** YYYY-MM-DD calendar date */
const CalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable()
  .optional()
/** 0–100 manual override; omit/null ⇒ derive on read (PG-4) */
const Progress = z.number().int().min(0).max(100).nullable().optional()

// --- values (PG-9 — first-class core-beliefs above purposes) -----------------
export const CreateValueSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(), // default 0
})
export const UpdateValueSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
})

// --- purposes (the rollup apex; no measurement_kind) -------------------------
export const CreatePurposeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  why: z.string().nullable().optional(),
  value_id: z.string().nullable().optional(), // nullable spine joint (PG-9), no FK
  domain: DomainSchema.nullable().optional(),
  status: StatusSchema.optional(), // default 'in_progress'
  progress: Progress, // override slot
  start_date: CalendarDate,
  target_date: CalendarDate,
  is_primary: z.boolean().optional(), // default false
  sort_order: z.number().int().optional(),
})
export const UpdatePurposeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  why: z.string().nullable().optional(),
  value_id: z.string().nullable().optional(),
  domain: DomainSchema.nullable().optional(),
  status: StatusSchema.optional(),
  progress: Progress,
  start_date: CalendarDate,
  target_date: CalendarDate,
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

// --- targets (= Goals; the pursuable entity) --------------------------------
export const CreateTargetSchema = z.object({
  purpose_id: z.string().nullable().optional(), // SR-003 relaxed → nullable (PG-9), no FK
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  measurement_kind: MeasurementKindSchema.optional(), // default 'quantitative'
  binding_mode: BindingModeSchema.nullable().optional(), // NULL ⇒ derive (ADR-011 M2)
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(), // override slot (PG-4)
  unit: z.string().nullable().optional(),
  success_criteria: z.string().nullable().optional(), // PG-11 (restored)
  measurement_method: z.string().nullable().optional(), // PG-11 (restored)
  status: StatusSchema.optional(), // default 'not_started'
  priority: PrioritySchema.optional(), // default 'medium'
  start_date: CalendarDate,
  target_date: CalendarDate,
  next_review_date: CalendarDate,
  // nullable; the DB DEFAULT 'weekly' never fires under create-echo (every key is in the INSERT) ⇒ an omit persists NULL
  review_frequency: FrequencySchema.nullable().optional(),
  sort_order: z.number().int().optional(),
})
export const UpdateTargetSchema = z.object({
  purpose_id: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  measurement_kind: MeasurementKindSchema.optional(),
  binding_mode: BindingModeSchema.nullable().optional(),
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  success_criteria: z.string().nullable().optional(),
  measurement_method: z.string().nullable().optional(),
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  start_date: CalendarDate,
  target_date: CalendarDate,
  next_review_date: CalendarDate,
  review_frequency: FrequencySchema.nullable().optional(),
  sort_order: z.number().int().optional(),
})

// --- dreams (S2 — single aspiration; absorbs bucket_list_items, PG-16) -------
const CategorySchema = z.enum(BUCKET_LIST_CATEGORY)
const BucketStatusSchema = z.enum(BUCKET_LIST_STATUS)
/** A dream checklist step — stored as a JSON string in the `steps` TEXT column (never json<T>()). */
const DreamStepSchema = z.object({ id: z.string(), text: z.string(), completed: z.boolean() })
const StepsSchema = z.array(DreamStepSchema).nullable().optional()

export const CreateDreamSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  domain: DomainSchema.nullable().optional(),
  category: CategorySchema.nullable().optional(), // default 'other'
  status: BucketStatusSchema.optional(), // default 'dream'
  priority: PrioritySchema.optional(), // default 'medium'
  target_age: z.number().int().nullable().optional(),
  target_date: CalendarDate,
  completed_date: CalendarDate,
  estimated_cost: z.number().int().nullable().optional(), // cents
  location: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  inspiration_url: z.string().nullable().optional(),
  progress_percentage: Progress, // override slot (PG-4)
  steps: StepsSchema,
  purpose_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
})
export const UpdateDreamSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  domain: DomainSchema.nullable().optional(),
  category: CategorySchema.nullable().optional(),
  status: BucketStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  target_age: z.number().int().nullable().optional(),
  target_date: CalendarDate,
  completed_date: CalendarDate,
  estimated_cost: z.number().int().nullable().optional(),
  location: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  inspiration_url: z.string().nullable().optional(),
  progress_percentage: Progress,
  steps: StepsSchema,
  purpose_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
})

// Input types — inferred from the schemas (single source of truth; cannot drift).
export type CreateValueInput = z.infer<typeof CreateValueSchema>
export type UpdateValueInput = z.infer<typeof UpdateValueSchema>
export type CreatePurposeInput = z.infer<typeof CreatePurposeSchema>
export type UpdatePurposeInput = z.infer<typeof UpdatePurposeSchema>
export type CreateTargetInput = z.infer<typeof CreateTargetSchema>
export type UpdateTargetInput = z.infer<typeof UpdateTargetSchema>
export type CreateDreamInput = z.infer<typeof CreateDreamSchema>
export type UpdateDreamInput = z.infer<typeof UpdateDreamSchema>
