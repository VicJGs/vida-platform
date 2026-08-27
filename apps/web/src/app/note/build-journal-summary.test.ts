// MOD-notes ② · B7 — buildJournalSummary + sectionsFromConfig (pure). The inert-engine degrade: each enabled row →
// state 'empty' with the inert message, never throws, never blanks; and the 5-flag→5-row config fallback. Spec:
// b7-summary-block.md BR-B7-2/3/4.
import { describe, expect, it } from 'vitest'
import type { DailySummarySectionType, JournalSummaryConfig } from '@vida/types'
import { buildJournalSummary, sectionsFromConfig, SUMMARY_INERT_MESSAGE } from './build-journal-summary'

describe('buildJournalSummary — inert-engine degrade (BR-B7-3)', () => {
  it('maps N enabled sections → N rows, each state "empty" with the inert message (never "error")', () => {
    const sections: DailySummarySectionType[] = ['habits', 'tasks', 'study']
    const rows = buildJournalSummary('2026-08-26', sections)
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.section)).toEqual(sections)
    expect(rows.every((r) => r.state === 'empty')).toBe(true)
    expect(rows.every((r) => r.message === SUMMARY_INERT_MESSAGE)).toBe(true)
    expect(rows.every((r) => r.dataPoints.length === 0)).toBe(true)
  })

  it('empty sections → empty result (no rows); never throws; date is ignored in the inert impl', () => {
    expect(buildJournalSummary(null, [])).toEqual([])
    expect(() => buildJournalSummary('2026-08-26', [])).not.toThrow()
  })

  it('preserves section ORDER as given (the block attr drives the rendered order)', () => {
    const rows = buildJournalSummary(null, ['transactions', 'habits'])
    expect(rows.map((r) => r.section)).toEqual(['transactions', 'habits'])
  })
})

describe('sectionsFromConfig — the A7 5-flag → 5-row fallback map (BR-B7-4; routines has no flag, G5)', () => {
  it('maps each show-flag to its row (showStudySessions → study), skips routines', () => {
    const config: JournalSummaryConfig = {
      showHabits: true,
      showTasks: true,
      showStudySessions: true,
      showTransactions: true,
      showInteractions: true,
    }
    expect(sectionsFromConfig(config)).toEqual(['habits', 'tasks', 'study', 'transactions', 'interactions'])
  })

  it('a partial config yields only the enabled rows', () => {
    expect(sectionsFromConfig({ showHabits: true, showInteractions: true })).toEqual(['habits', 'interactions'])
  })

  it('an all-false / empty config yields no rows', () => {
    expect(sectionsFromConfig({})).toEqual([])
    expect(sectionsFromConfig({ showHabits: false })).toEqual([])
  })
})
