import { describe, expect, it } from 'vitest'
import { overviewFor, registerOverview, type OverviewRenderer } from './overview-registry'
import { journalOverviewStub, noteOverview } from './note-overview'

describe('overview-registry (S2 — the Layout-facet slot / RIDE seam)', () => {
  it('resolves the S2-shipped types to their renderers (note full + journal stub)', () => {
    expect(overviewFor('note')).toBe(noteOverview)
    expect(overviewFor('journal')).toBe(journalOverviewStub)
  })

  it('falls back to the note layout for an unregistered type — empty-but-functional, no dead affordance', () => {
    // deliverable_note RIDEs from fe-projects (not registered in S2) → fe-notes' own note layout.
    expect(overviewFor('deliverable_note')).toBe(noteOverview)
  })

  it('registerOverview swaps in a renderer for its type (the zero-signature RIDE swap)', () => {
    const custom: OverviewRenderer = () => null
    registerOverview('task_note', custom)
    expect(overviewFor('task_note')).toBe(custom)
  })
})
