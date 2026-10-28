# Slice-map — fe-codec-canvas-editor (CODEC · Canvas: Editor, #7, LIF-234)

> Entity Delivery Flow ② · Step 2 — DECOMPOSITION GATE (decide-mode; net-new). Each slice tagged by plane; each
> closes with a blocking per-slice Visual/Verification Gate. Approval 1 required before per-slice work.
> Grounded in `interpretation.md` (IR-1…IR-7, §5.1) + `envision.md` (EC-1…EC-11, verdict).

## The shape (why it's not one apps/web slice)

IR-1 forces the composition into `apps/web` (`@vida/ui` can't import `@vida/editor`). But the Envision feel
("editor / notebook page") + EC-7 (dark text) can't be reached by `apps/web` alone: the shipped `EditorFrame`
draws a **border/radius/padding box** [FACT: packages/editor/src/editor.tsx:76-82] and `.ProseMirror` sets **no
base `color`** [FACT: packages/editor/src/internal/editor-styles.ts — no `color` rule on `.ProseMirror`]. Opening
the box + binding the color are **`@vida/editor` (UI-3) concerns**. This mirrors the campaign's "reuse" pattern —
#8 canvas-graph "reuse UI-2" actually EXTENDED `NeuralGraph` to the codec voice [FACT: TASKS.md canvas-graph row].
So #7 = a minimal UI-3 extension (S1) + the apps/web composition (S2) + the persistence/slot convention (S3).

## Slices

### S1 — `@vida/editor` minimal extension (UI-3) · plane: `packages/editor`

Make the shipped editor presentable as an open page + readable in dark — benefits EVERY mount, not just the canvas.

- **EC-7 color bind** — add `.vida-editor-frame .ProseMirror{color:var(--colorTextPrimary)}` to `editor-styles.ts` (the token-only convention it already follows; a real dark-mode bug fix) [FACT: editor-styles.ts:22 "COLORS are Tamagui theme vars only"].
- **`chrome?: 'framed' | 'bare'` prop** (default `'framed'` = back-compat). `'bare'` drops the `EditorFrame` border/radius/opaque-bg (transparent, host supplies the page surface) while KEEPING the focus-ring-on-frame host + a sane writing inset [FACT: editor.tsx:76-82 EditorFrame; editor-styles.ts:43 focus-ring `:has(.ProseMirror:focus-visible)`]. The canvas (S2) uses `'bare'`.
- **Writing-grade body rhythm** — a comfortable base `line-height` on `.ProseMirror` (writing feel); font-size/family stay preset-driven (the host/theme owns the scale). DECIDE in-slice whether this is UI-3 default or host-set.
- **Gate:** blocking Visual Gate — editor in BOTH modes (dark text readable, EC-7) × `framed` vs `bare`. Unit tests for the prop.

### S2 — `apps/web` `CanvasEditor` composition · plane: `apps/web/src/canvas-editor/`

The notebook page. Composes the shipped `CanvasView` (#10) + `SyncStatus` (S4) + the page treatment, hosting `<VidaEditor chrome="bare">`.

- Masthead via `CanvasView`: eyebrow + serif title (user-named page, EC-1) + meta + `SyncStatus` in the `actions` slot (EC locked: top-right) + hairline.
- **Notebook page** (EC-11): the editor body = a paper SHEET (`$colorSurfacePrimary` + soft shadow + generous writing margins px`$48`/py`$40`) on a desk (`$colorSurfaceSecondary`); full frame width (~1136, locked A).
- 8-state threading (R4 / patterns): `success` → editor · `loading` → skeleton (editor NOT mounted, EC-6) · `empty` → `EmptyState` teaching invitation (EC-4) · `error` → calm privacy voice (EC-5). `CanvasView` overrides **only** `empty`/`error` → else `children` [FACT: canvas-view.tsx:103]; `loading` is NOT a CanvasView slot, so the S2 composition branches `children` itself (skeleton vs editor page) — the greybox mechanism [FACT: apps/web/src/__envision__/canvas-editor.tsx:119-137].
- a11y (IR-7): region labelled by the title; the editor gets an accessible name.
- Produces a **drop-in `ReactNode`** (IR-5) — the thing EntityView #6 mounts in its `editor` slot.
- **Gate:** blocking Visual Gate — FULL matrix: 3 presets × light/dark × {success·empty·loading·error} × {375·768·1440}; AA both modes incl. warm-dark; notebook feel (EC-11); preset voice swap (EC-8); no overflow (EC-10); maxWidth cap (EC-9).

### S3 — `apps/web` persistence convention + EntityView slot producer · plane: `apps/web` (pure)

The data seam — pure, per the sibling-adapter + ProviderRead precedent (IR-6, §5.1 doc-resolved).

- **`EditorDocument ↔ pages.content` mapping convention** — pure types + documented mapping (the `canvas/adapter.ts` `SavedViewLike` precedent) [FACT: apps/web/src/canvas/adapter.ts header].
- **EntityView `editor`-slot producer convention** — how apps/web resolves a page-able entity → passes `<CanvasEditor>` as EntityView's `editor` node, registry-gated (`isEntityType()` + page lookup) [FACT: entity-view.tsx:20-22].
- **DEFERRED (doc-resolved, not a gap):** the live `usePage`/`useEditorDoc` hook (React Query → `@vida/core` pages) = first consumer #27 [FACT: s5-conventions.md:69 "deferred to first consumer"; reconstructed-structure.md:33 runtime @vida/core wiring = #13 seams].
- **Gate:** Verification Gate — pure (typecheck-proven; the future binding typechecks against the convention).

## Out of scope (homed)

- O1 — real `CapabilityRegistry` block wiring → MOD-notes #31 [FACT: baseline §2; RATIFY here].
- O2 — live page persistence / `@vida/core` runtime read → #27 / #13 seams (IR-6).
- O3 — the EntityView Editor-facet tab/merged chrome → #6 (shipped; #7 only fills the slot) [FACT: entity-view.tsx:14-15].
- O4 — export (md/pdf/docx) affordances → serializers shipped, surfacing is later.

## Envision coverage (every structural EC → a slice)

EC-1/4/5/6/9/10 → S2 · EC-2/3 → S2 (hosts shipped editor+blocks) · **EC-7 → S1** · EC-8 (feel) → S2 Visual Gate · **EC-11 (notebook feel) → S1 (bare frame) + S2 (page sheet)**. No EC unhomed.
