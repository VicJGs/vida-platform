// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { NoteEntityView } from './note-entity'
import type { NoteEntityData } from './use-note-entity'

// The editor body persists content via the composition root (useNoteContent); mock it (no write in these tests).
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: async () => undefined } }),
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

const notePage: NoteEntityData = {
  id: '1',
  type: 'note',
  title: 'Project kickoff',
  content: null,
  favorite: true,
  archived: false,
  updated: '2h ago',
  journalDate: null,
  icon: null,
  cover: null,
}

describe('NoteEntityView (S2 — the note-entity frame)', () => {
  it('renders the EntityView frame with the page title (serif H1)', () => {
    const { getByText } = renderUI(<NoteEntityView page={notePage} />)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-4/EC-5 — a page-able note OFFERS the Editor facet: tabbed default exposes Overview + Note tabs', () => {
    const { getByRole } = renderUI(<NoteEntityView page={notePage} />)
    // Tabs render only when the editor slot is present (offersEditor gate) → proves the Editor facet is offered.
    expect(getByRole('tab', { name: 'Overview' })).not.toBeNull()
    expect(getByRole('tab', { name: 'Note' })).not.toBeNull()
  })

  it('EC-4 — leads with the Editor facet (Note tab selected by default)', () => {
    const { getByRole } = renderUI(<NoteEntityView page={notePage} />)
    expect(getByRole('tab', { name: 'Note' }).getAttribute('aria-selected')).toBe('true')
  })
})
