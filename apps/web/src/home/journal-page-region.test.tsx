// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { NoteEntityData } from '../notes/use-note-entity'
import type { JournalEntryResult } from './use-journal-entry'

// The region calls useJournalEntry() unconditionally (Rules of Hooks). Mock it to drive the state;
// mock NoteEditorBody to a sentinel so a success render asserts "the live editor mounts" without
// pulling TipTap/ProseMirror into jsdom.
const mockEntry = vi.fn<() => Pick<JournalEntryResult, 'page' | 'state'>>()
vi.mock('./use-journal-entry', () => ({ useJournalEntry: () => ({ retry: () => {}, retrying: false, ...mockEntry() }) }))
vi.mock('../notes/note-editor-body', () => ({
  NoteEditorBody: ({ page }: { page: NoteEntityData }) => (
    <div data-testid="editor-body">editor:{page.title}</div>
  ),
}))

import { JournalPageRegion } from './journal-page-region'

afterEach(() => {
  cleanup()
  mockEntry.mockReset()
})

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)
const page: NoteEntityData = {
  id: 'j1', type: 'journal', title: '2026-10-21', content: null, contentStatus: 'absent', rawContent: null,
  favorite: false, archived: false, updated: 'now', journalDate: '2026-10-21', icon: null, cover: null,
}

describe('JournalPageRegion (home-journal-go-live S1)', () => {
  it('success mounts the live editor body for today’s journal page', () => {
    mockEntry.mockReturnValue({ page, state: 'success' })
    const { getByTestId } = renderUI(<JournalPageRegion />)
    expect(getByTestId('editor-body').textContent).toContain('2026-10-21')
  })

  it('EC-34 / BR-R1-5 — success shows ONE save chip inside the journal region; a malformed page shows none', () => {
    mockEntry.mockReturnValue({ page, state: 'success' })
    const { getByRole, getAllByText, queryByText, rerender } = renderUI(<JournalPageRegion />)
    const region = getByRole('region', { name: 'Journal entry' })
    expect(getAllByText('Saved on this device')).toHaveLength(1)
    expect(region.textContent).toContain('Saved on this device')
    mockEntry.mockReturnValue({ page: { ...page, id: 'j2', contentStatus: 'malformed' }, state: 'success' })
    rerender(<UIProvider><JournalPageRegion /></UIProvider>)
    expect(queryByText('Saved on this device')).toBeNull()
  })

  it('reflects the live loading/error frames (shell owns terminal states)', () => {
    mockEntry.mockReturnValue({ page: null, state: 'loading' })
    const { container, rerender } = renderUI(<JournalPageRegion />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockEntry.mockReturnValue({ page: null, state: 'error' })
    rerender(<UIProvider><JournalPageRegion /></UIProvider>)
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).toContain('Couldn’t load today’s page.')
  })

  it('editorState override wins over the live read (test/Visual-Gate affordance) — incl. empty (no silent blank)', () => {
    mockEntry.mockReturnValue({ page, state: 'success' }) // live says success…
    const { container } = renderUI(<JournalPageRegion editorState="empty" />) // …override forces empty
    expect(container.textContent).toContain('Start today’s entry')
    expect(container.querySelector('[data-testid="editor-body"]')).toBeNull()
  })

  it('names the page region for a11y', () => {
    mockEntry.mockReturnValue({ page, state: 'success' })
    const { getByRole } = renderUI(<JournalPageRegion aria-label="Journal entry" />)
    expect(getByRole('region', { name: 'Journal entry' })).not.toBeNull()
  })
})
