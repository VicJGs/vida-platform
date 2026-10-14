import { z } from 'zod'
import {
  TASK_DIFFICULTY,
  TASK_KIND,
  STATUS,
  PRIORITY,
  MEASUREMENT_KIND,
  BINDING_MODE,
} from '@vida/types'

export const TaskDifficultySchema = z.enum(TASK_DIFFICULTY)
export const TaskKindSchema = z.enum(TASK_KIND)

// --- mod-tasks #65 · ① service validators (S1 — tasks CRUD) ------------------
const StatusSchema = z.enum(STATUS)
const PrioritySchema = z.enum(PRIORITY)
const MeasurementKindSchema = z.enum(MEASUREMENT_KIND)
const BindingModeSchema = z.enum(BINDING_MODE)
/** YYYY-MM-DD calendar date */
const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable()
  .optional()
const MinutesSchema = z.number().int().min(0).nullable().optional()
/** NULL ⇒ equal-weight (ADR-011 §3.3 M4) */
const NestingWeightSchema = z.number().int().min(0).nullable().optional()
const SortOrderSchema = z.number().int().min(0).optional()
const ParentRefSchema = z.string().nullable().optional()

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  // parent-module links (≤1 enforced in the service, TK-2); parent_task_id is the sub-task axis
  project_id: ParentRefSchema,
  milestone_id: ParentRefSchema,
  course_id: ParentRefSchema,
  contact_id: ParentRefSchema,
  parent_task_id: ParentRefSchema,
  status: StatusSchema.optional(), // NN default 'not_started'
  priority: PrioritySchema.optional(), // NN default 'medium'
  difficulty: TaskDifficultySchema.nullable().optional(), // nullable, default 'medium' (SQL)
  due_date: CalendarDateSchema,
  scheduled_date: CalendarDateSchema,
  estimated_minutes: MinutesSchema,
  kind: TaskKindSchema.optional(), // NN default 'standard'
  recurrence_rule: z.string().nullable().optional(), // obligations only (validated S5)
  measurement_kind: MeasurementKindSchema.optional(), // NN default 'milestone'
  binding_mode: BindingModeSchema.nullable().optional(), // nullable, no default (NULL ⇒ derive)
  nesting_weight: NestingWeightSchema,
  sort_order: SortOrderSchema,
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  project_id: ParentRefSchema,
  milestone_id: ParentRefSchema,
  course_id: ParentRefSchema,
  contact_id: ParentRefSchema,
  parent_task_id: ParentRefSchema,
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  difficulty: TaskDifficultySchema.nullable().optional(),
  due_date: CalendarDateSchema,
  scheduled_date: CalendarDateSchema,
  estimated_minutes: MinutesSchema,
  kind: TaskKindSchema.optional(),
  recurrence_rule: z.string().nullable().optional(),
  measurement_kind: MeasurementKindSchema.optional(),
  binding_mode: BindingModeSchema.nullable().optional(),
  nesting_weight: NestingWeightSchema,
  sort_order: SortOrderSchema,
})

export const ListTasksFilterSchema = z
  .object({
    status: StatusSchema.optional(),
    priority: PrioritySchema.optional(),
    parent_task_id: z.string().nullable().optional(),
    project_id: z.string().nullable().optional(),
    completed: z.boolean().optional(),
    due_before: CalendarDateSchema,
  })
  .optional()
