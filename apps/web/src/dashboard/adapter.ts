// ============================================================================
// Placement ↔ Dashboard adapter — fe-codec-dashboard S2 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a module/Space uses to drive
// @vida/ui's `DashboardView` from the @vida/core capability canon. This is the
// ONLY place @vida/core (CapabilityRegistry) + @vida/types (RenderTarget) meet
// the presentational shell — the Tamagui-only boundary forbids this in @vida/ui
// (BR-2; the fe-codec-collection adapter precedent).
//
// SHIPS (buildable + tested NOW): the pure `toCellDescriptor` / `toBlocks`
// mapping (block_instances → DashboardView cell descriptors, resolving defs
// through the registry + gating to `standalone`). DOES NOT ship a live data
// hook — no M1.2.1 Dashboard consumer is BUILT yet (Home #18 / Finance / the
// modules depend on it but ship after #5; grep clean). The concrete
// `useDashboard(spaceId)` hook (React Query → block_instances + the per-block
// providers + these pieces) is built at the FIRST consumer — the Collection
// adapter / `ProviderRead` type+convention precedent. See ./CLAUDE.md.
// ============================================================================
import type { CapabilityRegistry } from '@vida/core'
import type { RenderTarget } from '@vida/types'
import type { CellSize, DashboardBlock } from '@vida/ui'

/** The per-block terminal state the shell threads (the @vida/ui `ViewState` canon, extracted from the block descriptor
 *  — apps/web derives it via the 8-state machine + passes it, BR-2). */
type BlockState = DashboardBlock['state']

/** A structural projection of a `block_instances` row (≡ the relevant `schema.BlockInstanceRow` fields) — the module
 *  feeds this (the `SavedViewLike` precedent; decoupled from the sync-metadata columns). `config` = the [E] user-literal
 *  JSON holding placement attrs (title/size). */
export interface BlockInstanceLike {
  id: string
  capability_def_id: string
  config: string | null
}

/** A capability definition's dashboard-relevant face — structurally ≡ the shipped `CapabilityDefinition`
 *  (`registry.get`), kept local for decoupling (the adapter only needs id + render_targets to gate `standalone`). */
export interface CapabilityDefLike {
  id: string
  render_targets: readonly RenderTarget[]
}

const CELL_SIZES: readonly CellSize[] = ['sm', 'md', 'lg', 'full']
function isCellSize(v: unknown): v is CellSize {
  return typeof v === 'string' && (CELL_SIZES as readonly string[]).includes(v)
}

/** Parse the [E] instance `config` JSON → the placement literals the dashboard reads (title + size). TOLERANT:
 *  a null / malformed config yields `{}` (degrade-never-crash). */
export function parseBlockConfig(instance: BlockInstanceLike): { title?: string; size?: CellSize } {
  if (instance.config == null) return {}
  try {
    const c = JSON.parse(instance.config) as Record<string, unknown>
    return {
      title: typeof c.title === 'string' ? c.title : undefined,
      size: isCellSize(c.size) ? c.size : undefined,
    }
  } catch {
    return {}
  }
}

/** Is this capability placeable on a dashboard? (its render_targets must include `standalone`). */
export function isStandalone(def: CapabilityDefLike): boolean {
  return def.render_targets.includes('standalone')
}

/** Map a standalone block_instance (+ its PRE-RESOLVED def) + its derived state → a DashboardView cell descriptor. PURE.
 *  `title`/`size` come from the instance config (span default `md` when unset); `state` is derived by the app's 8-state
 *  machine, passed in. */
export function toCellDescriptor(
  instance: BlockInstanceLike,
  def: CapabilityDefLike,
  state: BlockState,
): DashboardBlock {
  const cfg = parseBlockConfig(instance)
  return {
    id: instance.id,
    title: cfg.title ?? def.id, // a human label is a config literal; fall back to the capability id
    size: cfg.size ?? 'md', // default span; the placement config overrides
    state,
  }
}

/** The full adapter convention a module/Space assembles. */
export interface DashboardAdapter {
  /** Resolve the placed instances' defs through the registry (ASYNC — `registry.get` returns a Promise), filter to
   *  `standalone`, and map each to a cell descriptor (threading each block's derived state; default `loading`). ORDER is
   *  preserved; an unresolvable def degrades to a skip (never crashes the dashboard). */
  toBlocks: (
    instances: readonly BlockInstanceLike[],
    registry: CapabilityRegistry,
    states: Record<string, BlockState>,
  ) => Promise<DashboardBlock[]>
}

export async function toBlocks(
  instances: readonly BlockInstanceLike[],
  registry: CapabilityRegistry,
  states: Record<string, BlockState>,
): Promise<DashboardBlock[]> {
  // Promise.all preserves array order; a per-instance guard degrades an unresolvable/non-standalone placement to a skip.
  const resolved = await Promise.all(
    instances.map(async (instance) => {
      try {
        const def = await registry.get(instance.capability_def_id)
        if (!isStandalone(def)) return null
        return toCellDescriptor(instance, def, states[instance.id] ?? 'loading')
      } catch {
        return null
      }
    }),
  )
  return resolved.filter((b): b is DashboardBlock => b !== null)
}

/** Assemble the adapter (the pure, no-React half of the convention). */
export function createDashboardAdapter(): DashboardAdapter {
  return { toBlocks }
}
