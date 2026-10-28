import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { TableView, type Column } from './table-view'
import { type ViewState } from './list-view'

// UI-2 · V8 · table-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) + preset.
// A columnar grid (role="table"): caller-declared columns × rows. Diverges from the linear spine like calendar: empty
// = a designed row (not a message); a table, not a list. READ-ONLY lens — no sort toggle/row click (TV-1/TV-5).
//
// MEASURE (v8-table-view.md §4): role="table"/row/columnheader/cell · column grow + align + fixed width · aria-sort
// DISPLAY (asc/desc arrows) · density (compact/default/spacious) · 4 states (loading skeleton · error status · empty
// designed row · success) · dark mode × 3 presets · resize narrow → horizontal scroll (375, TV-6).

type Task = { id: string; title: string; status: string; priority: string; due: string }
const TASKS: Task[] = [
  { id: '1', title: 'Draft the proposal', status: 'In progress', priority: 'High', due: '2026-10-08' },
  { id: '2', title: 'Review PR #75', status: 'Todo', priority: 'Medium', due: '2026-10-05' },
  { id: '3', title: 'Ship the codec viewmodes', status: 'Todo', priority: 'High', due: '2026-10-12' },
  { id: '4', title: 'Archive old specs', status: 'Done', priority: 'Low', due: '2026-10-02' },
]

const COLUMNS: Column<Task>[] = [
  {
    key: 'title',
    header: 'Title',
    render: (t) => (
      <Text color="$colorTextPrimary" fontSize="$small">
        {t.title}
      </Text>
    ),
    sort: 'asc',
  },
  {
    key: 'status',
    header: 'Status',
    width: 140,
    render: (t) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {t.status}
      </Text>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    width: 120,
    render: (t) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {t.priority}
      </Text>
    ),
  },
  {
    key: 'due',
    header: 'Due',
    width: 120,
    align: 'end',
    render: (t) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {t.due}
      </Text>
    ),
  },
]

type PlaygroundArgs = { state: ViewState; density: 'compact' | 'default' | 'spacious' }
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Table',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    density: { control: 'inline-radio', options: ['compact', 'default', 'spacious'] },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

export const Playground: Story = {
  args: { state: 'success', density: 'default' },
  render: (args) => (
    <View width={760} maxWidth="100%">
      <TableView<Task>
        items={TASKS}
        columns={COLUMNS}
        getKey={(t) => t.id}
        state={args.state}
        density={args.density}
        aria-label="Tasks"
      />
    </View>
  ),
}

export const TerminalStates: Story = {
  render: () => (
    <View gap={32} width={760} maxWidth="100%">
      {(['loading', 'empty', 'error'] as const).map((s) => (
        <View key={s} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {s === 'empty' ? 'empty (= designed row, NOT a message)' : s}
          </Text>
          <TableView<Task> items={[]} columns={COLUMNS} getKey={(t) => t.id} state={s} aria-label="Tasks" />
        </View>
      ))}
    </View>
  ),
}

// Density — the three cell-rhythm options side by side.
export const Density: Story = {
  render: () => (
    <View gap={32} width={760} maxWidth="100%">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <View key={d} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {d}
          </Text>
          <TableView<Task> items={TASKS} columns={COLUMNS} getKey={(t) => t.id} density={d} aria-label="Tasks" />
        </View>
      ))}
    </View>
  ),
}
