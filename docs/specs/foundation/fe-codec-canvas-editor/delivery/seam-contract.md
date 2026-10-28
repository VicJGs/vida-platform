# Seam-contract — fe-codec-canvas-editor (#7, LIF-234)

> The APIs each slice ships + consumes. Entity Delivery Flow ② · Step 2. Types are the contract the per-slice
> gates verify against. No `@vida/core` runtime coupling (IR-6); `@vida/ui` never imports `@vida/editor` (IR-1).

## S1 — `@vida/editor` extension (UI-3)

```ts
// editor.tsx — additive, back-compat (default preserves today's render).
export interface VidaEditorProps {
  // …existing: defaultValue, onChange, editable, toolbar, placeholder, aria-* …
  /** Chrome treatment. 'framed' (default) = today's bordered EditorFrame. 'bare' = transparent, no border/radius
   *  (host supplies the page surface — the Canvas: Editor notebook page), focus-ring host + writing inset kept. */
  chrome?: 'framed' | 'bare'
}
```

- `editor-styles.ts` (internal, no API): `.vida-editor-frame .ProseMirror{color:var(--colorTextPrimary)}` (EC-7) + a `'bare'` style branch keyed off a frame class/attr + comfortable base `line-height`.
- Invariants: `chrome` omitted ⇒ byte-identical to today (back-compat). `'bare'` keeps `.ProseMirror` focusable + the focus-ring-on-frame. Colors stay token-only (no hex).

## S2 — `apps/web` `CanvasEditor`

```ts
export interface CanvasEditorProps {
  /** The page title = the user-named page (EC-1) — NEVER a filename. */
  title: string
  /** Entity-type eyebrow (e.g. "Note"). */
  eyebrow?: string
  /** Quiet meta subline (e.g. "Edited 2h ago · 6 blocks"). */
  meta?: ReactNode
  /** Derived save-state → the SyncStatus chip in the masthead actions slot (locked top-right). */
  syncState?: 'saved' | 'error'
  /** The 8-state-collapsed canvas state (app derives + passes — patterns R4). Default 'success'. */
  state?: CanvasState // 'loading' | 'empty' | 'error' | 'success'
  /** The editor document (uncontrolled seed) + change sink — threaded to <VidaEditor> (IR-3). */
  doc?: EditorDocument
  onChange?: (doc: EditorDocument) => void
  editable?: boolean // default true
  'aria-label'?: string
  'aria-labelledby'?: string
}
```

- Renders: `CanvasView` masthead (eyebrow/title/meta + `<SyncStatus>` in `actions`) → the notebook page sheet-on-desk → `<VidaEditor chrome="bare" defaultValue={doc} onChange editable aria-label>`; state overrides via `CanvasView` (`loading`→skeleton, `empty`→`EmptyState`, `error`→calm message).
- Output: a drop-in `ReactNode` → EntityView #6 `editor` slot (IR-5). NON-generic (no `<T>`; holds no entity data).

## S3 — persistence convention + slot producer (pure)

```ts
/** Pure projection: a page row ≡ the fields the editor canvas needs (the SavedViewLike precedent). */
export interface PageLike {
  id: string
  title: string
  content: EditorDocument | null
  updatedAt: number
}
/** The documented mapping: page.content ⇄ <VidaEditor> doc; onChange(doc) ⇒ page.content write (wired at the consumer). */
export type EditorDocReader = () => Promise<EditorDocument> // ProviderRead<EditorDocument> shape — hook DEFERRED to #27.
/** Slot producer convention: apps/web resolves a page-able entity → <CanvasEditor> as EntityView's `editor` ReactNode,
 *  registry-gated (isEntityType + page lookup). Produces the node or omits it (the onFilter!=null precedent). */
```

- Ships: `PageLike`, the mapping convention (header-documented), the slot-producer convention. **No hook, no `@vida/core` call** (IR-6).

## Consumed (all shipped)

`CanvasView` + `CanvasState` + `SyncStatus` + `EmptyState` (`@vida/ui`) · `VidaEditor`/`VidaEditorProps`/`EditorDocument` (`@vida/editor`/`@vida/types`) · the patterns 8-state (`apps/web/state-conventions`) · `EntityView` `editor` slot (`@vida/ui`, #6).

## Open for Approval 1

1. **S1 scope** — is the `chrome:'bare'` prop + EC-7 color bind the right UI-3 touch (vs apps/web CSS override)? (Recommend: YES — a prop is clean + the color bind is a real bug; CSS-override-fighting is fragile.)
2. **Writing type** — base `line-height` in UI-3 (all mounts) vs canvas-only (S2)? (Recommend: UI-3 base line-height; font-size/family stay preset/host.)
3. **Slice count** — 3 (S1 UI-3 · S2 composition · S3 convention). Fold S3 into S2? (Recommend: keep S3 separate — distinct plane concern + its own pure gate, the sibling-adapter precedent.)
