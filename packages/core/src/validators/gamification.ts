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

// --- S2 rule engine ---------------------------------------------------------

/** The 4 gamification-owned consequence effects (ADR-004 §3.2.5 Additive class). move_money/
 *  surface_notification handlers are Finance/Notifications-owned; grant/lock are economy's. */
export const GAMIFICATION_EFFECTS = [
  'grant_currency',
  'lock_currency',
  'move_money',
  'surface_notification',
] as const

/** A currency effect payload (grant/lock) — the amount is a positive magnitude (kind implies sign). */
const CurrencyEffectPayload = z.object({
  currencyId: z.string().min(1),
  amount: z.number().int().nonnegative(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
})

/** One typed consequence in a rule's `consequences` set. grant/lock carry a typed payload (needed for the
 *  below-floor clamp); move_money/surface_notification payloads are validated by their owning handlers. */
export const ConsequenceSpecSchema = z.discriminatedUnion('effectType', [
  z.object({ effectType: z.literal('grant_currency'), targetRef: z.string().optional(), payload: CurrencyEffectPayload }),
  z.object({ effectType: z.literal('lock_currency'), targetRef: z.string().optional(), payload: CurrencyEffectPayload }),
  z.object({ effectType: z.literal('move_money'), targetRef: z.string().optional(), payload: z.record(z.string(), z.unknown()) }),
  z.object({ effectType: z.literal('surface_notification'), targetRef: z.string().optional(), payload: z.record(z.string(), z.unknown()).optional() }),
])

/** A rule's condition (M1 minimal encoding, config-open). event_trigger fires on a matching event;
 *  derived_pull reads a measurement source and compares to a threshold. Its `kind` maps to
 *  the `condition_binding_type` column. */
export const RuleConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('event_trigger'), eventType: z.string().min(1) }),
  z.object({
    kind: z.literal('derived_pull'),
    measureKey: z.string().min(1),
    operator: z.enum(['gte', 'lte', 'eq']),
    threshold: z.number(),
  }),
])

export const RuleCreateSchema = z.object({
  name: z.string().min(1),
  condition: RuleConditionSchema,
  consequences: z.array(ConsequenceSpecSchema).min(1),
  grantId: z.string().nullable().optional(), // null = shipped/trusted; non-null = user-authored (envelope-checked)
  isEnabled: z.boolean().optional(),
})

export const RuleUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    condition: RuleConditionSchema.optional(),
    consequences: z.array(ConsequenceSpecSchema).min(1).optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict()

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
