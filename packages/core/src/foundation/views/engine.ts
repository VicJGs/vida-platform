// ============================================================================
// ViewEngine — resolve a saved view over registered ReadProviders
// (AR-6 · ADR-007 §3.3/§3.4, V3/V4/V5)
//
// Fans the view's filter out to each selected entity_type's provider (V4/R7),
// merges the results, groups them (V3), and returns a terminal state (V5/R5).
// Cross-type resolution rules (V3):
//   • a selected type with NO provider → contributes nothing + a declared
//     degraded note; the type is NEVER silently dropped, and resolve NEVER
//     throws mid-fan-out (BR-11).
//   • a provider that throws → degraded note + state 'error' (degrade, not crash).
//   • group-by a field a row lacks → the row goes to the 'ungrouped' bucket (BR-10).
//   • empty result set → state 'empty'.
// ============================================================================

import { createViewProviderRegistry, type ViewProviderRegistry } from './provider-registry'
import type { ViewFilter, ViewGrouping, ResolvedGroup, ResolvedView } from './types'
import type { ViewRow } from '../../db/schema/foundation/spaces'

const UNGROUPED = 'ungrouped'

export interface ViewEngine {
  registry: ViewProviderRegistry
  resolve(view: ViewRow): Promise<ResolvedView>
}

function parse<T>(json: string | null | undefined, fallback: T): T {
  if (json == null) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export function createViewEngine(registry: ViewProviderRegistry = createViewProviderRegistry()): ViewEngine {
  async function resolve(view: ViewRow): Promise<ResolvedView> {
    const filter = parse<ViewFilter>(view.filter, {})
    const grouping = parse<ViewGrouping>(view.grouping, {})
    const entityTypes = filter.entity_types ?? []

    const rows: unknown[] = []
    const degraded: string[] = []
    let providerErrored = false

    // V4/R7 — fan out to each selected type's documented read provider.
    for (const type of entityTypes) {
      const provider = registry.get(type)
      if (!provider) {
        degraded.push(`no provider for entity_type '${type}'`) // BR-11 — declared, not dropped
        continue
      }
      try {
        const typeRows = await provider.list(filter)
        rows.push(...typeRows)
      } catch {
        providerErrored = true
        degraded.push(`provider for entity_type '${type}' failed`) // degrade, never crash
      }
    }

    // V3 — grouping (ungrouped bucket for rows lacking the group-by field).
    const groups: ResolvedGroup[] = []
    if (grouping.field) {
      const buckets = new Map<string, unknown[]>()
      for (const row of rows) {
        const val = (row as Record<string, unknown>)[grouping.field]
        const key = val == null ? UNGROUPED : String(val)
        const bucket = buckets.get(key) ?? []
        bucket.push(row)
        buckets.set(key, bucket)
      }
      for (const [key, bucketRows] of buckets) groups.push({ key, rows: bucketRows })
    }

    // V5/R5 — terminal state.
    const state = providerErrored ? 'error' : rows.length === 0 ? 'empty' : 'success'
    return { rows, groups, state, degraded }
  }

  return { registry, resolve }
}
