import { describe, it, expect } from 'vitest'
import { searchSettings, groupResults } from './settings-search'

describe('searchSettings (fe-settings S4 — EC-6)', () => {
  it('empty / whitespace query → [] (caller shows the normal pane)', () => {
    expect(searchSettings('')).toEqual([])
    expect(searchSettings('   ')).toEqual([])
  })

  it('matches by label (case-insensitive)', () => {
    const r = searchSettings('DENSITY')
    expect(r.map((e) => e.id)).toContain('density')
  })

  it('matches by description', () => {
    const r = searchSettings('reading voice')
    expect(r.map((e) => e.id)).toContain('theme-preset')
  })

  it('matches by keyword', () => {
    const r = searchSettings('a11y')
    expect(r.map((e) => e.id)).toContain('reduce-motion')
  })

  it('no match → []', () => {
    expect(searchSettings('xyzzy')).toEqual([])
  })

  it('a broad query returns multiple entries', () => {
    expect(searchSettings('a').length).toBeGreaterThan(1)
  })
})

describe('groupResults', () => {
  it('groups entries by category, preserving index order', () => {
    const groups = groupResults(searchSettings('a'))
    expect(groups.length).toBeGreaterThanOrEqual(1)
    expect(groups[0]?.category).toBe('appearance')
    expect(groups.every((g) => g.entries.length > 0)).toBe(true)
  })

  it('empty input → no groups', () => {
    expect(groupResults([])).toEqual([])
  })
})

describe('searchSettings — R3 index entries', () => {
  it('R3 (D4) — "persona" and a persona value both find the Persona row (Appearance)', () => {
    for (const q of ['persona', 'student', 'Retiree']) {
      const hits = searchSettings(q)
      expect(hits.map((h) => h.id)).toContain('persona')
      expect(hits.find((h) => h.id === 'persona')?.category).toBe('appearance')
    }
  })

  it('no setting offers a `game` theme (D3: game is a module, not a theme)', () => {
    expect(searchSettings('game').map((h) => h.id)).not.toContain('theme-preset')
  })
})
