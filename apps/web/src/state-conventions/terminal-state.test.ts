// Pure — env `node` (no jsdom). Verifies the derivation's four branches + the
// isPending-first ordering (the empty-vs-loading race guard) + the defensive
// no-data branch. Locks that the web layer maps onto the `@vida/core` canon.
import { describe, expect, it } from 'vitest'

import { deriveTerminalState, type QueryResultLike, TERMINAL_STATE, type TerminalState } from './terminal-state'

// A list `isEmpty`: empty when zero-length.
const isEmptyList = (rows: readonly unknown[]) => rows.length === 0

// Build a result slice; fields default to a resolved-success shape.
function result<T>(over: Partial<QueryResultLike<T>> & { data?: T }): QueryResultLike<T> {
  return { isPending: false, isError: false, data: undefined, ...over }
}

describe('deriveTerminalState — the four canonical states', () => {
  it('pending → loading (no data yet)', () => {
    expect(deriveTerminalState(result<number[]>({ isPending: true }), isEmptyList)).toBe('loading')
  })

  it('pending wins over an empty payload → loading (the empty-vs-loading race guard)', () => {
    // First paint can carry data:[] while still pending; must read as loading, never empty.
    expect(deriveTerminalState(result<number[]>({ isPending: true, data: [] }), isEmptyList)).toBe('loading')
  })

  it('error → error (even with a stale previous value)', () => {
    // React Query may retain a prior successful `data` on error (placeholderData) — error still wins.
    expect(deriveTerminalState(result<number[]>({ isError: true, data: [1, 2] }), isEmptyList)).toBe('error')
  })

  it('resolved + empty payload → empty', () => {
    expect(deriveTerminalState(result<number[]>({ data: [] }), isEmptyList)).toBe('empty')
  })

  it('resolved + non-empty payload → success', () => {
    expect(deriveTerminalState(result<number[]>({ data: [1] }), isEmptyList)).toBe('success')
  })

  it('defensive: not pending, not error, but no data → loading (never a false empty)', () => {
    expect(deriveTerminalState(result<number[]>({ data: undefined }), isEmptyList)).toBe('loading')
  })
})

describe('deriveTerminalState — precedence order is stable', () => {
  it('pending outranks error and empty', () => {
    expect(deriveTerminalState(result<number[]>({ isPending: true, isError: true, data: [] }), isEmptyList)).toBe(
      'loading',
    )
  })

  it('works with a non-array entity via an injected isEmpty', () => {
    const isEmptyObj = (o: { count: number }) => o.count === 0
    expect(deriveTerminalState(result({ data: { count: 0 } }), isEmptyObj)).toBe('empty')
    expect(deriveTerminalState(result({ data: { count: 3 } }), isEmptyObj)).toBe('success')
  })

  it('every returned value is a member of the @vida/core canon', () => {
    const outcomes: TerminalState[] = [
      deriveTerminalState(result<number[]>({ isPending: true }), isEmptyList),
      deriveTerminalState(result<number[]>({ isError: true }), isEmptyList),
      deriveTerminalState(result<number[]>({ data: [] }), isEmptyList),
      deriveTerminalState(result<number[]>({ data: [1] }), isEmptyList),
    ]
    for (const o of outcomes) expect(TERMINAL_STATE).toContain(o)
  })
})
