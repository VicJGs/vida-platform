import { describe, expect, it } from 'vitest'
import { overviewFor, registerOverview, type OverviewRenderer } from './overview-registry'
import { NoteOverview } from './note-overview'

describe('overview-registry (the Layout-facet slot / RIDE seam)', () => {
  it('resolves `note` to the note Overview component', () => {
    expect(overviewFor('note')).toBe(NoteOverview)
  })

  it('Notes no longer registers a journal Overview (EC-18a → journals-rescope; BR-R1-4): journal falls back', () => {
    expect(overviewFor('journal')).toBe(NoteOverview)
  })

  it('falls back to the note layout for an unregistered type — empty-but-functional, no dead affordance', () => {
    // deliverable_note RIDEs from fe-projects (not registered here) → fe-notes' own note layout.
    expect(overviewFor('deliverable_note')).toBe(NoteOverview)
  })

  it('registerOverview swaps in a component for its type (the zero-signature RIDE swap)', () => {
    const custom: OverviewRenderer = () => null
    registerOverview('task_note', custom)
    expect(overviewFor('task_note')).toBe(custom)
  })
})
