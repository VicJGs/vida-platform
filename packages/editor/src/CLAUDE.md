# packages/editor/src — @vida/editor source (TipTap block editor)

The block editor that is the heart of the Notes & Journals integration layer (ADR-001 §8, CLAUDE.md §8).
Durable spec: `docs/specs/features/ui-3-vida-editor/{_index,e1-editor-core,e2-standard-blocks,e3-toolbar,e4-slash-menu,e5-block-registry}.md`.
Built unit-by-unit (E1→E8), each under the §XXVI double-gate + a real-browser component Visual Gate (rendered
`@vida/ui`-consuming component).

## Shipped (E7 — PDF serializer)
The **PDF serializer** (ADR-001:101 — `@react-pdf/renderer@4.6.1`, **web/desktop**; mobile=`expo-print` OUT of UI-3 scope).
**Emit-only, no round-trip.** Durable: `docs/editor/serialization-spec.md`. **v0.7.0.** The ONE new top-level runtime dep.
- `serializers/to-pdf.tsx` — the pure `documentToPdfTree(doc, options): ReactElement<DocumentProps>` (total tree-walk over
  `EditorNode` → react-pdf `Document/Page/Text/View/Image/Link`; exhaustively testable on `element.type` = the imported
  CLASS identity) + the thin async `toPdf(doc, options): Promise<Blob>` (`pdf(tree).toBlob()` — the only IO seam;
  async+binary is engine-intrinsic). **Marks merge as ONE `<Text>` style object** (bold/italic/strike+underline combined
  `textDecoration`/code Courier); `link` = the outermost `<Link src={href}>` element. Integration blocks → `skip` /
  placeholder card (`comment`≡`placeholder`); frontmatter (non-empty) → a page-1 header. A **table cell's non-paragraph
  block recurses via `renderBlock`** (keeps its text — post-impl M1); `orderedList.start` `Number.isFinite`-guarded (M2).
- `serializers/pdf-theme.ts` — **THE ONE place raw hex lives in the serializer layer** (BR-E7-8a): react-pdf has no CSS
  runtime (can't read Tamagui vars), so styles must be literal; `to-pdf.tsx` is hex-clean. Print-neutral, provisional —
  brand fonts/palette deferred; built-in Helvetica/Courier (auto-resolve Bold, no `Font.register`).
- **Degrade-never-throw is TREE-level** (empty image src skipped, unknown node → text); a present-but-corrupt image src
  throws at react-pdf RENDER — the caller's contract (valid `note_attachments` srcs, BR-E2-5). Additive `PdfSerializeOptions`
  in `@vida/types`. Tests: `serializers/to-pdf.test.tsx` (**33** — schema-parity all 11 + marks + hardBreak + integration
  modes + frontmatter + degradation + M1/M2/m1/m2 regressions + 2 `%PDF-` byte smokes). No component surface → **no Visual
  Gate**. Boundary unchanged (no `@vida/core`). **188 total.** Spec `docs/specs/features/ui-3-vida-editor/e7-pdf-serializer.md`.

## Shipped (E6 — markdown serializers)
The custom **TipTap-JSON ↔ Markdown** serializer (ADR-001 §8) — two pure, headless, deterministic functions (no `Editor`,
no DOM), barrel-exported. NO off-the-shelf bridge (`@tiptap/markdown`/`turndown` reopen ADR-001 / drop the E5
`rendered:false` config). Durable: `docs/editor/serialization-spec.md`. **v0.6.0.**
- `serializers/to-markdown.ts` — the canonical emitter. Defines ONE spelling per node/mark so the round-trip grammar is
  CLOSED. Italic→`_` (bold+italic `**_x_**` unambiguous, bold always OUTER — dissolves the `*`/`**` ambiguity);
  code/code-fence **variable-length** (longest inner run + 1); callout→`<div data-type="callout" data-variant>` HTML
  carrier; integration→`<!-- vida:integration type config -->` comment (config straight from `node.attrs` — the E5
  `rendered:false` codec lands here); hardBreak→two-space+`\n`; inline escaping of `` \ ` * _ [ ] < > ~ `` + per-line
  block-marker guard (a literal `---` paragraph ≠ HR).
- `serializers/from-markdown.ts` — the exact INVERSE over the closed grammar. Line-classed block tokenizer (fixed
  precedence: frontmatter → fence → integration-comment → callout-div → heading → **task-before-bullet** → lists →
  table → blockquote → hr → paragraph) + an escape-aware inline pass (`findClose` skips code spans + escapes). **Degrades,
  never throws** (BR-E6-9) — unknown input → paragraph + `warnings`. E6 is headless so it hand-parses the `data-type`
  divs (no TipTap `parseHTML`).
- **Invariant** = JSON→md→JSON: `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live schema (11 blocks + every
  StarterKit-registered mark [`bold/italic/strike/code/link/underline`] + `hardBreak`). `toMarkdown` returns a bare
  `string` (no emit-side warnings channel); `fromMarkdown` returns `MarkdownParseResult {document, frontmatter, warnings}`.
- **One additive `@vida/types` edit:** `MarkdownSerializeOptions.frontmatter?` (emit-side value carrier, symmetric with
  the parse result). Flat YAML; scalars stringly-typed (declared-lossy). `integration_block_handling`: `comment`
  (lossless for the declared schema) · `skip` · `placeholder`.
- Tests: `serializers/serializers.test.ts` — **34** (24 round-trip fixtures across all 11 blocks + marks + hardBreak +
  7 stress cases [nested emphasis, escaped metacharacters, HR-collision, image-brackets, href-parens, code-fence,
  comment-entities] + 3 handling modes + frontmatter + degradation). No component surface → **no Visual Gate**. Boundary
  unchanged (no `@vida/core`); **no new runtime dep**. **155 total.**

## Shipped (E5 — integration-block registry)
The editor's **`inline` render surface for the ADR-008 capability registry** — the "TipTap re-home" AR-7 deferred to
UI-3 #29 (`docs/core/capability/current-business-rules.md:26`). Durable: `docs/editor/block-registry.md`. The editor is
the `inline` renderer (ADR-008 §3.4), NOT the definition owner (that's AR-7's `CapabilityRegistry` in `@vida/core`).
- `extensions/integration-blocks.tsx` — `createIntegrationBlockNode(def)` builds one atom `Node` per
  `INTEGRATION_BLOCK_TYPE` (11) over `INLINE_BLOCK_DEFS` (E1's command data + a per-type `configSchema`);
  `INTEGRATION_BLOCK_EXTENSIONS` is spread into `useEditor` after the standard blocks. `AVAILABLE_INTEGRATION_BLOCKS`
  (all 11) is the availability set the slash menu reads (closes the E4 `isBlockAvailable` seam → the entries flip on +
  gain a `run` inserting the node).
- **Config = node attrs per `config_schema` (CB2 "inline = editor-node attrs").** The 7 TYPED capabilities declare their
  `@vida/types` interface (`DailySummaryBlockAttrs {date,sections}`, `EntityLinkBlockAttrs`, `ChartBlockAttrs`,
  `TimelineBlockAttrs`, `PomodoroBlockAttrs`, `HabitsBlockAttrs`, `TaskChecklistBlockAttrs`) as attrs — each `{default,
  rendered:false}` (JSON-only; the HTML per-attr codec is deferred to E6). The `CONFIG_SCHEMAS` map is `satisfies
  Record<keyof …Attrs, AttrSpec>` — a COMPILE-TIME drift guard (interfaces are erased → no runtime key test). Config
  round-trips losslessly for the declared schema (`nodeFromJSON→toJSON`). The 4 schema-less types
  (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock`) register attr-less — their MOD-* authors the schema.
- **`IntegrationBlockPlaceholder` — the FIRST React node-view in the editor.** `addNodeView →
  ReactNodeViewRenderer(IntegrationBlockPlaceholder)` → `NodeViewWrapper` + a Tamagui card on BASE tokens
  (`$colorSurfaceSecondary`/`$colorBorderDefault`/`$colorTextPrimary`/`$colorTextMuted`), `contentEditable={false}`,
  `role="note"` + accessible name, label + description + a muted "Available when its module ships" — the inline
  `empty/unavailable` terminal state (CB6). MOD-* replaces it with the real body. `⚠ .tsx` (JSX) — unlike E2's callout
  (injected CSS, `.ts`). Mutable (object/array) attr defaults are FUNCTION defaults (`() => []`) — TipTap invokes them
  per schema build, so each editor owns its array instead of one module-global shared reference (the shared-mutable
  footgun; a cross-editor isolation test locks it). ProseMirror attrs stay immutable-by-convention.
- **HTML contract + per-node `getAttrs` discriminator.** `renderHTML` → `<div data-type="integration-block"
  data-block-type="<name>">` (atom, no content hole); `parseHTML` `getAttrs` returns `false` unless `data-block-type ===
  name` (all 11 share one tag → without it the first-registered node claims every div). The E6 detection seam.
- **Never crashes, degrades:** an undeclared attr → raw PM `checkAttrs` throws, but TipTap's lenient content-load
  (neither `enableContentCheck` nor `errorOnInvalidContent` set in editor.tsx) catches → warns → empty. Tests:
  `extensions/integration-blocks.test.tsx` (schema path + `<VidaEditor>` RTL for the node-view mount). **120 total.**
  Story "Integration blocks (placeholders)". Boundary unchanged (no `@vida/core`); no new dep. **v0.5.0.**

## Shipped (E4 — slash menu)
The `/`-triggered block palette. Type `/` → a caret-anchored, filterable popup; ↑/↓/Enter/Esc drive it while **focus
stays in the editor** (a WAI-ARIA **combobox**, NOT a UI-1 `Menu`/`Popover` mount — those are trigger-anchored + move
focus in). Built on `@tiptap/suggestion` (new dep) + `@tiptap/react` `ReactRenderer`. No new public prop (a built-in of
the editing surface; inert until `/` typed → no read-only gate). Durable: `docs/editor/slash-menu-spec.md`.
- `extensions/slash-command.ts` — the `Extension` → `Suggestion({char:'/', allowSpaces:false, startOfLine:false,
  allow:!isActive('codeBlock'), items, command, render})`. `render()` drives a `ReactRenderer(SlashMenu)`: `onStart` +
  `props.mount()` (v3 managed positioning — no floating-ui import), `onKeyDown` forwards to the popup handle (`Escape`/
  `Tab` → `exitSuggestion`), `onExit` unmount+destroy. `command({editor,range,props}) → props.run?.(editor,range)`.
  Exports `slashActive(state)` + **`slashComboboxAttrs(active)`** — the host combobox ARIA merged into editor.tsx's
  editorProps (see a11y below).
- `slash-commands.ts` — the editor-local **`SlashMenuItem`** view-model (NOT `@vida/types.SlashCommand`, whose
  `block_type` is integration-only — BR-7). `SLASH_MENU_ITEMS` = standard blocks (Text·H1–3·bullet/numbered/task list·
  quote·code·divider·table·callout — each `run = chain().focus().deleteRange(range).<cmd>()`; **heading uses `setNode`
  turn-into, NOT E3's toggle**; **Image EXCLUDED**, no attachment UI) + the 11 integration blocks **derived from
  `INTEGRATION_BLOCK_COMMANDS`, `available:false`** (dimmed, ↑/↓-skipped, no-op on select). `isBlockAvailable` seam
  (empty in M1.0; E5 flips it). `filterSlashItems` = case-insensitive substring over title+keywords (empty→full;
  no-match→"No blocks").
- `slash-menu.tsx` — the `forwardRef` `role="listbox"` popup wrapped in `<Theme name="Menu">` (portal-scope; ReactRenderer
  portals inside `<EditorContent>` → inherits Tamagui context). Rows `role="option"` + `aria-selected`/`aria-disabled`,
  grouped by category. Reuses the Menu sub-theme token language — fully Tamagui, no injected CSS, no motion. Imperative
  `onKeyDown` moves selection (wrap, skip disabled) / Enter activates / printables fall through.
- **⚠ Combobox a11y — the SINGLE `role` writer is `editor.tsx`'s `editorProps.attributes` FUNCTION (post-impl B1).** A
  ProseMirror plugin CANNOT flip the host `role` textbox→combobox: PM's `computeDocDeco` consumes `view._props`
  (editorProps) BEFORE plugins with **first-writer-wins**, so E1's static `role:'textbox'` always won and the plugin's
  `combobox` was silently DROPPED (the a11y feature was dead — caught only post-impl). So `role`/`aria-expanded`/
  `-controls`/`-haspopup` merge in via editorProps `attributes(state)` (`slashComboboxAttrs(slashActive(state))`);
  `aria-activedescendant` (needs the popup's live `selectedIndex`) is a raw popup setAttribute (not PM-managed →
  survives). Tests: `slash-commands.test.ts` · `slash-menu.test.tsx` · `extensions/slash-command.test.ts` (the active-flip
  proof: `insertContent('/')` → `slashActive` true). **102 total.** Stories "Slash menu (popup)"/"(live)".

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

## Deferred (later units)
`serializers/to-docx.ts` (E8 · `docx`) — empty skeleton file exists (E6 markdown + E7 PDF serializers are SHIPPED — see
their sections above). Integration-block
**REAL bodies** (MOD-* phases replace each placeholder node-view) + wiring AR-7's `CapabilityRegistry` into the editor
(MOD-notes #31). **Yjs/`y-prosemirror` = a deferred SEAM, no dep** (BR-2, M4/AR-9b): `pages.content` is a TipTap-JSON
snapshot that renders locally without a Y.Doc; E1's shell keeps the content source swappable so M4 can invert authority
(JSON→Yjs-derived) without a rewrite. (E5's placeholder node-views are SHIPPED — see the E5 section above; the 9 stale
per-type skeleton stubs were retired, `tag-extension.ts` kept.)

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
