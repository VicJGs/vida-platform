// ============================================================================
// services/journals — the contribution registry (mod-journals #39 · Slice 1)
//
// The seam a module registers its journal presence into. Mirrors the ADR-004
// factory-registry pattern (createEffectRegistry) — an in-memory map, no db
// (contributions are runtime code, not a table; structure-data.md:19-22).
// Supersedes the inert apps/web UX-6 placeholder that threw JournalSeamNotActivated.
// ============================================================================

import type { HomeSectionKey, JournalContribution } from './types'

/** Declared section order for deterministic iteration (BR-S1-2 / IR-a2). */
const SECTION_ORDER: readonly HomeSectionKey[] = ['summary', 'agenda', 'entry']

export interface JournalRegistry {
  /** Register a module's contribution. Dedup by `module` — re-register OVERWRITES
   *  (BR-S1-3): the `module` key is self-owned (only that module registers under
   *  it), so a second register is an idempotent re-wire, not a collision. This
   *  deliberately differs from EffectRegistry, whose shared `effectType` key throws. */
  register(def: JournalContribution): void
  /** All contributions in a DETERMINISTIC order (BR-S1-2): by `sectionKey`
   *  (summary → agenda → entry), then `module` ascending — never insertion order. */
  list(): readonly JournalContribution[]
  /** The contribution registered under `module`, or `undefined`. */
  get(module: string): JournalContribution | undefined
}

export function createJournalRegistry(): JournalRegistry {
  const contributions = new Map<string, JournalContribution>()
  return {
    register(def) {
      contributions.set(def.module, def) // overwrite by module key (BR-S1-3)
    },
    list() {
      return [...contributions.values()].sort((a, b) => {
        const bySection =
          SECTION_ORDER.indexOf(a.sectionKey) - SECTION_ORDER.indexOf(b.sectionKey)
        return bySection !== 0 ? bySection : a.module.localeCompare(b.module)
      })
    },
    get(module) {
      return contributions.get(module)
    },
  }
}
