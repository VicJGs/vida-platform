import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { styled, useTheme, View } from '@tamagui/core'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { type ViewState, Message } from '../internal/data-view'
import { useReducedMotion } from '../hooks/use-reduced-motion'

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
  /** forceatlas2 iterations. Default 200. Capped to 0 under reduced motion — `useReducedMotion()` (BR-12). */
  layoutIterations?: number
  /** Slot overriding the default "Loading…" message (e.g. a teaching component). */
  loading?: ReactNode
  /** Slot overriding the default "Couldn't load." error message. */
  error?: ReactNode
  /** Slot overriding the default "No connections yet." empty message (e.g. a teaching <EmptyState/>). */
  empty?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
}

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

/** Sigma camera settings under reduced motion (R4-BR-8, D-R4-3). */
const INSTANT_CAMERA = { zoomDuration: 1, doubleClickZoomingDuration: 1, inertiaDuration: 1, inertiaRatio: 0 }

export function NeuralGraph({
  nodes,
  edges,
  onNodeClick,
  state = 'success',
  height = 400,
  layoutIterations = 200,
  loading,
  error,
  empty,
  ref,
  ...rest
}: NeuralGraphProps): ReactElement {
  // Ink voice (NG-7, BR-7): node/edge DEFAULT colors come from the live theme — the editorial per-preset accent +
  // the muted hairline, NOT a fixed blue-SaaS hex. `useTheme().get('web')` returns a CSS-var REFERENCE
  // (`var(--colorBrandPrimary)`) — fine for an SVG attr (the pomodoro-ring pattern), but Sigma renders in WebGL and
  // can't parse `var(...)` (it would render colorless). AND the CODEC preset is applied as a `<body>` class that
  // overrides the var's VALUE — so the concrete, preset-aware colour must be resolved from the CSS cascade at a DOM
  // node via getComputedStyle (done in the effect, below), NOT from `.val` (which would miss the body-class override).
  // The literals are the no-theme-resolution fallback (jsdom). A per-item node.color still overrides (BR-8).
  const theme = useTheme()
  const nodeColorToken = theme.colorBrandPrimary?.get('web') ?? '#6366f1'
  const edgeColorToken = theme.colorBorderDefault?.get('web') ?? '#cbd5e1'

  // Reduced motion (BR-12, NG-8): the force-settling is synchronous, but a reduced-motion user gets the deterministic
  // circular seed (0 iterations) instead of the force-clustered layout — instant, predictable, no organic settling.
  const reduced = useReducedMotion()

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
    // Resolve the themed colour tokens to a CONCRETE value Sigma's WebGL colour parser accepts (BR-7/9). A CSS
    // custom property's COMPUTED value does not substitute nested var() refs (`--colorBrandPrimary` → the chained
    // `var(--c-...)`, not a hex), so read it through a REAL property on a throwaway probe in THIS DOM subtree — the
    // browser then applies the full cascade (incl. the active preset's `<body>`-class override + light/dark) and
    // returns a concrete `rgb(...)`. jsdom has no CSS var engine → the probe yields a var/empty → the literal fallback.
    const host = containerRef.current
    const resolveColor = (token: string, fallback: string): string => {
      if (!token.startsWith('var(')) return token || fallback // already concrete (a literal)
      const probe = document.createElement('span')
      probe.style.position = 'absolute'
      probe.style.color = token
      host.appendChild(probe)
      try {
        const resolved = getComputedStyle(probe).color
        return resolved && !resolved.startsWith('var(') ? resolved : fallback
      } finally {
        probe.remove() // never leak the probe, even if getComputedStyle throws (review N1)
      }
    }
    const nodeColor = resolveColor(nodeColorToken, '#6366f1')
    const edgeColor = resolveColor(edgeColorToken, '#cbd5e1')
    const graph = new Graph()
    const n = nodes.length
    nodes.forEach((node, i) => {
      graph.addNode(node.id, {
        label: node.label ?? node.id,
        x: Math.cos((2 * Math.PI * i) / n), // deterministic circular seed (m1)
        y: Math.sin((2 * Math.PI * i) / n),
        size: node.size ?? 6,
        color: node.color ?? nodeColor, // themed default (BR-7); per-item override wins (BR-8)
      })
    })
    edges.forEach((e) => {
      if (graph.hasNode(e.source) && graph.hasNode(e.target) && !graph.hasEdge(e.source, e.target))
        graph.addEdge(e.source, e.target, { color: e.color ?? edgeColor })
    })
    // reduced-motion → 0 iterations = the nodes stay on their deterministic circular seed (no force-settling); BR-12.
    const iterations = reduced ? 0 : layoutIterations
    forceAtlas2.assign(graph, { iterations, settings: { barnesHutOptimize: true } })
    // Reduced motion also makes the CAMERA instant (R4-BR-8; motion.md §Reduced Motion). 1 ms, never 0: sigma's
    // Camera.animate computes t = elapsed / duration and runs its first frame synchronously (sigma 3.0.3 sigma.esm.js:199),
    // so 0 gives 0/0 = NaN → one blank frame per wheel tick. 1 ms = start state, then the end state next frame. No inertia.
    const sigma = new Sigma(graph, containerRef.current, reduced ? INSTANT_CAMERA : {})
    sigma.on('clickNode', ({ node }) => onNodeClickRef.current?.(node))
    return () => {
      sigma.kill()
    }
    // deps on graphKey (content) NOT [nodes, edges] refs — B1. The body reads current nodes/edges + nodeColor/edgeColor
    // (the colors are intentionally OUT of deps — BR-10 stale-until-re-topology; `reduced` IS in → a toggle re-lays-out).
  }, [graphKey, webglAvailable, layoutIterations, reduced])

  const effectiveEmpty = state === 'empty' || (state === 'success' && nodes.length === 0)
  const ariaLabel =
    (rest as { 'aria-label'?: string })['aria-label'] ??
    `Network graph: ${nodes.length} nodes, ${validEdges} connections`

  // Terminal states (NG-3): each accepts an optional consumer slot that OVERRIDES the default Message (BR-11);
  // absent → the current copy verbatim (back-compat). Mirrors board-view / calendar-view `{slot ?? <Message>}`.
  let content: ReactNode
  if (state === 'loading') content = loading ?? <Message role="status">Loading…</Message>
  else if (state === 'error') content = error ?? <Message role="status">Couldn&rsquo;t load.</Message>
  else if (effectiveEmpty) content = empty ?? <Message role="status">No connections yet.</Message>
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
