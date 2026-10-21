// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { NotesSurface } from './notes-surface'

// The live list reads via React Query over the composition root; mock it empty.
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { listPages: async () => [] } }),
}))

// NotesSurface + useCreateNote call useNavigate (open-on-click / create-and-open); stub the router.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <UIProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </UIProvider>,
  )
}

describe('NotesSurface (S1)', () => {
  it('renders the Notes collection title + the region', () => {
    const { getByText, getByRole } = renderUI(<NotesSurface />)
    expect(getByText('Notes')).not.toBeNull()
    expect(getByRole('region', { name: 'Notes collection' })).not.toBeNull()
  })

  it('S7 — mounts the notes search box above the collection (EC-12)', () => {
    const { getByRole } = renderUI(<NotesSurface />)
    expect(getByRole('search', { name: 'Search notes' })).not.toBeNull()
    expect(getByRole('region', { name: 'Notes collection' })).not.toBeNull()
  })

  it('exposes the "New note" create action (go-live)', () => {
    const { getByText } = renderUI(<NotesSurface />)
    expect(getByText('New note')).not.toBeNull()
  })

  it('EC-1 — exposes the view-mode switcher (condensed Menu in jsdom)', () => {
    const { getByText } = renderUI(<NotesSurface />)
    expect(getByText('View: List')).not.toBeNull()
  })

  it('EC-2 — the honest empty state once the live list resolves to []', async () => {
    const { getByText } = renderUI(<NotesSurface />)
    await waitFor(() => expect(getByText(/Nothing here yet|No notes/i)).not.toBeNull())
  })
})
