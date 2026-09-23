// ============================================================================
// services/gamification — achievement engine pure core (mod-gamification #48 ① · S3)
//
// DB-free: the achievement condition encoding (a predicate over measured state OR a
// currency balance quantity — GM-13, "predicates over measured state + the event
// stream") + its evaluation. The service (service.ts) owns the static-seed read (direct
// drizzle — achievements is non-syncable), the user_achievements write (syncable), and
// the unlock → reward + notification effect firing (registry-guarded).
// ============================================================================

import type { z } from 'zod'
import type { CurrencyBalance } from '../../foundation/economy'
import { AchievementConditionSchema } from '../../validators/gamification'

export type AchievementCondition = z.infer<typeof AchievementConditionSchema>

/** Parse a stored achievement condition (Record) into the typed predicate; null/malformed → null
 *  (an achievement with no auto-evaluable predicate is skipped by the engine, never crashes it). */
export function parseAchievementCondition(raw: Record<string, unknown> | null): AchievementCondition | null {
  if (raw == null) return null
  const parsed = AchievementConditionSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function compare(value: number, operator: 'gte' | 'lte' | 'eq', threshold: number): boolean {
  return operator === 'gte' ? value >= threshold : operator === 'lte' ? value <= threshold : value === threshold
}

/** Evaluate a parsed condition. `measure` reads the ADR-011 measurement seam; `currency` reads a derived
 *  balance quantity. A null source value (unmeasured / unknown currency) → not met (never fabricated). */
export function evaluateAchievementCondition(
  cond: AchievementCondition,
  resolveMeasure: (key: string) => number | null,
  resolveCurrency: (code: string) => CurrencyBalance | null,
): boolean {
  if (cond.kind === 'measure') {
    const v = resolveMeasure(cond.measureKey)
    return v != null && compare(v, cond.operator, cond.threshold)
  }
  const bal = resolveCurrency(cond.currencyCode)
  if (bal == null) return false
  return compare(bal[cond.quantity], cond.operator, cond.threshold)
}
