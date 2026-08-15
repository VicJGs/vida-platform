# @vida/editor — current spec (ground truth)

> Durable, living description of what `@vida/editor` IS as built (§XXIX Currency Rule). Refreshed per unit; never lags
> the code. Source of truth for `/critique` + `/preflight` + `victor:session-kickoff`. Every claim cites code.
> Scope today: **E1 — editor core spine + E2 — standard blocks + E3 — toolbar + E4 — slash menu + E5 — integration-block
> registry + E6 — markdown serializers** (UI-3). Later units (E7 PDF, E8 DOCX) extend this file. Forward specs:
> `docs/specs/features/ui-3-vida-editor/`. Serializer ground truth: `docs/editor/serialization-spec.md`.

## Package
`@vida/editor` **v0.6.0** — the TipTap block editor at the heart of Notes & Journals (ADR-001 §8). Built on Tiptap
**v3** (`@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` + `@tiptap/extension-placeholder` + **E2:**
`@tiptap/extension-image` + `@tiptap/extension-table` + `@tiptap/extension-list` + **E4:** `@tiptap/suggestion`,
family-pinned `^3.30.0`) + `@tamagui/core@2.6.2` + `@vida/types`/`@vida/ui` (workspace). Peer `react>=19`.
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

## Slash menu (E4) `[FACT: src/extensions/slash-command.ts; src/slash-menu.tsx; src/slash-commands.ts; editor.tsx]`
A `/`-triggered block palette: type `/`, a caret-anchored popup lists filterable blocks; ↑/↓/Enter/Esc drive it while
**focus stays in the editor** (a COMBOBOX, not a Menu). Built on `@tiptap/suggestion` (new dep) + `@tiptap/react`
`ReactRenderer`, NOT a UI-1 `Menu`/`Popover` mount (those are trigger-anchored + move focus in). No new public prop —
the menu is a built-in of the editing surface (parity with the default-on toolbar); inert until `/` typed, so read-only
needs no gate.
- **Mechanism** — `extensions/slash-command.ts` = an `Extension` whose `addProseMirrorPlugins` returns
  `Suggestion({ char:'/', allowSpaces:false, startOfLine:false, allow:!isActive('codeBlock'), items, command, render })`.
  `render()` drives a `ReactRenderer(SlashMenu)` — `onStart` calls `props.mount()` (v3 managed positioning), `onKeyDown`
  forwards to the popup's imperative handle, `Escape`/`Tab` call `exitSuggestion`, `onExit` unmounts+destroys.
  `command({editor,range,props})` runs `props.run?.(editor,range)`.
- **Command set** — `slash-commands.ts` `SLASH_MENU_ITEMS`: an editor-local `SlashMenuItem` view-model (NOT
  `@vida/types.SlashCommand`, whose `block_type` is integration-only — BR-7 kept). **Standard blocks insert now**
  (Text·H1–3·bullet/numbered/task list·quote·code·divider·table·callout — each `run` = `chain().focus().deleteRange(range)
  .<cmd>()`; heading uses `setNode` turn-into, deliberately NOT E3's toggle; Image EXCLUDED, no attachment UI). **The 11
  integration blocks are DERIVED from `INTEGRATION_BLOCK_COMMANDS`, shown DISABLED** (`available:false`, skipped by ↑/↓,
  no-op on select) via the `isBlockAvailable` seam (empty in M1.0; E5 flips them on). `filterSlashItems` = case-insensitive
  substring over title+keywords (empty→full; no match→a disabled "No blocks" row).
- **Popup** `slash-menu.tsx` — a `forwardRef` `role="listbox"` panel wrapped in `<Theme name="Menu">` (portal-scope), rows
  `role="option"` + `aria-selected`/`aria-disabled`, grouped by category. Reuses the Menu sub-theme token language (fully
  Tamagui, no injected CSS). The imperative `onKeyDown` moves selection (wrap, skip disabled), Enter activates.
- **Combobox a11y (§XIV)** — while open, the editor host flips `role` textbox→**combobox** + `aria-expanded`/`-controls`
  via `editor.tsx`'s `editorProps.attributes` FUNCTION (the SINGLE `role` writer — a plugin can't override `role`, PM
  reads `view._props` before plugins first-writer-wins; post-impl B1). `aria-activedescendant` = the active option id,
  set raw by the popup (not PM-managed → survives). Focus never leaves the editor.

## States (§VIII applicable subset) `[FACT: editor.tsx; editor.stories.tsx]`
`default` (resting/focusable) · `focus` (frame ring) · `disabled` (`editable=false`, no caret) · `empty` (placeholder).
No loading/error at E1 (the app's terminal-state wrapper owns those, UX-4).

## Integration-block registry (E5) `[FACT: src/extensions/integration-blocks.tsx; editor.tsx; slash-commands.ts]`
The editor's **`inline` render surface for the ADR-008 capability registry** — the TipTap re-home AR-7 deferred to UI-3
#29 `[FACT: ADR-008 §3.4:104-109; docs/core/capability/current-business-rules.md:26]`. `INTEGRATION_BLOCK_EXTENSIONS` =
one atom `Node` per `INTEGRATION_BLOCK_TYPE` (11), built by `createIntegrationBlockNode(def)` over `INLINE_BLOCK_DEFS`
(E1's command data joined to a per-type config schema), spread into `useEditor` after the standard blocks.
- **Config = node attrs per `config_schema` (CB2).** The 7 typed capabilities declare `addAttributes()` from their
  `@vida/types` interface (each attr `{default, rendered:false}`); a `satisfies Record<keyof …Attrs, AttrSpec>` guards
  drift at COMPILE time. Config round-trips losslessly for the declared schema via `nodeFromJSON→toJSON`; it stays out
  of the HTML DOM (`rendered:false` → the HTML codec is E6). The 4 schema-less types (`eventsBlock`/`classesBlock`/
  `backlink`/`milestoneBlock`) register attr-less (schema pending, per-module).
- **Placeholder node-view (the FIRST React node-view).** `addNodeView → ReactNodeViewRenderer(IntegrationBlockPlaceholder)`
  → `NodeViewWrapper` + a Tamagui card on BASE tokens, `contentEditable={false}`, `role="note"` + accessible name, label
  + description + a muted "Available when its module ships" — the inline `empty/unavailable` terminal state (CB6). MOD-*
  replaces this with the real body.
- **Never-crash (degrade).** The node type is in-schema so any doc parses; an undeclared attr degrades via TipTap's
  lenient content-load (warn + empty), not a crash.
- **HTML contract + discriminator.** `renderHTML` → `<div data-type="integration-block" data-block-type="<name>">`;
  `parseHTML` `getAttrs` returns `false` unless `data-block-type === name` (all 11 share one tag selector — the E6 seam).
- **Availability flipped on (BR-E4-5 closed).** `AVAILABLE_INTEGRATION_BLOCKS` (owned here) = all 11 → `isBlockAvailable`
  true; slash entries gain a `run` inserting the node. The definition source in M1.0 is the interim closed enum (the
  BlockType-union re-home UI-3 owns); MOD-notes #31 wires AR-7's real `CapabilityRegistry`.

## Markdown serializers (E6) `[FACT: src/serializers/to-markdown.ts; src/serializers/from-markdown.ts; index.ts]`
The **custom TipTap-JSON ↔ Markdown serializer** (ADR-001 §8) — two pure, headless, deterministic functions (no `Editor`,
no DOM), barrel-exported: `toMarkdown(doc, options): string` + `fromMarkdown(md, options?): MarkdownParseResult`. NO
off-the-shelf markdown bridge. Full mapping table: `docs/editor/serialization-spec.md`.
- **Lossless invariant** = JSON→md→JSON: `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live schema. `toMarkdown`
  emits ONE canonical spelling; `fromMarkdown` parses that CLOSED grammar and DEGRADES (never throws) on anything else —
  so no general-GFM lexer, **zero new runtime dep**. Canonical choices: italic→`_` (bold+italic `**_x_**` unambiguous),
  callout→`<div data-type="callout">` HTML carrier, integration blocks→`<!-- vida:integration -->` comment (config from
  `node.attrs`, the E5 `rendered:false` codec landing here), hardBreak→two-space+`\n`, variable-length code fences.
- **`MarkdownSerializeOptions.frontmatter?`** — one additive field added to `@vida/types` (the emit-side value carrier,
  symmetric with `MarkdownParseResult.frontmatter`). Flat YAML; scalars round-trip stringly-typed (declared-lossy, out of
  the document-side invariant). `[FACT: @vida/types editor.ts:203]`
- **`integration_block_handling`** — `comment` (lossless for the declared schema) · `skip` · `placeholder` (both
  declared-lossy). Tests: `serializers.test.ts` (34 — 24 round-trip fixtures covering all 11 blocks + every registered
  mark + hardBreak + 7 stress cases, + modes + frontmatter + degradation). No component surface → no Visual Gate.

## Integration-block command map `[FACT: commands.ts]`
`INTEGRATION_BLOCK_COMMANDS` = one `SlashCommand` per `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields populated,
`category ∈ {platform, embed}`. E1 ships the DATA; E4's slash menu LISTS them; E5 built the node-views (placeholders).

## File map `[FACT: packages/editor/src]`
`editor.tsx` (VidaEditor + assertEditorDocument + toolbar mount + E4 host-combobox editorProps) · `commands.ts` ·
**`toolbar.tsx`** (E3 — `EditorToolbar` + `ToolbarButton`) · **`internal/toolbar-state.ts`** (E3) ·
`internal/editor-styles.ts` (E1 chrome + E2 block CSS) · **`extensions/standard-blocks.ts`** (E2) ·
**`extensions/callout.ts`** (E2 bespoke node + E3 `calloutInsertContent` + `isolating`) · **`extensions/integration-blocks.tsx`**
(E5 — the 11 inline nodes + `IntegrationBlockPlaceholder` node-view + `INLINE_BLOCK_DEFS` + `AVAILABLE_INTEGRATION_BLOCKS`) ·
**`slash-commands.ts`** (E4 — `SlashMenuItem` view-model + `SLASH_MENU_ITEMS` + `filterSlashItems`; E5 — `isBlockAvailable`
reads the registry set + integration `run`s) · **`slash-menu.tsx`** (E4 — the `ReactRenderer` combobox popup) ·
**`extensions/slash-command.ts`** (E4 — the Suggestion extension + `slashComboboxAttrs`/`slashActive`) · `index.ts`
(barrel) · `env.d.ts` · `test-setup.ts` (jsdom shims) · `editor.test.tsx`/`commands.test.ts`/
`extensions/standard-blocks.test.tsx`/`toolbar.test.tsx`/`internal/toolbar-state.test.ts`/`slash-commands.test.ts`/
`slash-menu.test.tsx`/`extensions/slash-command.test.ts`/`extensions/integration-blocks.test.tsx`/**`serializers/serializers.test.ts`** (**155 tests**) ·
`editor.stories.tsx` (Visual-Gate surface incl. "Standard blocks" · "Toolbar" · "Slash menu (popup)" · "Slash menu (live)" ·
**"Integration blocks (placeholders)"**) · `CLAUDE.md`.
**E6 serializers** — `serializers/to-markdown.ts` (canonical emitter) · `serializers/from-markdown.ts` (closed-grammar
inverse parser) · `serializers/serializers.test.ts` (34 tests). **Deferred:** `serializers/to-pdf.ts` (E7) ·
`serializers/to-docx.ts` (E8). **Retired (E5):** the 9 stale per-type integration stub files (`tag-extension.ts` kept).
Yjs = a deferred seam, no dep (BR-2/M4).

## Verify
`pnpm --filter @vida/editor typecheck && build && test` (155 tests) · Visual Gate `pnpm --filter @vida/editor storybook`.
