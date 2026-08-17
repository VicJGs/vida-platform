// UI-4 · S2 (LIF-89) — the feature-flag seam the nav chrome reads (S2-BR-b).
//
// A `MODULE_MAP` entry with `visibleWhen` (e.g. `gamification` → 'feature_gamification') shows ONLY when its flag is
// ON. M1.0 has NO feature-flag system yet — the flag source is `nav_preferences` / Preferences, built at M1.1
// (information-architecture.md:46-47, 112-113). Until then this is a documented STUB that fails CLOSED: an absent
// flag reads OFF, so a conditional-dock surface never renders without an explicit enable (BR-6 security — no
// default-open surface). When Preferences lands, this reads the real per-user flag store; the call sites don't change.

/** Whether a feature flag is enabled. M1.0 stub → always `false` (fail-closed). */
export function isFeatureEnabled(_flag: string): boolean {
  return false
}
