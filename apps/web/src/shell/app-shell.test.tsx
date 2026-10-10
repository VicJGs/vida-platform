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

  it('a panel toggle flips its pressed state via the placement store (envision M1)', async () => {
    await renderShell('desktop')
    const modules = screen.getByRole('button', { name: 'Modules' })
    expect(modules.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(modules)
    expect(screen.getByRole('button', { name: 'Modules' }).getAttribute('aria-pressed')).toBe('true')
    // Independent per panel — toggling Modules leaves System closed (envision L3).
    expect(screen.getByRole('button', { name: 'System' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('reflects an externally-set placement (hydration seam — stubShellPrefs / setPlacement)', async () => {
    useAppShellUIStore.setState({
      placement: { ...DEFAULT_PLACEMENT, system: { ...DEFAULT_PLACEMENT.system, open: true } },
    })
    await renderShell('desktop')
    expect(screen.getByRole('button', { name: 'System' }).getAttribute('aria-pressed')).toBe('true')
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
