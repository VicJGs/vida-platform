// @vitest-environment jsdom
// MOD-notes ② · B1 — the collection screen: terminal-state rendering (empty CTA / populated rows), the New Note
// create action, row-open navigation, and the ephemeral view-switch. The data hooks + router navigate are mocked
// (no real service/DB/worker); the Zustand view store + deriveTerminalState are exercised for real. Wrapped in
// <UIProvider> (Tamagui tokens — the onboarding.test.tsx precedent).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { PageRow } from '@vida/core'

const nav = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => nav }))

const h = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), mutate: vi.fn(), edges: vi.fn(), tags: vi.fn() }))
// B5 fold (g2-1): notes-collection imports useNotesGraphEdges from this module — the whole-module mock MUST stub it.
vi.mock('./use-notes-list', () => ({
  useNotesList: h.list,
  useCreateNoteWithTags: h.create, // B6: create-with-tags flow
  useNotesGraphEdges: h.edges,
}))
// B6 fold: the collection imports the tag hooks (filter bar + create-dialog TagPicker) — mock the whole module so
// the tests need no QueryClientProvider.
vi.mock('./use-tags', () => ({
  useTags: h.tags,
  useCreateTag: () => ({ mutate: vi.fn(), isPending: false }),
  useNoteTags: () => ({ data: [] }),
  useTagNote: () => ({ mutate: vi.fn() }),
  useUntagNote: () => ({ mutate: vi.fn() }),
}))

import { NotesCollection } from './notes-collection'
import { useNotesViewStore } from '../../stores/notes-view-store'

const page = (id: string, title: string | null): PageRow =>
  ({ id, title, created_at: 1_700_000_000_000 }) as unknown as PageRow

const renderScreen = () =>
  render(
    <UIProvider>
      <NotesCollection />
    </UIProvider>,
  )

beforeEach(() => {
  h.create.mockReturnValue({ mutate: h.mutate, isPending: false })
  h.edges.mockReturnValue({ data: undefined }) // B5 default: no edges (the 4 non-neural views never read them)
  h.tags.mockReturnValue({ data: [] }) // B6 default: no tag definitions
})
afterEach(() => {
  cleanup()
  h.list.mockReset()
  h.create.mockReset()
  h.mutate.mockReset()
  h.edges.mockReset()
  h.tags.mockReset()
  nav.mockReset()
  useNotesViewStore.setState({ view: 'list', filter: {} }) // reset the module-scope ephemeral store between tests
})

describe('NotesCollection terminal states', () => {
  it('renders the populated rows on success', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('1', 'Note A'), page('2', 'Note B')] })
    renderScreen()
    expect(screen.getByText('Note A')).toBeTruthy()
    expect(screen.getByText('Note B')).toBeTruthy()
  })

  it('renders the empty create-CTA when there are no notes (EC-5)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [] })
    renderScreen()
    expect(screen.getByRole('button', { name: /create your first note/i })).toBeTruthy()
  })

  it('renders the loading skeleton region (not empty/success) while pending', () => {
    h.list.mockReturnValue({ isPending: true, isError: false, data: undefined })
    renderScreen()
    // loading → list-view renders skeleton rows in a role="list" region, NOT the empty CTA and NOT real rows.
    expect(screen.getByRole('list', { name: 'Notes, list view' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /create your first note/i })).toBeNull()
  })

  it('renders the error status region on failure (never a blank list)', () => {
    h.list.mockReturnValue({ isPending: false, isError: true, data: undefined })
    renderScreen()
    // error → a polite role="status" region (data-view.tsx:65), not a role="list".
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Notes, list view' })).toBeNull()
  })
})

describe('NotesCollection actions', () => {
  it('New Note opens the create dialog → Create fires create-with-tags (EC-8, BR-B6-4)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [] })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'New Note' }))
    // create is gated behind the dialog now (set tags on create) — the header click does NOT create.
    expect(h.mutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(h.mutate).toHaveBeenCalledTimes(1)
    expect(h.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: [] }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('opening a row navigates to /note/$id', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('note-1', 'Note A')] })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Note A' }))
    expect(nav).toHaveBeenCalledWith({ to: '/note/$id', params: { id: 'note-1' } })
  })
})

describe('NotesCollection filter bar (B6 · EC-9)', () => {
  it('the Favorites toggle drives listPages({favorite:true}) and is pressed', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [] })
    renderScreen()
    // default: unfiltered ({}) — the sole call arg (BR-B6-2, no invented default-hide).
    expect(h.list).toHaveBeenLastCalledWith({})
    fireEvent.click(screen.getByRole('button', { name: /Favorites/ }))
    expect(useNotesViewStore.getState().filter).toEqual({ favorite: true })
    expect(screen.getByRole('button', { name: /Favorites/, pressed: true })).toBeTruthy()
  })

  it('the Archived toggle maps to archived:true (explicit show-only, no default-hide)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [] })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
    expect(useNotesViewStore.getState().filter).toEqual({ archived: true })
  })
})

describe('NotesCollection view-switch', () => {
  it('switches the active renderer via the Tabs (ephemeral, BR-B1-3)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('1', 'Note A')] })
    renderScreen()
    // default = list
    expect(screen.getByRole('list', { name: 'Notes, list view' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Gallery' }))
    expect(screen.getByRole('list', { name: 'Notes, gallery view' })).toBeTruthy()
  })
})

describe('NotesCollection Neural edges (B5)', () => {
  it('gates the edge fan-out OFF when the Neural view is not active (BR-B5-3 lazy-enable)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('1', 'Note A'), page('2', 'Note B')] })
    renderScreen() // default view = list
    expect(h.edges).toHaveBeenCalledWith(['1', '2'], false)
  })

  it('enables the fan-out + renders page-link edges as node connection counts on the Neural view (EC-1)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('1', 'Note A'), page('2', 'Note B')] })
    h.edges.mockReturnValue({ data: [{ source: '1', target: '2' }] })
    useNotesViewStore.setState({ view: 'neural' })
    renderScreen()
    expect(h.edges).toHaveBeenCalledWith(['1', '2'], true)
    // WebGL canvas is aria-hidden in jsdom; the a11y node-list carries the degree derived from `edges` — non-zero once linked.
    expect(screen.getByRole('button', { name: 'Note A, 1 connections' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Note B, 1 connections' })).toBeTruthy()
  })

  it('degrades to nodes-only (0 connections) when the edges query has no data (BR-B5-4)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('1', 'Note A')] })
    h.edges.mockReturnValue({ data: undefined }) // error/pending → no edges, graph still shows its nodes
    useNotesViewStore.setState({ view: 'neural' })
    renderScreen()
    expect(screen.getByRole('button', { name: 'Note A, 0 connections' })).toBeTruthy()
  })
})
