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
  CALCULATION_METHOD,
  METRIC_VALUE_SOURCE,
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

// --- metrics + value ledger (S3 — PG-15) -------------------------------------
const CalculationMethodSchema = z.enum(CALCULATION_METHOD)
const MetricValueSourceSchema = z.enum(METRIC_VALUE_SOURCE)

export const CreateMetricSchema = z.object({
  purpose_id: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(), // override slot — NULL ⇒ derive via calculation_method (PG-4)
  calculation_method: CalculationMethodSchema.optional(), // default 'latest'
  is_higher_better: z.boolean().nullable().optional(), // progress direction (PG-15)
  baseline_value: z.number().nullable().optional(),
})
export const UpdateMetricSchema = z.object({
  purpose_id: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  calculation_method: CalculationMethodSchema.optional(),
  is_higher_better: z.boolean().nullable().optional(),
  baseline_value: z.number().nullable().optional(),
})
/** Record a time-series point on a metric's ledger. `recorded_at` defaults to now (Unix ms) if omitted. */
export const RecordMetricValueSchema = z.object({
  source: MetricValueSourceSchema.optional(), // default 'manual'
  context_notes: z.string().nullable().optional(),
  recorded_at: z.number().int().optional(),
})

// --- contributions edge (S4 — PG-10, weighted polymorphic goal-edge) ---------
/** The weight + optional notes on a contribution. The goal/contributor TYPE membership is a domain guard
 *  (InvalidContributor), not a Zod enum here — so an out-of-vocabulary ref is a typed domain error, not a ZodError. */
export const LinkContributionSchema = z.object({
  weight: z.number().int().min(0).max(100), // 0–100; never a copied progress value (PG-10)
  notes: z.string().nullable().optional(),
})
export const ReweightContributionSchema = z.object({
  weight: z.number().int().min(0).max(100),
})

// --- bindings (S6 — ADR-011 §3.5/§3.7, PG-6/8) -------------------------------
/** A binding's source endpoint — any pursuable/source entity (habit · finance_target · another target · …).
 *  Not enum-guarded (the source vocabulary is cross-module/open); validated as a non-empty {type,id}. */
const BindingRefSchema = z.object({ type: z.string().min(1), id: z.string().min(1) })
/** Declare a target's binding_mode. A non-manual mode (`derived-pull`/`event-trigger`) REQUIRES a `ref` (the
 *  source it reads / is fed by); `manual` ignores ref and clears the binding. */
export const BindSchema = z
  .object({
    binding_mode: BindingModeSchema,
    ref: BindingRefSchema.optional(),
  })
  .refine((v) => v.binding_mode === 'manual' || v.ref != null, {
    message: 'a derived-pull / event-trigger binding requires a ref',
    path: ['ref'],
  })

// --- reviews + plan_steps (S7 — PG-11/12/13) --------------------------------
/** Conduct/record a target review (ledger row). `reviewed_at` defaults to now (Unix ms). */
export const OpenTargetReviewSchema = z.object({
  progress_rating: z.number().int().min(1).max(10).nullable().optional(),
  reflection: z.string().nullable().optional(),
  next_actions: z.string().nullable().optional(),
  reviewed_at: z.number().int().optional(),
})
/** Conduct/record a purpose review (the alignment/fulfillment loop, PG-12). `still_aligned` required. */
export const OpenPurposeReviewSchema = z.object({
  still_aligned: z.boolean(),
  alignment_notes: z.string().nullable().optional(),
  overall_progress: z.number().int().min(0).max(100).nullable().optional(),
  key_achievements: z.string().nullable().optional(),
  obstacles_faced: z.string().nullable().optional(),
  adjustments_needed: z.string().nullable().optional(),
  renewed_commitment: z.boolean().nullable().optional(),
  fulfillment_rating: z.number().int().nullable().optional(),
  clarity_rating: z.number().int().nullable().optional(),
  reviewed_at: z.number().int().optional(),
})
/** A plan step (ordered doc checklist on a task/target, PG-11). The owner {type,id} is a typed arg, not here. */
export const AddPlanStepSchema = z.object({
  title: z.string().min(1),
  note: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
})

// Input types — inferred from the schemas (single source of truth; cannot drift).
export type BindInput = z.infer<typeof BindSchema>
export type OpenTargetReviewInput = z.infer<typeof OpenTargetReviewSchema>
export type OpenPurposeReviewInput = z.infer<typeof OpenPurposeReviewSchema>
export type AddPlanStepInput = z.infer<typeof AddPlanStepSchema>
export type LinkContributionInput = z.infer<typeof LinkContributionSchema>
export type CreateMetricInput = z.infer<typeof CreateMetricSchema>
export type UpdateMetricInput = z.infer<typeof UpdateMetricSchema>
export type RecordMetricValueInput = z.infer<typeof RecordMetricValueSchema>
export type CreateValueInput = z.infer<typeof CreateValueSchema>
export type UpdateValueInput = z.infer<typeof UpdateValueSchema>
export type CreatePurposeInput = z.infer<typeof CreatePurposeSchema>
export type UpdatePurposeInput = z.infer<typeof UpdatePurposeSchema>
export type CreateTargetInput = z.infer<typeof CreateTargetSchema>
export type UpdateTargetInput = z.infer<typeof UpdateTargetSchema>
export type CreateDreamInput = z.infer<typeof CreateDreamSchema>
export type UpdateDreamInput = z.infer<typeof UpdateDreamSchema>
