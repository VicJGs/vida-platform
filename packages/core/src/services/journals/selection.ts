// ============================================================================
// services/journals — selection resolution (mod-journals #39 · Slice 2)
//
// The pure default-resolution logic for which data points show per module: a
// global default overlaid by a per-journal override (override wins PER MODULE,
// no module dropped — BR-6). Lifted verbatim from the UX-6 design model
// (apps/web/src/home/selection.ts); @vida/core is now the canonical home (the
// backend engine owns it; apps/web migrates via fe-journals). The STORAGE
// (get/setSelection) is a seam — no Preferences field / generalized
// summary_config exists yet (N-3), so it is NOT ported here.
// ============================================================================

import type { JournalSelection } from './types'

/**
 * Resolve the effective selection: the per-journal override replaces the global
 * default PER MODULE; modules the override does not mention keep the global
 * default (no module is dropped). Pure. `[FACT: journals/business-rules.md:22 JR-4 (BR-6)]`
 */
export function resolveSelection(
  globalDefault: JournalSelection,
  perJournalOverride?: Partial<JournalSelection>,
): JournalSelection {
  const resolved: Record<string, readonly string[]> = { ...globalDefault }
  for (const [module, dataPoints] of Object.entries(perJournalOverride ?? {})) {
    if (dataPoints !== undefined) resolved[module] = dataPoints
  }
  return resolved
}
