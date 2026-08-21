// Purpose & Goals domain (ADR-011) — shared enums for the DB-3 substrate tables
// (values · contributions · purpose_reviews · plan_steps). Columns: purposes-and-goals/structure-data.md:30-44.

/** PG7 — the goal a `contributions` weighted edge ladders INTO. */
export const CONTRIBUTION_GOAL_TYPE = ['purpose', 'target'] as const
export type ContributionGoalType = (typeof CONTRIBUTION_GOAL_TYPE)[number]

/** PG7 — the polymorphic contributor a `contributions` edge ladders FROM (weight only, never a copied value — PG-10). */
export const CONTRIBUTION_CONTRIBUTOR_TYPE = [
  'habit',
  'routine',
  'project',
  'task',
  'dream',
  'finance_target',
  'check_in',
] as const
export type ContributionContributorType = (typeof CONTRIBUTION_CONTRIBUTOR_TYPE)[number]

/** PG5 — the owner a lightweight `plan_steps` checklist item hangs off (not a tracked entity — PG-11). */
export const PLAN_STEP_OWNER_TYPE = ['task', 'target'] as const
export type PlanStepOwnerType = (typeof PLAN_STEP_OWNER_TYPE)[number]

/** PG-15 (DB-4 group #8) — provenance of a `purpose_metric_values` point: hand-recorded vs derived-pull writer.
 *  Distinct axis from `binding_mode` (how a measurable is fed). Matches Health's provenance `source`. */
export const METRIC_VALUE_SOURCE = ['manual', 'auto'] as const
export type MetricValueSource = (typeof METRIC_VALUE_SOURCE)[number]
