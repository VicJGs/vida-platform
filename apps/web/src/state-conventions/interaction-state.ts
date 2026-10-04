// ============================================================================
// Interaction-state machine — fe-codec-patterns S1 (LIF-211). The CODEC's 8-state
// SUPERSET over the four-state terminal canon: the reusable form of ux-2's
// `SearchStatus`, so every input-bearing surface speaks ONE state vocabulary
// instead of re-inventing idle/typing/results.
//
// REUSES the `@vida/core` `TerminalState` canon (via ./terminal-state) — it adds
// no new canon and does NOT re-home the vocabulary; the `@vida/types` consolidation
// of the three un-unified copies is deferred and belongs to the canon's owner
// (state-conventions.md §1). Each of the 8 states COLLAPSES to exactly one of the
// four for the fail-loud/degrade contract ("degrade, never crash").
//
// Data/logic only — no chrome (the ux-4 rule). Rendering is @vida/ui + each module;
// this layer owns the vocabulary + derivation + the canonical state→render mapping.
// ============================================================================

// One import point for the web layer — re-export the terminal canon through here too
// (BR-S1-6), so a consumer imports the whole state vocabulary from one module.
export {
  TERMINAL_STATE,
  type TerminalState,
  type QueryResultLike,
  deriveTerminalState,
} from './terminal-state'

import { type QueryResultLike, type TerminalState, deriveTerminalState } from './terminal-state'

/**
 * The input-bearing superset (decomposition.md §1.3 / :39). The four terminal
 * members ARE the `@vida/core` canon's literals (never a 5th copy); the four
 * additions (`idle·typing·results·unavailable`) are surface sub-states that each
 * collapse back to a canonical one via {@link collapseToTerminal}.
 */
export const INTERACTION_STATE = [
  'idle',
  'typing',
  'loading',
  'results',
  'empty',
  'unavailable',
  'error',
  'success',
] as const

export type InteractionState = (typeof INTERACTION_STATE)[number]

/**
 * TOTAL collapse `InteractionState → TerminalState` — the fail-loud/degrade contract
 * (state-conventions.md:44-47 "each sub-state maps back to one of the four"). Authored
 * as net-new logic: ux-2's `SearchStatus` is a flat union with no collapse fn.
 *
 * An exhaustive `switch` (not a `Record` lookup) so removing any case fails `tsc` via
 * the `never` default — compile-time totality that also stays safe under the planned
 * `noUncheckedIndexedAccess` (a `Record` read would widen to `| undefined`).
 *
 * Rows (each grounded): `typing`→loading (a query in flight) · `results`→success
 * (content present) · `unavailable`→error (fail-loud, generalizes `search-unavailable`)
 * · `idle`→empty (nothing requested yet → no content to show; the nearest no-content
 * canonical renderer for the degrade fallback — a surface with a richer idle affordance
 * renders its own, this is only the fallback).
 */
export function collapseToTerminal(s: InteractionState): TerminalState {
  switch (s) {
    case 'loading':
      return 'loading'
    case 'empty':
      return 'empty'
    case 'error':
      return 'error'
    case 'success':
      return 'success'
    case 'typing':
      return 'loading'
    case 'results':
      return 'success'
    case 'unavailable':
      return 'error'
    case 'idle':
      return 'empty'
    default: {
      const _exhaustive: never = s
      return _exhaustive
    }
  }
}

/** The input dimension for an input-bearing surface (a search box, a filter field). */
export interface InputContext {
  /** The current query text. An empty string is `idle` — nothing requested yet. */
  query: string
}

/**
 * Derive an {@link InteractionState} from a React-Query result + an optional input
 * dimension. For a NON-input call it is `deriveTerminalState` lifted (identical four
 * outcomes + precedence). For an input call it adds `idle`/`typing`/`results`:
 *
 * 1. `input.query === ''` → `idle` — keyed on the empty query ALONE, never focus
 *    (the ground truth, `command-bar/search-provider.ts` `emptyQueryOutcome`).
 * 2. pending with a non-empty query → `typing` (a query in flight; collapses to loading).
 * 3. else the terminal dimension (`deriveTerminalState`, `isPending`-first / `isError`
 *    -before-data precedence preserved), remapping a non-empty `success` → `results`
 *    for a non-empty query (the surface-semantic alias; `empty` stays `empty` = "no matches").
 *
 * `unavailable` is NEVER derived here — it is a PRODUCER verdict ("this capability
 * isn't available", like `search-unavailable`), fed straight to {@link collapseToTerminal}
 * / the render map from a provider's status, bypassing this result-deriver.
 */
export function deriveInteractionState<T>(
  result: QueryResultLike<T>,
  isEmpty: (data: T) => boolean,
  input?: InputContext,
): InteractionState {
  if (input) {
    if (input.query === '') return 'idle'
    if (result.isPending) return 'typing'
  }
  const terminal = deriveTerminalState(result, isEmpty)
  if (input && input.query !== '' && terminal === 'success') return 'results'
  return terminal
}

/**
 * The render kind each state degrades to — one canonical mapping so surfaces don't
 * re-decide (extends state-conventions.md §3). `'input'` = the surface's own input
 * affordance (no overlay state). Wired to the real `@vida/ui` primitives as they land
 * (S2 ReducedMotion · S3 EmptyState · S4 SyncStatus) — `'skeleton'`=§3.1 recipe,
 * `'empty-state'`=`EmptyState`, `'error-card'`=inline error + retry.
 */
export type RenderKind = 'input' | 'skeleton' | 'content' | 'empty-state' | 'error-card'

export const INTERACTION_RENDER: Record<InteractionState, RenderKind> = {
  idle: 'input',
  typing: 'input',
  loading: 'skeleton',
  results: 'content',
  success: 'content',
  empty: 'empty-state',
  unavailable: 'error-card',
  error: 'error-card',
}

/** Index-safe reader for {@link INTERACTION_RENDER} (exhaustive — safe under noUncheckedIndexedAccess). */
export function renderKindFor(s: InteractionState): RenderKind {
  switch (s) {
    case 'idle':
    case 'typing':
      return 'input'
    case 'loading':
      return 'skeleton'
    case 'results':
    case 'success':
      return 'content'
    case 'empty':
      return 'empty-state'
    case 'unavailable':
    case 'error':
      return 'error-card'
    default: {
      const _exhaustive: never = s
      return _exhaustive
    }
  }
}
