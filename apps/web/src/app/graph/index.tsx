// Graph route — UI-4 · S5. The lazy-split boundary for the heavy WebGL neural graph
// (sigma/graphology/forceatlas2). This dynamic import (routes.tsx `lazyRouteComponent`)
// is what keeps sigma OUT of the initial bundle (BR-7; performance-strategy.md §6 —
// Graph < 50 KB, lazy). No graph-data source in M1.0 (AR-8 graph-prep is a seam), so it
// degrades to NeuralGraph's empty terminal state (BR-4). Default export = route component.
import { NeuralGraph } from '@vida/ui'

export default function GraphRoute() {
  return <NeuralGraph nodes={[]} edges={[]} state="empty" />
}
