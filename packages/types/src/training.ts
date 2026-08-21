// ============================================================================
// Training Domain — @vida/types
// DB-4 group #19 — Health: Training · ADR-002 additions (recovered domain, no v2 schema)
//
// The exercise pillar — 3 net-new FIXED enum tuples (the sets the structure-data
// floor inline-enumerates). Reused vocabs are NOT redefined here:
//   • METRIC_SIDE (workout_sets.side) · PHYSICAL_ROLE_AUTHORING_SOURCE
//     (exercise_plans.authoring_source) → health.ts (#17)
// OPEN vocabs (primary_muscle · difficulty · risk_level · progression_model ·
// energy_system_focus · workout_type · set_structure · location · form_quality ·
// status) are modality (conventions L16) / not inline-enumerated → NO tuple, NO CHECK.
// Row interfaces → DB-11 reconcile.
// Spec: docs/specs/foundation/db-4-health-training/_index.md
// ============================================================================

// Exercise movement pattern (structure-data.md:10). `[HT-7 modality; conventions L16]`
export const MOVEMENT_PATTERN = [
  'push',
  'pull',
  'hinge',
  'squat',
  'lunge',
  'carry',
  'rotation',
] as const
export type MovementPattern = (typeof MOVEMENT_PATTERN)[number]

// Per-set category within a workout (structure-data.md:26).
export const WORKOUT_SET_CATEGORY = [
  'warm-up',
  'main',
  'accessory',
  'cardio',
  'mobility',
  'cool-down',
] as const
export type WorkoutSetCategory = (typeof WORKOUT_SET_CATEGORY)[number]

// Calories-burned estimation method on a workout (structure-data.md:24). `[HC-6 energy loop]`
export const BURN_SOURCE = ['formula', 'wearable', 'manual'] as const
export type BurnSource = (typeof BURN_SOURCE)[number]
