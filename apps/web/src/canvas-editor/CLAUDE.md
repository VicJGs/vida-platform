# apps/web/src/canvas-editor — CODEC Canvas: Editor (fe-codec-canvas-editor #7, LIF-234)

The editor archetype of the CODEC canvas: the shipped `<VidaEditor>` (@vida/editor, UI-3) framed as an editorial
**notebook page**. Lives in `apps/web` because `@vida/ui` cannot import `@vida/editor` (editor→ui dep cycle, IR-1) —
this is the one plane where the frame (`@vida/ui` `CanvasView`) and the body (`@vida/editor` `VidaEditor`) compose.
Delivery docs: `docs/specs/foundation/fe-codec-canvas-editor/delivery/` (interpretation · envision · slice-map · seam-contract).

## Files
- **`canvas-editor.tsx`** — `CanvasEditor` (S2). Presentational, state-as-prop (patterns BR-2), NON-generic (holds no
  entity data; the host owns `doc`). Composes: `CanvasView` masthead (eyebrow + serif title + meta + `SyncStatus` in the
  top-right `actions` slot) over a **desk** (`$colorSurfaceSecondary`) with the editor on a **page sheet**
  (`$colorSurfacePrimary` + shadow + generous writing margins) hosting `<VidaEditor chrome="bare">` (EC-11). 8-state:
  `success`→editor · `loading`→skeleton (editor NOT mounted, EC-6) · `empty`→`EmptyState` teaching invitation ·
  `error`→calm privacy-preserving message. (`CanvasView` overrides only empty/error; `loading` is the composition's own
  ternary.) a11y: `CanvasView` names the region by title; the editor gets `${title} editor` (IR-7).
- **`canvas-editor-styles.ts`** — `ensureCanvasEditorStyles()` (S2). Idempotent, browser-only, scoped to
  `.vida-canvas-editor-page` so it never leaks to other `VidaEditor` mounts. Carries the HOST presentation only:
  writing **font-size (18px)** + preset font-family + inter-block rhythm. Color + base line-height are S1's (`@vida/editor`
  `editor-styles.ts`, EC-7) — not repeated here.
- **`page-binding.ts`** — S3, PURE. `PageLike` (a `pages`-row projection), `toCanvasEditorProps(page, opts)` (the
  `pages`→`CanvasEditorProps` mapping; `meta` = block count), `EditorDocReader = ProviderRead<EditorDocument>` (the
  live-read seam type). **No live hook, no `@vida/core` at runtime** — the `usePage`/`useEditorDoc` hook is deferred to
  the first consumer (#27 fe-notes), per the ProviderRead convention; Spaces/engine runtime wiring is #13 seams.

## How it reaches a page
The EntityView `editor` slot is produced + registry-gated by #6 (`apps/web/src/entity/adapter.ts` — `offersEditor` +
`EntitySource.editorNode`). #7 supplies WHAT that node is: `editorNode: <CanvasEditor {...toCanvasEditorProps(page, opts)} />`.
No new gate/producer here.

## Boundaries
- `@vida/ui` is Tamagui-only → the `@vida/core`/`@vida/types` ↔ presentational composition lives HERE (the canvas/entity
  adapter precedent). `@vida/editor` is an `apps/web` dep (added by #7) — `apps/web → @vida/editor → @vida/ui` is acyclic.
- Uncontrolled editor (BR-E1-1): `doc` seeds `defaultValue`; `onChange` is the sink the consumer wires to `pages.content`.

## Gates
tsc 0 · tests: `canvas-editor.test.tsx` (7, jsdom) + `page-binding.test.ts` (4, node). Visual Gate PASS (Brave, 3 presets
× light/dark: title 13.0–15.7 · body 15.8–17.3 · muted eyebrow/meta 4.52–5.22 AA · sheet-on-desk · no overflow 375/768/1440).
