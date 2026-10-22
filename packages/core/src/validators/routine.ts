// ============================================================================
// validators/routine — canonical Zod validators (mod-routines #64 ① · S1)
//
// Enum schemas (z.enum over the @vida/types tuples — tuple ≡ union ≡ validator ≡
// SQL CHECK, enum-parity.test.ts) + the S1 Routine Create/Update shapes.
//
// DB-11 reconcile: the flat-POC RoutineActionTypeSchema/RoutineRecurrenceFrequencySchema
// are RETIRED with their tuples. MeasurementKindSchema/BindingModeSchema are canonical in
// ./measurement — reuse (re-export), never redefine (barrel collision). Create makes
// defaulted/nullable columns OPTIONAL; serializeRoutine backfills the notNull-default
// columns so create()'s echoed row is faithful (repository-create-returns-input-row seam).
// The derived `progress` is a nullable override slot (RT-14) — NOT a required input.
// ============================================================================

import { z } from 'zod'
import { ROUTINE_LIFECYCLE, ROUTINE_TIME_OF_DAY } from '@vida/types'
import { MeasurementKindSchema, BindingModeSchema } from './measurement'

export const RoutineLifecycleSchema = z.enum(ROUTINE_LIFECYCLE)
// S2c — setLifecycle input (ROU-17). Namespaced: two `export *` barrels carry this file.
export const SetRoutineLifecycleSchema = z.object({ lifecycle: RoutineLifecycleSchema })
export const RoutineTimeOfDaySchema = z.enum(ROUTINE_TIME_OF_DAY)
// Re-export the shared measurability validators for the routines surface (no redefine).
export { MeasurementKindSchema, BindingModeSchema }

// S2c (B1, interp rule 16, ADR-002 §2.8) — calendar dates are YYYY-MM-DD. Shape only, the tasks/projects/purposes parity.
const YMD = /^\d{4}-\d{2}-\d{2}$/
const CalendarDate = z.string().regex(YMD, 'expected YYYY-MM-DD')
// Namespaced export for the service's positional-date checks (editCompletion/deleteCompletion) — avoids an `export *` collision.
export const RoutineCalendarDateSchema = CalendarDate

// --- routines (RT-2/RT-19) --------------------------------------------------
const RoutineFields = z.object({
  name: z.string().min(1), // S2c (B16) — a routine is a NAMED sequence (RT-2)
  description: z.string().nullable(),
  recurrence_rule: z.string().nullable(), // RRULE (RT-11)
  lifecycle: RoutineLifecycleSchema,
  measurement_kind: MeasurementKindSchema, // ADR-011 M1 (RT-19 natural 'rate')
  binding_mode: BindingModeSchema.nullable(), // null ⇒ derive derived-pull
  progress: z.number().int().min(0).max(100).nullable(), // override slot 0–100 (RT-14; projects ProgressSchema parity, S2c B2)
  sort_order: z.number().int(),
})
export const CreateRoutineSchema = RoutineFields.partial().extend({
  name: z.string().min(1), // the extend override must carry min(1) too, or it bypasses the base field's
})
export const UpdateRoutineSchema = RoutineFields.partial()

// --- routine_step (RT-3/RT-4/RT-8 · S2) -------------------------------------
// `step_type` is OPEN vocab (user-extensible, registry-validated) → plain string, NO enum.
// `entity_type`/`entity_id` are nullable (an actionable "alarm" step has no driven entity, RT-4).
// `skip_dates` is a JSON array of YYYY-MM-DD (planned skips, RT-8) → serialized to TEXT by the service.
// `routine_id` is NOT in the input shape — addStep takes it as an argument (the habit-completion precedent).
const RoutineStepFields = z.object({
  step_type: z.string().nullable(),
  entity_type: z.string().nullable(),
  entity_id: z.string().nullable(),
  is_required: z.boolean(),
  title: z.string().min(1), // S2c (B16)
  description: z.string().nullable(),
  time_of_day: RoutineTimeOfDaySchema.nullable(),
  skip_dates: z.array(CalendarDate).nullable(), // S2c (B1)
  step_order: z.number().int(),
})
export const AddStepSchema = RoutineStepFields.partial().extend({
  title: z.string().min(1), // the extend override must carry min(1) too
})
export const UpdateStepSchema = RoutineStepFields.partial()

// --- routine_completions (RT-5/RT-8 · S3) -----------------------------------
// The per-step ledger. `completeStep` = a DONE occurrence (skipped=false); `skipStep` = a LOGGED skip on the day
// (skipped=true + reason, RT-8). `completed_date` defaults to today (clock) in the service. Pre-planned skips are a
// DISTINCT mechanism (step.skip_dates) → `planSkipDates`, not a completion row (RT-8).
export const CompleteStepSchema = z.object({
  date: CalendarDate.optional(),
  actual_duration_minutes: z.number().int().nullable().optional(),
})
// S3 — runStep input: the occurrence date (default = UTC today).
export const RunStepSchema = z.object({
  date: CalendarDate.optional(),
})
// S4 — evaluateRoutine input: the occurrence date judged (default = UTC today).
export const EvaluateRoutineSchema = z.object({
  date: CalendarDate.optional(),
})
// S5 — an analytics range: YYYY-MM-DD inclusive, from <= to.
export const RoutineDateRangeSchema = z
  .object({ from: CalendarDate, to: CalendarDate })
  .refine((r) => r.from <= r.to, { message: 'from must be <= to' })
export const SkipStepSchema = z.object({
  date: CalendarDate.optional(),
  reason: z.string().nullable().optional(),
})
// Namespaced to avoid the `export *` barrel collision with habits' EditCompletionSchema (both re-exported
// from validators/index.ts + the @vida/core barrel) — [[barrel-export-star-collides-with-services-on-generic-names]].
export const EditRoutineCompletionSchema = z.object({
  skipped: z.boolean().optional(),
  skip_reason: z.string().nullable().optional(),
  actual_duration_minutes: z.number().int().nullable().optional(),
})
export const PlanSkipDatesSchema = z.object({
  dates: z.array(CalendarDate),
})
