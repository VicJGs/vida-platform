// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Text } from '@tamagui/core'
import { EntityView } from './entity-view'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

const LAYOUT = <div data-body="layout">LAYOUT BODY</div>
const EDITOR = <div data-body="editor">EDITOR BODY</div>
const noop = () => {}

describe('EntityView — the Entity shell', () => {
  it('names the region via the visible title', () => {
    const { getByRole, getByText } = renderUI(
      <EntityView title="Redesign the onboarding" mode="merged" onModeChange={noop} layout={LAYOUT} />,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-labelledby')).not.toBeNull()
    expect(getByText('Redesign the onboarding')).not.toBeNull()
  })

  // ── BR-E-3: the registry gate = slot presence ──────────────────────────────────────────────
  it('page-less (no editor): renders the Layout directly — no toolbar, no tabs, no editor', () => {
    const { queryByRole, getByText, queryByText } = renderUI(
      <EntityView title="A tag" mode="tabbed" onModeChange={noop} layout={LAYOUT} />,
    )
    expect(getByText('LAYOUT BODY')).not.toBeNull()
    expect(queryByRole('toolbar')).toBeNull() // no mode toggle (nothing to toggle to)
    expect(queryByRole('tablist')).toBeNull() // tabbed is moot with one facet → rendered directly
    expect(queryByText('EDITOR BODY')).toBeNull()
  })

  // ── BR-E-1/EC-1: merged = both facets, labeled regions, divider ────────────────────────────
  it('merged + editor: both facets render as labeled regions', () => {
    const { getByRole, getByText } = renderUI(
      <EntityView title="Task" mode="merged" onModeChange={noop} layout={LAYOUT} editor={EDITOR} />,
    )
    expect(getByRole('region', { name: 'Home' })).not.toBeNull()
    expect(getByRole('region', { name: 'Content' })).not.toBeNull()
    expect(getByText('LAYOUT BODY')).not.toBeNull()
    expect(getByText('EDITOR BODY')).not.toBeNull()
  })

  // ── BR-E-4/EC-2: tabbed = Tabs, only active panel mounts ───────────────────────────────────
  it('tabbed + editor: a tablist with two tabs; only the active (layout) panel mounts', () => {
    const { getByRole, getAllByRole, getByText, queryByText } = renderUI(
      <EntityView
        title="Task"
        mode="tabbed"
        onModeChange={noop}
        layout={LAYOUT}
        editor={EDITOR}
        defaultFacet="layout"
      />,
    )
    expect(getByRole('tablist')).not.toBeNull()
    expect(getAllByRole('tab').length).toBe(2)
    expect(getByText('LAYOUT BODY')).not.toBeNull()
    expect(queryByText('EDITOR BODY')).toBeNull() // inactive panel not mounted (Tabs D5)
  })

  // ── B1: deep-link straight to the Editor facet ─────────────────────────────────────────────
  it('tabbed + defaultFacet="editor": opens on the Editor panel', () => {
    const { getByText, queryByText } = renderUI(
      <EntityView
        title="Task"
        mode="tabbed"
        onModeChange={noop}
        layout={LAYOUT}
        editor={EDITOR}
        defaultFacet="editor"
      />,
    )
    expect(getByText('EDITOR BODY')).not.toBeNull()
    expect(queryByText('LAYOUT BODY')).toBeNull()
  })

  // ── BR-E-6/EC-4: the mode toggle ───────────────────────────────────────────────────────────
  it('mode toggle: role="toolbar", aria-pressed reflects mode, press calls onModeChange', () => {
    const onModeChange = vi.fn()
    const { getByRole } = renderUI(
      <EntityView title="Task" mode="merged" onModeChange={onModeChange} layout={LAYOUT} editor={EDITOR} />,
    )
    expect(getByRole('toolbar', { name: 'Facet mode' })).not.toBeNull()
    const merged = getByRole('button', { name: 'Merged' })
    const tabbed = getByRole('button', { name: 'Tabbed' })
    expect(merged.getAttribute('aria-pressed')).toBe('true')
    expect(tabbed.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(tabbed)
    expect(onModeChange).toHaveBeenCalledWith('tabbed')
  })

  // ── BR-E-5/EC-5: shell owns the Editor terminal states ─────────────────────────────────────
  it('editorState="empty": the Content tab IS shown with a teaching empty body (distinct from page-less)', () => {
    const { getByRole, getByText } = renderUI(
      <EntityView
        title="Task"
        mode="tabbed"
        onModeChange={noop}
        layout={LAYOUT}
        editor={EDITOR}
        editorState="empty"
        defaultFacet="editor"
      />,
    )
    expect(getByRole('tablist')).not.toBeNull() // the tab exists — the page is present, just blank
    expect(getByText('This page is empty')).not.toBeNull()
  })

  it('editorState="error": a calm role="status", muted (never the raw editor)', () => {
    const { getByRole, queryByText } = renderUI(
      <EntityView title="Task" mode="merged" onModeChange={noop} layout={LAYOUT} editor={EDITOR} editorState="error" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByText('EDITOR BODY')).toBeNull() // editor rendered only for success
  })

  it('editorState="loading": an aria-busy skeleton (never the raw editor)', () => {
    const { container, queryByText } = renderUI(
      <EntityView
        title="Task"
        mode="merged"
        onModeChange={noop}
        layout={LAYOUT}
        editor={EDITOR}
        editorState="loading"
      />,
    )
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(queryByText('EDITOR BODY')).toBeNull()
  })

  it('editorState="success" (default): renders the editor body', () => {
    const { getByText } = renderUI(
      <EntityView title="Task" mode="merged" onModeChange={noop} layout={LAYOUT} editor={EDITOR} />,
    )
    expect(getByText('EDITOR BODY')).not.toBeNull()
  })

  it('DEV-R1-1 — the title pairs a display line-height with its display size (wrapped lines must not collide)', () => {
    const { container, getByText } = renderUI(
      <>
        <EntityView
          title="A long entity title that wraps at 375"
          mode="merged"
          onModeChange={() => {}}
          layout={<div />}
        />
        <Text data-ref="display" fontFamily="$display" fontSize="$display" lineHeight="$display">
          ref
        </Text>
        <Text data-ref="body" fontFamily="$display" fontSize="$display" lineHeight="$body">
          ref
        </Text>
      </>,
    )
    // jsdom resolves no CSS vars — assert the pairing STRUCTURALLY (the canvas-view precedent, packages/ui/src/CLAUDE.md):
    // the title carries the same `_lh-` atomic class as a reference `lineHeight="$display"` Text, not a `$body` one.
    const lhClass = (el: Element | null) => (el?.className.split(/\s+/) ?? []).find((c) => c.startsWith('_lh-'))
    const displayLh = lhClass(container.querySelector('[data-ref="display"]'))
    expect(displayLh).toBeDefined()
    expect(lhClass(getByText('A long entity title that wraps at 375'))).toBe(displayLh)
    expect(lhClass(container.querySelector('[data-ref="body"]'))).not.toBe(displayLh)
  })
})

describe('EntityView — the H1 + the inline rename seam (notes-rescope R3, PLAN G11 · IMPL R-5/R-6)', () => {
  const base = { mode: 'merged' as const, onModeChange: noop, layout: LAYOUT }
  const regionName = (r: ReturnType<typeof renderUI>, name: string) => r.getByRole('region', { name })

  it('the title is a level-1 heading; without onTitleCommit it holds plain text (no button)', () => {
    const r = renderUI(<EntityView {...base} title="Project kickoff" />)
    expect(r.getByRole('heading', { level: 1 }).textContent).toBe('Project kickoff')
    expect(r.queryByRole('button', { name: 'Project kickoff' })).toBeNull()
    expect(regionName(r, 'Project kickoff')).not.toBeNull()
  })

  it('with onTitleCommit the title is a button inside the heading; the region name is EXACTLY the title (hint excluded)', () => {
    const r = renderUI(<EntityView {...base} title="Project kickoff" onTitleCommit={vi.fn()} />)
    const btn = r.getByRole('button', { name: 'Project kickoff' })
    expect(r.getByRole('heading', { level: 1 }).contains(btn)).toBe(true)
    expect(btn.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(btn.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Rename the page')
    expect(regionName(r, 'Project kickoff')).not.toBeNull()
  })

  it('Enter on the title opens an input named "Page title", seeded with titleEditValue; the region keeps its name', () => {
    const r = renderUI(<EntityView {...base} title="Untitled note" titleEditValue="" onTitleCommit={vi.fn()} />)
    fireEvent.keyDown(r.getByRole('button', { name: 'Untitled note' }), { key: 'Enter' })
    const input = r.getByRole('textbox', { name: 'Page title' }) as HTMLInputElement
    expect(input.value).toBe('')
    expect(regionName(r, 'Untitled note')).not.toBeNull() // never blank while editing
  })

  it('Enter commits a changed trimmed value ONCE — a blur after it does nothing; focus returns to the title', async () => {
    const commit = vi.fn()
    const r = renderUI(<EntityView {...base} title="Old" onTitleCommit={commit} />)
    fireEvent.click(r.getByRole('button', { name: 'Old' }))
    const input = r.getByRole('textbox', { name: 'Page title' })
    fireEvent.change(input, { target: { value: '  New name  ' } })
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.blur(input)
    })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('New name')
    await act(async () => {})
    expect(document.activeElement?.textContent).toBe('Old')
  })

  it('Esc reverts — no commit, also when a blur follows; focus returns to the title', async () => {
    const commit = vi.fn()
    const r = renderUI(<EntityView {...base} title="Old" onTitleCommit={commit} />)
    fireEvent.click(r.getByRole('button', { name: 'Old' }))
    const input = r.getByRole('textbox', { name: 'Page title' })
    fireEvent.change(input, { target: { value: 'Typed' } })
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
      fireEvent.blur(input)
    })
    expect(commit).not.toHaveBeenCalled()
    await act(async () => {})
    expect(r.queryByRole('textbox', { name: 'Page title' })).toBeNull()
    expect(document.activeElement?.textContent).toBe('Old')
  })

  it('blur commits a changed value; an unchanged value commits nothing', () => {
    const commit = vi.fn()
    const r = renderUI(<EntityView {...base} title="Same" onTitleCommit={commit} />)
    fireEvent.click(r.getByRole('button', { name: 'Same' }))
    fireEvent.blur(r.getByRole('textbox', { name: 'Page title' }))
    expect(commit).not.toHaveBeenCalled()
    fireEvent.click(r.getByRole('button', { name: 'Same' }))
    const input = r.getByRole('textbox', { name: 'Page title' })
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.blur(input)
    expect(commit).toHaveBeenCalledWith('Changed')
  })

  it('an empty commit passes through (the app maps it to null)', () => {
    const commit = vi.fn()
    const r = renderUI(<EntityView {...base} title="T" onTitleCommit={commit} />)
    fireEvent.click(r.getByRole('button', { name: 'T' }))
    const input = r.getByRole('textbox', { name: 'Page title' })
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(commit).toHaveBeenCalledWith('')
  })

  it('titleRef points at the heading (the Retry focus target)', () => {
    const ref = createRef<HTMLElement>()
    const r = renderUI(<EntityView {...base} title="T" titleRef={ref} />)
    expect(ref.current).toBe(r.getByRole('heading', { level: 1 }))
    expect(ref.current?.getAttribute('tabindex')).toBe('-1')
  })
})
