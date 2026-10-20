// ============================================================================
// reward-copy — the System's register COPY (fe-gamification ② · S1 · EC-10 / GM-16).
//
// The System reads `persona` (deny-safe, via use-persona) for REWARD FRAMING ONLY — the
// manhwa-"System" tone in COPY, NEVER theming (theming = the global `game` preset, picked in
// Preferences/Onboarding; GM-16 forbids the System owning framing). This is the whole, bounded
// effect of persona on the surface: a few nouns swap.
//
// Grounded strictly in the envision EC-10 pairs — "Quests/Treasure/Loot ↔ Rules/Boxes/Reward"
// (envision.md:32). Only the pairs that name THIS surface's vocabulary are mapped:
//   • Rules  ↔ Quests   (the rule mode + authoring flow)
//   • Reward ↔ Loot      (the reward noun a rule grants)
// "Treasure ↔ Boxes" is Finance-owned storage, not a surface here (GM-16 / IR-G4) → not mapped.
// Currencies/Achievements/Activity/Overview have no documented game term → unchanged in both
// registers (no invented words — the No-Guessing Principle).
// ============================================================================

/** The user-adaptive register. `neutral` = the calmer default (adults turning their life around);
 *  `game` = the manhwa-"System" tone (students/teens). Resolved deny-safe from `persona` (use-persona). */
export type RewardRegister = 'neutral' | 'game'

export interface RewardCopy {
  /** The rules mode label + authoring-flow noun. */
  rules: string
  /** What a rule grants. */
  reward: string
}

const NEUTRAL: RewardCopy = { rules: 'Rules', reward: 'Reward' }
const GAME: RewardCopy = { rules: 'Quests', reward: 'Loot' }

/** The register's copy (EC-10). Pure; the ONLY place persona touches the surface. */
export function rewardCopy(register: RewardRegister): RewardCopy {
  return register === 'game' ? GAME : NEUTRAL
}
