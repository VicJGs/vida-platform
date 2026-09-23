// ============================================================================
// services/gamification — barrel (mod-gamification #48 ①)
// The Points Economy user-facing SURFACE over foundation/economy. S1: currency
// surface + level + below-floor clamp. S2–S4 append rules/achievements/journal.
// ============================================================================

export { createGamificationService } from './service'
export {
  CurrencyNotFound,
  CurrencyExists,
  RuleNotFound,
  RuleBindingCyclic,
  RuleGrantDenied,
  RailNotConfigured,
  type GamificationService,
  type GamificationServiceDeps,
  type GamificationProfile,
  type CurrencyCreateInput,
  type UpdateProfileInput,
  type RuleCreateInput,
  type RuleUpdateInput,
  type Rule,
  type RuleContext,
  type ExecutionResult,
  type RuleCondition,
  type ConsequenceSpec,
  type AchievementSeedInput,
  type AchievementCondition,
} from './types'
export {
  deriveLevel,
  clampToFloor,
  requiredXpForLevel,
  type LevelInfo,
  type ClampResult,
} from './level'
// NB: CurrencyDef/CurrencyBalance are the ② surface types but are re-exported by the core
// barrel via `foundation/economy` already — NOT re-exported here (avoids the double-export collision).
