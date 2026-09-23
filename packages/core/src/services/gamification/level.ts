// ============================================================================
// services/gamification — level curve + below-floor clamp (mod-gamification #48 ① · S1)
//
// Pure, DB-free logic. `deriveLevel` is GM-14: level is a pure function of a
// currency total over a FIXED non-linear curve + titles (the cache in
// user_profile is derived from this, never truth). `clampToFloor` is the
// below-floor clamp+flag the economy substrate deferred to this enforcing
// surface (economy/current-business-rules.md:13,23): a lock/spend can never
// drive a balance below its floor — it clamps and flags instead.
// ============================================================================

/** GM-14 level + title for a currency total. */
export interface LevelInfo {
  level: number
  title: string
}

/**
 * FIXED non-linear XP curve (M1 default; config-open for later tuning).
 * requiredXp(n) = 100·(n−1)²  →  L2=100, L3=400, L4=900, L5=1600, …
 * Closed form for the inverse: level = 1 + floor(√(total/100)).
 */
export function requiredXpForLevel(level: number): number {
  if (level <= 1) return 0
  return 100 * (level - 1) ** 2
}

/** Level bands → titles (GM-14). A total below 0 clamps to level 1. */
const TITLE_BANDS: ReadonlyArray<{ minLevel: number; title: string }> = [
  { minLevel: 50, title: 'Master' },
  { minLevel: 20, title: 'Expert' },
  { minLevel: 10, title: 'Adept' },
  { minLevel: 5, title: 'Apprentice' },
  { minLevel: 1, title: 'Novice' },
]

function titleForLevel(level: number): string {
  for (const band of TITLE_BANDS) {
    if (level >= band.minLevel) return band.title
  }
  return 'Novice'
}

/** Pure GM-14 derivation. Level is derived from lifetime `earned` (never de-levels on spend). */
export function deriveLevel(total: number): LevelInfo {
  const safe = total > 0 ? total : 0
  const level = 1 + Math.floor(Math.sqrt(safe / 100))
  return { level, title: titleForLevel(level) }
}

/** The outcome of applying the below-floor clamp to a proposed lock/spend. */
export interface ClampResult {
  /** The amount that may actually be applied (≥ 0, ≤ requested). */
  applied: number
  /** True when the request was reduced to respect the floor (the flag). */
  clamped: boolean
}

/**
 * Below-floor clamp+flag (IR-12). A lock/spend of `requested` (a positive magnitude) may not drive
 * `current` below `floor` (default 0 — you cannot spend/lock what you do not have). Returns the
 * clamped amount + whether it was reduced. Rewards (earn/distribute) never call this.
 */
export function clampToFloor(current: number, requested: number, floor = 0): ClampResult {
  const available = current - floor
  const applied = Math.max(0, Math.min(requested, available))
  return { applied, clamped: applied < requested }
}
