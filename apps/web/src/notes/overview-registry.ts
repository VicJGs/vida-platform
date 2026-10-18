// ============================================================================
// overview-registry — the Layout-facet SLOT (the cross-unit RIDE seam, slice-map D1
// / seam-contract 3a). A module-level map from `entity_type` → an Overview renderer.
//
// S2 registers `note` (full) + `journal` (stub); fe-tasks/fe-projects call
// `registerOverview` for their types later (zero-signature swap). An ABSENT renderer
// falls back to fe-notes' own `note` layout — empty-but-functional, no dead
// affordance (the fe-shell panel-slot precedent).
// ============================================================================
import type { ReactNode } from 'react'
import type { FacetMode } from '@vida/ui'
import type { PageType } from '@vida/types'
import type { NoteEntityData } from './use-note-entity'
import { noteOverview, journalOverviewStub } from './note-overview'

/** What a renderer receives: the page + the active facet mode (it branches merged⇄tabbed). */
export interface OverviewContext {
  page: NoteEntityData
  mode: FacetMode
}

/** A per-entity-type Layout-facet renderer (the RIDE contract the owning unit implements). */
export type OverviewRenderer = (ctx: OverviewContext) => ReactNode

const registry = new Map<PageType, OverviewRenderer>()

/** Register a per-entity-type Overview renderer (fe-tasks/fe-projects call this for their types — the RIDE seam). */
export function registerOverview(type: PageType, renderer: OverviewRenderer): void {
  registry.set(type, renderer)
}

/** Resolve the slot for an entity type. Absent ⇒ fe-notes' own `note` layout (empty-but-functional; seam-contract 3a). */
export function overviewFor(type: PageType): OverviewRenderer {
  return registry.get(type) ?? noteOverview
}

// S2 ships note (full) + journal (stub); the rest RIDE in later.
registerOverview('note', noteOverview)
registerOverview('journal', journalOverviewStub)
