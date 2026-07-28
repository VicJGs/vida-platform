import { z } from 'zod'
import { HABIT_TYPE, HABIT_FREQUENCY, HABIT_TIME_OF_DAY } from '@vida/types'

export const HabitTypeSchema = z.enum(HABIT_TYPE)
export const HabitFrequencySchema = z.enum(HABIT_FREQUENCY)
export const HabitTimeOfDaySchema = z.enum(HABIT_TIME_OF_DAY)
