// ============================================================================
// mod-journals #39 · LIF-127 · Slice 1 — registry + types tests (pure logic)
//
// Proves the S1 charter (docs/specs/features/mod-journals/sessions/PLAN-2026-09-19-s1-registry.md §4):
//   • BR-S1-2 — list() is DETERMINISTIC: sectionKey (summary→agenda→entry) then module asc
//   • BR-S1-3 — re-register OVERWRITES by module key (not throw)
//   • edges   — empty list() → []; get(unknown) → undefined
//   • BR-S1-1 — a contribution carries a plain `module` string (no module import)
//   • BR-S1-6 — the 4 typed errors are Error subclasses with stable `.name`
//   • BR-S1-4 — SectionData.state is the @vida/core canon ('success', not 'populated')
// No live store — the registry is in-memory runtime code (structure-data.md:19-22).
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createJournalRegistry } from '../registry'
import {
  type JournalContribution,
  type SectionData,
  ContributionFailed,
  SnapshotMissing,
  InsufficientHistory,
  ProviderUnavailable,
} from '../types'

/** A minimal contribution builder for tests. */
function contrib(
  module: string,
  sectionKey: JournalContribution['sectionKey'],
  withDueIn = false,
): JournalContribution {
  const base: JournalContribution = {
    module,
    sectionKey,
    dataPoints: [{ id: `${module}.count`, label: `${module} count` }],
    summary: (date) => ({ sectionKey, module, dataPoints: [], state: 'success' as const, items: [date] }),
  }
  return withDueIn
    ? { ...base, dueIn: (range) => ({ sectionKey: 'agenda', module, dataPoints: [], state: 'empty' as const, items: [range] }) }
    : base
}

describe('createJournalRegistry', () => {
  it('list() on an empty registry returns [] (not an error)', () => {
    expect(createJournalRegistry().list()).toEqual([])
  })

  it('get(unknown) returns undefined', () => {
    expect(createJournalRegistry().get('nope')).toBeUndefined()
  })

  it('list() is deterministic: sectionKey order (summary→agenda→entry), then module asc (BR-S1-2)', () => {
    const r = createJournalRegistry()
    // register in a deliberately scrambled order
    r.register(contrib('tasks', 'agenda'))
    r.register(contrib('finance', 'summary'))
    r.register(contrib('notes', 'entry'))
    r.register(contrib('habits', 'summary'))
    r.register(contrib('sessions', 'agenda'))

    expect(r.list().map((c) => `${c.sectionKey}:${c.module}`)).toEqual([
      'summary:finance',
      'summary:habits',
      'agenda:sessions',
      'agenda:tasks',
      'entry:notes',
    ])
  })

  it('re-register of the same module OVERWRITES; list length unchanged (BR-S1-3)', () => {
    const r = createJournalRegistry()
    r.register(contrib('habits', 'summary'))
    const replacement = contrib('habits', 'agenda', true)
    r.register(replacement)

    expect(r.list()).toHaveLength(1)
    expect(r.get('habits')).toBe(replacement)
    expect(r.get('habits')?.sectionKey).toBe('agenda')
  })

  it('stores a plain module string; a contribution needs no module import (BR-S1-1)', () => {
    const r = createJournalRegistry()
    r.register(contrib('some-future-module', 'summary'))
    expect(r.get('some-future-module')?.module).toBe('some-future-module')
  })

  it('a summary-only contribution registers without dueIn (dueIn optional)', () => {
    const r = createJournalRegistry()
    r.register(contrib('finance', 'summary')) // no dueIn
    expect(r.get('finance')?.dueIn).toBeUndefined()
  })
})

describe('journals typed errors (BR-S1-6)', () => {
  it('are Error subclasses with stable .name', () => {
    const errs = [
      new ContributionFailed('habits', '2026-09-19'),
      new SnapshotMissing('2026-09-19'),
      new InsufficientHistory('week'),
      new ProviderUnavailable('sessions'),
    ]
    for (const e of errs) expect(e).toBeInstanceOf(Error)
    expect(errs.map((e) => e.name)).toEqual([
      'ContributionFailed',
      'SnapshotMissing',
      'InsufficientHistory',
      'ProviderUnavailable',
    ])
    // carries its context
    expect(new ContributionFailed('habits', '2026-09-19').module).toBe('habits')
  })
})

describe('SectionData.state reuses the @vida/core TerminalState canon (BR-S1-4)', () => {
  it("accepts 'success' and (type-level) rejects the docs' prose 'populated'", () => {
    const ok: SectionData = { sectionKey: 'summary', module: 'habits', dataPoints: [], state: 'success' }
    expect(ok.state).toBe('success')
    // @ts-expect-error 'populated' is NOT in the canon (['loading','empty','error','success'])
    const bad: SectionData = { sectionKey: 'summary', module: 'habits', dataPoints: [], state: 'populated' }
    void bad
  })
})
