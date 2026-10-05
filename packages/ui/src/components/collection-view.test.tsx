// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { CollectionView, type ViewLayout } from './collection-view'
import { type ViewState } from '../internal/data-view'

// Tamagui useMedia reads window.matchMedia; jsdom ships none. Mock it so the breakpoint is deterministic:
// `tabletUp=true` → min-width:768 matches → the toolbar renders; `false` → mobile base → the condensed Menu.
function mockMatchMedia(tabletUp: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: tabletUp && /min-width:\s*768px/.test(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(cleanup)
beforeEach(() => mockMatchMedia(true)) // default = desktop/tablet → toolbar

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

const ALL: readonly ViewLayout[] = ['list', 'table', 'board', 'gallery', 'calendar', 'graph', 'timeline']
// a renderView spy that records (layout,state) and emits a marker
function spyRenderView() {
  const calls: Array<{ layout: ViewLayout; state: ViewState }> = []
  const fn = (layout: ViewLayout, state: ViewState) => {
    calls.push({ layout, state })
    return <div data-renderview data-layout={layout} data-state={state} />
  }
  return { fn, calls }
}

describe('CollectionView — shell', () => {
  it('renders a named region, the title, and an honest count in success', () => {
    const { fn } = spyRenderView()
    const { getByRole, getByText } = renderUI(
      <CollectionView title="Tasks" count={6} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="success" />,
    )
    const region = getByRole('region')
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-labelledby')).not.toBeNull() // named by the visible title
    expect(getByText('Tasks')).not.toBeNull()
    expect(getByText('6 items')).not.toBeNull()
  })

  it("renders '—' for the count when not success (honest — no fake number)", () => {
    const { fn } = spyRenderView()
    const { getByText } = renderUI(
      <CollectionView title="Tasks" count={6} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="loading" />,
    )
    expect(getByText('—')).not.toBeNull()
  })

  it('renders the switcher as a role="toolbar" of one labeled button per available layout (tablet+)', () => {
    const { fn } = spyRenderView()
    const { getByRole, getAllByRole } = renderUI(
      <CollectionView title="Tasks" count={0} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="success" />,
    )
    expect(getByRole('toolbar', { name: 'View mode' })).not.toBeNull()
    // 7 switcher buttons (the chrome has no other buttons in S1)
    const pressed = getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') != null)
    expect(pressed).toHaveLength(7)
  })

  it('marks exactly the active layout aria-pressed', () => {
    const { fn } = spyRenderView()
    const { getByRole } = renderUI(
      <CollectionView title="Tasks" count={0} layout="board" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="success" />,
    )
    expect(getByRole('button', { name: 'Board', pressed: true })).not.toBeNull()
    expect(getByRole('button', { name: 'List', pressed: false })).not.toBeNull()
  })

  it('fires onLayoutChange (a view-config change) when a switcher button is pressed', () => {
    const { fn } = spyRenderView()
    const onLayoutChange = vi.fn()
    const { getByRole } = renderUI(
      <CollectionView title="Tasks" count={0} layout="list" layouts={ALL} onLayoutChange={onLayoutChange} renderView={fn} state="success" />,
    )
    fireEvent.click(getByRole('button', { name: 'Table' }))
    expect(onLayoutChange).toHaveBeenCalledWith('table')
  })

  it('dispatches to renderView(layout, state) for success/loading/error', () => {
    for (const state of ['success', 'loading', 'error'] as const) {
      const { fn, calls } = spyRenderView()
      renderUI(
        <CollectionView title="Tasks" count={3} layout="gallery" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state={state} />,
      )
      expect(calls).toContainEqual({ layout: 'gallery', state })
      cleanup()
    }
  })
})

describe('CollectionView — empty ownership (the resolved contract point)', () => {
  it('renders the teaching-invitation EmptyState for a non-designed-empty layout (list), NOT renderView', () => {
    const { fn, calls } = spyRenderView()
    const { getByRole } = renderUI(
      <CollectionView title="Tasks" count={0} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="empty" />,
    )
    // EmptyState is a role="group" named by its title heading
    expect(getByRole('heading', { name: 'Nothing here yet' })).not.toBeNull()
    // renderView was NOT invoked for the empty list (the shell owns the collection-level empty)
    expect(calls.find((c) => c.state === 'empty')).toBeUndefined()
  })

  it('delegates empty to renderView for a DESIGNED_EMPTY layout (calendar keeps its grid)', () => {
    const { fn, calls } = spyRenderView()
    renderUI(
      <CollectionView title="Tasks" count={0} layout="calendar" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="empty" />,
    )
    expect(calls).toContainEqual({ layout: 'calendar', state: 'empty' })
  })

  it('uses a consumer-supplied empty override when provided', () => {
    const { fn } = spyRenderView()
    const { getByText } = renderUI(
      <CollectionView title="Tasks" count={0} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="empty" empty={<div>custom-empty</div>} />,
    )
    expect(getByText('custom-empty')).not.toBeNull()
  })
})

describe('CollectionView — condensed switcher (<768)', () => {
  beforeEach(() => mockMatchMedia(false)) // mobile base → no toolbar

  it('condenses the switcher to a Menu button (no toolbar) at mobile width', () => {
    const { fn } = spyRenderView()
    const { queryByRole, getByRole } = renderUI(
      <CollectionView title="Tasks" count={2} layout="list" layouts={ALL} onLayoutChange={vi.fn()} renderView={fn} state="success" />,
    )
    expect(queryByRole('toolbar')).toBeNull()
    // the condensed trigger shows the current layout
    expect(getByRole('button', { name: /View: List/ })).not.toBeNull()
  })
})
