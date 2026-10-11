// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { NotesSurface } from './notes-surface'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('NotesSurface (S1)', () => {
  it('renders the Notes collection title + the region', () => {
    const { getByText, getByRole } = renderUI(<NotesSurface />)
    expect(getByText('Notes')).not.toBeNull()
    expect(getByRole('region', { name: 'Notes collection' })).not.toBeNull()
  })

  it('EC-1 — exposes the view-mode switcher (condensed Menu in jsdom; the full 4-layout toolbar ≥768 is a Visual-Gate MUST)', () => {
    const { getByText } = renderUI(<NotesSurface />)
    // jsdom reports < 768 → CollectionView condenses the switcher to a "View: <layout>" Menu trigger.
    expect(getByText('View: List')).not.toBeNull()
  })

  it('EC-2 — M1 default data is the honest empty state', () => {
    const { getByText } = renderUI(<NotesSurface />)
    expect(getByText(/Nothing here yet|No notes/i)).not.toBeNull()
  })
})
