// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
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
      <EntityView title="Task" mode="tabbed" onModeChange={noop} layout={LAYOUT} editor={EDITOR} defaultFacet="layout" />,
    )
    expect(getByRole('tablist')).not.toBeNull()
    expect(getAllByRole('tab').length).toBe(2)
    expect(getByText('LAYOUT BODY')).not.toBeNull()
    expect(queryByText('EDITOR BODY')).toBeNull() // inactive panel not mounted (Tabs D5)
  })

  // ── B1: deep-link straight to the Editor facet ─────────────────────────────────────────────
  it('tabbed + defaultFacet="editor": opens on the Editor panel', () => {
    const { getByText, queryByText } = renderUI(
      <EntityView title="Task" mode="tabbed" onModeChange={noop} layout={LAYOUT} editor={EDITOR} defaultFacet="editor" />,
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
      <EntityView title="Task" mode="merged" onModeChange={noop} layout={LAYOUT} editor={EDITOR} editorState="loading" />,
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
        <EntityView title="A long entity title that wraps at 375" mode="merged" onModeChange={() => {}} layout={<div />} />
        <Text data-ref="display" fontFamily="$display" fontSize="$display" lineHeight="$display">ref</Text>
        <Text data-ref="body" fontFamily="$display" fontSize="$display" lineHeight="$body">ref</Text>
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
