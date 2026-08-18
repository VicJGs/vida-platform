import { z } from 'zod'
import {
  CONTRIBUTION_GOAL_TYPE,
  CONTRIBUTION_CONTRIBUTOR_TYPE,
  PLAN_STEP_OWNER_TYPE,
} from '@vida/types'

// Canonical validators for the Purpose & Goals substrate enums (DB-3 · ADR-011).
// z.enum over the @vida/types tuple — the single source (DB-9). No cast, no spread.
export const ContributionGoalTypeSchema = z.enum(CONTRIBUTION_GOAL_TYPE)
export const ContributionContributorTypeSchema = z.enum(CONTRIBUTION_CONTRIBUTOR_TYPE)
export const PlanStepOwnerTypeSchema = z.enum(PLAN_STEP_OWNER_TYPE)
