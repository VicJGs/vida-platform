// fe-onboarding (LIF-216) · S2 — the module enable-set picker's DATA projection (EC-4). Pure, no React.
// Projects the canonical `MODULE_MAP` to the picker's grouped candidate roster, MIRRORING the shipped dock's
// visibility logic so the picker's default can never lie about what the dock actually shows:
//   - `placement === 'dock'` only, then the `visibleWhen`/`isFeatureEnabled` fail-closed gate
//   [FACT: apps/web/src/shell/module-dock.tsx:39-54 visibleDockGroups · feature-flags.ts:10 fails closed].
// The dock is chrome consumer #1 of (MODULE_MAP + the flag seam); this picker is consumer #2 — each chrome surface
// composes the data SSOT + the flag itself (the existing pattern), so this re-derives rather than imports from the
// dock COMPONENT. Group labels are chrome's by design [FACT: module-dock.tsx:17-18] → a local GROUP_LABELS mirror.
import { MODULE_MAP, type ModuleGroup } from '../nav/module-map'
import { isFeatureEnabled } from '../shell/feature-flags'

/** A dock module as the picker needs it — key + its display label. */
export interface DockModule {
  readonly key: string
  readonly label: string
}

/** The dock roster grouped for the picker (declaration order; only non-empty groups). */
export interface DockModuleGroup {
  readonly group: ModuleGroup
  readonly label: string
  readonly modules: readonly DockModule[]
}

// Mirror of `module-dock.tsx` GROUP_LABELS (information-architecture.md §3). Labels live with chrome by the documented
// key-vs-label split (module-map.ts:17-18) — the picker is a second chrome surface, so it owns its own copy.
const GROUP_LABELS: Record<ModuleGroup, string> = {
  integration: 'Integration',
  productivity: 'Productivity',
  knowledge: 'Knowledge',
  'personal-growth': 'Personal Growth',
  'life-management': 'Life Management',
  'platform-services': 'Platform Services',
}

/**
 * The visible dock modules, grouped in declaration order — the picker's candidate roster. Mirrors
 * `visibleDockGroups()`: `placement:'dock'` filtered by the fail-closed `visibleWhen` gate FIRST, then grouped, so a
 * group left with zero visible entries never appears (S2-BR-a2; e.g. `platform-services`, whose only dock member is the
 * flag-gated `gamification`, drops in M1.0).
 */
export function getDockModuleGroups(): DockModuleGroup[] {
  const order: ModuleGroup[] = []
  const byGroup = new Map<ModuleGroup, DockModule[]>()
  for (const entry of MODULE_MAP) {
    if (entry.placement !== 'dock') continue
    if (entry.visibleWhen != null && !isFeatureEnabled(entry.visibleWhen)) continue // fail-closed, mirrors the dock
    const mod: DockModule = { key: entry.key, label: entry.label }
    const existing = byGroup.get(entry.group)
    if (existing == null) {
      order.push(entry.group)
      byGroup.set(entry.group, [mod])
    } else {
      existing.push(mod)
    }
  }
  return order.map((group) => ({ group, label: GROUP_LABELS[group], modules: byGroup.get(group) ?? [] }))
}

/**
 * The default enable-set: every visible dock module ON — the exact behavior today (no default-OFF mechanism exists).
 * Keyed by module key. Honest preview: enabling-by-default == what the dock already shows (EC-4/EC-7).
 */
export function defaultModuleEnableSet(): Record<string, boolean> {
  const enabled: Record<string, boolean> = {}
  for (const group of getDockModuleGroups()) {
    for (const mod of group.modules) enabled[mod.key] = true
  }
  return enabled
}
