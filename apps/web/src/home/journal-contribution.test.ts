// Pure — env node. Locks the registry seam as signature-only + inert (BR-2; the engine is MOD-journals #33).
import { describe, expect, it } from 'vitest'

import { JournalSeamNotActivated, registerJournalContribution, type JournalContribution } from './journal-contribution'

describe('registerJournalContribution (deferred seam)', () => {
  it('throws JournalSeamNotActivated — inert until the engine activates it', () => {
    expect(() => registerJournalContribution({} as JournalContribution)).toThrow(JournalSeamNotActivated)
  })
  it('the error names the seam and its downstream home', () => {
    try {
      registerJournalContribution({} as JournalContribution)
      expect.unreachable('seam should throw')
    } catch (e) {
      expect((e as Error).name).toBe('JournalSeamNotActivated')
      expect((e as Error).message).toContain('registerJournalContribution')
      expect((e as Error).message).toContain('MOD-journals')
    }
  })
})

describe('JournalContribution shape (names no module by reference)', () => {
  it('accepts a well-formed contribution whose module is a plain string field', () => {
    const contribution: JournalContribution = {
      module: 'habits',
      sectionKey: 'summary',
      dataPoints: [{ id: 'streak', label: 'Streak' }],
      summary: () => ({ sectionKey: 'summary', dataPoints: [], state: 'success' }),
      dueIn: () => ({ sectionKey: 'agenda', dataPoints: [], state: 'empty' }),
    }
    expect(contribution.module).toBe('habits')
    expect(contribution.summary('2026-08-17').state).toBe('success')
    expect(contribution.dueIn({ from: '2026-08-17', to: '2026-08-17' }).state).toBe('empty')
  })
})
