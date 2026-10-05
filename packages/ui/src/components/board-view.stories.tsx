import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { BoardView, type BoardGroup } from './board-view'
import { type ViewState } from './list-view'
import { Card } from './card'

// UI-2 · V9 · board-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) + preset.
// A grouped-column (kanban) grid (role="group" of role="list" columns). Diverges from the linear spine like calendar:
// the board level owns loading/error/board-empty; each column reuses the list spine. READ-ONLY lens — no drag/move
// (BV-1). Card interactivity composes in renderCard (LV-5).
//
// MEASURE (v9-board-view.md §4): role="group"/column role="list"/listitem · group header + per-group count ·
// per-column empty (role="status") · 4 board states (loading skeleton columns · error status · board-empty status ·
// success) · dark mode × 3 presets · resize narrow → horizontal scroll (375, BV-5).

type Task = { id: string; title: string }
const GROUPS: BoardGroup<Task>[] = [
  { id: 'todo', title: 'To Do', items: [
    { id: '1', title: 'Draft the proposal' },
    { id: '2', title: 'Review PR #75' },
    { id: '3', title: 'Ship the codec viewmodes' },
  ] },
  { id: 'doing', title: 'In Progress', items: [{ id: '4', title: 'Write the board-view spec' }] },
  { id: 'done', title: 'Done', items: [{ id: '5', title: 'Archive old specs' }, { id: '6', title: 'Merge PR #74' }] },
  { id: 'blocked', title: 'Blocked', items: [] },
]

// renderCard composes an interactive Card (the LV-5 boundary — the renderer owns the listitem, not the card chrome).
const renderCard = (t: Task) => (
  <Card interactive>
    <Text color="$colorTextPrimary" fontSize="$small">{t.title}</Text>
  </Card>
)

type PlaygroundArgs = { state: ViewState; density: 'compact' | 'default' | 'spacious' }
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Board',
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
    <View width={960} maxWidth="100%">
      <BoardView<Task>
        groups={GROUPS}
        renderCard={renderCard}
        getKey={(t) => t.id}
        state={args.state}
        density={args.density}
        aria-label="Tasks board"
      />
    </View>
  ),
}

export const TerminalStates: Story = {
  render: () => (
    <View gap={32} width={960} maxWidth="100%">
      {(['loading', 'empty', 'error'] as const).map((s) => (
        <View key={s} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {s === 'empty' ? 'board-empty (no groups = role="status")' : s}
          </Text>
          <BoardView<Task> groups={[]} renderCard={renderCard} getKey={(t) => t.id} state={s} aria-label="Tasks board" />
        </View>
      ))}
    </View>
  ),
}

// An empty column INSIDE a success board — the per-column empty (role="status"), distinct from board-empty.
export const EmptyColumn: Story = {
  render: () => (
    <View width={960} maxWidth="100%">
      <BoardView<Task>
        groups={[
          { id: 'todo', title: 'To Do', items: [{ id: '1', title: 'Only card' }] },
          { id: 'empty', title: 'Empty column', items: [] },
        ]}
        renderCard={renderCard}
        getKey={(t) => t.id}
        aria-label="Tasks board"
      />
    </View>
  ),
}

// Density — the three card-rhythm options.
export const Density: Story = {
  render: () => (
    <View gap={32} width={960} maxWidth="100%">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <View key={d} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {d}
          </Text>
          <BoardView<Task> groups={GROUPS} renderCard={renderCard} getKey={(t) => t.id} density={d} aria-label="Tasks board" />
        </View>
      ))}
    </View>
  ),
}
