import { z } from 'zod'
import {
  PROJECT_SCOPE,
  PROJECT_COMPLEXITY,
  TARGET_TYPE,
  CALCULATION_METHOD,
  BUCKET_LIST_CATEGORY,
  BUCKET_LIST_STATUS,
  STATUS,
  PRIORITY,
} from '@vida/types'

export const ProjectScopeSchema = z.enum(PROJECT_SCOPE)
export const ProjectComplexitySchema = z.enum(PROJECT_COMPLEXITY)
export const TargetTypeSchema = z.enum(TARGET_TYPE)
export const CalculationMethodSchema = z.enum(CALCULATION_METHOD)
export const BucketListCategorySchema = z.enum(BUCKET_LIST_CATEGORY)
export const BucketListStatusSchema = z.enum(BUCKET_LIST_STATUS)

// --- mod-projects #54 · ① service validators (S1 — projects CRUD) ------------
const StatusSchema = z.enum(STATUS)
const PrioritySchema = z.enum(PRIORITY)
/** 0-100 manual override; omit/null ⇒ derive on read (PJ-3) */
const ProgressSchema = z.number().int().min(0).max(100).nullable().optional()
/** YYYY-MM-DD calendar date */
const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable()
  .optional()
/** minutes (despite the `_hours` name) */
const MinutesSchema = z.number().int().min(0).nullable().optional()

export const CreateProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  scope: ProjectScopeSchema.optional(), // notNull w/ default 'personal'
  complexity: ProjectComplexitySchema.optional(), // default 'moderate'
  status: StatusSchema.optional(), // default 'not_started'
  priority: PrioritySchema.optional(), // default 'medium'
  progress: ProgressSchema,
  start_date: CalendarDateSchema,
  target_end_date: CalendarDateSchema,
  actual_end_date: CalendarDateSchema,
  estimated_hours: MinutesSchema,
  actual_hours: MinutesSchema,
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  scope: ProjectScopeSchema.optional(),
  complexity: ProjectComplexitySchema.optional(),
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  progress: ProgressSchema,
  start_date: CalendarDateSchema,
  target_end_date: CalendarDateSchema,
  actual_end_date: CalendarDateSchema,
  estimated_hours: MinutesSchema,
  actual_hours: MinutesSchema,
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

export const ListProjectsFilterSchema = z
  .object({ status: StatusSchema.optional(), scope: ProjectScopeSchema.optional() })
  .optional()
