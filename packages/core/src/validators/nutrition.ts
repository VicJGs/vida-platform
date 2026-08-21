import { z } from 'zod'
import { MEAL_SOURCE, MEAL_GENERATION_METHOD } from '@vida/types'

// DB-4 group #18 Health: Nutrition — canonical Zod validators for the 2 net-new tuples (ADR-002 §2.3).
// Reused FREQUENCY (nutritional_plans.review_frequency) has its own validator. OPEN vocabs (modality /
// editable-starter / status) carry no tuple → no validator (plain TEXT, no CHECK).
export const MealSourceSchema = z.enum(MEAL_SOURCE)
export const MealGenerationMethodSchema = z.enum(MEAL_GENERATION_METHOD)
