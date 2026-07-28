import { z } from 'zod'
import {
  PERSONA,
  ACHIEVEMENT_CATEGORY,
  ACHIEVEMENT_TIER,
  CHECK_IN_TYPE,
  CHECK_IN_SCHEDULE_TYPE,
  CHECK_IN_PREFERRED_TIME,
  CHECK_IN_QUESTION_FIELD_TYPE,
  THEME,
  TIME_FORMAT,
  DOCK_POSITION,
  DOCK_SIZE,
} from '@vida/types'

export const PersonaSchema = z.enum(PERSONA)
export const AchievementCategorySchema = z.enum(ACHIEVEMENT_CATEGORY)
export const AchievementTierSchema = z.enum(ACHIEVEMENT_TIER)
export const CheckInTypeSchema = z.enum(CHECK_IN_TYPE)
export const CheckInScheduleTypeSchema = z.enum(CHECK_IN_SCHEDULE_TYPE)
export const CheckInPreferredTimeSchema = z.enum(CHECK_IN_PREFERRED_TIME)
export const CheckInQuestionFieldTypeSchema = z.enum(CHECK_IN_QUESTION_FIELD_TYPE)
export const ThemeSchema = z.enum(THEME)
export const TimeFormatSchema = z.enum(TIME_FORMAT)
export const DockPositionSchema = z.enum(DOCK_POSITION)
export const DockSizeSchema = z.enum(DOCK_SIZE)
