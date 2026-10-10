// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Text } from '@tamagui/core'
import { CanvasReader, SelectionActions, ReaderHighlightMark, type ReaderChapter, type AnnotationGroup } from './canvas-reader'

// First jsdom render bears the whole Tamagui compile; scope a generous timeout (the flow-session precedent).
vi.setConfig({ testTimeout: 15000 })
afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}
const body = () => <div data-body="x">READING BODY</div>

describe('CanvasReader — the Canvas: Reader shell (S1)', () => {
  // ── BR-S1-7: the region is named by the visible title ──────────────────────────────
  it('names the region via the visible title', () => {
    const { getByRole, getByText } = renderUI(<CanvasReader title="The Brothers Karamazov" />)
    expect(getByRole('region').getAttribute('aria-labelledby')).not.toBeNull()
    expect(getByText('The Brothers Karamazov')).not.toBeNull()
  })

  // ── BR-S1-4: renderContent runs ONLY on success ────────────────────────────────────
  it('calls renderContent on success', () => {
    const { getByText } = renderUI(<CanvasReader title="T" state="success" renderContent={body} aria-label="R" />)
    expect(getByText('READING BODY')).not.toBeNull()
  })
  it('does NOT call renderContent off success', () => {
    const rc = vi.fn(body)
    renderUI(<CanvasReader title="T" state="loading" renderContent={rc} aria-label="R" />)
    expect(rc).not.toHaveBeenCalled()
  })

  // ── BR-S1-5: the five states ────────────────────────────────────────────────────────
  it('loading → aria-busy skeleton', () => {
    const { container } = renderUI(<CanvasReader title="T" state="loading" aria-label="R" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
  it('empty → teaching EmptyState (heading), not a status', () => {
    const { getByText, queryByRole } = renderUI(<CanvasReader title="T" state="empty" aria-label="R" />)
    expect(getByText('Nothing to read yet')).not.toBeNull()
    expect(queryByRole('status')).toBeNull()
  })
  it('error → role=status, muted copy', () => {
    const { getByRole, getByText } = renderUI(<CanvasReader title="T" state="error" aria-label="R" />)
    expect(getByRole('status')).not.toBeNull()
    expect(getByText(/Couldn’t open this book/)).not.toBeNull()
  })
  // access-unavailable is DISTINCT from empty (IR-NEEDS-4): a status line, NOT the EmptyState heading.
  it('unavailable ≠ empty — a distinct access status', () => {
    const { getByRole, getByText, queryByText } = renderUI(<CanvasReader title="T" state="unavailable" aria-label="R" />)
    expect(getByRole('status')).not.toBeNull()
    expect(getByText(/physical copy/)).not.toBeNull()
    expect(queryByText('Nothing to read yet')).toBeNull()
  })

  // ── BR-S1-1: the progress bar renders ONLY when progress is provided ────────────────
  it('renders a progress bar only when progress is given', () => {
    const { queryByRole, rerender } = renderUI(<CanvasReader title="T" aria-label="R" />)
    expect(queryByRole('progressbar')).toBeNull()
    rerender(<UIProvider><CanvasReader title="T" progress={0.4} aria-label="R" /></UIProvider>)
    expect(queryByRole('progressbar')).not.toBeNull()
  })

  // ── BR-S1-2: the not-synced position line renders when provided ──────────────────────
  it('renders the not-synced position note when provided', () => {
    const { getByText } = renderUI(<CanvasReader title="T" positionNote="Not synced yet" aria-label="R" />)
    expect(getByText('Not synced yet')).not.toBeNull()
  })
})

const CHAPTERS: ReaderChapter[] = [
  { id: 'c1', number: 1, title: 'Alpha', pageRef: 'p. 1', done: true },
  { id: 'c2', number: 2, title: 'Beta', pageRef: 'p. 20', current: true },
  { id: 'c3', number: 3, title: 'Gamma', pageRef: 'p. 40' },
]

describe('CanvasReader — Contents panel (S2)', () => {
  // ── BR-S2-1/2: the panel renders the summary + the TOC ──────────────────────────────
  it('renders the About summary + every chapter', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" summary="A short synopsis." chapters={CHAPTERS} />)
    expect(getByText('A short synopsis.')).not.toBeNull()
    expect(getByText('2. Beta')).not.toBeNull()
    expect(getByText('3. Gamma')).not.toBeNull()
  })

  // ── BR-S2-1: the current chapter carries aria-current ───────────────────────────────
  it('marks the current chapter with aria-current', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" chapters={CHAPTERS} />)
    const row = getByText('2. Beta').closest('[aria-current="true"]')
    expect(row).not.toBeNull()
  })

  // ── BR-S2-3: rows are pressable ONLY when onJumpToChapter is given ───────────────────
  it('emits onJumpToChapter when a row is pressed', () => {
    const onJump = vi.fn()
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" chapters={CHAPTERS} onJumpToChapter={onJump} />)
    const btn = getByText('3. Gamma').closest('[role="button"]') as HTMLElement
    expect(btn).not.toBeNull()
    fireEvent.click(btn)
    expect(onJump).toHaveBeenCalledWith('c3')
  })
  it('rows are NOT buttons without onJumpToChapter', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" chapters={CHAPTERS} />)
    expect(getByText('3. Gamma').closest('[role="button"]')).toBeNull()
  })

  // ── BR-S2-4: the toggle renders only with a handler; contentsOpen hides the panel ────
  it('renders the Contents toggle only when onToggleContents is given + fires it', () => {
    const onToggle = vi.fn()
    const { getByRole, queryByRole, rerender } = renderUI(<CanvasReader title="T" aria-label="R" chapters={CHAPTERS} />)
    expect(queryByRole('button', { name: 'Contents' })).toBeNull()
    rerender(<UIProvider><CanvasReader title="T" aria-label="R" chapters={CHAPTERS} onToggleContents={onToggle} /></UIProvider>)
    const toggle = getByRole('button', { name: 'Contents' })
    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalled()
  })
  it('hides the panel when contentsOpen is false', () => {
    const { queryByText } = renderUI(<CanvasReader title="T" aria-label="R" summary="S" chapters={CHAPTERS} contentsOpen={false} />)
    expect(queryByText('2. Beta')).toBeNull()
  })

  // panel absent when there is no content
  it('renders no Contents region without summary/chapters', () => {
    const { queryByRole } = renderUI(<CanvasReader title="T" aria-label="R" />)
    const regions = queryByRole('region', { name: 'Contents' })
    expect(regions).toBeNull()
  })
})

const ANNOS: AnnotationGroup[] = [
  {
    id: 'c1', title: 'Chapter One',
    annotations: [
      { id: 'h1', nature: 'highlight', text: 'Highlighted span', location: 'Ch. 1 · p. 3' },
      { id: 'b1', nature: 'bookmark', text: 'Bookmark here', location: 'Ch. 1 · p. 5' },
    ],
  },
  { id: 'c2', title: 'Chapter Two', annotations: [{ id: 'q1', nature: 'quote', text: 'A quote', location: 'Ch. 2 · p. 12' }] },
]

describe('CanvasReader — margin rail (S3)', () => {
  // ── BR-S3-1/10: chapter groups render as labeled role=list; the three nature labels show ──
  it('renders chapter groups (role=list) with the three nature labels', () => {
    const { getAllByRole, getByText } = renderUI(<CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} />)
    expect(getAllByRole('list').length).toBe(2) // one role=list per chapter group (no Contents panel here)
    expect(getByText('Highlight')).not.toBeNull()
    expect(getByText('Bookmark')).not.toBeNull()
    expect(getByText('Quote')).not.toBeNull()
  })

  // ── BR-S3-2 (IR-1, EC-5): a highlight is NEVER linkable, even with the handlers passed ──
  it('IR-1: a highlight shows NO Add-note/Link; a bookmark & a quote show both', () => {
    const { getByText } = renderUI(
      <CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} onAddNote={() => {}} onLinkAnnotation={() => {}} />,
    )
    const hiRow = getByText('Highlighted span').closest('[role="listitem"]') as HTMLElement
    expect(within(hiRow).queryByRole('button', { name: 'Add note' })).toBeNull()
    expect(within(hiRow).queryByRole('button', { name: 'Link' })).toBeNull()
    const bmRow = getByText('Bookmark here').closest('[role="listitem"]') as HTMLElement
    expect(within(bmRow).queryByRole('button', { name: 'Add note' })).not.toBeNull()
    expect(within(bmRow).queryByRole('button', { name: 'Link' })).not.toBeNull()
  })

  // ── BR-S3-9: the affordances emit the annotation id ──
  it('emits onAddNote / onLinkAnnotation with the annotation id', () => {
    const onAddNote = vi.fn()
    const onLink = vi.fn()
    const { getByText } = renderUI(
      <CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} onAddNote={onAddNote} onLinkAnnotation={onLink} />,
    )
    const bmRow = getByText('Bookmark here').closest('[role="listitem"]') as HTMLElement
    fireEvent.click(within(bmRow).getByRole('button', { name: 'Add note' }))
    expect(onAddNote).toHaveBeenCalledWith('b1')
    fireEvent.click(within(bmRow).getByRole('button', { name: 'Link' }))
    expect(onLink).toHaveBeenCalledWith('b1')
  })

  // ── BR-S3-5: the total count line ──
  it('shows the total annotation count', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} />)
    expect(getByText('3 annotations')).not.toBeNull()
  })

  // ── BR-S3-6: the rail terminal states ──
  it('rail loading → aria-busy within the Annotations region', () => {
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" annotationsState="loading" railOpen />)
    const rail = getByRole('region', { name: 'Annotations' })
    expect(rail.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
  it('rail empty → teaching EmptyState', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" annotationsState="empty" railOpen />)
    expect(getByText('No annotations yet')).not.toBeNull()
  })
  it('rail error → role=status', () => {
    const { getByText } = renderUI(<CanvasReader title="T" aria-label="R" annotationsState="error" railOpen />)
    expect(getByText(/Couldn’t load annotations/)).not.toBeNull()
  })

  // ── BR-S3-7: the toggle renders only with a handler; railOpen hides the rail; aria-pressed reflects state ──
  it('renders the Annotations toggle only with a handler + fires it (aria-pressed)', () => {
    const onToggle = vi.fn()
    const { getByRole, queryByRole, rerender } = renderUI(<CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} />)
    expect(queryByRole('button', { name: 'Annotations' })).toBeNull()
    rerender(
      <UIProvider>
        <CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} onToggleRail={onToggle} />
      </UIProvider>,
    )
    const toggle = getByRole('button', { name: 'Annotations' })
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalled()
  })
  it('hides the rail when railOpen is false', () => {
    const { queryByText } = renderUI(<CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} railOpen={false} />)
    expect(queryByText('Bookmark here')).toBeNull()
  })

  // ── BR-S3-10: the rail is a named region ──
  it('names the rail region Annotations', () => {
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" annotationGroups={ANNOS} />)
    expect(getByRole('region', { name: 'Annotations' })).not.toBeNull()
  })
})

describe('CanvasReader — selection affordance (S4)', () => {
  // ── BR-S4-1: the birth action set — a named toolbar of the 4 actions ──
  it('renders the 4 actions (toolbar) when every handler is passed', () => {
    const { getByRole } = renderUI(
      <SelectionActions onHighlight={() => {}} onQuote={() => {}} onBookmark={() => {}} onListenFrom={() => {}} />,
    )
    expect(getByRole('toolbar', { name: 'Turn selection into' })).not.toBeNull()
    for (const name of ['Highlight', 'Quote', 'Bookmark', 'Listen from here'])
      expect(getByRole('button', { name })).not.toBeNull()
  })

  // ── BR-S4-1: each action emits its intent ──
  it('emits each selection intent on press', () => {
    const h = vi.fn(), q = vi.fn(), b = vi.fn(), l = vi.fn()
    const { getByRole } = renderUI(<SelectionActions onHighlight={h} onQuote={q} onBookmark={b} onListenFrom={l} />)
    fireEvent.click(getByRole('button', { name: 'Highlight' })); expect(h).toHaveBeenCalled()
    fireEvent.click(getByRole('button', { name: 'Quote' })); expect(q).toHaveBeenCalled()
    fireEvent.click(getByRole('button', { name: 'Bookmark' })); expect(b).toHaveBeenCalled()
    fireEvent.click(getByRole('button', { name: 'Listen from here' })); expect(l).toHaveBeenCalled()
  })

  // ── BR-S4-1: render-when-handler — an action is absent without its handler ──
  it('omits an action when its handler is not passed', () => {
    const { queryByRole } = renderUI(<SelectionActions onHighlight={() => {}} />)
    expect(queryByRole('button', { name: 'Highlight' })).not.toBeNull()
    expect(queryByRole('button', { name: 'Quote' })).toBeNull()
    expect(queryByRole('button', { name: 'Bookmark' })).toBeNull()
    expect(queryByRole('button', { name: 'Listen from here' })).toBeNull()
  })

  // ── BR-S4-3 (IR-7): Listen-from-here degrades to omitted when TTS is unavailable ──
  it('omits Listen-from-here when listenAvailable is false', () => {
    const { queryByRole } = renderUI(<SelectionActions onListenFrom={() => {}} listenAvailable={false} />)
    expect(queryByRole('button', { name: 'Listen from here' })).toBeNull()
  })

  // ── BR-S4-2 (EC-15): real inline SVG icons, never emoji ──
  it('uses inline SVG icons with no emoji text', () => {
    const { getByRole } = renderUI(<SelectionActions onHighlight={() => {}} />)
    const btn = getByRole('button', { name: 'Highlight' })
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(btn.textContent?.trim()).toBe('') // name is from aria-label, not emoji/text content
  })

  // ── BR-S4-1: with no handlers the toolbar renders empty + valid (consumer controls which actions exist) ──
  it('renders an empty named toolbar when no handlers are passed', () => {
    const { getByRole, queryByRole } = renderUI(<SelectionActions />)
    expect(getByRole('toolbar', { name: 'Turn selection into' })).not.toBeNull()
    expect(queryByRole('button')).toBeNull()
  })

  // ── BR-S4-4 (EC-3): the inline mark wraps its children + carries the mark class ──
  it('ReaderHighlightMark renders children with the mark class', () => {
    const { getByText } = renderUI(
      <Text>
        <ReaderHighlightMark>marked words</ReaderHighlightMark>
      </Text>,
    )
    expect(getByText('marked words').className).toContain('vida-reader-highlight')
  })
})

describe('CanvasReader — listen bar (S5)', () => {
  // ── BR-S5-1: the bar renders ONLY when `listen` is provided ──
  it('renders no listen bar when `listen` is absent', () => {
    const { queryByRole } = renderUI(<CanvasReader title="T" aria-label="R" renderContent={body} />)
    expect(queryByRole('group', { name: 'Listen' })).toBeNull()
  })

  it('renders the named listen bar when `listen` is provided', () => {
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="idle" onListenToggle={() => {}} />)
    expect(getByRole('group', { name: 'Listen' })).not.toBeNull()
  })

  // ── BR-S5-2 (EC-7): idle shows a Listen toggle that emits onListenToggle ──
  it('idle shows a Listen toggle that emits onListenToggle', () => {
    const toggle = vi.fn()
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="idle" onListenToggle={toggle} />)
    const btn = getByRole('button', { name: 'Listen' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  // ── BR-S5-2 (EC-7): playing shows a Pause toggle + a progressbar when listenProgress is given ──
  it('playing shows a Pause toggle (aria-pressed) and a progressbar', () => {
    const { getByRole } = renderUI(
      <CanvasReader title="T" aria-label="R" listen="playing" listenProgress={0.42} onListenToggle={() => {}} />,
    )
    expect(getByRole('button', { name: 'Pause' }).getAttribute('aria-pressed')).toBe('true')
    expect(getByRole('progressbar')).not.toBeNull()
  })

  it('playing omits the progressbar when listenProgress is absent (honest, no fake fill)', () => {
    const { queryByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="playing" onListenToggle={() => {}} />)
    expect(queryByRole('progressbar')).toBeNull()
  })

  // ── BR-S5-2 (IR-7): unavailable is a CALM status line, with NO control ──
  it('unavailable shows a calm status line and no toggle', () => {
    const { getByRole, queryByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="unavailable" />)
    expect(getByRole('status').textContent).toContain('isn’t available')
    expect(queryByRole('button', { name: 'Listen' })).toBeNull()
    expect(queryByRole('button', { name: 'Pause' })).toBeNull()
  })

  // ── nit 1: the status line renders independent of handler presence ──
  it('unavailable shows the calm line even without onListenToggle', () => {
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="unavailable" />)
    expect(getByRole('group', { name: 'Listen' })).not.toBeNull()
    expect(getByRole('status')).not.toBeNull()
  })

  // ── BR-S5-4: the toggle is absent when onListenToggle is omitted (render-when-handler) ──
  it('omits the toggle when onListenToggle is not passed', () => {
    const { queryByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="idle" />)
    expect(queryByRole('button', { name: 'Listen' })).toBeNull()
  })

  // ── BR-S5-3 (EC-15): real inline SVG icon, never emoji ──
  it('uses an inline SVG icon with no emoji text on the toggle', () => {
    const { getByRole } = renderUI(<CanvasReader title="T" aria-label="R" listen="idle" onListenToggle={() => {}} />)
    const btn = getByRole('button', { name: 'Listen' })
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(btn.textContent?.trim()).toBe('')
  })
})
