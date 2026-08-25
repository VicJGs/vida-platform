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

const h = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), mutate: vi.fn() }))
vi.mock('./use-notes-list', () => ({ useNotesList: h.list, useCreateNote: h.create }))

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
})
afterEach(() => {
  cleanup()
  h.list.mockReset()
  h.create.mockReset()
  h.mutate.mockReset()
  nav.mockReset()
  useNotesViewStore.setState({ view: 'list' }) // reset the module-scope ephemeral store between tests
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
  it('New Note triggers createPage (the mutation)', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [] })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'New Note' }))
    expect(h.mutate).toHaveBeenCalledTimes(1)
  })

  it('opening a row navigates to /note/$id', () => {
    h.list.mockReturnValue({ isPending: false, isError: false, data: [page('note-1', 'Note A')] })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Note A' }))
    expect(nav).toHaveBeenCalledWith({ to: '/note/$id', params: { id: 'note-1' } })
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
