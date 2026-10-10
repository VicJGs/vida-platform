// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { CanvasReader } from './canvas-reader'

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
