// ============================================================================
// overview-registry — the Layout-facet SLOT (the cross-unit RIDE seam, slice-map D1
// / seam-contract 3a). A module-level map from page type → an Overview COMPONENT.
//
// Notes registers only `note` (BR-R1-4); the journal Overview is journals-rescope's (EC-18a re-pin), and
// fe-tasks/fe-projects register their `*_note` types (zero-signature swap). An ABSENT renderer falls back to
// fe-notes' own `note` layout — empty-but-functional, no dead affordance (the fe-shell panel-slot precedent).
// Renderers are components, mounted as `<Overview/>` (notes-rescope R1, IR-R13): a registrant's hooks bind to its own
// instance, never to the page that hosts it.
// ============================================================================
import type { ComponentType } from 'react'
import type { FacetMode } from '@vida/ui'
import type { PageType } from '@vida/types'
import type { NoteEntityData } from './use-note-entity'
import { NoteOverview } from './note-overview'

/** What a renderer receives: the page + the active facet mode (it branches merged⇄tabbed). */
export interface OverviewContext {
  page: NoteEntityData
  mode: FacetMode
}

/** A per-page-type Layout-facet component (the RIDE contract the owning unit implements). */
export type OverviewRenderer = ComponentType<OverviewContext>

const registry = new Map<PageType, OverviewRenderer>()

/** Register a per-entity-type Overview renderer (fe-tasks/fe-projects call this for their types — the RIDE seam). */
export function registerOverview(type: PageType, renderer: OverviewRenderer): void {
  registry.set(type, renderer)
}

/** Resolve the slot for an entity type. Absent ⇒ fe-notes' own `note` layout (empty-but-functional; seam-contract 3a). */
export function overviewFor(type: PageType): OverviewRenderer {
  return registry.get(type) ?? NoteOverview
}

// Notes owns the `note` Overview only; every other type RIDEs in from its owning unit.
registerOverview('note', NoteOverview)
