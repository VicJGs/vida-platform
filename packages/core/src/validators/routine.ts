import { z } from 'zod'
import {
  ROUTINE_ACTION_TYPE,
  ROUTINE_TIME_OF_DAY,
  ROUTINE_RECURRENCE_FREQUENCY,
} from '@vida/types'

export const RoutineActionTypeSchema = z.enum(ROUTINE_ACTION_TYPE)
export const RoutineTimeOfDaySchema = z.enum(ROUTINE_TIME_OF_DAY)
export const RoutineRecurrenceFrequencySchema = z.enum(ROUTINE_RECURRENCE_FREQUENCY)
