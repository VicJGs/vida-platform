// Pure — env `node` (no jsdom). Locks the 8-state machine: the exact superset, the
// TOTAL collapse to the @vida/core canon, deriveInteractionState's precedence +
// idle-on-empty-query + the producer-only `unavailable`, and the render mapping.
import { describe, expect, it } from 'vitest'

import { TERMINAL_STATE, type TerminalState } from './terminal-state'
import {
  INTERACTION_RENDER,
  INTERACTION_STATE,
  type InteractionState,
  collapseToTerminal,
  deriveInteractionState,
  renderKindFor,
  type QueryResultLike,
} from './interaction-state'

const isEmptyList = (rows: readonly unknown[]) => rows.length === 0
function result<T>(over: Partial<QueryResultLike<T>> & { data?: T }): QueryResultLike<T> {
  return { isPending: false, isError: false, data: undefined, ...over }
}

describe('INTERACTION_STATE — the exact decomposition.md:39 superset (BR-S1-2)', () => {
  it('is the 8 documented members, no more no less', () => {
    expect([...INTERACTION_STATE]).toEqual([
      'idle',
      'typing',
      'loading',
      'results',
      'empty',
      'unavailable',
      'error',
      'success',
    ])
  })

  it('contains the four @vida/core canonical literals (reuse, not a 5th copy — BR-S1-1)', () => {
    for (const t of TERMINAL_STATE) expect(INTERACTION_STATE).toContain(t)
  })
})

describe('collapseToTerminal — total + grounded (BR-S1-3)', () => {
  it('is total: every InteractionState maps to a valid TerminalState', () => {
    for (const s of INTERACTION_STATE) {
      expect(TERMINAL_STATE).toContain(collapseToTerminal(s))
    }
  })

  it('the four canonical collapse to themselves', () => {
    expect(collapseToTerminal('loading')).toBe('loading')
    expect(collapseToTerminal('empty')).toBe('empty')
    expect(collapseToTerminal('error')).toBe('error')
    expect(collapseToTerminal('success')).toBe('success')
  })

  it('the four additions collapse per the grounded rows', () => {
    expect(collapseToTerminal('typing')).toBe('loading')
    expect(collapseToTerminal('results')).toBe('success')
    expect(collapseToTerminal('unavailable')).toBe('error')
    expect(collapseToTerminal('idle')).toBe('empty')
  })
})

describe('deriveInteractionState — non-input call === deriveTerminalState lifted (BR-S1-4)', () => {
  it('pending → loading; error → error; empty → empty; non-empty → success', () => {
    expect(deriveInteractionState(result<number[]>({ isPending: true }), isEmptyList)).toBe('loading')
    expect(deriveInteractionState(result<number[]>({ isError: true, data: [1] }), isEmptyList)).toBe('error')
    expect(deriveInteractionState(result<number[]>({ data: [] }), isEmptyList)).toBe('empty')
    expect(deriveInteractionState(result<number[]>({ data: [1] }), isEmptyList)).toBe('success')
  })

  it('preserves isPending-first precedence (the empty-vs-loading race guard)', () => {
    expect(deriveInteractionState(result<number[]>({ isPending: true, data: [] }), isEmptyList)).toBe('loading')
  })
})

describe('deriveInteractionState — the input dimension (idle/typing/results)', () => {
  it('empty query → idle, keyed on the query ALONE (not focus) — even while pending', () => {
    // An unfocused/blank input is still idle; it must NOT fall through to loading/empty.
    expect(deriveInteractionState(result<number[]>({ data: [] }), isEmptyList, { query: '' })).toBe('idle')
    expect(deriveInteractionState(result<number[]>({ isPending: true }), isEmptyList, { query: '' })).toBe('idle')
  })

  it('pending with a non-empty query → typing', () => {
    expect(deriveInteractionState(result<number[]>({ isPending: true }), isEmptyList, { query: 'ab' })).toBe('typing')
  })

  it('resolved non-empty result for a non-empty query → results (not success)', () => {
    expect(deriveInteractionState(result<number[]>({ data: [1, 2] }), isEmptyList, { query: 'ab' })).toBe('results')
  })

  it('resolved empty result for a non-empty query → empty ("no matches")', () => {
    expect(deriveInteractionState(result<number[]>({ data: [] }), isEmptyList, { query: 'ab' })).toBe('empty')
  })

  it('error for a non-empty query → error', () => {
    expect(deriveInteractionState(result<number[]>({ isError: true }), isEmptyList, { query: 'ab' })).toBe('error')
  })

  it('NEVER emits unavailable (producer-path only, not derivable from a result)', () => {
    const outcomes: InteractionState[] = [
      deriveInteractionState(result<number[]>({ isPending: true }), isEmptyList, { query: 'x' }),
      deriveInteractionState(result<number[]>({ isError: true }), isEmptyList, { query: 'x' }),
      deriveInteractionState(result<number[]>({ data: [] }), isEmptyList, { query: '' }),
      deriveInteractionState(result<number[]>({ data: [1] }), isEmptyList, { query: 'x' }),
      deriveInteractionState(result<number[]>({ data: [1] }), isEmptyList),
    ]
    expect(outcomes).not.toContain('unavailable')
  })
})

describe('render mapping — one canonical state→primitive map (seam-contract §A)', () => {
  it('renderKindFor agrees with INTERACTION_RENDER for all 8', () => {
    for (const s of INTERACTION_STATE) {
      expect(renderKindFor(s)).toBe(INTERACTION_RENDER[s])
    }
  })

  it('maps per the extended state-conventions §3 table', () => {
    expect(renderKindFor('idle')).toBe('input')
    expect(renderKindFor('typing')).toBe('input')
    expect(renderKindFor('loading')).toBe('skeleton')
    expect(renderKindFor('results')).toBe('content')
    expect(renderKindFor('success')).toBe('content')
    expect(renderKindFor('empty')).toBe('empty-state')
    expect(renderKindFor('unavailable')).toBe('error-card')
    expect(renderKindFor('error')).toBe('error-card')
  })
})

describe('canon re-exported through this module (BR-S1-6 one import point)', () => {
  it('TERMINAL_STATE is the four @vida/core literals', () => {
    const canon: readonly TerminalState[] = TERMINAL_STATE
    expect([...canon]).toEqual(['loading', 'empty', 'error', 'success'])
  })
})
