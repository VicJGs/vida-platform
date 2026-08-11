import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type Ref } from 'react'
import { styled, View } from '@tamagui/core'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { type ViewState, Message } from '../internal/data-view'

// UI-2 · V7 · neural-graph — the renderer for the `graph` VIEW_LAYOUT. A force-directed WebGL graph (Sigma.js).
// Implements docs/specs/components/ui-2-platform-views/v7-neural-graph.md. The last + hardest UI-2 view.
// - PRESENTATIONAL (the boundary): `nodes`/`edges` are props the app provides (from AR-8's graph-prep, which @vida/ui
//   can't import). V7 defines its own minimal GraphNode/GraphEdge shape.
// - Sigma mounts via a ref+effect (BR-5), WebGL-GUARDED (skips in jsdom / no-WebGL). ⚠ The effect deps on a CONTENT
//   signature `graphKey` (NOT the nodes/edges array refs) — an equal-content new array must NOT kill+rebuild+relayout
//   the WebGL context every render (the Toast re-arm bug at WebGL scale; browsers cap live contexts ~16). Cleanup =
//   `sigma.kill()`.
// - A11y (§XIV met IN V7): the WebGL canvas is aria-hidden; a visually-hidden focusable node-`<button>` list is the
//   accessible equivalent — onNodeClick is keyboard-reachable + SR-navigable + jsdom-testable.

export interface GraphNode {
  id: string
  label?: string
  color?: string
  size?: number
}
export interface GraphEdge {
  source: string
  target: string
  color?: string
}

export interface NeuralGraphProps {
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  /** Node-click intent (the app opens the entity). Fired by Sigma clickNode (mouse) + the node buttons (keyboard). */
  onNodeClick?: (nodeId: string) => void
  /** loading | error | empty | success. Default 'success'. */
  state?: ViewState
  /** Frame height (px). Default 400. */
  height?: number
  /** forceatlas2 iterations. Default 200. */
  layoutIterations?: number
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
}

// Documented default Sigma colors (WebGL, outside Tamagui theming — NG-7).
const DEFAULT_NODE_COLOR = '#6366f1'
const DEFAULT_EDGE_COLOR = '#cbd5e1'

// sr-only (visually hidden but FOCUSABLE — never display:none/visibility:hidden). NG-5/m-B.
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

const Frame = styled(View, {
  position: 'relative',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$lg',
  backgroundColor: '$colorSurfacePrimary', // Sigma canvas is transparent → this flips with the theme (m2)
  overflow: 'hidden',
})
const CanvasHost = styled(View, { width: '100%', height: '100%' })

export function NeuralGraph({
  nodes,
  edges,
  onNodeClick,
  state = 'success',
  height = 400,
  layoutIterations = 200,
  ref,
  ...rest
}: NeuralGraphProps): ReactElement {
  // WebGL availability — once, client-only (false in jsdom → the effect skips; false in a no-WebGL browser → NG-6).
  const [webglAvailable] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
    } catch {
      return false
    }
  })

  // Degree map + valid-edge count + dangling-edge dev-warn (runs in jsdom too → testable).
  const { degree, validEdges } = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id))
    const d = new Map<string, number>()
    let valid = 0
    let dangling = 0
    for (const e of edges) {
      if (ids.has(e.source) && ids.has(e.target)) {
        valid++
        d.set(e.source, (d.get(e.source) ?? 0) + 1)
        d.set(e.target, (d.get(e.target) ?? 0) + 1)
      } else dangling++
    }
    if (process.env.NODE_ENV !== 'production' && dangling > 0)
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] NeuralGraph: ${dangling} edge(s) reference a missing node — skipped.`)
    return { degree: d, validEdges: valid }
  }, [nodes, edges])

  // Content signature (B1) — re-init only on TOPOLOGY change, NOT on a new-but-equal array ref.
  const graphKey = useMemo(
    () => nodes.map((n) => n.id).join('|') + '¦' + edges.map((e) => e.source + '>' + e.target).join('|'),
    [nodes, edges],
  )

  const containerRef = useRef<HTMLDivElement | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick // latest-ref so the clickNode handler stays fresh without re-arming

  useEffect(() => {
    if (!webglAvailable || !containerRef.current || nodes.length === 0) return
    const graph = new Graph()
    const n = nodes.length
    nodes.forEach((node, i) => {
      graph.addNode(node.id, {
        label: node.label ?? node.id,
        x: Math.cos((2 * Math.PI * i) / n), // deterministic circular seed (m1)
        y: Math.sin((2 * Math.PI * i) / n),
        size: node.size ?? 6,
        color: node.color ?? DEFAULT_NODE_COLOR,
      })
    })
    edges.forEach((e) => {
      if (graph.hasNode(e.source) && graph.hasNode(e.target) && !graph.hasEdge(e.source, e.target))
        graph.addEdge(e.source, e.target, { color: e.color ?? DEFAULT_EDGE_COLOR })
    })
    forceAtlas2.assign(graph, { iterations: layoutIterations, settings: { barnesHutOptimize: true } })
    const sigma = new Sigma(graph, containerRef.current, {})
    sigma.on('clickNode', ({ node }) => onNodeClickRef.current?.(node))
    return () => {
      sigma.kill()
    }
    // deps on graphKey (content) NOT [nodes, edges] refs — B1. The body reads current nodes/edges.
  }, [graphKey, webglAvailable, layoutIterations])

  const effectiveEmpty = state === 'empty' || (state === 'success' && nodes.length === 0)
  const ariaLabel =
    (rest as { 'aria-label'?: string })['aria-label'] ??
    `Network graph: ${nodes.length} nodes, ${validEdges} connections`

  let content: ReactElement
  if (state === 'loading') content = <Message role="status">Loading…</Message>
  else if (state === 'error') content = <Message role="status">Couldn&rsquo;t load.</Message>
  else if (effectiveEmpty) content = <Message role="status">No connections yet.</Message>
  else
    // success + nodes: the VISUAL is the WebGL canvas (or a "needs WebGL" message if unavailable — NG-6); the
    // accessible node list renders EITHER WAY (it's the a11y equivalent AND the no-WebGL data fallback).
    content = (
      <>
        {webglAvailable ? (
          <CanvasHost ref={containerRef} aria-hidden />
        ) : (
          <Message role="status">This graph needs WebGL.</Message>
        )}
        {/* Accessible equivalent: a visually-hidden, focusable node list. Bare <button>s (NOT UI-1 Button — m-D). */}
        <View role="list" style={SR_ONLY}>
          {nodes.map((node) => (
            <View key={node.id} role="listitem">
              <button type="button" onClick={() => onNodeClick?.(node.id)}>
                {(node.label ?? node.id) + `, ${degree.get(node.id) ?? 0} connections`}
              </button>
            </View>
          ))}
        </View>
      </>
    )

  const isGraph = state === 'success' && !effectiveEmpty // the node-list region exists with or without WebGL

  return (
    <Frame ref={ref} {...rest} height={height} role={isGraph ? 'group' : undefined} aria-label={isGraph ? ariaLabel : undefined}>
      {content}
    </Frame>
  )
}
