import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { NeuralGraph, type GraphNode, type GraphEdge } from './neural-graph'

// UI-2 · V7 · neural-graph stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A Sigma.js WebGL force-directed graph. (Renders the real WebGL graph in the browser; jsdom/tests use the guarded
// fallback + the accessible node list.)
//
// MEASURE (v7-neural-graph.md §4): a force-directed layout (nodes spread, edges connect) · pan/zoom/drag (Sigma
// camera) · click a node → logs onNodeClick · empty state · dark mode (the transparent canvas sits on the frame's
// surface, which flips with the theme). NOTE: nodes/edges are STABLE module constants (B1 — a new array each render
// would kill+rebuild the WebGL context).

// A small knowledge graph: notes/people/projects with connections.
const NODES: GraphNode[] = [
  { id: 'vida', label: 'Vida', size: 12, color: '#6366f1' },
  { id: 'ui2', label: 'UI-2 views', size: 9, color: '#8b5cf6' },
  { id: 'list', label: 'List', color: '#10b981' },
  { id: 'gallery', label: 'Gallery', color: '#10b981' },
  { id: 'timeline', label: 'Timeline', color: '#10b981' },
  { id: 'calendar', label: 'Calendar', color: '#10b981' },
  { id: 'pomodoro', label: 'Pomodoro', color: '#f59e0b' },
  { id: 'export', label: 'Export', color: '#f59e0b' },
  { id: 'graph', label: 'Neural graph', color: '#ef4444' },
  { id: 'hard3', label: 'HARD-3', size: 9, color: '#06b6d4' },
  { id: 'ar8', label: 'AR-8 graph-prep', color: '#06b6d4' },
  { id: 'spaces', label: 'Spaces', color: '#ec4899' },
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

const meta: Meta = { title: 'Platform Views/NeuralGraph' }
export default meta
type Story = StoryObj

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

export const Empty: Story = {
  render: () => (
    <View width={640} maxWidth="100%">
      <NeuralGraph nodes={[]} edges={[]} height={440} />
    </View>
  ),
}
