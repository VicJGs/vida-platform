import { z } from 'zod'
import { MOVEMENT_PATTERN, WORKOUT_SET_CATEGORY, BURN_SOURCE } from '@vida/types'

// DB-4 group #19 Health: Training — canonical Zod validators for the 3 net-new tuples (ADR-002 §2.3).
// Reused METRIC_SIDE (workout_sets.side) + PHYSICAL_ROLE_AUTHORING_SOURCE (exercise_plans.authoring_source)
// have their own validators (validators/health.ts). OPEN vocabs (modality/status) carry no tuple → no validator.
export const MovementPatternSchema = z.enum(MOVEMENT_PATTERN)
export const WorkoutSetCategorySchema = z.enum(WORKOUT_SET_CATEGORY)
export const BurnSourceSchema = z.enum(BURN_SOURCE)
