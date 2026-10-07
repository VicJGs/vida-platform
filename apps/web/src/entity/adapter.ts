// ============================================================================
// Entity ↔ EntityView adapter — fe-codec-entity-facet S2 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a module uses to drive @vida/ui's
// `EntityView` from the @vida/core page-ability registry. This is the ONLY place
// @vida/core (`schema.isEntityType`) meets the presentational shell — the
// Tamagui-only boundary forbids this in @vida/ui (BR-2; the collection/dashboard
// adapter precedent).
//
// SHIPS (buildable + tested NOW): the pure `offersEditor` gate (the "registry-
// gated editor": the Editor facet is offered iff the entity type is page-able AND
// a page exists) + `toEntityProps` (which PASSES the editor slot only when the
// gate is open) + the merged/tabbed memory CONVENTION. DOES NOT ship a live data
// hook — no M1.2.1 entity-page consumer is BUILT yet (the module entity pages
// depend on this but ship after #6; grep clean). The concrete
// `useEntity(entityType, entityId)` hook (React Query → the entity + its `pages`
// row + the mode preference) is built at the FIRST consumer — the Collection/
// Dashboard adapter precedent. See ./CLAUDE.md.
// ============================================================================
import type { ReactNode } from 'react'
import { schema } from '@vida/core'
import type { EntityViewProps, Facet, FacetMode } from '@vida/ui'

/** The per-block/page terminal state the shell threads (the @vida/ui `ViewState` canon, carried by EntityViewProps). */
type EditorState = EntityViewProps['editorState']

/**
 * THE pure gate (the "registry-gated editor"): does this entity get an Editor facet?
 * Page-able IFF the type is registered in `@vida/core`'s `ENTITY_TYPES` registry (ADR-006 SP2) AND a page exists.
 * `@vida/ui` cannot consult the registry (it's in `@vida/core`) → this is where the gate lives, resolving to a boolean
 * the app turns into `editor`-slot presence.
 */
export function offersEditor(entityType: string, hasPage: boolean): boolean {
  return schema.isEntityType(entityType) && hasPage
}

/** The module-fed source for one entity page. `editorNode` is the COMPOSED Editor body (the entity's linked page =
 *  Canvas: Editor #7) — it is passed through to the shell ONLY when `offersEditor` is open. */
export interface EntitySource {
  title: string
  subtitle?: ReactNode
  entityType: string
  hasPage: boolean
  /** The composed Editor facet body — gated: only reaches EntityView when the entity is page-able. */
  editorNode?: ReactNode
  editorState?: EditorState
  /** The Layout facet body — a self-stating composite (DashboardView + CollectionView + summary). */
  layout: ReactNode
  // the facet composition mode + the active facet — the app owns + persists (the mode store below).
  mode: FacetMode
  onModeChange: (next: FacetMode) => void
  defaultFacet?: Facet
  activeFacet?: Facet
  onActiveFacetChange?: (next: Facet) => void
  layoutLabel?: string
  editorLabel?: string
}

/**
 * THE pure mapping: an entity source → `EntityView` props. The `editor` slot is included IFF `offersEditor` is open —
 * that is the registry gate in action (a non-page-able entity gets NO editor, so the shell shows no Content tab/section).
 */
export function toEntityProps(src: EntitySource): EntityViewProps {
  const editor = offersEditor(src.entityType, src.hasPage) ? src.editorNode : undefined
  return {
    title: src.title,
    subtitle: src.subtitle,
    mode: src.mode,
    onModeChange: src.onModeChange,
    defaultFacet: src.defaultFacet,
    activeFacet: src.activeFacet,
    onActiveFacetChange: src.onActiveFacetChange,
    layout: src.layout,
    editor,
    editorState: src.editorState,
    layoutLabel: src.layoutLabel,
    editorLabel: src.editorLabel,
  }
}

/**
 * The merged/tabbed per-instance MEMORY (O4 — the storage schema is design-pass-open per frontend-quality-bar:150 /
 * ADR-006:130). The adapter defines the CONVENTION; the first consumer binds it to real storage (user_preferences or an
 * entity-instance field). A per-type default seeds a cold entity ("remembered per instance", quality-bar:127).
 */
export interface EntityModeStore {
  readMode(entityType: string, entityId: string): FacetMode
  persistMode(entityType: string, entityId: string, mode: FacetMode): void
}

/** A reference in-memory `EntityModeStore` (the convention, testable; NOT the durable storage — that's the first consumer's).
 *  Keys by `entityType:entityId`; an unseen entity returns `defaultMode`. */
export function createInMemoryEntityModeStore(defaultMode: FacetMode = 'merged'): EntityModeStore {
  const store = new Map<string, FacetMode>()
  const key = (t: string, id: string) => `${t}:${id}`
  return {
    readMode: (t, id) => store.get(key(t, id)) ?? defaultMode,
    persistMode: (t, id, mode) => {
      store.set(key(t, id), mode)
    },
  }
}

/** THE CONVENTION a module composes to drive EntityView (the gate + the mapping + the mode store). The live
 *  `useEntity(entityType, entityId)` hook is built at the first consumer (R3). */
export interface EntityAdapter {
  offersEditor: typeof offersEditor
  toEntityProps: typeof toEntityProps
  mode: EntityModeStore
}

/** Compose the convention from a mode store (the pure functions + the injected store). */
export function createEntityAdapter(mode: EntityModeStore): EntityAdapter {
  return { offersEditor, toEntityProps, mode }
}
