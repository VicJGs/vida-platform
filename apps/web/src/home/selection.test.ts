// Pure — env node. Locks the personalization default-resolution: per-journal override wins per module, no module
// dropped (BR-6). Does NOT test the deferred get/setSelection storage path beyond confirming it is inert.
import { describe, expect, it } from 'vitest'

import { JournalSeamNotActivated } from './journal-contribution'
import { getSelection, resolveSelection, setSelection, type JournalSelection } from './selection'

const globalDefault: JournalSelection = {
  habits: ['streak', 'completion'],
  tasks: ['due-today'],
  finance: ['balance'],
}

describe('resolveSelection (BR-6)', () => {
  it('returns the global default when there is no override', () => {
    expect(resolveSelection(globalDefault)).toEqual(globalDefault)
  })
  it('lets a per-journal override replace one module — and drops no other module', () => {
    const resolved = resolveSelection(globalDefault, { habits: ['streak'] })
    expect(resolved.habits).toEqual(['streak'])
    expect(resolved.tasks).toEqual(['due-today'])
    expect(resolved.finance).toEqual(['balance'])
  })
  it('can add a module the global default did not mention', () => {
    const resolved = resolveSelection(globalDefault, { relationships: ['follow-ups'] })
    expect(resolved.relationships).toEqual(['follow-ups'])
    expect(Object.keys(resolved)).toHaveLength(4)
  })
})

describe('selection storage seams (deferred — Preferences/MOD-journals)', () => {
  it('getSelection/setSelection are inert until the storage engine activates them', () => {
    expect(() => getSelection()).toThrow(JournalSeamNotActivated)
    expect(() => setSelection({})).toThrow(JournalSeamNotActivated)
  })
})
