// ============================================================================
// Views substrate — types + typed errors  (AR-6 · ADR-007)
//
// A view = filter × layout × grouping (V3). The engine reads through per-module
// ReadProviders (V4/R7 — INT-1), merges, groups, and returns a terminal state
// (V5/R5). AR-6 ships the engine + the provider INTERFACE + an empty registry;
// real providers register per-module at their build (ADR-007 §3.4).
// ============================================================================

import type { ViewFilterOp } from '@vida/types'

/** The filter half of a view: the ADR-007 §3.6 grammar (VW-8). Stored as JSON TEXT. A row written before the
 *  grammar reads through `normalizeViewFilter` (§3.6.4) — see `StoredViewFilter`. */
export interface ViewFilter {
  entity_types: string[]
  /** Every provider applies it, nested-aware (§3.6.1): `any` union · `all` intersection · `none` exclusion, ANDed. */
  tags?: TagClause
  /** AND conjuncts (§3.6.2); a conjunct a provider can't apply is ignored for that type (§3.3.4). */
  where?: Clause[]
  exclude_unsupported?: boolean
  /** Saved-view ids drawn as lanes (§3.9, Living). */
  lanes?: string[]
}

export interface TagClause {
  any?: string[]
  all?: string[]
  none?: string[]
}

export type Op = ViewFilterOp

/** A relative date, resolved at read time to a `YYYY-MM-DD` (§3.6.3). */
export interface RelativeDate {
  rel: 'today'
  days?: number
}

export type Literal = string | number | boolean | null

/** A literal · a list (`in`, `between`) · a relative date. */
export type Value = Literal | RelativeDate | (Literal | RelativeDate)[]

export interface Comparison {
  field: string
  op: Op
  value?: Value
}

export type Clause = Comparison | { any: Clause[] } | { not: Clause }

/** A filter as it may sit in a `views` row or reach `ReadProvider.list`: the grammar, or the pre-grammar keys
 *  (`tags: string[]`, `predicates: { k: v }`) an older client wrote. Read it through `normalizeViewFilter`. */
export interface StoredViewFilter {
  entity_types?: string[]
  tags?: TagClause | string[]
  where?: Clause[]
  /** Pre-grammar: one `eq` conjunct per key, or a provider-declared alias (§3.6.4). */
  predicates?: Record<string, unknown>
  exclude_unsupported?: boolean
  lanes?: string[]
}

/** Legacy `predicates` keys a provider maps to a comparison other than `eq` on the same field (§3.6.4). A small
 *  provider-owned declaration (Tasks: `due_before` → `due_date lt`), the seed of §3.7's `capabilities.aliases`. */
export type FilterAliases = Readonly<Record<string, { field: string; op: Op }>>

/** Grouping directive (applied after filter, independent of layout). */
export interface ViewGrouping {
  field?: string
}

/** A module's documented read API for one entity type (V4/R7 provider fan-out).
 *  The seam modules register through — never a direct cross-module table read. */
export interface ReadProvider {
  entityType: string
  /** Receives the filter as stored; the provider reads it through `normalizeViewFilter` with its own aliases. */
  list(filter: StoredViewFilter): Promise<unknown[]>
}

export type ViewState = 'loading' | 'empty' | 'error' | 'success'

export interface ResolvedGroup {
  key: string
  rows: unknown[]
}

/** The engine's resolution result (V5/R5 terminal states, degrade never crash). */
export interface ResolvedView {
  rows: unknown[]
  groups: ResolvedGroup[]
  state: ViewState
  /** Per-type declared degradations (no provider / provider error) — BR-11/BR-12. */
  degraded: string[]
}

// --- Typed errors ------------------------------------------------------------
export class ViewNotFound extends Error {
  constructor(public readonly viewId: string) {
    super(`No view found for id '${viewId}'`)
    this.name = 'ViewNotFound'
  }
}

/** Thrown ONLY on a direct provider lookup (a `require`-style caller). The engine
 *  itself never throws this mid-resolve — a missing provider degrades (BR-11). */
export class NoProviderForEntityType extends Error {
  constructor(public readonly entityType: string) {
    super(`No ReadProvider registered for entity_type '${entityType}'`)
    this.name = 'NoProviderForEntityType'
  }
}
