// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { renderNotesView } from './note-renderers'
import type { NotesRow } from './use-notes-rows'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) =>
  render(
    <UIProvider>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </UIProvider>,
  )
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
    fireEvent.click(getByRole('button', { name: /^Project kickoff,/ }))
    expect(onList).toHaveBeenCalledWith('1')
    unmount()
    const onTile = vi.fn()
    const { getByRole: getByRole2 } = renderUI(<>{renderNotesView('gallery', 'success', ROWS, onTile)}</>)
    fireEvent.click(getByRole2('button', { name: /^Daily journal,/ }))
    expect(onTile).toHaveBeenCalledWith('2')
  })

  it('B-60 — cards use the shared note-chrome type labels', () => {
    const rows: NotesRow[] = [{ id: '9', title: 'Plan', type: 'task_note', excerpt: '', updated: '1h ago', date: '2026-10-10', favorite: false }]
    const { getByText, queryByText } = renderUI(<>{renderNotesView('list', 'success', rows, noop)}</>)
    expect(getByText('Task · 1h ago')).not.toBeNull()
    expect(queryByText(/Task note ·/)).toBeNull()
  })

  it('B-63 — a card is named by title, type, edited time and favorite', () => {
    const { getByRole } = renderUI(<>{renderNotesView('list', 'success', ROWS, noop)}</>)
    expect(getByRole('button', { name: 'Project kickoff, Note, edited 2h ago, favorite' })).not.toBeNull()
    expect(getByRole('button', { name: 'Daily journal, Journal, edited today' })).not.toBeNull()
  })

  it('B-63 — an untitled card drops the doubled type segment', () => {
    const rows: NotesRow[] = [
      { id: '7', title: 'Task note', labelFromType: true, type: 'task_note', excerpt: '', updated: 'now', date: '2026-10-10', favorite: false },
    ]
    const { getByRole } = renderUI(<>{renderNotesView('gallery', 'success', rows, noop)}</>)
    expect(getByRole('button', { name: 'Task note, edited now' })).not.toBeNull()
  })

  it('E-4 / B-38 — rows and tiles show the chosen icon; a tile shows its cover image', () => {
    const rows: NotesRow[] = [
      { id: '8', title: 'Iconed', type: 'note', excerpt: '', updated: 'now', date: '2026-10-10', favorite: false, icon: 'book-open', cover: 'https://e.com/c.png' },
    ]
    const list = renderUI(<>{renderNotesView('list', 'success', rows, noop)}</>)
    expect(list.container.querySelector('svg.lucide-book-open')).not.toBeNull()
    list.unmount()
    // A tile with a cover shows the cover in its media area (PLAN G10 — "when set, else the type icon").
    const gallery = renderUI(<>{renderNotesView('gallery', 'success', rows, noop)}</>)
    expect(gallery.container.querySelector('img')?.getAttribute('src')).toBe('https://e.com/c.png')
    gallery.unmount()
    const noCover = renderUI(<>{renderNotesView('gallery', 'success', [{ ...rows[0]!, cover: null }], noop)}</>)
    expect(noCover.container.querySelector('svg.lucide-book-open')).not.toBeNull()
  })
})

