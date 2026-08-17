// @vitest-environment jsdom
// UI-4 · S1+S2 — AppShell frame tests. `__bp` drives the breakpoint deterministically (jsdom has no layout engine);
// the nav chrome (S2) renders links, so the shell mounts inside a memory router (renderInShell). We assert region
// presence/absence, reflow state, landmarks (S1) + the mobile drawer's open/closed a11y (S2).
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AppShell } from './app-shell'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { renderInShell } from './test-router'
import { type Breakpoint } from './breakpoints'

// (window.matchMedia + the WebGL globals are stubbed in ./test-setup.ts, loaded via vite.config setupFiles.)

afterEach(() => {
  cleanup()
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
})

function renderShell(bp: Breakpoint) {
  return renderInShell(
    <AppShell __bp={bp}>
      <div data-testid="outlet">content</div>
    </AppShell>,
  )
}

describe('AppShell', () => {
  it('renders the core regions + the content children', async () => {
    const { container, getByTestId } = await renderShell('desktop')
    expect(container.querySelector('[data-region="moduleDock"]')).not.toBeNull()
    expect(container.querySelector('[data-region="globalBar"]')).not.toBeNull()
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
    expect(container.querySelector('[data-region="overlayHost"]')).not.toBeNull()
    expect(getByTestId('outlet')).not.toBeNull()
  })

  it('unmounts the spaces bar on mobile, mounts it from tablet up (REGION_VISIBILITY)', async () => {
    const mobile = await renderShell('mobile')
    expect(mobile.container.querySelector('[data-region="spacesBar"]')).toBeNull()
    cleanup()
    const tablet = await renderShell('tablet')
    expect(tablet.container.querySelector('[data-region="spacesBar"]')).not.toBeNull()
  })

  it('reflows the dock drawer → rail → sidebar across breakpoints', async () => {
    const cases: Array<[Breakpoint, string]> = [
      ['mobile', 'drawer'],
      ['tablet', 'rail'],
      ['desktop', 'sidebar'],
      ['wide', 'sidebar'],
    ]
    for (const [bp, state] of cases) {
      const { container } = await renderShell(bp)
      expect(container.querySelector('[data-region="moduleDock"]')?.getAttribute('data-dock-state')).toBe(state)
      cleanup()
    }
  })

  it('uses landmark roles; overlayHost carries no landmark or label', async () => {
    const { container } = await renderShell('desktop')
    expect(container.querySelector('nav[aria-label="Modules"]')).not.toBeNull()
    expect(container.querySelector('header')).not.toBeNull()
    expect(container.querySelector('main')).not.toBeNull()
    const overlay = container.querySelector('[data-region="overlayHost"]')
    expect(overlay?.getAttribute('aria-label')).toBeNull()
    expect(overlay?.getAttribute('role')).toBeNull()
    expect(overlay?.tagName.toLowerCase()).toBe('div')
  })

  it('renders real nav content: a dock module link + the global-bar Search', async () => {
    const { getByRole } = await renderShell('desktop')
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull()
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
  })

  it('mobile drawer is aria-hidden + inert while closed, no scrim (S2-BR-f, B3)', async () => {
    const { container } = await renderShell('mobile')
    const dock = container.querySelector('[data-region="moduleDock"]') as HTMLElement
    expect(dock.getAttribute('aria-hidden')).toBe('true')
    expect(dock.inert).toBe(true)
    expect(container.querySelector('[data-region="navScrim"]')).toBeNull()
  })

  it('mobile drawer open: scrim mounts + drawer un-hidden (S2-BR-f)', async () => {
    useAppShellUIStore.setState({ isMobileNavOpen: true })
    const { container } = await renderShell('mobile')
    const dock = container.querySelector('[data-region="moduleDock"]') as HTMLElement
    expect(dock.getAttribute('aria-hidden')).toBeNull()
    expect(dock.inert).toBe(false)
    expect(container.querySelector('[data-region="navScrim"]')).not.toBeNull()
  })
})
