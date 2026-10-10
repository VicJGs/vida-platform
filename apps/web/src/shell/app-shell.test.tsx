// @vitest-environment jsdom
// fe-shell #14 · S2 — AppShell FRAME tests. The CODEC reshape (dock⇄float inspector model): the shell is now a reserved
// top strip (banner) + full-bleed centered Content + an overlay host. `__bp` drives the breakpoint deterministically
// (jsdom has no layout engine). We assert the frame regions/landmarks (EC-7/8/9), the serif wordmark, the System/Modules
// panel toggles + their pressed state wiring, the injection slots (#15/#16/#17), and the reserved-strip reflow.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { AppShell } from './app-shell'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { renderInShell } from './test-router'
import { type Breakpoint } from './breakpoints'
import { DEFAULT_PLACEMENT } from './regions'

// (window.matchMedia + the WebGL globals are stubbed in ./test-setup.ts, loaded via vite.config setupFiles.)

afterEach(() => {
  cleanup()
  useAppShellUIStore.setState({ placement: DEFAULT_PLACEMENT })
})

function renderShell(bp: Breakpoint, props?: { bar1Slot?: React.ReactNode; hudSlot?: React.ReactNode; overlaySlot?: React.ReactNode }) {
  return renderInShell(
    <AppShell __bp={bp} {...props}>
      <div data-testid="outlet">content</div>
    </AppShell>,
  )
}

describe('AppShell — CODEC frame (S2)', () => {
  it('renders the frame regions + the content children', async () => {
    const { container, getByTestId } = await renderShell('desktop')
    expect(container.querySelector('[data-region="topStrip"]')).not.toBeNull()
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
    expect(container.querySelector('[data-region="overlayHost"]')).not.toBeNull()
    expect(getByTestId('outlet')).not.toBeNull()
  })

  it('uses landmark roles: the top strip is a banner, content is main; the overlay host carries neither', async () => {
    const { container } = await renderShell('desktop')
    // A top-level <header> is the banner landmark; <main> is the content.
    expect(screen.getByRole('banner')).not.toBeNull()
    expect(screen.getByRole('main')).not.toBeNull()
    const overlay = container.querySelector('[data-region="overlayHost"]')
    expect(overlay?.getAttribute('aria-label')).toBeNull()
    expect(overlay?.getAttribute('role')).toBeNull()
    expect(overlay?.tagName.toLowerCase()).toBe('div')
  })

  it('renders the serif wordmark and the System/Modules panel toggles', async () => {
    await renderShell('desktop')
    expect(screen.getByText('Vida')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'System' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Modules' })).not.toBeNull()
  })

  it('a panel toggle is a disclosure — aria-expanded flips + aria-controls points at the docked panel (S3)', async () => {
    await renderShell('desktop')
    const modules = screen.getByRole('button', { name: 'Modules' })
    expect(modules.getAttribute('aria-expanded')).toBe('false')
    expect(modules.getAttribute('aria-controls')).toBeNull() // no controlled region while closed
    fireEvent.click(modules)
    const opened = screen.getByRole('button', { name: 'Modules' })
    expect(opened.getAttribute('aria-expanded')).toBe('true')
    expect(opened.getAttribute('aria-controls')).toBe('shell-panel-modules')
    // The docked panel mounted as the Modules navigation landmark (EC-2 content beside).
    expect(screen.getByRole('navigation', { name: 'Modules' })).not.toBeNull()
    // Independent per panel — toggling Modules leaves System closed (envision L3).
    expect(screen.getByRole('button', { name: 'System' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('reflects an externally-set placement (hydration seam — stubShellPrefs / setPlacement)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, system: { ...DEFAULT_PLACEMENT.system, open: true } },
    })
    await renderShell('desktop')
    const system = screen.getByRole('button', { name: 'System' })
    expect(system.getAttribute('aria-expanded')).toBe('true')
    expect(system.getAttribute('aria-controls')).toBe('shell-panel-system')
    // System is complementary chrome ⇒ an <aside> landmark.
    expect(screen.getByRole('complementary', { name: 'System' })).not.toBeNull()
  })

  it('renders the #15/#16/#17 injection slots when provided (empty-but-functional in #14)', async () => {
    await renderShell('desktop', {
      bar1Slot: <div data-testid="bar1">scope</div>,
      hudSlot: <div data-testid="hud">hud</div>,
      overlaySlot: <div data-testid="overlay-content">cmdk</div>,
    })
    expect(screen.getByTestId('bar1')).not.toBeNull()
    expect(screen.getByTestId('hud')).not.toBeNull()
    expect(screen.getByTestId('overlay-content')).not.toBeNull()
  })

  it('reserves a top strip that reflows shorter on mobile (EC-7)', async () => {
    const mobile = await renderShell('mobile')
    expect(mobile.container.querySelector('[data-region="topStrip"]')?.getAttribute('data-top-inset')).toBe('52')
    cleanup()
    const tablet = await renderShell('tablet')
    expect(tablet.container.querySelector('[data-region="topStrip"]')?.getAttribute('data-top-inset')).toBe('56')
  })

  it('drives the overlay host mode: sheet on mobile, centered from tablet up (EC-8)', async () => {
    const mobile = await renderShell('mobile')
    expect(mobile.container.querySelector('[data-region="overlayHost"]')?.getAttribute('data-overlay-mode')).toBe('sheet')
    cleanup()
    const desktop = await renderShell('desktop')
    expect(desktop.container.querySelector('[data-region="overlayHost"]')?.getAttribute('data-overlay-mode')).toBe('centered')
  })
})

describe('AppShell — docked panel composition (S3)', () => {
  it('mounts an open+docked panel beside the content, at its edge (EC-2)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'dock', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    const panel = container.querySelector('[data-panel="modules"]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mode')).toBe('dock')
    expect(panel?.getAttribute('data-edge')).toBe('left')
    // Content still renders (beside the panel, not replaced).
    expect(screen.getByTestId('outlet')).not.toBeNull()
  })

  it('does NOT render a FLOATING panel in S3 (overlay=S4); its toggle stays honest (aria-expanded false, no controls)', async () => {
    // The Float control is disabled in the panel, so this float+open placement is only reachable via the hydration
    // seam (setPlacement) — never the UI. The disclosure must stay HONEST: nothing rendered ⇒ not expanded (g2 S3).
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'float', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    expect(container.querySelector('[data-panel="modules"]')).toBeNull() // float render deferred to S4
    const modules = screen.getByRole('button', { name: 'Modules' })
    expect(modules.getAttribute('aria-expanded')).toBe('false') // honest — no controlled region is rendered
    expect(modules.getAttribute('aria-controls')).toBeNull()
  })

  it('the panel ✕-close toggles the panel shut (focus returns to the bar toggle, N2)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'dock', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    fireEvent.click(screen.getByRole('button', { name: 'Close Modules panel' }))
    expect(container.querySelector('[data-panel="modules"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Modules' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('the edge picker is live — repositions the docked panel (EC-4, onSetEdge→setPanelEdge)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'dock', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    fireEvent.click(screen.getByRole('button', { name: 'Dock bottom' }))
    expect(container.querySelector('[data-panel="modules"]')?.getAttribute('data-edge')).toBe('bottom')
  })
})
