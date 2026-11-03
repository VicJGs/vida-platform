// ============================================================================
// TaskChecklistBlock — the live body of the task block (`taskChecklist`, LIF-339), registered in
// ../notes/block-renderers.tsx (the editor imports no module, BR-E5-7). Reads through `useTasks(attrs)`; the composer,
// alert, skeleton, empty line and copy are task-parts.tsx (shared with the /tasks route); ticks ride `useTaskWrites`.
// Every write goes through the tasks service and then invalidates the tasks query (invalidate-and-reread, BR-RT-4).
//
// Terminal states (docs/features/tasks/business-rules.md "Task list"): loading (static skeleton bars), empty ("No tasks"
// + the "New task" input is the create CTA), error (a calm message + Retry), success (one checkbox per task, named by
// its title; completed tasks stay listed, ticked). A tick shows its target value while the write and the re-read are in
// flight (the "Create / edit task: optimistic" row); a failed tick says so and the box falls back to the stored value.
// A failed create keeps the typed title in the input and says so.
//
// Inside TipTap: the body sits in a `contentEditable={false}` node-view. TipTap's node-view `stopEvent` already hands
// events whose target is an <input> to the input, not ProseMirror; the composer (`stopPropagation`) also stops Enter so
// it can never split the block.
// ============================================================================
import { View } from '@tamagui/core'
import { Checkbox } from '@vida/ui'
import type { IntegrationBlockRendererProps } from '@vida/editor'
import { ReadErrorMessage } from '../notes/read-error-message'
import { retryState } from '../notes/read-error'
import { TASK_COPY, TaskAlert, TaskComposer, TaskEmpty, TaskSkeleton } from './task-parts'
import { useTaskWrites } from './use-task-writes'
import { useTasks, type TaskRow } from './use-tasks'

const GROUP = 'Task checklist'

function TaskItem({
  task,
  onToggle,
  pendingDone,
  disabled,
}: {
  task: TaskRow
  onToggle: (task: TaskRow, done: boolean) => void
  /** The value a tick in flight is writing (shown until the store re-read settles); undefined when none. */
  pendingDone: boolean | undefined
  disabled: boolean
}) {
  return (
    <Checkbox
      size="sm"
      label={task.title}
      checked={pendingDone ?? task.status === 'completed'}
      disabled={disabled}
      onCheckedChange={(done) => onToggle(task, done)}
    />
  )
}

export function TaskChecklistBlock({ attrs, editable }: IntegrationBlockRendererProps) {
  const tasks = useTasks(attrs)
  const read = retryState(tasks)
  const { toggle, tick, pendingDone } = useTaskWrites()

  const onToggle = (task: TaskRow, done: boolean) => tick(task.id, done)

  const rows = tasks.data
  let body
  if (read.error) {
    body = <ReadErrorMessage message={TASK_COPY.readError} retry={read.retry} retrying={read.retrying} />
  } else if (rows === undefined) {
    body = <TaskSkeleton />
  } else if (rows.length === 0) {
    body = <TaskEmpty />
  } else {
    body = (
      <View gap="$8">
        {rows.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={onToggle}
            pendingDone={pendingDone(t.id)}
            disabled={!editable || pendingDone(t.id) !== undefined}
          />
        ))}
      </View>
    )
  }

  return (
    <View
      role="group"
      aria-label={GROUP}
      backgroundColor="$colorSurfaceSecondary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
      paddingHorizontal="$12"
      paddingVertical="$8"
      gap="$8"
    >
      {body}
      {toggle.isError ? <TaskAlert>{TASK_COPY.toggleError}</TaskAlert> : null}
      {editable ? <TaskComposer stopPropagation /> : null}
    </View>
  )
}
