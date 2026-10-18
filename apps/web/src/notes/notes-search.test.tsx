// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { SearchOutcome, SearchProvider } from '../command-bar/types'
import { NotesSearchView } from './notes-search'
import { useNotesSearch } from './use-notes-search'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('NotesSearchView (S7) — state-as-prop', () => {
  const view = (outcome: SearchOutcome, query = '') =>
    renderUI(<NotesSearchView query={query} onQueryChange={() => {}} outcome={outcome} />)

  it('renders a named role=search region with the search box (EC-12)', () => {
    const { getByRole } = view({ status: 'idle' })
    expect(getByRole('search', { name: 'Search notes' })).not.toBeNull()
    // the Input carries its own accessible name (no unlabeled-input warn)
    expect(getByRole('textbox', { name: 'Search notes' })).not.toBeNull()
  })

  it('EC-22 — the leading glyph is a Lucide svg', () => {
    const { container } = view({ status: 'idle' })
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('idle → the box renders with NO status overlay', () => {
    const { queryByRole } = view({ status: 'idle' })
    expect(queryByRole('status')).toBeNull()
  })

  it('search-unavailable → a calm role=status line with VOICE copy, NOT the (DB-8) dev string (B2)', () => {
    const { getByRole } = view({ status: 'search-unavailable', message: 'Search activates when the index is built (DB-8).' })
    const status = getByRole('status')
    expect(status.textContent).toMatch(/Search turns on once your notes are indexed\./)
    expect(status.textContent).not.toMatch(/DB-8/)
  })

  it('empty → "No matching notes." role=status', () => {
    const { getByRole } = view({ status: 'empty' })
    expect(getByRole('status').textContent).toMatch(/No matching notes/)
  })

  it('error → a calm role=status (not a crash)', () => {
    const { getByRole } = view({ status: 'error', message: 'boom' })
    expect(getByRole('status').textContent).toMatch(/Search failed/)
  })

  it('typing/loading → aria-busy (no fake results)', () => {
    const { container } = view({ status: 'loading' }, 'ab')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('results → a role=list of result titles (authored for the live swap)', () => {
    const { getByText, getByRole } = view({
      status: 'results',
      groups: [{ entityType: 'page', results: [{ id: 'p1', entityType: 'page', title: 'Trip notes', routePath: '/notes/p1' }] }],
    })
    expect(getByRole('list')).not.toBeNull()
    expect(getByText('Trip notes')).not.toBeNull()
  })

  it('typing in the box fires onQueryChange', () => {
    const onQueryChange = vi.fn()
    const { getByRole } = renderUI(<NotesSearchView query="" onQueryChange={onQueryChange} outcome={{ status: 'idle' }} />)
    fireEvent.change(getByRole('textbox', { name: 'Search notes' }), { target: { value: 'tax' } })
    expect(onQueryChange).toHaveBeenCalledWith('tax')
  })

  it('Esc clears the query (D-S7-9)', () => {
    const onQueryChange = vi.fn()
    const { getByRole } = renderUI(<NotesSearchView query="tax" onQueryChange={onQueryChange} outcome={{ status: 'search-unavailable' }} />)
    fireEvent.keyDown(getByRole('textbox', { name: 'Search notes' }), { key: 'Escape' })
    expect(onQueryChange).toHaveBeenCalledWith('')
  })
})

describe('useNotesSearch (S7) — data seam reusing useCommandSearch', () => {
  it('blank query → idle', () => {
    const { result } = renderHook(() => useNotesSearch())
    expect(result.current.query).toBe('')
    expect(result.current.outcome.status).toBe('idle')
  })

  it('non-blank query via the default stub → search-unavailable (race-guarded resolve)', async () => {
    const { result } = renderHook(() => useNotesSearch())
    act(() => result.current.setQuery('project'))
    await waitFor(() => expect(result.current.outcome.status).toBe('search-unavailable'))
  })

  it('an injected provider returning results flows through (zero-sig live swap)', async () => {
    const fake: SearchProvider = {
      search: async (): Promise<SearchOutcome> => ({
        status: 'results',
        groups: [{ entityType: 'page', results: [{ id: 'p1', entityType: 'page', title: 'Hit', routePath: '/notes/p1' }] }],
      }),
    }
    const { result } = renderHook(() => useNotesSearch(fake))
    act(() => result.current.setQuery('hit'))
    await waitFor(() => expect(result.current.outcome.status).toBe('results'))
    expect(result.current.outcome.groups?.[0]?.results[0]?.title).toBe('Hit')
  })
})
