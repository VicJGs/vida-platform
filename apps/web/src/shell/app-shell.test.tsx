// @vitest-environment jsdom
// fe-shell #14 · S2 — AppShell FRAME tests. The CODEC reshape (dock⇄float inspector model): the shell is now a reserved
// top strip (banner) + full-bleed centered Content + an overlay host. `__bp` drives the breakpoint deterministically
// (jsdom has no layout engine). We assert the frame regions/landmarks (EC-7/8/9), the serif wordmark, the System/Modules
// panel toggles + their pressed state wiring, the injection slots (#15/#16/#17), and the reserved-strip reflow.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
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

  it('renders a FLOATING panel as a modal drawer (S4) + widens the toggle disclosure', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'float', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    // The drawer mounts (role=dialog, data-mode=float) in the float layer.
    const drawer = container.querySelector('[data-panel="modules"][data-mode="float"]')
    expect(drawer).not.toBeNull()
    expect(screen.getByRole('dialog', { name: 'Modules' })).not.toBeNull()
    expect(container.querySelector('[data-region="floatLayer"]')).not.toBeNull()
    // The disclosure widened to BOTH modes (S4): open ⇒ expanded + controls, regardless of mode.
    const modules = screen.getByRole('button', { name: 'Modules' })
    expect(modules.getAttribute('aria-expanded')).toBe('true')
    expect(modules.getAttribute('aria-controls')).toBe('shell-panel-modules')
  })

  it('inerts the content/docked wrapper while a float drawer is open (G1 modal background)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, system: { mode: 'float', edge: 'right', open: true } },
    })
    const { container } = await renderShell('desktop')
    // The content region sits inside the inert wrapper; the top strip (banner) is OUTSIDE it (stays live for re-toggle).
    const content = container.querySelector('[data-region="content"]')
    const inertWrapper = content?.closest('[inert]')
    expect(inertWrapper).not.toBeNull()
    expect(screen.getByRole('banner').closest('[inert]')).toBeNull() // top strip NOT inert
  })

  it('a docked panel is NOT inert (no float open)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'dock', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    expect(container.querySelector('[inert]')).toBeNull()
  })

  it('takes the bar toggles out of the tab order while a float is open (complete trap) + signals aria-haspopup', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'float', edge: 'left', open: true } },
    })
    await renderShell('desktop')
    const modules = screen.getByRole('button', { name: 'Modules' })
    const system = screen.getByRole('button', { name: 'System' })
    // Both toggles leave the keyboard tab order (the drawer trap is complete); still pointer-clickable.
    expect(modules.getAttribute('tabindex')).toBe('-1')
    expect(system.getAttribute('tabindex')).toBe('-1')
    // The floating panel's toggle announces the modal popup.
    expect(modules.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('returns focus to the bar toggle when the float drawer is dismissed (EC-6)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, modules: { mode: 'float', edge: 'left', open: true } },
    })
    const { container } = await renderShell('desktop')
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Modules' }), { key: 'Escape' })
    expect(container.querySelector('[data-panel="modules"]')).toBeNull() // closed
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Modules' }))
  })
})

describe('AppShell — dock-together + persist seam (S5)', () => {
  it('docks two panels at the SAME edge together as ONE cluster, content beside (EC-4)', async () => {
    useAppShellUIStore.setState({
      placement: {
        system: { mode: 'dock', edge: 'left', open: true },
        modules: { mode: 'dock', edge: 'left', open: true },
      },
    })
    const { container } = await renderShell('desktop')
    const clusters = container.querySelectorAll('[data-dock-edge="left"]')
    expect(clusters.length).toBe(1) // one shared-edge cluster, not two independent strips
    const cluster = clusters[0]!
    expect(cluster.querySelector('[data-panel="system"]')).not.toBeNull()
    expect(cluster.querySelector('[data-panel="modules"]')).not.toBeNull()
    expect(screen.getByTestId('outlet')).not.toBeNull() // Content still beside
  })

  it('keeps panels at DIFFERENT edges in separate clusters', async () => {
    useAppShellUIStore.setState({
      placement: {
        system: { mode: 'dock', edge: 'left', open: true },
        modules: { mode: 'dock', edge: 'top', open: true },
      },
    })
    const { container } = await renderShell('desktop')
    expect(container.querySelector('[data-dock-edge="left"]')).not.toBeNull()
    expect(container.querySelector('[data-dock-edge="top"]')).not.toBeNull()
  })

  it('hydrates placement from shellPrefs on COLD boot (persist-read seam wired)', async () => {
    const prefs = vi.fn(() =>
      Promise.resolve({ ...DEFAULT_PLACEMENT, modules: { mode: 'dock' as const, edge: 'left' as const, open: true } }),
    )
    await renderInShell(
      <AppShell __bp="desktop" shellPrefs={prefs}>
        <div data-testid="outlet">content</div>
      </AppShell>,
    )
    await waitFor(() => expect(useAppShellUIStore.getState().placement.modules.open).toBe(true))
    expect(prefs).toHaveBeenCalledTimes(1)
  })

  it('does NOT clobber an already-set arrangement — the cold-boot guard skips the read (B1)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, system: { mode: 'dock', edge: 'right', open: true } },
    })
    const prefs = vi.fn(() => Promise.resolve(DEFAULT_PLACEMENT)) // would reset system if it ran
    await renderInShell(
      <AppShell __bp="desktop" shellPrefs={prefs}>
        <div data-testid="outlet">content</div>
      </AppShell>,
    )
    expect(prefs).not.toHaveBeenCalled() // guard saw a non-default arrangement → skipped the read
    expect(useAppShellUIStore.getState().placement.system.open).toBe(true) // not clobbered
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
