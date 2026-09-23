// ============================================================================
// validators/gamification — Zod for the Gamification module surface (mod-gamification #48 ① · S1)
//
// Currency-create (over the foundation CurrencyRegistry) + user_profile update.
// backing_kind reuses the economy enum schema (no duplicate). total_xp/current_level
// are NOT here — they are service-managed caches (GM-4), never client-set.
// ============================================================================

import { z } from 'zod'
import { CurrencyBackingKindSchema } from './economy'

/** defineCurrency input (maps to foundation CurrencyDef; `name` is [E]). */
export const CurrencyCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().optional(),
  backing_kind: CurrencyBackingKindSchema,
  unit: z.string().optional(),
  icon: z.string().optional(),
  pool_ceiling: z.number().int().nullable().optional(),
})

/** updateProfile input — the mutable, non-cache user_profile columns (IR-11 real-column view). */
export const UpdateProfileSchema = z
  .object({
    life_stage: z.string().nullable().optional(),
    focus_areas: z.array(z.string()).optional(),
    display_name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    birth_date: z.string().nullable().optional(),
    timezone: z.string().optional(),
    skipped_modules: z.array(z.string()).optional(),
  })
  .strict()
