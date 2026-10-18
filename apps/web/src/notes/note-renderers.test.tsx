// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { renderNotesView } from './note-renderers'
import type { NotesRow } from './use-notes-rows'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

const ROWS: NotesRow[] = [
  { id: '1', title: 'Project kickoff', type: 'note', excerpt: 'Scope.', updated: '2h ago', date: '2026-10-10', favorite: true },
  { id: '2', title: 'Daily journal', type: 'journal', excerpt: 'Reflection.', updated: 'today', date: '2026-10-10', favorite: false },
]

describe('renderNotesView (S1, NOT-48/49)', () => {
  it('EC-1 — list layout renders note rows', () => {
    const { getByText, getAllByText } = renderUI(<>{renderNotesView('list', 'success', ROWS)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
    expect(getByText('Daily journal')).not.toBeNull()
    expect(getAllByText(/Note|Journal/).length).toBeGreaterThan(0)
  })

  it('EC-1 — gallery layout renders tiles', () => {
    const { getByText } = renderUI(<>{renderNotesView('gallery', 'success', ROWS)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-1 — calendar layout renders the month grid with chips', () => {
    const { getByText } = renderUI(<>{renderNotesView('calendar', 'success', ROWS)}</>)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-3 — graph layout ALWAYS degrades to the empty terminal (AR-8 deferred), even with rows', () => {
    const { getByText } = renderUI(<>{renderNotesView('graph', 'success', ROWS)}</>)
    expect(getByText('The graph is being prepared')).not.toBeNull()
  })

  it('EC-2 — empty state renders the teaching empty (list)', () => {
    const { getByText } = renderUI(<>{renderNotesView('list', 'empty', [])}</>)
    expect(getByText(/Nothing here yet|No notes/i)).not.toBeNull()
  })
})
