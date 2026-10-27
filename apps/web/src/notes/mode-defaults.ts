// ============================================================================
// mode-defaults — the per-type merged/tabbed DEFAULT (notes-rescope R2, B-22 / BR-R2-2 · PLAN-R2 G6).
// The mode a page opens in when this device holds no remembered choice for it (and while that read is still loading —
// "seeded per-type default while loading"). The RIDE shape of `registerOverview`: Notes registers `note`; `*_note`
// types are registered by their owners (fe-tasks/fe-projects); `journal` isn't a Notes mode (Home's arrangement,
// journals-rescope). Unregistered → `tabbed`. The Note (editor) tab leads either way (EC-4, `defaultFacet:'editor'`).
// ============================================================================
import type { FacetMode } from '@vida/ui'

const defaults = new Map<string, FacetMode>()

/** A RIDE owner sets its page type's default mode. */
export function registerModeDefault(type: string, mode: FacetMode): void {
  defaults.set(type, mode)
}

/** The page type's default mode; unregistered → `tabbed`. */
export function defaultModeFor(type: string): FacetMode {
  return defaults.get(type) ?? 'tabbed'
}

// Notes owns the `note` default: tabbed, the Note (editor) tab leading (EC-4 / interpretation §5 #3).
registerModeDefault('note', 'tabbed')
