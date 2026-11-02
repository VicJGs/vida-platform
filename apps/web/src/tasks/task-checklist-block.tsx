// ============================================================================
// TaskChecklistBlock — the live body of the task block (`taskChecklist`, LIF-339), registered in
// ../notes/block-renderers.tsx (the editor imports no module, BR-E5-7). Reads through `useTasks(attrs)`; every write
// goes through the tasks service (`createTask` / `completeTask` / `reopenTask`) and then invalidates the tasks query
// (invalidate-and-reread, BR-RT-4).
//
// Terminal states (docs/features/tasks/business-rules.md "Task list"): loading (static skeleton bars), empty ("No tasks"
// + the "New task" input is the create CTA), error (a calm message + Retry), success (one checkbox per task, named by
// its title; completed tasks stay listed, ticked). A tick shows its target value while the write and the re-read are in
// flight (the "Create / edit task: optimistic" row); a failed tick says so and the box falls back to the stored value.
// A failed create keeps the typed title in the input and says so.
//
// Inside TipTap: the body sits in a `contentEditable={false}` node-view. TipTap's node-view `stopEvent` already hands
// events whose target is an <input> to the input, not ProseMirror; Enter also calls preventDefault/stopPropagation so
// it can never split the block.
// ============================================================================
import { useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Text, View } from '@tamagui/core'
import { Checkbox, Input } from '@vida/ui'
import type { IntegrationBlockRendererProps } from '@vida/editor'
import { getServices } from '../db/composition-root'
import { ReadErrorMessage } from '../notes/read-error-message'
import { retryState } from '../notes/read-error'
import { TASKS_QUERY_KEY, useTasks, type TaskRow } from './use-tasks'

const COPY = {
  group: 'Task checklist',
  input: 'New task',
  placeholder: 'Add a task and press Enter',
  loading: 'Loading tasks',
  empty: 'No tasks',
  readError: 'Tasks could not be loaded.',
  createError: 'The task was not saved. Press Enter to try again.',
  toggleError: 'The change was not saved. Try again.',
} as const

function TaskSkeleton() {
  return (
    <View role="status" aria-label={COPY.loading} aria-busy="true" gap="$8">
      {[0, 1].map((i) => (
        <View key={i} height={20} width={180} borderRadius="$md" backgroundColor="$colorSurfacePrimary" />
      ))}
    </View>
  )
}

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
  const qc = useQueryClient()
  const tasks = useTasks(attrs)
  const read = retryState(tasks)
  const [title, setTitle] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY })

  const create = useMutation({
    mutationFn: async (t: string) => (await getServices()).tasks.createTask({ title: t }),
    onSuccess: async () => {
      setTitle('')
      await refresh()
    },
  })

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const s = await getServices()
      return done ? s.tasks.completeTask(id) : s.tasks.reopenTask(id)
    },
    onSettled: refresh,
  })

  const submit = () => {
    const t = title.trim()
    if (t === '' || create.isPending) return
    create.mutate(t)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    submit()
  }

  const onToggle = (task: TaskRow, done: boolean) => toggle.mutate({ id: task.id, done })

  const rows = tasks.data
  let body
  if (read.error) {
    body = <ReadErrorMessage message={COPY.readError} retry={read.retry} retrying={read.retrying} />
  } else if (rows === undefined) {
    body = <TaskSkeleton />
  } else if (rows.length === 0) {
    body = (
      <Text fontSize="$small" color="$colorTextMuted">
        {COPY.empty}
      </Text>
    )
  } else {
    body = (
      <View gap="$8">
        {rows.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={onToggle}
            pendingDone={toggle.isPending && toggle.variables.id === t.id ? toggle.variables.done : undefined}
            disabled={!editable || (toggle.isPending && toggle.variables.id === t.id)}
          />
        ))}
      </View>
    )
  }

  return (
    <View
      role="group"
      aria-label={COPY.group}
      backgroundColor="$colorSurfaceSecondary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
      paddingHorizontal="$12"
      paddingVertical="$8"
      gap="$8"
    >
      {body}
      {toggle.isError ? (
        <View role="alert">
          <Text fontSize="$small" color="$colorTextMuted">
            {COPY.toggleError}
          </Text>
        </View>
      ) : null}
      {editable ? (
        <Input
          size="sm"
          aria-label={COPY.input}
          placeholder={COPY.placeholder}
          value={title}
          onChangeText={(v) => {
            setTitle(v)
            if (create.isError) create.reset()
          }}
          onKeyDown={onKeyDown}
          invalid={create.isError}
          aria-busy={create.isPending ? true : undefined}
        />
      ) : null}
      {create.isError ? (
        <View role="alert">
          <Text fontSize="$small" color="$colorTextMuted">
            {COPY.createError}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
