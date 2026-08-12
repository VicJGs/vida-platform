# packages/editor/src — @vida/editor source (TipTap block editor)

The block editor that is the heart of the Notes & Journals integration layer (ADR-001 §8, CLAUDE.md §8).
Durable spec: `docs/specs/features/ui-3-vida-editor/{_index,e1-editor-core,e2-standard-blocks}.md`. Built unit-by-unit
(E1→E8), each under the §XXVI double-gate + a real-browser component Visual Gate (rendered `@vida/ui`-consuming component).

## Shipped (E3 — toolbar)
The formatting chrome for `<VidaEditor>`. `<VidaEditor>` gains an additive **`toolbar?: boolean` (default true)**; the
toolbar renders inside the frame ABOVE `<EditorContent>` only when `toolbar && editable && editor != null` (the
null-editor gate — `useEditor` is `Editor|null` under `immediatelyRender:false`). The raw `Editor` never leaks
(E1's curated handle unchanged); `EditorToolbar` is internal (not barrel-exported).
- `toolbar.tsx` — `EditorToolbar` (`role="toolbar"`, aria-label `Formatting`, `aria-orientation`) with a **roving
  tabindex** controller: a single tab stop, `←/→/Home/End` move between controls, and it owns ONLY horizontal+Home/End
  (never `↓/↑`, which the Menus bind to open — M2). The roving order is the LIVE ENABLED set; a **reconcile effect**
  adopts the effective stop when a control disables under `can()` and refocuses only if a toolbar control owns focus
  (never pulls focus from the editor — MAT-A/B). `ToolbarButton` composes UI-1 `<Button intent="ghost" size="sm">` in a
  frame whose **`active` VARIANT** carries the pressed-bg (`$colorSurfaceSecondary`) — a variant, NOT injected CSS (the
  "prop-driven state = variant" rule); `aria-pressed` on toggles only. **DEF-E3-a** filed: UI-1 Button has no toggle
  §VIII state. Controls: mark toggles Bold/Italic/Underline/Strike/Code, a block-type `Menu` ("Turn into", trigger
  label reflects the active block), an insert `Menu` (Table `{3×3,header}`/Callout/Divider — callout disabled inside a
  callout), Undo/Redo (`can()`-gated). Image + Link excluded (need URL/attachment UI).
- `internal/toolbar-state.ts` — `useToolbarState` → `useEditorState({editor, selector})` reflects `{marks, can,
  activeBlock}` (re-renders only on a reflected-value change; the selector's per-transaction `isActive`/`can()` probes
  are real compute — the dedup gates the render, not the compute). `resolveActiveBlock` (taskList before the generic
  list checks; N3).
- `extensions/callout.ts` (E3 additions) — `calloutInsertContent(variant?)` (the canonical insert payload) +
  **`isolating: true`** on the node (closed container; lets `insertContent` place a closed callout — DEV-1/DEV-2). No
  `setCallout` node command / `@tiptap/core` augmentation (didn't propagate to the toolbar's `ChainedCommands` in this
  pnpm monorepo). No new dep; no injected CSS (fully Tamagui); no motion. Tests: `toolbar.test.tsx` +
  `internal/toolbar-state.test.ts` (**60 total**); stories "Toolbar" + "No toolbar".

## Shipped (E2 — standard blocks)
Completes the `STANDARD_BLOCK_TYPE` set (11). StarterKit (E1) provides 7; E2 adds the 4 it lacks via
`extensions/standard-blocks.ts` (`STANDARD_BLOCK_EXTENSIONS`, spread into `editor.tsx`'s `useEditor` array after
StarterKit+Placeholder). Catalog: `docs/editor/extension-catalog.md`.
- `extensions/standard-blocks.ts` — `taskList`/`taskItem` (`@tiptap/extension-list`, already installed — inherits
  StarterKit's `listKeymap`), `image` (`@tiptap/extension-image`, `inline:false, allowBase64:true` — **presentational
  only**, attachment pipeline deferred BR-E2-5), `table` (`TableKit` from `@tiptap/extension-table`, one dep bundles
  Table+Row+Cell+Header, `resizable:false`), `Callout`. **No double-registration** of codeBlock/horizontalRule (BR-E2-2).
- `extensions/callout.ts` — bespoke `Node` (`group:'block'`, `content:'block+'`, `defining:true`), attr `variant ∈
  {info,success,danger}` (default `info` — EXACTLY `ToastIntent`, so each binds an existing accent token; no `warn`).
  Renders/parses `<div data-type="callout" data-variant>`; out-of-set/absent variant → `info`. Styled by injected CSS,
  NOT a React node-view (the editor-styles precedent).
- `internal/editor-styles.ts` extended — token-var CSS for taskList/table/callout(×3)/image/code/divider; tints via
  `color-mix(… , transparent)` on a Tamagui theme var; **no raw hex** (BR-E2-7), no motion added.
- Tests: `extensions/standard-blocks.test.tsx` — schema-parity (`STANDARD_BLOCK_TYPE ⊆ schema.nodes`), per-block
  getJSON round-trip, callout variant + parseHTML default-fallback, TableKit co-registration, end-to-end render via
  `<VidaEditor>`. Story: `editor.stories.tsx` "Standard blocks". **30 tests** total.

## Shipped (E1 — editor core spine)
- `editor.tsx` — **`<VidaEditor>`**: a headless Tiptap v3 React editor (`useEditor` + `<EditorContent>`) in a Tamagui
  `@tamagui/core` styled frame. **UNCONTROLLED + imperative reset (BR-E1-1):** `defaultValue` seeds the doc ONCE;
  edits emit via `onChange` (`onUpdate → getJSON`); external resets go through the `forwardRef` handle
  (`setContent`/`focus`/`getDocument`) — **`setContent` is SILENT (`emitUpdate:false`)**, a reset is not an edit so it
  never echoes to `onChange`/persistence (Tiptap v3 defaults `emitUpdate:true`; avoids the save-echo + M4 Yjs-feedback
  dead-end) — NEVER a re-passed `value` prop. **`onChange` also fires once on mount** (Tiptap normalizes the seed) — a
  benign idempotent echo; the app dirty-checks/dedupes persistence (BR-E1-2). Only non-edit emit; resets are silenced (a React-controlled value loop causes cursor
  jumps, and BR-2's M4 Yjs inversion makes props-as-source-of-truth a dead end). `onChange` is read through a **ref**
  so an unstable inline handler never recreates the editor (which would reset ProseMirror state/cursor); the editor is
  created ONCE (default `[]` deps) and `editable` is synced imperatively via `setEditable`.
  - **`assertEditorDocument(json)`** — the RUNTIME structural gate (spec §6): Tiptap `getJSON()` returns `JSONContent`,
    so a bare `as EditorDocument` cast would silence a shape drift vs `@vida/types.EditorNode` that reaches
    E6/persistence undetected. Validates `type==='doc'` + `content` is an array of `{type:string}`, throws otherwise.
    Wired into `onUpdate` and `getDocument`. With StarterKit this always holds → a throw is a real contract breach.
  - **`immediatelyRender:false`** — defers first render to a post-mount effect (StrictMode double-mount safety). Tests
    MUST `waitFor(.ProseMirror)` / `isEditable` before asserting the first `onChange` — never a synchronous query.
  - **a11y (BR-6, §XIV):** `role=textbox` + `aria-multiline` + `aria-label`/`aria-labelledby` applied to the
    contenteditable host via `editorProps.attributes`; dev-warns if neither name is given (the card.tsx guard precedent).
  - **Frame = base semantic tokens, NO sub-theme (BR-E1-5):** unnamed styled host → `$colorSurfacePrimary` /
    `$colorBorderDefault` resolve directly (the list-view LV-3 precedent); `borderRadius:'$md'` reads the radius token
    SCALE, not a sub-theme key (DEF-U8-h). `tamagui.config.ts` is UNTOUCHED (no `light_/dark_Editor`).
- `internal/editor-styles.ts` — injected CSS (idempotent, browser-only; the `input-styles.ts` mechanism) for what a
  styled frame can't reach on the inner `.ProseMirror`: **focus ring** on the frame via
  `:has(.ProseMirror:focus-visible)` → `var(--colorFocusRing)`; **placeholder** `::before` colour →
  `var(--colorTextMuted)` — a BASE semantic var, **NOT `--placeholder`** (which is sub-theme-only, absent on the
  editor's unnamed frame — the "cite tokens from emitted output" lesson). `@tiptap/extension-placeholder` marks the
  empty node but ships no CSS; the consumer renders it.
- `commands.ts` — **`INTEGRATION_BLOCK_COMMANDS`** (BR-E1-4): the enum→command TYPE MAP, one `SlashCommand` per
  `INTEGRATION_BLOCK_TYPE` (11), each populating all 7 required fields. E1 owns this so E4's slash menu can LIST
  commands before E5 builds their node-views. **E1 ships the DATA only** — E5 builds the node-views the commands insert.
- `index.ts` — barrel: `VidaEditor` + `assertEditorDocument` + `VidaEditorProps`/`VidaEditorHandle` +
  `INTEGRATION_BLOCK_COMMANDS` + re-exported `EditorDocument`/`EditorNode`/`EditorMark`/`SlashCommand` types.

## Deferred (later UI-3 units — empty skeleton files exist)
`toolbar.tsx` (E3) · `slash-menu.tsx` (E4) · `extensions/*` integration node-views (E5 — e.g. `daily-summary.ts`,
`task-checklist.ts` [the `/tasks` integration block, DISTINCT from the E2 standard `taskList`], …) ·
`serializers/{to,from}-*.ts` (E6 markdown round-trip · E7 PDF · E8 DOCX). **Yjs/`y-prosemirror` = a deferred SEAM,
no dep** (BR-2, M4/AR-9b): `pages.content` is a TipTap-JSON snapshot that renders locally without a Y.Doc; E1's shell
keeps the content source swappable so M4 can invert authority (JSON→Yjs-derived) without a rewrite.

## Boundary (BR-1 / BR-E1-2)
`@vida/editor` is PRESENTATIONAL: it emits `EditorDocument` JSON and touches NO SQLite / `@vida/core` (the export-dialog
precedent). The app wires `onChange` → `pages.content` + persistence. E1 imports only `UIProvider`/`config`/tokens from
`@vida/ui` (the Tamagui context + base sub-theme) — it composes NO UI-1 primitive yet (Menu/Button arrive at E3/E4).

## Types
`EditorDocument`/`EditorNode`/`EditorMark`/`SlashCommand`/`INTEGRATION_BLOCK_TYPE` are owned by **`@vida/types`**
(`editor.ts`) and NEVER redefined here (BR-7).

## Verify
`pnpm --filter @vida/editor typecheck && build && test`. Component Visual Gate: `pnpm --filter @vida/editor storybook`
(or `build-storybook`) — the decorator paints the theme page surface so the caret/placeholder/frame are reviewable in
both themes. Tiptap v3 packages: `@tiptap/react` + `@tiptap/pm` (ProseMirror bundle) + `@tiptap/starter-kit` +
`@tiptap/extension-placeholder`, family-pinned `^3.30.0`.
