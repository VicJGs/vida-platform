// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'

// Mock the WebGL libs so the Sigma lifecycle is testable without a real WebGL context (jsdom has none).
const h = vi.hoisted(() => {
  const kill = vi.fn()
  const on = vi.fn()
  const Sigma = vi.fn(() => ({ on, kill }))
  const assign = vi.fn()
  return { kill, on, Sigma, assign }
})
vi.mock('sigma', () => ({ default: h.Sigma }))
vi.mock('graphology-layout-forceatlas2', () => ({ default: { assign: h.assign } }))

import Graph from 'graphology' // NOT mocked — the real graph is passed to the Sigma mock (A4 inspects its attributes)
import { UIProvider } from '../provider'
import { NeuralGraph, type GraphNode, type GraphEdge } from './neural-graph'

const NODES: GraphNode[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
]
const EDGES: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
]
// getContext truthy → webglAvailable=true → the Sigma effect runs.
const enableWebGL = () => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

beforeEach(() => {
  h.kill.mockClear()
  h.on.mockClear()
  h.Sigma.mockClear()
  h.assign.mockClear()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('NeuralGraph', () => {
  // ── a11y node-list + states (real jsdom, no WebGL) ──────────────────────────
  it('success renders a labelled region + a focusable node <button> per node (a11y equivalent)', () => {
    const { getByRole, getAllByRole } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    expect(getByRole('group', { name: 'Map' })).not.toBeNull()
    const buttons = getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.textContent).toContain('Alpha')
    expect(buttons[0]?.textContent).toContain('1 connections') // degree
  })

  it('a node button fires onNodeClick(id) — keyboard/SR path', () => {
    const onNodeClick = vi.fn()
    const { getByRole } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} onNodeClick={onNodeClick} aria-label="Map" />)
    fireEvent.click(getByRole('button', { name: /^Alpha,/ }))
    expect(onNodeClick).toHaveBeenCalledWith('a')
  })

  it('composes an aria-label summary when none is given', () => {
    const { getByRole } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} />)
    expect(getByRole('group').getAttribute('aria-label')).toBe('Network graph: 3 nodes, 2 connections')
  })

  it('terminal states → a role=status message (not the graph)', () => {
    const empty = renderUI(<NeuralGraph nodes={[]} edges={[]} state="empty" />)
    expect(empty.getByRole('status').textContent).toMatch(/no connections/i)
    cleanup()
    const err = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} state="error" />)
    expect(err.getByRole('status').textContent).toMatch(/couldn/i)
  })

  it('no-WebGL: success shows a "needs WebGL" message AND still the accessible node list', () => {
    // (no enableWebGL) → webglAvailable false
    const { getByRole, getAllByRole } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    expect(getByRole('status').textContent).toMatch(/webgl/i)
    expect(getAllByRole('button')).toHaveLength(3) // a11y equivalent still present
    expect(h.Sigma).not.toHaveBeenCalled() // Sigma never inited without WebGL
  })

  it('dangling edges (referencing a missing node) dev-warn + are excluded from the summary', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI(
      <NeuralGraph nodes={NODES} edges={[...EDGES, { source: 'a', target: 'zzz' }]} />, // no aria-label → composed summary
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing node'))
    expect(getByRole('group').getAttribute('aria-label')).toBe('Network graph: 3 nodes, 2 connections') // dangling not counted
    warn.mockRestore()
  })

  it('forwards ref to the frame', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<NeuralGraph ref={ref} nodes={NODES} edges={EDGES} aria-label="Map" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  // ── Sigma WebGL lifecycle (mocked sigma + enableWebGL) ──────────────────────
  it('WebGL: mounts Sigma once, runs forceatlas2, wires clickNode', () => {
    enableWebGL()
    renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    expect(h.Sigma).toHaveBeenCalledTimes(1)
    expect(h.assign).toHaveBeenCalledTimes(1) // forceatlas2.assign
    expect(h.on).toHaveBeenCalledWith('clickNode', expect.any(Function))
  })

  it('B1: a re-render with an equal-content NEW array does NOT re-init Sigma (content-key dep)', () => {
    enableWebGL()
    const { rerender } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    expect(h.Sigma).toHaveBeenCalledTimes(1)
    // new array refs, identical content:
    rerender(
      <UIProvider>
        <NeuralGraph nodes={NODES.map((n) => ({ ...n }))} edges={EDGES.map((e) => ({ ...e }))} aria-label="Map" />
      </UIProvider>,
    )
    expect(h.Sigma).toHaveBeenCalledTimes(1) // NOT re-inited
    expect(h.kill).not.toHaveBeenCalled()
  })

  it('a TOPOLOGY change re-inits (kill + new Sigma)', () => {
    enableWebGL()
    const { rerender } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    rerender(
      <UIProvider>
        <NeuralGraph nodes={[...NODES, { id: 'd', label: 'Delta' }]} edges={EDGES} aria-label="Map" />
      </UIProvider>,
    )
    expect(h.kill).toHaveBeenCalledTimes(1)
    expect(h.Sigma).toHaveBeenCalledTimes(2)
  })

  it('kills Sigma on unmount (no WebGL-context leak)', () => {
    enableWebGL()
    const { unmount } = renderUI(<NeuralGraph nodes={NODES} edges={EDGES} aria-label="Map" />)
    unmount()
    expect(h.kill).toHaveBeenCalledTimes(1)
  })

  // ── fe-codec-canvas-graph: ink voice + consumer slots + reduced-motion ──────
  it('A3: a consumer slot overrides the default terminal message; absent → default copy', () => {
    const custom = renderUI(<NeuralGraph nodes={[]} edges={[]} state="empty" empty={<div>graph is waiting</div>} />)
    expect(custom.getByText('graph is waiting')).not.toBeNull()
    expect(custom.queryByText(/no connections/i)).toBeNull() // the default Message is replaced, not appended
    cleanup()
    const dflt = renderUI(<NeuralGraph nodes={[]} edges={[]} state="empty" />)
    expect(dflt.getByRole('status').textContent).toMatch(/no connections/i) // absent slot → verbatim default
  })

  it('A4: a per-item GraphNode.color overrides the themed default (BR-8)', () => {
    // The EXACT themed default (per-preset accent) is a real-browser concern → the Visual Gate (A2). Here we assert
    // the stable contract: a per-item color wins; a node without one gets a DIFFERENT, non-empty default.
    enableWebGL()
    renderUI(
      <NeuralGraph
        nodes={[
          { id: 'a', label: 'A', color: '#ff0000' },
          { id: 'b', label: 'B' },
        ]}
        edges={[]}
        aria-label="Map"
      />,
    )
    const graph = h.Sigma.mock.calls[0]?.[0] as Graph // the real graphology graph the effect built
    expect(graph.getNodeAttribute('a', 'color')).toBe('#ff0000') // per-item override wins (BR-8)
    const bColor = graph.getNodeAttribute('b', 'color') as string // themed default (BR-7)
    expect(bColor).toBeTruthy()
    expect(bColor).not.toBe('#ff0000') // the default is NOT the override — it's the themed/fallback value
  })

  it('A7: reduced-motion → forceatlas2 runs with 0 iterations (circular seed); normal → layoutIterations', () => {
    // normal path — no matchMedia in jsdom → useReducedMotion() false
    enableWebGL()
    renderUI(<NeuralGraph nodes={NODES} edges={EDGES} layoutIterations={150} aria-label="Map" />)
    expect(h.assign).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ iterations: 150 }))
    cleanup()
    h.assign.mockClear()
    // reduced-motion ON → 0 iterations (the nodes stay on the deterministic circular seed)
    const mql = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)
    enableWebGL()
    renderUI(<NeuralGraph nodes={NODES} edges={EDGES} layoutIterations={150} aria-label="Map" />)
    expect(h.assign).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ iterations: 0 }))
  })
})
