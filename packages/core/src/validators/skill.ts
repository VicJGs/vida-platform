import { z } from 'zod'
import {
  SKILL_LEVEL_STATUS,
  SKILL_ACTIVITY_TYPE,
  SKILL_FILL_SOURCE,
  SKILL_DEPENDENCY_TYPE,
  SKILL_DEPENDENCY_SCOPE,
  SKILL_DEFINITION_SOURCE,
  SKILL_SETUP_MODE,
} from '@vida/types'

// DB-4 group Skills — canonical Zod validators for the 7 net-new tuples (ADR-002 §2.3).
// Reused vocabs (MASTERY_LEVEL / LIFE_DOMAIN / PRIORITY / FREQUENCY) have their own validators.
export const SkillLevelStatusSchema = z.enum(SKILL_LEVEL_STATUS)
export const SkillActivityTypeSchema = z.enum(SKILL_ACTIVITY_TYPE)
export const SkillFillSourceSchema = z.enum(SKILL_FILL_SOURCE)
export const SkillDependencyTypeSchema = z.enum(SKILL_DEPENDENCY_TYPE)
export const SkillDependencyScopeSchema = z.enum(SKILL_DEPENDENCY_SCOPE)
export const SkillDefinitionSourceSchema = z.enum(SKILL_DEFINITION_SOURCE)
export const SkillSetupModeSchema = z.enum(SKILL_SETUP_MODE)
