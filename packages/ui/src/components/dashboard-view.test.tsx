// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { DashboardView, type DashboardBlock } from './dashboard-view'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// a renderBlock spy that records which blocks it is asked to render (should be SUCCESS only — shell owns the rest)
function spyRenderBlock() {
  const calls: string[] = []
  const fn = (b: DashboardBlock) => {
    calls.push(b.id)
    return <div data-body={b.id} />
  }
  return { fn, calls }
}

const B = (over: Partial<DashboardBlock> & Pick<DashboardBlock, 'id'>): DashboardBlock => ({
  title: over.title ?? over.id,
  size: over.size ?? 'md',
  state: over.state ?? 'success',
  ...over,
})

describe('DashboardView — shell', () => {
  it('renders a named region, the title, and a grid cell per block', () => {
    const { fn } = spyRenderBlock()
    const { getByRole, getByText, container } = renderUI(
      <DashboardView title="Home" blocks={[B({ id: 'a' }), B({ id: 'b', size: 'sm' })]} renderBlock={fn} />,
    )
    const region = getByRole('region')
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-labelledby')).not.toBeNull() // named by the visible title
    expect(getByText('Home')).not.toBeNull()
    expect(container.querySelectorAll('.vida-dash-cell').length).toBe(2)
  })

  it('tags each cell with its span size (EC-1/EC-6 measurement hook)', () => {
    const { fn } = spyRenderBlock()
    const { container } = renderUI(
      <DashboardView
        title="Home"
        blocks={[B({ id: 'a', size: 'full' }), B({ id: 'b', size: 'sm' }), B({ id: 'c', size: 'lg' })]}
        renderBlock={fn}
      />,
    )
    const sizes = [...container.querySelectorAll('.vida-dash-cell')].map((c) => c.getAttribute('data-size'))
    expect(sizes).toEqual(['full', 'sm', 'lg'])
  })

  it('calls renderBlock ONLY for success blocks — the shell owns loading/empty/error (EC-3)', () => {
    const { fn, calls } = spyRenderBlock()
    renderUI(
      <DashboardView
        title="Home"
        blocks={[
          B({ id: 'ok', state: 'success' }),
          B({ id: 'load', state: 'loading' }),
          B({ id: 'empty', state: 'empty' }),
          B({ id: 'err', state: 'error' }),
        ]}
        renderBlock={fn}
      />,
    )
    expect(calls).toEqual(['ok'])
  })

  it('renders a skeleton (aria-busy) for a loading block', () => {
    const { fn } = spyRenderBlock()
    const { container } = renderUI(
      <DashboardView title="Home" blocks={[B({ id: 'load', state: 'loading' })]} renderBlock={fn} />,
    )
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('renders a role=status for an error block (calm, not assertive)', () => {
    const { fn } = spyRenderBlock()
    const { getByRole } = renderUI(
      <DashboardView title="Home" blocks={[B({ id: 'err', state: 'error' })]} renderBlock={fn} />,
    )
    expect(getByRole('status')).not.toBeNull()
  })

  it('honors per-block overrides (blockLoading/blockEmpty/blockError)', () => {
    const { fn } = spyRenderBlock()
    const { getByText } = renderUI(
      <DashboardView
        title="Home"
        blocks={[
          B({ id: 'load', state: 'loading' }),
          B({ id: 'empty', state: 'empty' }),
          B({ id: 'err', state: 'error' }),
        ]}
        renderBlock={fn}
        blockLoading={() => <div>custom-skeleton</div>}
        blockEmpty={() => <div>custom-empty</div>}
        blockError={() => <div>custom-error</div>}
      />,
    )
    expect(getByText('custom-skeleton')).not.toBeNull()
    expect(getByText('custom-empty')).not.toBeNull()
    expect(getByText('custom-error')).not.toBeNull()
  })

  it('renders the block title + the ⋯ action slot in the cell header (EC-2)', () => {
    const { fn } = spyRenderBlock()
    const { getByText, getByLabelText } = renderUI(
      <DashboardView
        title="Home"
        blocks={[B({ id: 'a', title: 'Stats glance', action: <button aria-label="Block actions">⋯</button> })]}
        renderBlock={fn}
      />,
    )
    expect(getByText('Stats glance')).not.toBeNull()
    expect(getByLabelText('Block actions')).not.toBeNull()
  })

  it('shows a teaching empty-dashboard state (not a blank) when there are no blocks (EC-5)', () => {
    const { fn, calls } = spyRenderBlock()
    const { getByText } = renderUI(
      <DashboardView title="Projects" blocks={[]} renderBlock={fn} emptyAction={<button>Add a block</button>} />,
    )
    expect(getByText('Your dashboard is empty')).not.toBeNull()
    expect(getByText('Add a block')).not.toBeNull()
    expect(calls).toEqual([]) // renderBlock never called with no blocks
  })

  it('accepts an explicit aria-label (no visible-title labelledby then)', () => {
    const { fn } = spyRenderBlock()
    const { getByRole } = renderUI(
      <DashboardView title="Home" aria-label="My dashboard" blocks={[B({ id: 'a' })]} renderBlock={fn} />,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toBe('My dashboard')
    expect(region.getAttribute('aria-labelledby')).toBeNull() // explicit name wins — no visible-title labelledby
  })
})
