// ============================================================================
// Skills Domain — @vida/types
// ADR-002 §5.9 (reshaped roster) · DB-4 group Skills
//
// Net-new canonical enum tuples for the reshaped Skills model (the capability-
// forging engine: Levels · Activities · Actions · Dev-logs · Graph · Definition
// Library). Reused vocabs live elsewhere and are NOT redefined here:
//   • MASTERY_LEVEL  → learning.ts (skills.current_level / mastery_override, derived)
//   • LIFE_DOMAIN · PRIORITY · FREQUENCY → common.ts
// Row interfaces (Skill / SkillLevel / …) → DB-11 interface reconcile (the stale
// `Skill` in learning.ts is untouched here). Un-enumerated vocabs (skills.status,
// skill_activities.difficulty, …) are OPEN — no tuple, no CHECK.
// ============================================================================

// Ladder-stage lifecycle (structure-data.md:19). "locked" is a display synonym of
// `upcoming`, not a 4th value (business-rules.md:75 narrative) — roster is authoritative.
export const SKILL_LEVEL_STATUS = ['upcoming', 'active', 'complete'] as const
export type SkillLevelStatus = (typeof SKILL_LEVEL_STATUS)[number]

// Typed practice-task dispatcher (structure-data.md:20-21; title-case in the roster,
// lowercased per the codebase tuple convention).
export const SKILL_ACTIVITY_TYPE = ['practice', 'study', 'project', 'assessment', 'review'] as const
export type SkillActivityType = (typeof SKILL_ACTIVITY_TYPE)[number]

// How an activity/definition row was filled (structure-data.md:22,33). `ai` is the
// AI-draft leg; distinct from SKILL_DEFINITION_SOURCE (dataset origin). Canonical provenance
// triad `manual|ai|import` (unified with MEAL_SOURCE/HEALTH_METRIC_VALUE_SOURCE, P2 O4 2026-09-14).
export const SKILL_FILL_SOURCE = ['manual', 'ai', 'import'] as const
export type SkillFillSource = (typeof SKILL_FILL_SOURCE)[number]

// Skill-graph edge kind (structure-data.md:30).
export const SKILL_DEPENDENCY_TYPE = ['requires', 'unlocks', 'synergy'] as const
export type SkillDependencyType = (typeof SKILL_DEPENDENCY_TYPE)[number]

// Skill-graph edge scope: the global canonical library graph vs the user's personal graph
// (structure-data.md:31; conventions.md:19).
export const SKILL_DEPENDENCY_SCOPE = ['global', 'personal'] as const
export type SkillDependencyScope = (typeof SKILL_DEPENDENCY_SCOPE)[number]

// Definition-Library dataset origin (structure-data.md:33). `ai` = AI6 authorship provenance.
export const SKILL_DEFINITION_SOURCE = ['curated', 'community', 'ai'] as const
export type SkillDefinitionSource = (typeof SKILL_DEFINITION_SOURCE)[number]

// Skill Composer setup path (structure-data.md:16).
export const SKILL_SETUP_MODE = ['quick', 'advanced'] as const
export type SkillSetupMode = (typeof SKILL_SETUP_MODE)[number]
