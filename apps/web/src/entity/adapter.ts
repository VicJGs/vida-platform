// ============================================================================
// Entity ↔ EntityView adapter — fe-codec-entity-facet S2 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a module uses to drive @vida/ui's
// `EntityView` from the @vida/core page-ability registry. This is the ONLY place
// @vida/core (`schema.isEntityType`) meets the presentational shell — the
// Tamagui-only boundary forbids this in @vida/ui (BR-2; the collection/dashboard
// adapter precedent).
//
// notes-rescope R1 (NP-10 / EC-15): a PAGE surface gates on page type instead — `offersPageEditor` (every
// `PAGE_TYPE` member is editor-capable), chosen per source by `gate: 'page'`. The entity gate below is unchanged.
//
// SHIPS: the pure `offersEditor` gate (the "registry-gated editor": the Editor facet is offered iff the entity type is
// page-able AND a page exists) + `toEntityProps` (which PASSES the editor slot only when the gate is open) + the
// merged/tabbed memory CONVENTION and its durable store `createAppStateEntityModeStore` (notes-rescope R2: `app_state`
// `entity_mode:<type>:<id>`, ADR-006 §3.6 — the notes page binds it via `notes/use-entity-modes.ts`). See ./CLAUDE.md.
// ============================================================================
import type { ReactNode, Ref } from 'react'
import { entityModeKey, schema } from '@vida/core'
import { PAGE_TYPE } from '@vida/types'
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

/**
 * THE page-surface gate (NP-10, notes-rescope R1): every page type is editor-capable. A page surface keys on `PAGE_TYPE`,
 * not on the `ENTITY_TYPES` polymorphic-reference registry (which governs module-entity surfaces) — the four `*_note`
 * types are page types but not registered entity types.
 */
export function offersPageEditor(pageType: string): boolean {
  return (PAGE_TYPE as readonly string[]).includes(pageType)
}

/** The module-fed source for one entity page. `editorNode` is the COMPOSED Editor body (the entity's linked page =
 *  Canvas: Editor #7) — it is passed through to the shell ONLY when `offersEditor` is open. */
export interface EntitySource {
  title: string
  subtitle?: ReactNode
  entityType: string
  hasPage: boolean
  /** Which gate opens the editor: `'entity'` (default — `offersEditor`, the registry gate) or `'page'` (a page surface —
   *  `offersPageEditor`; `hasPage` is ignored, since a page surface IS the page). */
  gate?: 'entity' | 'page'
  /** The ⋯ entity-action slot (save status + menu) — passed through to `EntityView.action`. */
  action?: ReactNode
  /** notes-rescope R3 — the in-place rename seam + the H1 focus target, passed through to EntityView. */
  onTitleCommit?: (next: string) => void
  titleEditValue?: string
  titleRef?: Ref<HTMLElement>
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
  const open = src.gate === 'page' ? offersPageEditor(src.entityType) : offersEditor(src.entityType, src.hasPage)
  const editor = open ? src.editorNode : undefined
  return {
    title: src.title,
    subtitle: src.subtitle,
    action: src.action,
    onTitleCommit: src.onTitleCommit,
    titleEditValue: src.titleEditValue,
    titleRef: src.titleRef,
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
 * The merged/tabbed per-instance MEMORY (the CONVENTION). Storage RESOLVED by notes-rescope R2 (ADR-006 §3.6): the
 * device-local `app_state` KV, key `entity_mode:<entityType>:<entityId>` — `createAppStateEntityModeStore` below. A
 * per-type default seeds a cold entity ("remembered per instance", quality-bar:127) and every entity while the read loads.
 */
export interface EntityModeStore {
  readMode(entityType: string, entityId: string): FacetMode
  persistMode(entityType: string, entityId: string, mode: FacetMode): void
}

/** A reference in-memory `EntityModeStore` (the convention, testable; NOT the durable storage — that's
 *  `createAppStateEntityModeStore`). Used by the DEV `?sample` page and tests.
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

const isFacetMode = (v: unknown): v is FacetMode => v === 'merged' || v === 'tabbed'

/**
 * The durable `EntityModeStore` (notes-rescope R2, A-43) — PRELOADED, so `readMode` stays sync. `rows` = every stored
 * `entity_mode:` row by full key (`undefined` while the read is loading → the seeded per-type default). An unknown
 * stored value counts as absent (BR-R2-5). `persist` owns the write (cache + app_state) — the adapter stays storage-free.
 */
export function createAppStateEntityModeStore(
  rows: Readonly<Record<string, string>> | undefined,
  defaultFor: (entityType: string) => FacetMode,
  persist: (key: string, mode: FacetMode) => void,
): EntityModeStore {
  return {
    readMode: (t, id) => {
      const stored = rows?.[entityModeKey(t, id)]
      return isFacetMode(stored) ? stored : defaultFor(t)
    },
    persistMode: (t, id, mode) => persist(entityModeKey(t, id), mode),
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
