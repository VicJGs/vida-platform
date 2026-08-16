// @vitest-environment jsdom
// UI-4 · S1 — AppShell frame tests. The `__bp` override drives the breakpoint deterministically (jsdom has no
// layout engine), so we assert region presence/absence + reflow state + landmarks without a real viewport.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { AppShell } from './app-shell'
import { type Breakpoint } from './breakpoints'

// (window.matchMedia + the WebGL globals are stubbed in ./test-setup.ts, loaded via vite.config setupFiles.)

function renderShell(bp: Breakpoint) {
  return render(
    <UIProvider>
      <AppShell __bp={bp}>
        <div data-testid="outlet">content</div>
      </AppShell>
    </UIProvider>,
  )
}

describe('AppShell', () => {
  it('renders the core regions + the content children', () => {
    const { container, getByTestId } = renderShell('desktop')
    expect(container.querySelector('[data-region="moduleDock"]')).not.toBeNull()
    expect(container.querySelector('[data-region="globalBar"]')).not.toBeNull()
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
    expect(container.querySelector('[data-region="overlayHost"]')).not.toBeNull()
    expect(getByTestId('outlet')).not.toBeNull()
  })

  it('unmounts the spaces bar on mobile, mounts it from tablet up (REGION_VISIBILITY)', () => {
    const mobile = renderShell('mobile')
    expect(mobile.container.querySelector('[data-region="spacesBar"]')).toBeNull()
    mobile.unmount()
    const tablet = renderShell('tablet')
    expect(tablet.container.querySelector('[data-region="spacesBar"]')).not.toBeNull()
  })

  it('reflows the dock drawer → rail → sidebar across breakpoints', () => {
    const cases: Array<[Breakpoint, string]> = [
      ['mobile', 'drawer'],
      ['tablet', 'rail'],
      ['desktop', 'sidebar'],
      ['wide', 'sidebar'],
    ]
    for (const [bp, state] of cases) {
      const { container, unmount } = renderShell(bp)
      expect(container.querySelector('[data-region="moduleDock"]')?.getAttribute('data-dock-state')).toBe(state)
      unmount()
    }
  })

  it('uses landmark roles; overlayHost carries no landmark or label', () => {
    const { container } = renderShell('desktop')
    expect(container.querySelector('nav[aria-label="Modules"]')).not.toBeNull()
    expect(container.querySelector('header')).not.toBeNull()
    expect(container.querySelector('main')).not.toBeNull()
    const overlay = container.querySelector('[data-region="overlayHost"]')
    expect(overlay?.getAttribute('aria-label')).toBeNull()
    expect(overlay?.getAttribute('role')).toBeNull()
    expect(overlay?.tagName.toLowerCase()).toBe('div')
  })
})
