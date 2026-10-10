// fe-codec-canvas-editor (#7) · S3 — the persistence CONVENTION + the EntityView slot binding (apps/web plane, PURE).
//
// The seam between a `pages` row and the presentational CanvasEditor. Pure (types + mapping only) — per the
// ProviderRead convention (fe-codec-patterns s5-conventions.md:15, "a TYPE + convention, not a hook; the hook is
// deferred to the first consumer") and the sibling canvas/entity adapter precedent. It ships NO live data hook and
// touches NO @vida/core at runtime: the runtime `pages` read/write wiring is the first consumer's (#27 fe-notes) and
// the Spaces/engine runtime wiring is #13 seams (reconstructed-structure.md:33). IR-6.
//
// Slot binding: the EntityView `editor` slot is ALREADY produced + registry-gated by #6
// (apps/web/src/entity/adapter.ts — `offersEditor` + `EntitySource.editorNode`). #7 supplies WHAT that `editorNode`
// IS: `editorNode: <CanvasEditor {...toCanvasEditorProps(page, opts)} />`. No new gate/producer is built here.
import type { EditorDocument } from '@vida/types'
import type { ProviderRead } from '../providers/provider-read'
import type { CanvasEditorProps } from './canvas-editor'

/** A structural projection of a `pages` row — the fields the editor canvas needs (the `SavedViewLike`/`PageLike`
 *  decoupled-from-sync-metadata precedent). The module feeds this; `content` is the stored TipTap doc (null = blank). */
export interface PageLike {
  id: string
  /** The user-named page = the CanvasEditor title (EC-1). */
  title: string
  /** The stored editor document; `null` = an untouched/blank page. */
  content: EditorDocument | null
}

/** The live-read shape (ProviderRead<EditorDocument>) a consumer's hook will satisfy. The concrete
 *  `usePage(entityType, entityId)` / `useEditorDoc(pageId)` hook (React Query → @vida/core pages) is DEFERRED to the
 *  first consumer (#27) — this names the seam for typing, no hook shipped (ProviderRead convention). */
export type EditorDocReader = ProviderRead<EditorDocument>

/** Extras the runtime supplies that a bare `pages` row doesn't carry — the entity-type eyebrow + the derived
 *  save-state (which only exists at runtime, from the persistence wire). All optional. */
export interface CanvasEditorBindingOpts {
  /** Entity-type eyebrow, e.g. "Note" (the owning module knows its type). */
  eyebrow?: string
  /** Derived save-state → the SyncStatus chip. Omit → no chip (M1 honest: saved|error only). */
  syncState?: 'saved' | 'error'
  /** Read-only when false. */
  editable?: boolean
  /** The change sink — wired to `pages.content` persistence AT THE CONSUMER (IR-3/IR-6); not owned here. */
  onChange?: (doc: EditorDocument) => void
}

/**
 * THE pure mapping: a `pages` row → `CanvasEditorProps`. `meta` reports the block count (a cheap, now-free derivation;
 * time-relative "edited" strings need a clock + formatter → the consumer enriches). The produced props build the
 * `editorNode` the #6 entity adapter gates into EntityView's `editor` slot.
 */
export function toCanvasEditorProps(page: PageLike, opts: CanvasEditorBindingOpts = {}): CanvasEditorProps {
  const blocks = page.content?.content?.length ?? 0
  return {
    title: page.title,
    eyebrow: opts.eyebrow,
    meta: `${blocks} ${blocks === 1 ? 'block' : 'blocks'}`,
    syncState: opts.syncState,
    doc: page.content ?? undefined,
    onChange: opts.onChange,
    editable: opts.editable,
    // state is derived + threaded by the consumer (loading while the page loads, empty for a blank page, etc.).
  }
}
