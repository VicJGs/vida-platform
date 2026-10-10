import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { NeuralGraph, type GraphNode, type GraphEdge } from './neural-graph'

// UI-2 · V7 · neural-graph stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark)
// + preset (editorial｜reader｜quietDesk). A Sigma.js WebGL force-directed graph. (Renders the real WebGL graph in
// the browser; jsdom/tests use the guarded fallback + the accessible node list.)
//
// INK VOICE (fe-codec-canvas-graph, BR-7): the DEFAULT node color is the per-preset `$colorBrandPrimary` and the
// default edge is the muted `$colorBorderDefault` — NO per-item color. So the `Playground` graph wears each preset's
// voice (editorial blue · reader oxblood · quietDesk olive) and flips light/dark. `PerItemColors` shows a consumer
// overriding per node (BR-8). NOTE: nodes/edges are STABLE module constants (B1 — a new array each render would
// kill+rebuild the WebGL context).

// A small knowledge graph: notes/people/projects with connections. NO per-item color → the themed ink voice (BR-7).
const NODES: GraphNode[] = [
  { id: 'vida', label: 'Vida', size: 12 },
  { id: 'ui2', label: 'UI-2 views', size: 9 },
  { id: 'list', label: 'List' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'pomodoro', label: 'Pomodoro' },
  { id: 'export', label: 'Export' },
  { id: 'graph', label: 'Neural graph' },
  { id: 'hard3', label: 'HARD-3', size: 9 },
  { id: 'ar8', label: 'AR-8 graph-prep' },
  { id: 'spaces', label: 'Spaces' },
]
const EDGES: GraphEdge[] = [
  { source: 'vida', target: 'ui2' },
  { source: 'ui2', target: 'list' },
  { source: 'ui2', target: 'gallery' },
  { source: 'ui2', target: 'timeline' },
  { source: 'ui2', target: 'calendar' },
  { source: 'ui2', target: 'pomodoro' },
  { source: 'ui2', target: 'export' },
  { source: 'ui2', target: 'graph' },
  { source: 'graph', target: 'hard3' },
  { source: 'ar8', target: 'hard3' },
  { source: 'hard3', target: 'spaces' },
  { source: 'spaces', target: 'vida' },
  { source: 'graph', target: 'ar8' },
]

// A consumer overriding per-node color by category (BR-8 — the per-item override still wins over the themed default).
const NODES_COLORED: GraphNode[] = NODES.map((n) => ({
  ...n,
  color: n.id === 'vida' || n.id === 'ui2' ? '#8b5cf6' : n.id === 'graph' ? '#ef4444' : '#10b981',
}))

const meta: Meta = { title: 'Platform Views/NeuralGraph' }
export default meta
type Story = StoryObj

// Ink voice — themed default node/edge colors (BR-7). The KEY Visual-Gate surface: nodes = per-preset accent.
export const Playground: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph
        nodes={NODES}
        edges={EDGES}
        height={440}
        // eslint-disable-next-line no-console
        onNodeClick={(id) => console.info('[story] node clicked:', id)}
        aria-label="Vida knowledge graph"
      />
    </View>
  ),
}

// Per-item color override (BR-8) — the consumer's data colors still win over the themed default.
export const PerItemColors: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph nodes={NODES_COLORED} edges={EDGES} height={440} aria-label="Colored knowledge graph" />
    </View>
  ),
}

export const Empty: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph nodes={[]} edges={[]} height={440} />
    </View>
  ),
}

export const Loading: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph nodes={[]} edges={[]} state="loading" height={440} />
    </View>
  ),
}

export const Error: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph nodes={[]} edges={[]} state="error" height={440} />
    </View>
  ),
}

// Consumer slot override (BR-11) — a teaching empty replaces the default "No connections yet." Message.
export const EmptyWithSlot: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph
        nodes={[]}
        edges={[]}
        state="empty"
        height={440}
        empty={
          <View alignItems="center" gap="$8" padding="$24">
            <Text fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
              No connections yet
            </Text>
            <Text fontSize="$small" color="$colorTextMuted">
              Link notes, people, and projects to grow your graph.
            </Text>
          </View>
        }
      />
    </View>
  ),
}
