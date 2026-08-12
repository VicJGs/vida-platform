# @vida/editor — current spec (ground truth)

> Durable, living description of what `@vida/editor` IS as built (§XXIX Currency Rule). Refreshed per unit; never lags
> the code. Source of truth for `/critique` + `/preflight` + `victor:session-kickoff`. Every claim cites code.
> Scope today: **E1 — editor core spine + E2 — standard blocks + E3 — toolbar** (UI-3). Later units (E4 slash-menu ·
> E5 registry · E6–E8 serializers) extend this file. Forward specs: `docs/specs/features/ui-3-vida-editor/`.

## Package
`@vida/editor` **v0.3.0** — the TipTap block editor at the heart of Notes & Journals (ADR-001 §8). Built on Tiptap
**v3** (`@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` + `@tiptap/extension-placeholder` + **E2:**
`@tiptap/extension-image` + `@tiptap/extension-table` + `@tiptap/extension-list`, family-pinned `^3.30.0`) +
`@tamagui/core@2.6.2` + `@vida/types`/`@vida/ui` (workspace). Peer `react>=19`.
`[FACT: packages/editor/package.json]` Toolchain (Storybook 9 · vitest 3 · jsdom 30 · vite 6) mirrors `@vida/ui`.

## Public surface `[FACT: packages/editor/src/index.ts]`
- `VidaEditor` (+ `VidaEditorProps`, `VidaEditorHandle`) — the editor component.
- `assertEditorDocument(json): EditorDocument` — the runtime structural gate.
- `INTEGRATION_BLOCK_COMMANDS`, `INTEGRATION_BLOCK_COMMAND_COUNT` — the slash-command type map.
- Re-exported types `EditorDocument`/`EditorNode`/`EditorMark`/`SlashCommand` (owned by `@vida/types`, re-exported not
  redefined).

## `<VidaEditor>` contract `[FACT: packages/editor/src/editor.tsx]`
```ts
interface VidaEditorProps {
  defaultValue?: EditorDocument          // seeds the doc ONCE (uncontrolled)
  onChange?: (doc: EditorDocument) => void // emitted on user edits (+ one benign mount echo)
  editable?: boolean                     // default true; false = read-only, no caret
  placeholder?: string                   // empty-state text
  'aria-label'?: string                  // one of aria-label/-labelledby REQUIRED (dev-warns if neither)
  'aria-labelledby'?: string
}
interface VidaEditorHandle { setContent(doc): void; focus(): void; getDocument(): EditorDocument }
```
- `forwardRef` (mandatory, §VII) carries the imperative handle.
- Built on `useEditor({ extensions:[StarterKit, Placeholder], content:defaultValue, editable,
  immediatelyRender:false, editorProps:{attributes:{role:'textbox','aria-multiline':'true', <name>}}, onUpdate })`.
  `immediatelyRender:false` defers first render to a post-mount effect (StrictMode safety).
- Editor created ONCE; `onChange` read via a ref (no recreation on parent re-render); `editable` synced via
  `setEditable` in a `[editor, editable]` effect.

## Chrome / tokens `[FACT: editor.tsx EditorFrame; internal/editor-styles.ts]`
- Frame = an unnamed `@tamagui/core` `styled(View)` on BASE semantic tokens — `$colorSurfacePrimary` bg,
  `$colorBorderDefault` 1px border, `borderRadius:'$md'` (radius token SCALE, not a sub-theme key), `$12`/`$8` inset,
  `minHeight:120`. **No `light_/dark_Editor` sub-theme; `tamagui.config.ts` untouched** (base tokens suffice).
- Injected CSS (`internal/editor-styles.ts`, idempotent, browser-only) for what the frame can't reach on the inner
  `.ProseMirror`: focus ring on the frame via `:has(.ProseMirror:focus-visible)` → `var(--colorFocusRing)`;
  placeholder `::before` → `var(--colorTextMuted)` (base semantic, NOT sub-theme-only `--placeholder`).

## Standard blocks (E2) `[FACT: src/extensions/standard-blocks.ts; src/extensions/callout.ts; editor.tsx extensions]`
The full `STANDARD_BLOCK_TYPE` set (11) is registered. E1's StarterKit provides 7 (paragraph · heading · bulletList ·
orderedList · blockquote · **codeBlock** · **horizontalRule**); **E2 adds the 4 StarterKit lacks**, spread into the
`useEditor` extensions array via `STANDARD_BLOCK_EXTENSIONS`:
- **`taskList`/`taskItem`** — `@tiptap/extension-list` (`TaskItem nested`); inherits StarterKit's bundled `listKeymap`.
- **`image`** — `@tiptap/extension-image` (`inline:false, allowBase64:true`); **presentational only** — the encrypted
  `note_attachments` pipeline is deferred (BR-E2-5); `allowBase64` is a known-bad interim (a data-URI bloats the
  per-page sync blob).
- **`table`** — `TableKit` from `@tiptap/extension-table` (`table.resizable:false`); one dep bundles Table+Row+Cell+Header.
- **`callout`** — a bespoke `Node` (`src/extensions/callout.ts`): `group:'block'`, `content:'block+'`, `defining:true`,
  attr `variant ∈ {info,success,danger}` (default `info`, EXACTLY the `ToastIntent` set); renders/parses
  `<div data-type="callout" data-variant>`; out-of-set/absent variant → `info`. Styled by injected CSS, no React node-view.
- **No double-registration:** `codeBlock`/`horizontalRule` stay StarterKit-owned (E2 only styles them). A schema-parity
  test asserts every `STANDARD_BLOCK_TYPE` value ∈ `editor.schema.nodes`. Full catalog: `docs/editor/extension-catalog.md`.

## Toolbar (E3) `[FACT: src/toolbar.tsx; src/internal/toolbar-state.ts; editor.tsx toolbar mount]`
`<VidaEditor>` gains an additive prop **`toolbar?: boolean` (default true)**; the formatting toolbar renders INSIDE
the editor frame, above `<EditorContent>`, ONLY when `toolbar && editable && editor != null` (the null-editor gate —
`useEditor` is `Editor|null` under `immediatelyRender:false`). The raw `Editor` never leaks (E1's curated handle
unchanged). `EditorToolbar` is internal (not barrel-exported).
- **`role="toolbar"`** (aria-label `Formatting`, `aria-orientation=horizontal`) with **roving tabindex** — a single
  tab stop; `←/→` move between controls, `Home/End` to ends; the controller owns ONLY horizontal+Home/End (never
  `↓/↑`, which the Menus bind to open). The roving order is the LIVE ENABLED set; a reconcile effect adopts the
  effective stop when a control disables (never pulls focus from the editor).
- **Controls** (grounded in the registered schema): mark toggles **Bold · Italic · Underline · Strike · Code**
  (`aria-pressed` = `isActive`); a **block-type Menu** ("Turn into" — Paragraph/H1–3/lists/quote/code, trigger label
  reflects the active block); an **Insert Menu** (Table `{3×3, header}` · Callout · Divider — callout item disabled
  inside a callout); **Undo/Redo** (disabled via `editor.can()`). Image + Link are excluded (need URL/attachment UI).
- **Active state** via `useToolbarState` → `useEditorState({editor, selector})` (re-renders only on a reflected-value
  change, not per keystroke; the selector does O(controls) `isActive`/`can()` probes per transaction — dedup gates the
  render, not the compute).
- **Composition:** `ToolbarButton` wraps UI-1 `<Button intent="ghost" size="sm">` in a frame whose `active` VARIANT
  carries the pressed-bg (`$colorSurfaceSecondary`) — a variant, not injected CSS (the "prop-driven state = variant"
  rule); UI-1 Button has no toggle state (**DEF-E3-a** filed). Menus are UI-1 `Menu` (aria-labelled "Turn into" /
  "Insert"). No new dep; no injected CSS (fully Tamagui); no motion (Menu's open transition is UI-1's).

## States (§VIII applicable subset) `[FACT: editor.tsx; editor.stories.tsx]`
`default` (resting/focusable) · `focus` (frame ring) · `disabled` (`editable=false`, no caret) · `empty` (placeholder).
No loading/error at E1 (the app's terminal-state wrapper owns those, UX-4).

## Integration-block command map `[FACT: commands.ts]`
`INTEGRATION_BLOCK_COMMANDS` = one `SlashCommand` per `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields populated,
`category ∈ {platform, embed}`. E1 ships the DATA; E5 builds the node-views the commands insert.

## File map `[FACT: packages/editor/src]`
`editor.tsx` (VidaEditor + assertEditorDocument + toolbar mount) · `commands.ts` · **`toolbar.tsx`** (E3 —
`EditorToolbar` + `ToolbarButton`) · **`internal/toolbar-state.ts`** (E3 — `useToolbarState`/`resolveActiveBlock`) ·
`internal/editor-styles.ts` (E1 chrome + E2 block CSS) · **`extensions/standard-blocks.ts`** (E2) ·
**`extensions/callout.ts`** (E2 bespoke node + E3 `calloutInsertContent` + `isolating`) · `index.ts` (barrel) ·
`env.d.ts` · `test-setup.ts` (jsdom shims) · `editor.test.tsx`/`commands.test.ts`/
`extensions/standard-blocks.test.tsx`/`toolbar.test.tsx`/`internal/toolbar-state.test.ts` (**60 tests**) ·
`editor.stories.tsx` (Visual-Gate surface incl. "Standard blocks" + "Toolbar" + "No toolbar") · `CLAUDE.md`.
**Deferred (empty skeleton):** `slash-menu.tsx` (E4) · `extensions/*` integration node-views (E5) · `serializers/*`
(E6–E8). Yjs = a deferred seam, no dep (BR-2/M4).

## Verify
`pnpm --filter @vida/editor typecheck && build && test` (60 tests) · Visual Gate `pnpm --filter @vida/editor storybook`.
