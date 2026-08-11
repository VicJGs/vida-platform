# @vida/editor — current business rules (ground truth)

> Durable, living rules `@vida/editor` enforces as built (§XXIX). Promoted from the E1 IMPLEMENTATION-PLAN; refreshed
> per unit. Consumed by `/critique` + `/preflight`. Scope today: **E1 — editor core**.

## Package boundary
- **BR-1 / BR-E1-2 · Presentational, persists nothing.** `@vida/editor` emits `EditorDocument` JSON via `onChange` and
  touches NO SQLite / `@vida/core`. The app wires `onChange → pages.content` + persistence (the export-dialog
  precedent). Verified: no `@vida/core`/app import in `packages/editor/src`. `[FACT: boundary grep clean]`
- **BR-7 · Types owned by `@vida/types`.** `EditorDocument`/`EditorNode`/`EditorMark`/`SlashCommand`/
  `INTEGRATION_BLOCK_TYPE` are imported/re-exported, never redefined. `[FACT: editor.tsx, commands.ts, index.ts imports]`
- **BR-2 · Yjs is a deferred seam (M4/AR-9b), no dep.** `pages.content` is a TipTap-JSON snapshot that renders locally
  without a Y.Doc; the shell keeps the content source swappable so M4 can invert authority (JSON→Yjs-derived) without
  a rewrite. No `yjs`/`y-prosemirror` dep. `[FACT: package.json deps]`

## Editor core (E1)
- **BR-E1-1 · Uncontrolled + imperative reset.** `defaultValue` seeds the doc ONCE; edits emit via `onChange`; external
  resets go through the ref `setContent`, NOT a re-passed `value` prop (a controlled `value` loop causes cursor jumps;
  BR-2's M4 inversion makes props-as-source-of-truth a dead end). `[FACT: editor.tsx useEditor content + useImperativeHandle]`
  - **Resets are SILENT.** `setContent` passes `{ emitUpdate: false }` — a programmatic reset is not a user edit and
    must not echo to `onChange`/persistence. Tiptap v3 defaults `emitUpdate:true` (`@tiptap/core setContent.ts:52`),
    which would echo every load and, at M4, feed a Yjs→JSON snapshot straight back to the wire. `[FACT: editor.tsx setContent; test: "setContent does NOT emit onChange"]`
  - **Mount emit is benign.** `onChange` fires once on mount when Tiptap normalizes the seed — an idempotent echo of
    the just-seeded doc (a no-op re-write, not a loop). The app dirty-checks/dedupes persistence (BR-E1-2). Only
    non-edit emit; not suppressed (deterministic suppression needs normalization-edge-case comparison, out of scope).
- **BR-E1-3 · StarterKit only (explicit).** Baseline nodes/marks from StarterKit; custom standard blocks
  (table/callout/divider/image/code-block) are E2. `[FACT: editor.tsx extensions]`
- **BR-E1-4 · E1 owns the command TYPE MAP.** `INTEGRATION_BLOCK_COMMANDS` = one `SlashCommand` per
  `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields. E1 ships DATA; E5 builds node-views. Parity guarded by test.
  `[FACT: commands.ts; commands.test.ts parity]`
- **BR-E1-5 · Base tokens, no raw values, no sub-theme.** Chrome uses DS base semantic tokens; a `light_/dark_Editor`
  sub-theme is registered ONLY if bespoke color keys are needed — E1 needs none, so `tamagui.config.ts` is untouched
  (the UI-2 conditional-sub-theme rule). `[FACT: editor.tsx EditorFrame; tamagui.config.ts unchanged]`

## Contract integrity
- **Runtime document assertion (not a cast).** `onChange` and `getDocument` return values pass through
  `assertEditorDocument` — top-level `type==='doc'` + `content` an array of `{type:string}`, throws otherwise. Tiptap
  `getJSON()` returns `JSONContent`; a bare cast would hide a shape drift vs `@vida/types.EditorNode` reaching
  E6/persistence. `[FACT: editor.tsx assertEditorDocument, wired into onUpdate + getDocument; editor.test.tsx negative matrix]`

## a11y (§XIV)
- The contenteditable host carries `role=textbox` + `aria-multiline` + an accessible name (`aria-label`/
  `aria-labelledby`, one REQUIRED — dev-warns if neither). Focus ring is `:focus-visible` (pointer-suppressed), on the
  frame. `[FACT: editor.tsx editorProps.attributes + warnMissingName; editor-styles.ts]`
