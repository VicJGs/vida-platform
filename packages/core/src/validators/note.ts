import { z } from 'zod'
import {
  PAGE_TYPE,
  ENTITY_LINK_TARGET,
  POMODORO_TYPE,
  POMODORO_STATUS,
  POMODORO_ENTITY_TYPE,
} from '@vida/types'

export const PageTypeSchema = z.enum(PAGE_TYPE)
export const EntityLinkTargetSchema = z.enum(ENTITY_LINK_TARGET)
export const PomodoroTypeSchema = z.enum(POMODORO_TYPE)
export const PomodoroStatusSchema = z.enum(POMODORO_STATUS)
export const PomodoroEntityTypeSchema = z.enum(POMODORO_ENTITY_TYPE)
