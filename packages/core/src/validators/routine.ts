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
export const RoutineTimeOfDaySchema = z.enum(ROUTINE_TIME_OF_DAY)
// Re-export the shared measurability validators for the routines surface (no redefine).
export { MeasurementKindSchema, BindingModeSchema }

// --- routines (RT-2/RT-19) --------------------------------------------------
const RoutineFields = z.object({
  name: z.string(),
  description: z.string().nullable(),
  recurrence_rule: z.string().nullable(), // RRULE (RT-11)
  lifecycle: RoutineLifecycleSchema,
  measurement_kind: MeasurementKindSchema, // ADR-011 M1 (RT-19 natural 'rate')
  binding_mode: BindingModeSchema.nullable(), // null ⇒ derive derived-pull
  progress: z.number().int().nullable(), // nullable override slot (RT-14 — no cached streak)
  sort_order: z.number().int(),
})
export const CreateRoutineSchema = RoutineFields.partial().extend({
  name: z.string(),
})
export const UpdateRoutineSchema = RoutineFields.partial()
