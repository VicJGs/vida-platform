// ============================================================================
// useTasks — the task block's read (LIF-339): React Query over `getServices().tasks.listTasks` (BR-RT-3, a local core
// service). The block's attrs (`TaskChecklistBlockAttrs`) narrow the list: `project_id` / `due_before` pass through
// as-is; `milestone_id` is not a `ListTasksFilter` field, so it is not sent. `parent_task_id: null` keeps the block to
// top-level tasks. The service filters soft-deleted rows (acceptance #4).
//
// `retryOnMount: false`: the block swaps on query state, so an errored read must not re-fire on every remount; the
// body's Retry re-reads. Writes invalidate `TASKS_QUERY_KEY` (no optimistic updates, BR-RT-4).
// ============================================================================
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ListTasksFilter } from '@vida/core'
import { getServices, type Services } from '../db/composition-root'

export type TaskRow = Awaited<ReturnType<Services['tasks']['listTasks']>>[number]

export const TASKS_QUERY_KEY = ['tasks', 'list'] as const

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}

/** The block attrs → the service filter (pure). */
export function taskFilter(attrs: Record<string, unknown>): ListTasksFilter {
  const filter: ListTasksFilter = { project_id: str(attrs.project_id), parent_task_id: null }
  const due = str(attrs.due_before)
  if (due) filter.due_before = due
  return filter
}

export function useTasks(attrs: Record<string, unknown>): UseQueryResult<TaskRow[]> {
  const filter = taskFilter(attrs)
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, filter],
    queryFn: async () => (await getServices()).tasks.listTasks(filter),
    retryOnMount: false,
  })
}
