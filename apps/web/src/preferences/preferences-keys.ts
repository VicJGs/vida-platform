// preferences-rescope R2 (LIF-247) — the Preferences query keys + cache category (BR-RT-2 / BR-RT-5).
// Two NON-overlapping keys under one family prefix: a per-table cancel/invalidate uses the exact key so a user-table
// refetch never touches a pending nav patch (and vice versa). `['preferences']` is the family (defaults + family-wide ops).

export const PREFERENCES_FAMILY = ['preferences'] as const
export const USER_PREFS_KEY = ['preferences', 'user'] as const
export const NAV_PREFS_KEY = ['preferences', 'nav'] as const

/** Low-volatility category (performance-strategy.md:242,263-268 — "Preferences 5 min / 30 min"). */
export const PREFERENCES_STALE_MS = 5 * 60_000
export const PREFERENCES_GC_MS = 30 * 60_000
