// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { renderNotesView } from './note-renderers'
import type { NotesRow } from './use-notes-rows'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)
const noop = (): void => {}

const ROWS: NotesRow[] = [
  { id: '1', title: 'Project kickoff', type: 'note', excerpt: 'Scope.', updated: '2h ago', date: '2026-10-10', favorite: true },
  { id: '2', title: 'Daily journal', type: 'journal', excerpt: 'Reflection.', updated: 'today', date: '2026-10-10', favorite: false },
]

describe('renderNotesView (S1, NOT-48/49)', () => {
  it('EC-1 — list layout renders note rows', () => {
    const { getByText, getAllByText } = renderUI(<>{renderNotesView('list', 'success', ROWS, noop)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
    expect(getByText('Daily journal')).not.toBeNull()
    expect(getAllByText(/Note|Journal/).length).toBeGreaterThan(0)
  })

  it('EC-1 — gallery layout renders tiles', () => {
    const { getByText } = renderUI(<>{renderNotesView('gallery', 'success', ROWS, noop)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-1 — calendar layout renders the month grid with chips', () => {
    const { getByText } = renderUI(<>{renderNotesView('calendar', 'success', ROWS, noop)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-3 — graph layout ALWAYS degrades to the empty terminal (AR-8 deferred), even with rows', () => {
    const { getByText } = renderUI(<>{renderNotesView('graph', 'success', ROWS, noop)}</>)
    expect(getByText('The graph is being prepared')).not.toBeNull()
  })

  it('EC-2 — empty state renders the teaching empty (list)', () => {
    const { getByText } = renderUI(<>{renderNotesView('list', 'empty', [], noop)}</>)
    expect(getByText(/Nothing here yet|No notes/i)).not.toBeNull()
  })

  it('BR-NEU-1 — clicking a row calls onOpen(id) (list + gallery)', () => {
    const onList = vi.fn()
    const { getByRole, unmount } = renderUI(<>{renderNotesView('list', 'success', ROWS, onList)}</>)
    fireEvent.click(getByRole('button', { name: 'Project kickoff' }))
    expect(onList).toHaveBeenCalledWith('1')
    unmount()
    const onTile = vi.fn()
    const { getByRole: getByRole2 } = renderUI(<>{renderNotesView('gallery', 'success', ROWS, onTile)}</>)
    fireEvent.click(getByRole2('button', { name: 'Daily journal' }))
    expect(onTile).toHaveBeenCalledWith('2')
  })
})
