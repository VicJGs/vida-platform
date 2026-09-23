// ============================================================================
// validators/habit — canonical Zod validators (mod-habits #49 ① · S1)
//
// Enum schemas (z.enum over the @vida/types tuples — tuple ≡ union ≡ validator ≡
// SQL CHECK, enum-parity.test.ts) + the S1 Habit Create/Update shapes.
//
// MeasurementKindSchema/BindingModeSchema are canonical in ./measurement and
// LifeDomainSchema in ./common — reuse (re-export), never redefine (barrel collision).
// Create makes defaulted/nullable columns OPTIONAL — serializeHabit backfills the
// notNull-default columns so create()'s echoed row is faithful (repository-create-
// returns-input-row seam). Update is fully partial. The derived streak cache
// (current/longest/total_completions) is service-managed → NOT in the input shape.
// ============================================================================

import { z } from 'zod'
import { HABIT_TYPE, HABIT_FREQUENCY, HABIT_TIME_OF_DAY, HABIT_DIFFICULTY } from '@vida/types'
import { MeasurementKindSchema, BindingModeSchema } from './measurement'
import { LifeDomainSchema } from './common'

export const HabitTypeSchema = z.enum(HABIT_TYPE)
export const HabitFrequencySchema = z.enum(HABIT_FREQUENCY)
export const HabitTimeOfDaySchema = z.enum(HABIT_TIME_OF_DAY)
export const HabitDifficultySchema = z.enum(HABIT_DIFFICULTY)
// Re-export the shared measurability + domain validators for the habits surface (no redefine).
export { MeasurementKindSchema, BindingModeSchema, LifeDomainSchema }

// --- habits (HAB-01/02/24) --------------------------------------------------
const HabitFields = z.object({
  name: z.string(),
  description: z.string().nullable(),
  habit_type: HabitTypeSchema,
  frequency: HabitFrequencySchema,
  days_of_week: z.array(z.number().int()).nullable(), // [0-6]; serialized to JSON TEXT
  target_count: z.number().int(),
  unit: z.string().nullable(),
  time_of_day: HabitTimeOfDaySchema,
  times_of_day: z.array(z.string()).nullable(), // JSON TEXT
  cue: z.string().nullable(),
  reward: z.string().nullable(),
  domain: LifeDomainSchema.nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
  measurement_kind: MeasurementKindSchema,
  binding_mode: BindingModeSchema.nullable(),
  success_criteria: z.string().nullable(),
  difficulty: HabitDifficultySchema.nullable(),
})
export const CreateHabitSchema = HabitFields.partial().extend({
  name: z.string(),
})
export const UpdateHabitSchema = HabitFields.partial()
