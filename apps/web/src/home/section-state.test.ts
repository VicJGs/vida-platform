// Pure — env node. Locks the section-degrade composition: one failing section never blanks the others (BR-3).
import { describe, expect, it } from 'vitest'

import type { SectionData } from './journal-contribution'
import { journalStillRenders, resolveDashboardStates } from './section-state'

const sections: readonly SectionData[] = [
  { sectionKey: 'summary', dataPoints: [], state: 'success' },
  { sectionKey: 'agenda', dataPoints: [], state: 'error' },
  { sectionKey: 'entry', dataPoints: [], state: 'empty' },
]

describe('resolveDashboardStates', () => {
  it('maps each section to its own resolved state — one error never overwrites siblings (BR-3)', () => {
    expect(resolveDashboardStates(sections)).toEqual({
      summary: 'success',
      agenda: 'error',
      entry: 'empty',
    })
  })
  it('isolates a failed section (agenda error) while its siblings keep their own state', () => {
    const states = resolveDashboardStates(sections)
    expect(states.agenda).toBe('error')
    expect(states.summary).toBe('success')
    expect(states.entry).toBe('empty')
  })
})

describe('journalStillRenders', () => {
  it('is true when at least one section is non-error (never a blank journal)', () => {
    expect(journalStillRenders(sections)).toBe(true)
  })
  it('is false only when every section errored', () => {
    const allError: readonly SectionData[] = sections.map((s) => ({ ...s, state: 'error' as const }))
    expect(journalStillRenders(allError)).toBe(false)
  })
})
