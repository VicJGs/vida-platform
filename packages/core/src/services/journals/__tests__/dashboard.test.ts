// ============================================================================
// mod-journals #39 · LIF-127 · Slice 2 — buildDashboard + selection (pure logic)
//
// Proves the S2 charter (docs/specs/features/mod-journals/sessions/PLAN-2026-09-19-s2-dashboard.md §4):
//   • BR-S2-1/5 — deterministic order; membership by producing method; summary-only ⇒ no agenda
//   • BR-S2-2   — a throwing provider degrades ONLY its section; buildDashboard never throws
//   • BR-S2-6   — async providers awaited
//   • BR-S2-4   — selection filters summary dataPoints; omitted/absent ⇒ all shown
//   • BR-S2-5   — agenda NOT selection-filtered; sectionKey normalized by method
//   • BR-S2-3   — resolveSelection: override wins per module, none dropped
//   • BR-S2-7   — journalStillRenders false only when every section errors
//   • terminal  — empty registry ⇒ { summary:[], agenda:[] }
// No live store — pure logic over the in-memory registry.
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createJournalRegistry } from '../registry'
import { buildDashboard, journalStillRenders } from '../dashboard'
import { resolveSelection } from '../selection'
import type { JournalContribution, SectionData } from '../types'

function section(module: string, sectionKey: SectionData['sectionKey'], ids: string[]): SectionData {
  return { sectionKey, module, dataPoints: ids.map((id) => ({ id, label: id })), state: 'success' }
}

function summaryOnly(module: string, ids: string[] = ['a']): JournalContribution {
  return { module, sectionKey: 'summary', dataPoints: [], summary: () => section(module, 'summary', ids) }
}
function withAgenda(module: string): JournalContribution {
  return {
    module,
    sectionKey: 'summary',
    dataPoints: [],
    summary: () => section(module, 'summary', ['x']),
    dueIn: () => section(module, 'agenda', ['due1']),
  }
}

describe('buildDashboard', () => {
  it('empty registry → { summary: [], agenda: [] } (terminal state)', async () => {
    expect(await buildDashboard(createJournalRegistry(), '2026-09-19')).toEqual({ summary: [], agenda: [] })
  })

  it('deterministic order; summary from all, agenda only from dueIn providers (BR-S2-1/5)', async () => {
    const r = createJournalRegistry()
    r.register(withAgenda('tasks'))
    r.register(summaryOnly('finance'))
    r.register(withAgenda('habits'))

    const d = await buildDashboard(r, '2026-09-19')
    // summary = all three, ordered by list() (sectionKey then module asc): finance, habits, tasks
    expect(d.summary.map((s) => s.module)).toEqual(['finance', 'habits', 'tasks'])
    // agenda = only the dueIn providers, same relative order
    expect(d.agenda.map((s) => s.module)).toEqual(['habits', 'tasks'])
    // membership normalized by method
    expect(d.summary.every((s) => s.sectionKey === 'summary')).toBe(true)
    expect(d.agenda.every((s) => s.sectionKey === 'agenda')).toBe(true)
  })

  it('normalizes sectionKey by method even if a provider returns the wrong key (BR-S2-5)', async () => {
    const r = createJournalRegistry()
    // a mischievous provider that returns sectionKey:'agenda' from summary()
    r.register({
      module: 'rogue',
      sectionKey: 'summary',
      dataPoints: [],
      summary: () => ({ sectionKey: 'agenda', module: 'rogue', dataPoints: [], state: 'success' }),
    })
    const d = await buildDashboard(r, '2026-09-19')
    expect(d.summary[0]?.sectionKey).toBe('summary')
  })

  it('a throwing summary degrades ONLY its section; others render; never throws (BR-S2-2)', async () => {
    const r = createJournalRegistry()
    r.register(summaryOnly('finance'))
    r.register({
      module: 'habits',
      sectionKey: 'summary',
      dataPoints: [],
      summary: () => {
        throw new Error('provider boom')
      },
    })
    const d = await buildDashboard(r, '2026-09-19')
    const habits = d.summary.find((s) => s.module === 'habits')!
    const finance = d.summary.find((s) => s.module === 'finance')!
    expect(habits.state).toBe('error')
    expect(finance.state).toBe('success')
  })

  it('awaits async providers (BR-S2-6)', async () => {
    const r = createJournalRegistry()
    r.register({
      module: 'tasks',
      sectionKey: 'summary',
      dataPoints: [],
      summary: async () => section('tasks', 'summary', ['t']),
    })
    const d = await buildDashboard(r, '2026-09-19')
    expect(d.summary[0]?.state).toBe('success')
    expect(d.summary[0]?.dataPoints.map((p) => p.id)).toEqual(['t'])
  })

  it('selection filters summary dataPoints; agenda is NOT filtered (BR-S2-4/5)', async () => {
    const r = createJournalRegistry()
    r.register({
      module: 'habits',
      sectionKey: 'summary',
      dataPoints: [],
      summary: () => section('habits', 'summary', ['keep', 'drop']),
      dueIn: () => section('habits', 'agenda', ['due-keep', 'due-drop']),
    })
    const d = await buildDashboard(r, '2026-09-19', { habits: ['keep'] })
    expect(d.summary[0]?.dataPoints.map((p) => p.id)).toEqual(['keep']) // summary filtered
    expect(d.agenda[0]?.dataPoints.map((p) => p.id)).toEqual(['due-keep', 'due-drop']) // agenda untouched
  })

  it('no selection ⇒ all data points shown; module absent from selection ⇒ all shown (BR-S2-4)', async () => {
    const r = createJournalRegistry()
    r.register(summaryOnly('finance', ['a', 'b']))
    const all = await buildDashboard(r, '2026-09-19')
    expect(all.summary[0]?.dataPoints).toHaveLength(2)
    const absent = await buildDashboard(r, '2026-09-19', { habits: ['x'] }) // finance not mentioned
    expect(absent.summary[0]?.dataPoints).toHaveLength(2)
  })
})

describe('journalStillRenders (BR-S2-7)', () => {
  it('false only when EVERY section errored', () => {
    const ok = section('a', 'summary', [])
    const err: SectionData = { sectionKey: 'summary', module: 'b', dataPoints: [], state: 'error' }
    expect(journalStillRenders([err, ok])).toBe(true)
    expect(journalStillRenders([err])).toBe(false)
    expect(journalStillRenders([])).toBe(false)
  })
})

describe('resolveSelection (BR-S2-3)', () => {
  it('override replaces per module; unmentioned modules keep the global default; none dropped', () => {
    const global = { habits: ['h1', 'h2'], tasks: ['t1'] }
    const resolved = resolveSelection(global, { habits: ['h1'] })
    expect(resolved).toEqual({ habits: ['h1'], tasks: ['t1'] })
  })
  it('no override ⇒ the global default unchanged', () => {
    const global = { habits: ['h1'] }
    expect(resolveSelection(global)).toEqual(global)
  })
})
