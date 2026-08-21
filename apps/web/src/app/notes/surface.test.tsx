// @vitest-environment jsdom
// MOD-notes ②b — the rendered surface (NoteCard · view switcher · route). Consolidated
// into ONE file so the heavy @vida/ui barrel evaluates once and the renders run warm
// (separate files each pay the cold Tamagui/barrel mount → flaky under parallel load).
// Async `findBy*` (the shell-test convention) tolerates a slow first mount.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { UIProvider } from '@vida/ui'

const { navigate, usePagesByType } = vi.hoisted(() => ({
  navigate: vi.fn(),
  usePagesByType: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('./hooks', () => ({ usePagesByType }))

import { NoteCard } from './note-card'
import { NotesViewSwitcher } from './view-switcher'
import NotesRoute from './index'
import { useNotesUiStore } from '../../stores/notes-ui-store'

afterEach(() => {
  cleanup()
  useNotesUiStore.setState({ activeNotesView: 'list' })
})
beforeEach(() => vi.clearAllMocks())

function ui(node: React.ReactNode) {
  return render(<UIProvider>{node}</UIProvider>)
}

const page = { id: 'p1', title: 'My note' as string | null, type: 'note', updated_at: 1_700_000_000_000 }

describe('NoteCard', () => {
  it('renders the page title', async () => {
    ui(<NoteCard page={page as never} />)
    expect(await screen.findByText('My note')).toBeTruthy()
  })

  it('renders "Untitled" when the title is null', async () => {
    ui(<NoteCard page={{ ...page, title: null } as never} />)
    expect(await screen.findByText('Untitled')).toBeTruthy()
  })

  it('navigates to the detail route on activation', async () => {
    ui(<NoteCard page={page as never} />)
    fireEvent.click(await screen.findByRole('button', { name: 'My note' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/note/$id', params: { id: 'p1' } })
  })
})

describe('NotesViewSwitcher', () => {
  it('renders three views with the active one pressed (default list)', async () => {
    ui(<NotesViewSwitcher />)
    expect((await screen.findByRole('button', { name: 'List' })).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Gallery' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Graph' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking a view updates the store', async () => {
    ui(<NotesViewSwitcher />)
    fireEvent.click(await screen.findByRole('button', { name: 'Gallery' }))
    expect(useNotesUiStore.getState().activeNotesView).toBe('gallery')
  })
})

describe('NotesRoute', () => {
  it('renders the heading + the switcher', async () => {
    usePagesByType.mockReturnValue({ data: [], state: 'empty' })
    ui(<NotesRoute />)
    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'List' })).toBeTruthy()
  })

  it('shows the empty state when there are no notes', async () => {
    usePagesByType.mockReturnValue({ data: [], state: 'empty' })
    ui(<NotesRoute />)
    expect(await screen.findByText('No notes yet')).toBeTruthy()
  })

  it('renders rows in the success state', async () => {
    usePagesByType.mockReturnValue({ data: [{ ...page }], state: 'success' })
    ui(<NotesRoute />)
    expect(await screen.findByText('My note')).toBeTruthy()
  })
})
