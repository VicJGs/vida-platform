// ============================================================================
// useCreateTask / useTaskWrites — the task writes shared by the task block (LIF-339) and the /tasks route (LIF-389).
// `useCreateTask` backs the shared `TaskComposer` (task-parts.tsx); `useTaskWrites` is tick + delete. Every write goes
// through the tasks service (transactional there) and then invalidates `TASKS_QUERY_KEY` (invalidate-and-reread, no
// optimistic cache writes, BR-RT-4). A tick's target value is exposed while it is in flight (`pendingDone`) so the
// box shows it until the re-read settles; a failed write leaves the store and the list as they were.
//
// The in-flight tick is React state set INSIDE the change handler (`tick`), not read off `useMutation`: the checkbox
// is controlled, and React restores a controlled input to its prop right after the event unless state changed in it.
// `isPending` arrives through React Query's async notify, so reading it alone let the box flash back to the stored
// value (Playwright `check()` saw "did not change its state").
// ============================================================================
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { TASKS_QUERY_KEY } from './use-tasks'

function useRefreshTasks() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
}

/** Create a top-level task; `onCreated` runs on success, before the re-read. */
export function useCreateTask(onCreated?: () => void) {
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: async (title: string) => (await getServices()).tasks.createTask({ title }),
    onSuccess: async () => {
      onCreated?.()
      await refresh()
    },
  })
}

export function useTaskWrites() {
  const refresh = useRefreshTasks()

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const s = await getServices()
      return done ? s.tasks.completeTask(id) : s.tasks.reopenTask(id)
    },
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => (await getServices()).tasks.softDeleteTask(id),
    onSettled: refresh,
  })

  const [ticking, setTicking] = useState<{ id: string; done: boolean } | null>(null)

  /** Tick (complete) or untick (reopen) `id`; the box shows `done` until the write and the re-read settle. */
  const tick = (id: string, done: boolean) => {
    setTicking({ id, done })
    toggle.mutate({ id, done }, { onSettled: () => setTicking(null) })
  }

  /** The value a tick in flight is writing for `id`; undefined when none. */
  const pendingDone = (id: string): boolean | undefined => (ticking?.id === id ? ticking.done : undefined)

  return { toggle, tick, remove, pendingDone }
}
