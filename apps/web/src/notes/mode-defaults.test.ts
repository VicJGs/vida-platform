// notes-rescope R2 · B-22 / BR-R2-2 — per-type merged/tabbed defaults (PLAN-R2 G6, test B3).
import { describe, expect, it } from 'vitest'
import { defaultModeFor, registerModeDefault } from './mode-defaults'

describe('mode-defaults (BR-R2-2)', () => {
  it('note → tabbed (EC-4: the editor leads)', () => {
    expect(defaultModeFor('note')).toBe('tabbed')
  })
  it('an unregistered type falls back to tabbed (journal / *_note until their owners register)', () => {
    expect(defaultModeFor('journal')).toBe('tabbed')
    expect(defaultModeFor('deliverable_note')).toBe('tabbed')
  })
  it('a RIDE owner registers its type', () => {
    registerModeDefault('task_note', 'merged')
    expect(defaultModeFor('task_note')).toBe('merged')
  })
})
