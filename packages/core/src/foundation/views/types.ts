// ============================================================================
// Views substrate — types + typed errors  (AR-6 · ADR-007)
//
// A view = filter × layout × grouping (V3). The engine reads through per-module
// ReadProviders (V4/R7 — INT-1), merges, groups, and returns a terminal state
// (V5/R5). AR-6 ships the engine + the provider INTERFACE + an empty registry;
// real providers register per-module at their build (ADR-007 §3.4).
// ============================================================================

/** The filter half of a view (ADR-007 §3.3). Stored as JSON TEXT. */
export interface ViewFilter {
  tags?: string[]
  entity_types?: string[]
  predicates?: Record<string, unknown>
}

/** Grouping directive (applied after filter, independent of layout). */
export interface ViewGrouping {
  field?: string
}

/** A module's documented read API for one entity type (V4/R7 provider fan-out).
 *  The seam modules register through — never a direct cross-module table read. */
export interface ReadProvider {
  entityType: string
  list(filter: ViewFilter): Promise<unknown[]>
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
