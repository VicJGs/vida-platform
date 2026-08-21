// MOD-notes ②b — the notes UI store (ephemeral active-view).
import { describe, it, expect, beforeEach } from 'vitest'
import { useNotesUiStore } from './notes-ui-store'

describe('useNotesUiStore', () => {
  beforeEach(() => useNotesUiStore.setState({ activeNotesView: 'list' }))

  it('defaults to the list view (NC-2)', () => {
    expect(useNotesUiStore.getState().activeNotesView).toBe('list')
  })

  it('setActiveNotesView switches the view', () => {
    useNotesUiStore.getState().setActiveNotesView('gallery')
    expect(useNotesUiStore.getState().activeNotesView).toBe('gallery')
    useNotesUiStore.getState().setActiveNotesView('neural')
    expect(useNotesUiStore.getState().activeNotesView).toBe('neural')
  })
})
