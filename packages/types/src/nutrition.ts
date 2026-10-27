// ============================================================================
// Nutrition Domain — @vida/types
// DB-4 group #18 — Health: Nutrition · ADR-002 additions (recovered domain, no v2 schema)
//
// The fuel pillar — 2 net-new FIXED enum tuples (the only two the structure-data
// floor inline-enumerates). Reused vocabs are NOT redefined here:
//   • FREQUENCY → common.ts (nutritional_plans.review_frequency)
// OPEN vocabs (caloric_strategy · dietary_framework · philosophy · meal_type ·
// dish_category · source_type · whole_food_type · functional_area · all status
// columns) are modality / editable-starter (C5) / not inline-enumerated → NO tuple,
// NO CHECK (plain TEXT/JSON). Row interfaces → DB-11 reconcile.
// Spec: docs/specs/foundation/db-4-health-nutrition/_index.md
// ============================================================================

// Meal authorship provenance (structure-data.md:27) — the `manual|ai|import` triad.
// Standardizes on `ai` (NOT `llm`) per the rerun N3 decision, matching AI6 + the
// platform HEALTH_METRIC_VALUE_SOURCE `ai` member (health.ts). `[ADR-015 AI6]`
export const MEAL_SOURCE = ['manual', 'ai', 'import'] as const
export type MealSource = (typeof MEAL_SOURCE)[number]

// Daily-meal-plan generation method (structure-data.md:24). An `ai`/`hybrid` plan
// carries source=ai (AI6). `[ADR-015 AI6]`
export const MEAL_GENERATION_METHOD = ['manual', 'ai', 'template', 'goal-optimized', 'hybrid'] as const
export type MealGenerationMethod = (typeof MEAL_GENERATION_METHOD)[number]
