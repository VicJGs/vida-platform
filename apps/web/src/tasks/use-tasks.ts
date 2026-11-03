// ============================================================================
// useTasks — the task block's read (LIF-339): React Query over `getServices().tasks.listTasks` (BR-RT-3, a local core
// service). The block's attrs (`TaskChecklistBlockAttrs`) narrow the list: `project_id` / `due_before` pass through
// as-is; `milestone_id` is not a `ListTasksFilter` field, so it is not sent. `parent_task_id: null` keeps the block to
// top-level tasks. The service filters soft-deleted rows (acceptance #4).
//
// `retryOnMount: false`: the block swaps on query state, so an errored read must not re-fire on every remount; the
// body's Retry re-reads. Writes invalidate `TASKS_QUERY_KEY` (no optimistic updates, BR-RT-4).
//
// LIF-389: the /tasks route reads the same hook with no attrs (all top-level tasks) and narrows it with `recentTasks`.
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

/** The /tasks list (LIF-389 #1, pure): newest first by `updated_at`, the first `limit`. Ties fall back to the newer
 *  `created_at`, then the larger id (UUIDv7 is time-ordered), so the order is stable. */
export function recentTasks(rows: readonly TaskRow[], limit = 10): TaskRow[] {
  return [...rows]
    .sort(
      (a, b) => b.updated_at - a.updated_at || b.created_at - a.created_at || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    )
    .slice(0, limit)
}

export function useTasks(attrs: Record<string, unknown> = {}): UseQueryResult<TaskRow[]> {
  const filter = taskFilter(attrs)
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, filter],
    queryFn: async () => (await getServices()).tasks.listTasks(filter),
    retryOnMount: false,
  })
}
