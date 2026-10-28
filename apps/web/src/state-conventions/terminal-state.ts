// ============================================================================
// Terminal-state derivation — UX-4 (LIF-93). The single web-layer binding of the
// platform's terminal-state canon. REUSES `@vida/core`'s `TerminalState` — the
// same four states the capability registry (CB6/BR-4) and the ViewEngine degrade
// contract speak — so the frontend, capability, and views share ONE vocabulary.
// (The canon is currently declared three times un-unified: `TerminalState` here,
// `ViewState` in views, `SearchStatus` in command-bar — a future @vida/types
// consolidation for the canon's owner; UX-4 imports, does not re-home.)
//
// Data/logic only — no chrome. Consumed by every module's read surface (M1.1+)
// and by UI-4; UX-4 owns the derivation, modules own the rendering per the
// conventions in docs/core/architecture/state-conventions.md.
// See also: BR-RT-1/3 (React Query owns DB-derived data over local SQLite).
// ============================================================================

// Reuse the canon — the ONE import point for the web layer. Never redefine the
// four literals here (that would create a fourth un-unified copy).
export { TERMINAL_STATE, type TerminalState } from '@vida/core'

import type { TerminalState } from '@vida/core'

/**
 * The minimal React Query v5 result slice the derivation needs. Structural (not
 * a `UseQueryResult` import) so `deriveTerminalState` stays pure, dependency-free,
 * and React-Native-portable — a real `UseQueryResult<T>` is assignable to it.
 */
export interface QueryResultLike<T> {
  isPending: boolean
  isError: boolean
  data: T | undefined
}

/**
 * Map a React Query result to a {@link TerminalState}, in STRICT PRECEDENCE.
 *
 * `isPending` is checked FIRST — before the empty predicate — so a first paint
 * where `data` is still `undefined`/`[]` resolves to `loading`, never a flash of
 * `empty` (the empty-vs-loading race). `isError` is checked before `data` so an
 * error wins even when React Query is holding a previous successful value
 * (placeholderData / keepPreviousData) — fail-loud, per the convention.
 *
 * "Empty" is entity-shaped, so the caller injects `isEmpty` (e.g. `d => d.length === 0`).
 * The `data === undefined` guard is both defensive (an impossible not-pending/
 * not-error/no-data state resolves to `loading`, never a false `empty`) and the
 * type narrowing that lets `isEmpty` receive a defined `T`.
 *
 * Conceptually parallels `@vida/core`'s `ViewEngine.resolve` degrade contract
 * ("degrade, never crash") — same four-state shape, distinct implementation.
 */
export function deriveTerminalState<T>(result: QueryResultLike<T>, isEmpty: (data: T) => boolean): TerminalState {
  if (result.isPending) return 'loading'
  if (result.isError) return 'error'
  if (result.data === undefined) return 'loading'
  return isEmpty(result.data) ? 'empty' : 'success'
}
