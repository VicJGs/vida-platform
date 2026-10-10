// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { CanvasReader, type ReaderChapter } from './canvas-reader'

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
