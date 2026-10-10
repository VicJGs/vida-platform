// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { JournalPageRegion } from './journal-page-region'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('JournalPageRegion (S2)', () => {
  it('EC-3 — success renders prose + inline integration-block regions + the "/" affordance', () => {
    const { getByText, getAllByRole } = renderUI(<JournalPageRegion />)
    // prose
    expect(getByText(/Mornings have started to settle/)).not.toBeNull()
    // inline block regions (role=note), distinct from the page region
    const notes = getAllByRole('note')
    expect(notes.length).toBe(2)
    expect(getByText('Today so far')).not.toBeNull()
    expect(getByText('Today’s tasks')).not.toBeNull()
    // the "/" insert affordance
    expect(getByText(/Type \/ to pull in/)).not.toBeNull()
  })

  it('shell owns the page terminal states (loading/empty/error) — body renders only for success', () => {
    const { container, rerender } = renderUI(<JournalPageRegion editorState="loading" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    rerender(<UIProvider><JournalPageRegion editorState="empty" /></UIProvider>)
    expect(container.textContent).toContain('Start today’s entry')

    rerender(<UIProvider><JournalPageRegion editorState="error" /></UIProvider>)
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).toContain('Couldn’t load today’s page.')
  })

  it('names the page region for a11y', () => {
    const { getByRole } = renderUI(<JournalPageRegion aria-label="Journal entry" />)
    expect(getByRole('region', { name: 'Journal entry' })).not.toBeNull()
  })
})
