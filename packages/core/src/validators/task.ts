import { z } from 'zod'
import { TASK_DIFFICULTY, TASK_KIND } from '@vida/types'

export const TaskDifficultySchema = z.enum(TASK_DIFFICULTY)
export const TaskKindSchema = z.enum(TASK_KIND)
