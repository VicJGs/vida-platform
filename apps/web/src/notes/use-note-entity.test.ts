// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useNoteEntity } from './use-note-entity'

// Pure function (no React hooks) — safe to call directly. Default jsdom URL has no `?sample`.
describe('useNoteEntity (S2)', () => {
  it('M1 default is honest-empty (no live NotesService composition root yet)', () => {
    const result = useNoteEntity('1')
    expect(result.page).toBeNull()
    expect(result.state).toBe('empty')
  })

  it('returns a stable result shape (page + state)', () => {
    const result = useNoteEntity('any-id')
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('state')
  })
})
