// ============================================================================
// task-parts — the pieces the task block (LIF-339, task-checklist-block.tsx) and the /tasks route (LIF-389,
// tasks-surface.tsx) share: one COPY, the write-error alert, the loading skeleton, the empty line and the "New task"
// composer. One home, so the two surfaces cannot drift in copy or accessible names.
//
// TaskComposer: title + Enter → `createTask` (`useCreateTask`), then clears. A failed create keeps the typed title,
// marks the input invalid and says so in a `role="alert"`; typing again clears the error. `stopPropagation` is for the
// block's TipTap node-view, so Enter can never reach ProseMirror and split the block.
// ============================================================================
import { useState, type KeyboardEvent } from 'react'
import { Text, View } from '@tamagui/core'
import { Input } from '@vida/ui'
import { useCreateTask } from './use-task-writes'

export const TASK_COPY = {
  input: 'New task',
  placeholder: 'Add a task and press Enter',
  loading: 'Loading tasks',
  empty: 'No tasks',
  readError: 'Tasks could not be loaded.',
  createError: 'The task was not saved. Press Enter to try again.',
  toggleError: 'The change was not saved. Try again.',
} as const

/** A failed write, announced (`role="alert"`). */
export function TaskAlert({ children }: { children: string }) {
  return (
    <View role="alert">
      <Text fontSize="$small" color="$colorTextMuted">
        {children}
      </Text>
    </View>
  )
}

export function TaskSkeleton() {
  return (
    <View role="status" aria-label={TASK_COPY.loading} aria-busy="true" gap="$8">
      {[0, 1].map((i) => (
        <View key={i} height={20} width={180} borderRadius="$md" backgroundColor="$colorSurfacePrimary" />
      ))}
    </View>
  )
}

export function TaskEmpty() {
  return (
    <Text fontSize="$small" color="$colorTextMuted">
      {TASK_COPY.empty}
    </Text>
  )
}

export function TaskComposer({ stopPropagation = false }: { stopPropagation?: boolean }) {
  const [title, setTitle] = useState('')
  const create = useCreateTask(() => setTitle(''))

  const submit = () => {
    const t = title.trim()
    if (t === '' || create.isPending) return
    create.mutate(t)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (stopPropagation) e.stopPropagation()
    submit()
  }

  return (
    <>
      <Input
        size="sm"
        aria-label={TASK_COPY.input}
        placeholder={TASK_COPY.placeholder}
        value={title}
        onChangeText={(v) => {
          setTitle(v)
          if (create.isError) create.reset()
        }}
        onKeyDown={onKeyDown}
        invalid={create.isError}
        aria-busy={create.isPending ? true : undefined}
      />
      {create.isError ? <TaskAlert>{TASK_COPY.createError}</TaskAlert> : null}
    </>
  )
}
