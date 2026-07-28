import { z } from 'zod'
import {
  PROJECT_SCOPE,
  PROJECT_COMPLEXITY,
  TARGET_TYPE,
  CALCULATION_METHOD,
  BUCKET_LIST_CATEGORY,
  BUCKET_LIST_STATUS,
} from '@vida/types'

export const ProjectScopeSchema = z.enum(PROJECT_SCOPE)
export const ProjectComplexitySchema = z.enum(PROJECT_COMPLEXITY)
export const TargetTypeSchema = z.enum(TARGET_TYPE)
export const CalculationMethodSchema = z.enum(CALCULATION_METHOD)
export const BucketListCategorySchema = z.enum(BUCKET_LIST_CATEGORY)
export const BucketListStatusSchema = z.enum(BUCKET_LIST_STATUS)
