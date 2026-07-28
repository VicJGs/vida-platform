import { z } from 'zod'
import { TASK_DIFFICULTY } from '@vida/types'

export const TaskDifficultySchema = z.enum(TASK_DIFFICULTY)
