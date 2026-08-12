# @vida/editor — current business rules (ground truth)

> Durable, living rules `@vida/editor` enforces as built (§XXIX). Promoted from the E1/E2 IMPLEMENTATION-PLANs;
> refreshed per unit. Consumed by `/critique` + `/preflight`. Scope today: **E1 — editor core + E2 — standard blocks**.

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

## Standard blocks (E2)
- **BR-E2-1 · Implement the enum, not the prose.** The block set is derived from `STANDARD_BLOCK_TYPE` (11) minus what
  StarterKit registers → E2 adds `{taskList, image, table, callout}`. A schema-parity test asserts every enum value ∈
  `editor.schema.nodes`. `[FACT: standard-blocks.test.tsx BR-E2-9; editor.ts:12-24]`
- **BR-E2-2 · No double-registration.** `codeBlock`/`horizontalRule` stay StarterKit-owned; E2 never re-adds them
  (ProseMirror throws on duplicate node names) — it only styles them. `[FACT: standard-blocks.ts; editor.tsx extensions]`
- **BR-E2-3 · taskList from the already-present `@tiptap/extension-list`** (`TaskList`+`TaskItem nested`), promoted to a
  direct dep; inherits StarterKit's bundled `listKeymap` — do not disable it. `[FACT: standard-blocks.ts; package.json]`
- **BR-E2-5 · image is presentational; the attachment pipeline is a DEFERRED SEAM.** `@tiptap/extension-image` renders
  `<img src alt>`; the encrypted `note_attachments` upload/resolve path is the app's, deferred. `allowBase64:true` is a
  known-bad interim (a data-URI inlines the whole image into the per-page sync blob) — retired by the attachment
  pipeline before image is exposed in the app UI. E2 builds no upload/encryption. `[FACT: standard-blocks.ts; ADR-002/ADR-003]`
- **BR-E2-6 · callout is a bespoke Node with a 3-value `variant`.** `{info,success,danger}` (default `info`) — EXACTLY
  the `ToastIntent` set, so each binds an existing accent token; no `warn` (no `signal.warning` token exists). An
  out-of-set/absent `data-variant` parses to `info` (no throw). `variant` round-trips through `getJSON()`.
  `[FACT: callout.ts; standard-blocks.test.tsx]`
- **BR-E2-7 · Block chrome = token-var CSS, no raw colours.** `internal/editor-styles.ts` styles taskList/table/callout/
  image/code/divider with Tamagui theme vars only; tints via `color-mix(… , transparent)` on a token; no hex/rgb (grep-
  gated). No React node-views; no motion added. `[FACT: editor-styles.ts]`

## Contract integrity
- **Runtime document assertion (not a cast).** `onChange` and `getDocument` return values pass through
  `assertEditorDocument` — top-level `type==='doc'` + `content` an array of `{type:string}`, throws otherwise. Tiptap
  `getJSON()` returns `JSONContent`; a bare cast would hide a shape drift vs `@vida/types.EditorNode` reaching
  E6/persistence. `[FACT: editor.tsx assertEditorDocument, wired into onUpdate + getDocument; editor.test.tsx negative matrix]`

## a11y (§XIV)
- The contenteditable host carries `role=textbox` + `aria-multiline` + an accessible name (`aria-label`/
  `aria-labelledby`, one REQUIRED — dev-warns if neither). Focus ring is `:focus-visible` (pointer-suppressed), on the
  frame. `[FACT: editor.tsx editorProps.attributes + warnMissingName; editor-styles.ts]`
