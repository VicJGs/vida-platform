import { z } from 'zod'
import {
  TASK_DIFFICULTY,
  TASK_KIND,
  STATUS,
  PRIORITY,
  MEASUREMENT_KIND,
  BINDING_MODE,
} from '@vida/types'
import { ViewLayoutSchema } from './view'

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

/** The list-filter FIELDS (S8 split): the tasks ReadProvider validates provider predicates PER KEY through
 *  `ListTasksFilterFieldsSchema.shape[k]` — a `ZodOptional` (the wrapped form below) exposes `.unwrap()` but no
 *  `.shape` in zod v4, so the inner object is exported on its own. `listTasks` keeps the optional wrapper. */
export const ListTasksFilterFieldsSchema = z.object({
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  parent_task_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  due_before: CalendarDateSchema,
  kind: TaskKindSchema.optional(), // S8 — TAS-30 kind-bound presets
})
export const ListTasksFilterSchema = ListTasksFilterFieldsSchema.optional()

/** S8 — the tasks-side saved-view input (TAS-28). `strictObject`: a caller-supplied `entity_types` is REJECTED — tasks
 *  stamps `['task']` (ADR-007 §3.5) and the stamp is not overridable. `predicates`/`sort` are opaque (the predicate DSL
 *  is the deferred ADR-007 pass). */
export const SaveTaskViewSchema = z.strictObject({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  layout: ViewLayoutSchema,
  space_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  predicates: z.record(z.string(), z.unknown()).optional(),
  grouping: z.object({ field: z.string().optional() }).optional(),
  sort: z.unknown().optional(),
})

/** S9 · TAS-29 (RATIFY) — the Zod half of the one saved-view config schema: `SaveTaskViewSchema` minus identity
 *  (`id`) and ownership (`space_id`). `.omit` on a `strictObject` keeps the `never` catchall (zod 4.4.3), so a
 *  caller-supplied `entity_types`/`id`/`space_id` is still rejected — the stamp stays non-overridable. The ② validates
 *  a view-builder draft against this before `saveView`. */
export const TaskViewConfigSchema = SaveTaskViewSchema.omit({ id: true, space_id: true })

/** S7 — the aggregated-view grouping (TAS-05 "by module/project/status"). Boundary-validated like every S1 enum; a
 *  malformed `by` is a caller bug (Zod error), distinct from a source outage (a per-group `state`, never a throw). */
export const AggGroupingSchema = z.discriminatedUnion('by', [
  z.object({ by: z.literal('parent') }),
  z.object({ by: z.literal('parent_type') }),
  z.object({ by: z.literal('status') }),
])
