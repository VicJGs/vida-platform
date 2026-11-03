// ============================================================================
// TasksSurface — the live /tasks route (LIF-389): ONE list of the 10 most recently created or edited top-level tasks,
// newest first by `updated_at` (`recentTasks` over `useTasks()`, which reads `listTasks({ parent_task_id: null })`).
// Each row: a checkbox named by the title (tick completes / untick reopens), its "new" / "edited HH:mm" label
// (`taskEditLabel`) and a "Delete <title>" button (`softDeleteTask`). The "New task" input creates on Enter.
//
// The composer, alert, skeleton, empty line and shared COPY come from task-parts.tsx (shared with the block); tick and
// delete ride `useTaskWrites` (the block's own write/invalidate path, BR-RT-4: invalidate-and-reread, no optimistic
// cache writes), so an edited task moves to the top on the re-read.
//
// Terminal states (docs/features/tasks/business-rules.md "Task list"): loading (skeleton) · empty ("No tasks" + the
// "New task" input is the create CTA) · error (read error + Retry; `retryOnMount: false` in `useTasks`) · success.
// A failed create keeps the typed title; a failed tick falls back to the stored value; a failed delete keeps the row;
// each says so in a `role="alert"`.
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Button, Checkbox } from '@vida/ui'
import { ReadErrorMessage } from '../notes/read-error-message'
import { retryState } from '../notes/read-error'
import { TASK_COPY, TaskAlert, TaskComposer, TaskEmpty, TaskSkeleton } from './task-parts'
import { taskEditLabel } from './task-edit-label'
import { useTaskWrites } from './use-task-writes'
import { recentTasks, useTasks, type TaskRow } from './use-tasks'

const COPY = {
  title: 'Tasks',
  list: 'Recent tasks',
  deleteError: 'The task was not deleted. Try again.',
} as const

function TaskListRow({
  task,
  pendingDone,
  deleting,
  onToggle,
  onDelete,
}: {
  task: TaskRow
  pendingDone: boolean | undefined
  deleting: boolean
  onToggle: (done: boolean) => void
  onDelete: () => void
}) {
  return (
    <View role="listitem" flexDirection="row" alignItems="center" gap="$12">
      <View flex={1}>
        <Checkbox
          size="sm"
          label={task.title}
          checked={pendingDone ?? task.status === 'completed'}
          disabled={pendingDone !== undefined || deleting}
          onCheckedChange={onToggle}
        />
      </View>
      <Text fontSize="$small" color="$colorTextMuted">
        {taskEditLabel(task)}
      </Text>
      <Button intent="ghost" size="sm" loading={deleting} onPress={onDelete} aria-label={`Delete ${task.title}`}>
        Delete
      </Button>
    </View>
  )
}

export function TasksSurface() {
  const tasks = useTasks()
  const read = retryState(tasks)
  const { toggle, tick, remove, pendingDone } = useTaskWrites()

  const rows = tasks.data === undefined ? undefined : recentTasks(tasks.data)
  let body
  if (read.error) {
    body = <ReadErrorMessage message={TASK_COPY.readError} retry={read.retry} retrying={read.retrying} />
  } else if (rows === undefined) {
    body = <TaskSkeleton />
  } else if (rows.length === 0) {
    body = <TaskEmpty />
  } else {
    body = (
      <View role="list" aria-label={COPY.list} gap="$8">
        {rows.map((t) => (
          <TaskListRow
            key={t.id}
            task={t}
            pendingDone={pendingDone(t.id)}
            deleting={remove.isPending && remove.variables === t.id}
            onToggle={(done) => tick(t.id, done)}
            onDelete={() => remove.mutate(t.id)}
          />
        ))}
      </View>
    )
  }

  return (
    <View padding="$24" gap="$16" maxWidth={720} width="100%">
      <Text
        role="heading"
        aria-level={1}
        fontFamily="$display"
        fontSize="$heading"
        fontWeight="700"
        color="$colorTextPrimary"
      >
        {COPY.title}
      </Text>
      <TaskComposer />
      {body}
      {toggle.isError ? <TaskAlert>{TASK_COPY.toggleError}</TaskAlert> : null}
      {remove.isError ? <TaskAlert>{COPY.deleteError}</TaskAlert> : null}
    </View>
  )
}

export default TasksSurface
