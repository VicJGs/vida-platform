import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { CollectionView, type ViewLayout } from './collection-view'
import { type ViewState } from './list-view'
import { ListView } from './list-view'
import { GalleryView } from './gallery-view'
import { Timeline } from './timeline'
import { TableView, type Column } from './table-view'
import { BoardView, type BoardGroup } from './board-view'
import { CalendarView } from './calendar-view'
import { NeuralGraph, type GraphNode, type GraphEdge } from './neural-graph'
import { Card } from './card'

// CollectionView stories — the component Visual Gate surface (fe-codec-collection S1). Toggle Theme (light｜dark) +
// preset in the toolbar. The shell: a view-mode SWITCHER (role="toolbar" of labeled buttons; condenses to a Menu <768)
// + the active renderer dispatched via renderView + chrome (title/count) + the 8-state threaded. NOT a renderer.
//
// MEASURE (collection-view.md §Done when): switcher (7 labeled buttons, active aria-pressed) · dispatch to all 7
// renderers · 4 states · empty-ownership (EmptyState for list/…, grid for calendar) · 375 condense · light/dark × 3
// presets · AA full-matrix. Resize < 768 → the switcher condenses to "View: {label}".

type Row = { id: string; title: string; status: 'todo' | 'doing' | 'done'; due: string; owner: string }
const ROWS: Row[] = [
  { id: '1', title: 'Draft the Q3 proposal', status: 'todo', due: '2026-10-06', owner: 'Ana' },
  { id: '2', title: 'Review PR #76 (board-view)', status: 'doing', due: '2026-10-07', owner: 'Victor' },
  { id: '3', title: 'Ship the codec viewmodes', status: 'done', due: '2026-10-04', owner: 'Victor' },
  { id: '4', title: 'Write the Collection spec', status: 'doing', due: '2026-10-09', owner: 'Ana' },
  { id: '5', title: 'Archive superseded specs', status: 'todo', due: '2026-10-12', owner: 'Luis' },
  { id: '6', title: 'Merge PR #74 (theme)', status: 'done', due: '2026-10-03', owner: 'Victor' },
]
const STATUS_LABEL: Record<Row['status'], string> = { todo: 'To Do', doing: 'In Progress', done: 'Done' }
const card = (r: Row) => (
  <Card interactive>
    <Text color="$colorTextPrimary" fontSize="$small">
      {r.title}
    </Text>
  </Card>
)
const COLUMNS: Column<Row>[] = [
  {
    key: 'title',
    header: 'Title',
    render: (r) => (
      <Text color="$colorTextPrimary" fontSize="$small">
        {r.title}
      </Text>
    ),
    sort: 'asc',
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {STATUS_LABEL[r.status]}
      </Text>
    ),
    width: 120,
  },
  {
    key: 'owner',
    header: 'Owner',
    render: (r) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {r.owner}
      </Text>
    ),
    width: 100,
  },
  {
    key: 'due',
    header: 'Due',
    render: (r) => (
      <Text color="$colorTextMuted" fontSize="$small">
        {r.due}
      </Text>
    ),
    width: 120,
  },
]
const GROUPS: BoardGroup<Row>[] = (['todo', 'doing', 'done'] as const).map((s) => ({
  id: s,
  title: STATUS_LABEL[s],
  items: ROWS.filter((r) => r.status === s),
}))
const NODES: GraphNode[] = ROWS.map((r) => ({ id: r.id, label: r.title }))
const EDGES: GraphEdge[] = [
  { source: '1', target: '4' },
  { source: '2', target: '3' },
  { source: '4', target: '5' },
]

// the consumer's renderView — dispatches the active layout to its real renderer with its real props + the threaded state.
function renderView(layout: ViewLayout, state: ViewState) {
  const common = { state, getKey: (r: Row) => r.id, 'aria-label': 'Tasks' as const }
  switch (layout) {
    case 'list':
      return <ListView<Row> items={ROWS} renderItem={card} {...common} />
    case 'table':
      return <TableView<Row> items={ROWS} columns={COLUMNS} {...common} />
    case 'board':
      return <BoardView<Row> groups={GROUPS} renderCard={card} getKey={(r) => r.id} state={state} aria-label="Tasks" />
    case 'gallery':
      return <GalleryView<Row> items={ROWS} renderItem={card} {...common} />
    case 'calendar':
      return (
        <CalendarView<Row>
          items={ROWS}
          getDate={(r) => r.due}
          renderItem={(r) => (
            <Text fontSize="$small" color="$colorTextPrimary">
              {r.title}
            </Text>
          )}
          month={new Date('2026-10-01')}
          today={new Date('2026-10-04')}
          getKey={(r) => r.id}
          state={state === 'empty' ? 'success' : state}
          aria-label="Tasks"
        />
      )
    case 'timeline':
      return <Timeline<Row> items={ROWS} renderItem={card} getLabel={(r) => r.due} {...common} />
    case 'graph':
      return <NeuralGraph nodes={NODES} edges={EDGES} state={state} aria-label="Tasks" />
  }
}

const ALL: ViewLayout[] = ['list', 'table', 'board', 'gallery', 'calendar', 'graph', 'timeline']

// CollectionView is CONTROLLED (layout is a prop) → a tiny stateful wrapper for the interactive stories.
function Controlled({
  state,
  count,
  width,
  chrome,
}: {
  state: ViewState
  count?: number
  width?: number
  chrome?: boolean
}) {
  const [layout, setLayout] = useState<ViewLayout>('list')
  const [filterActive, setFilterActive] = useState(false)
  const chromeProps = chrome
    ? {
        onFilter: () => setFilterActive((v) => !v),
        filterActive,
        sortLabel: 'Due ↑' as const,
        onSort: () => {},
        onNewView: () => {},
      }
    : {}
  return (
    <View width={width ?? 960} maxWidth="100%">
      <CollectionView
        title="Tasks"
        count={count ?? ROWS.length}
        layout={layout}
        layouts={ALL}
        onLayoutChange={setLayout}
        renderView={renderView}
        state={state}
        {...chromeProps}
      />
    </View>
  )
}

type Args = { state: ViewState }
const meta: Meta<Args> = {
  title: 'Platform Views/Collection',
  argTypes: { state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] } },
}
export default meta
type Story = StoryObj<Args>

// The shell — switch between all 7 view-modes + the full view-config chrome (Filter/Sort/+), toggle the state arg.
export const Playground: Story = { args: { state: 'success' }, render: (a) => <Controlled state={a.state} chrome /> }

// Narrow surface — a 375px CONTAINER (the renderer-scroll surface). NB: the switcher condense is VIEWPORT-driven
// (window.matchMedia <768, useTabletUp) — proving it requires an actual browser resize to <768 (the Visual Gate does
// this via a 375 viewport), not just this container width. At a real 375 viewport the switcher becomes "View: {label}".
export const Narrow375: Story = {
  args: { state: 'success' },
  render: (a) => <Controlled state={a.state} width={375} chrome />,
}

// State coverage — the chrome (title · count · Filter/Sort/+ · switcher) persists + stays ACTIVE in every state (EC-2);
// empty = teaching-invitation.
export const StateCoverage: Story = {
  render: () => (
    <View gap="$24">
      {(['success', 'loading', 'error', 'empty'] as const).map((s) => (
        <View key={s} gap="$4">
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            state = {s}
          </Text>
          <Controlled state={s} count={s === 'success' ? ROWS.length : 0} width={720} chrome />
        </View>
      ))}
    </View>
  ),
}
