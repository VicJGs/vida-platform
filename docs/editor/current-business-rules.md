# @vida/editor — current business rules (ground truth)

> Durable, living rules `@vida/editor` enforces as built (§XXIX). Promoted from the E1/E2 IMPLEMENTATION-PLANs;
> refreshed per unit. Consumed by `/critique` + `/preflight`. Scope today: **E1 — editor core + E2 — standard blocks
> + E3 — toolbar + E4 — slash menu + E5 — integration-block registry + E6 — markdown serializers**.

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

## Toolbar (E3)
- **BR-E3-1 · The toolbar mounts INSIDE `<VidaEditor>`; the raw `Editor` never leaks.** `EditorToolbar` renders inside
  `VidaEditorImpl` (a sibling ABOVE `<EditorContent>`, not inside the contenteditable), ONLY when
  `toolbar && editable && editor != null` (the null-editor gate — `useEditor` is `Editor|null` under
  `immediatelyRender:false`). No new public API beyond the additive `toolbar?: boolean` prop (default true); the E1
  ref handle is unchanged. `[FACT: editor.tsx toolbar gate; toolbar.tsx]`
- **BR-E3-2 · Active state via `useEditorState`, not per-transaction re-render.** `useToolbarState` subscribes to a
  selected slice; the toolbar re-renders only when a reflected value changes. The selector runs every transaction and
  does O(controls) `isActive`/`can()` probes — the DEDUP gates the render, not the compute (not cost-free; narrow if a
  perf pass shows jank). `[FACT: internal/toolbar-state.ts]`
- **BR-E3-3 · Toggle active-state is a Tamagui VARIANT on `ToolbarButton`, not injected CSS.** `ToolbarButton` composes
  UI-1 `<Button intent="ghost" size="sm">` inside a frame whose `active` variant sets the pressed-bg; `aria-pressed` on
  toggles only. UI-1 Button has no toggle §VIII state — **DEF-E3-a** filed; UI-1 is NOT reopened. `[FACT: toolbar.tsx]`
- **BR-E3-4 · Block-type + insert use UI-1 `Menu`** (aria-labelled "Turn into"/"Insert"); the active block reflects on
  the block-type trigger label (Menu has no checked state). `[FACT: toolbar.tsx]`
- **BR-E3-4a · Callout insertion via `insertContent(calloutInsertContent())`** — E2 shipped no callout command; the
  planned `setCallout` node-command + `@tiptap/core` chain augmentation did NOT propagate to the toolbar's
  `ChainedCommands` type in this pnpm monorepo, so the toolbar inserts via the typed `insertContent` (the exact
  payload). The Callout node is **`isolating`** so the inserted slice stays a closed container. Callout insert is
  disabled inside a callout (no nesting). `[FACT: callout.ts calloutInsertContent + isolating; toolbar.tsx]`
- **BR-E3-5 · Every control is `editor.can()`-guarded** (disabled when the command can't run). `[FACT: toolbar-state.ts]`
- **BR-E3-6 · Toolbar hidden when read-only** (`editable===false`) or `toolbar={false}`. `[FACT: editor.tsx]`
- **BR-E3-a11y · APG toolbar** — `role="toolbar"` + roving tabindex (single tab stop; `←/→/Home/End`, never `↓/↑` which
  the Menus own); live enabled-set with a reconcile effect (adopts the effective stop when a control disables; never
  pulls focus from the editor). Commands chain `.focus()` → focus returns to the editor after activation. `[FACT:
  toolbar.tsx roving controller + reconcile effect; §XIV]`

## Slash menu (E4)
- **BR-E4-1 · A combobox, not a Menu mount.** The `/` menu is a Tiptap `Suggestion` plugin + `@tiptap/react`
  `ReactRenderer` popup — focus STAYS in the editor (highlight via `aria-activedescendant`), the inverse of UI-1
  `Menu`/`Popover` (trigger-anchored + move focus in). BR-4 is honored at the token/visual layer (Menu sub-theme reuse),
  not by mounting the component. New dep: **`@tiptap/suggestion@^3.30.0`** (`ReactRenderer` from the existing
  `@tiptap/react`). `[FACT: extensions/slash-command.ts; slash-menu.tsx; package.json]`
- **BR-E4-3 · Editor-local `SlashMenuItem` view-model; `@vida/types.SlashCommand` NOT redefined (BR-7).**
  `SlashCommand.block_type` is `IntegrationBlockType` (can't describe a standard block). `SLASH_MENU_ITEMS` unifies
  standard entries (authored) + the 11 integration entries **derived** from `INTEGRATION_BLOCK_COMMANDS`. `[FACT:
  slash-commands.ts]`
- **BR-E4-4/4b · Standard blocks dispatch registered E1/E2 commands after `deleteRange(range)`.** `chain().focus()
  .deleteRange(range).<cmd>()` removes the `/query` then applies. Heading/Text use SET semantics (`setNode`/`setParagraph`
  — turn-into), deliberately NOT E3's toggle. Table = `{3×3,header}`; callout = `insertContent(calloutInsertContent())`.
  **Image EXCLUDED** (BR-E4-4a — no attachment/URL surface, E3 parity). `[FACT: slash-commands.ts; slash-commands.test.ts]`
- **BR-E4-5 · Integration entries availability tracks node-view existence (CLOSED by E5).** In M1.0-pre-E5 all 11 were
  `available:false` (an unregistered node would throw on insert); E5 registered a placeholder node-view for every type,
  so `isBlockAvailable` now reads `AVAILABLE_INTEGRATION_BLOCKS` (owned by `extensions/integration-blocks.tsx`, all 11
  true) and the entries gain a `run` inserting the node. `[FACT: slash-commands.ts isBlockAvailable + INTEGRATION_ITEMS
  run; integration-blocks.tsx AVAILABLE_INTEGRATION_BLOCKS; ADR-008 §3.4]`
- **BR-E4-6 · Popup re-establishes the Menu sub-theme scope.** `<Theme name="Menu">` around the listbox (portal-scope
  lesson). ReactRenderer renders as a React portal inside `<EditorContent>` → inherits `UIProvider`/Tamagui context (no
  extra provider needed — verified). `[FACT: slash-menu.tsx; @tiptap/react ReactRenderer portal model]`
- **BR-E4-7 · Filter = case-insensitive substring over title+keywords; empty→full; no-match→"No blocks".** Integration
  entries stay in results (dimmed). `[FACT: slash-commands.ts filterSlashItems]`
- **BR-E4-10 · No trigger inside a code block.** `allow: ({editor}) => !editor.isActive('codeBlock')` — `/` stays
  literal code. `[FACT: slash-command.ts; slash-command.test.ts]`
- **BR-E4-a11y · Combobox host, the SINGLE `role` writer is `editorProps.attributes` (post-impl B1).** While open, the
  host flips `role` textbox→combobox + `aria-expanded`/`-controls`/`-haspopup` via `editor.tsx`'s `editorProps.attributes`
  FUNCTION (`slashComboboxAttrs(slashActive(state))`) — NOT a plugin (PM consumes `view._props` before plugins,
  first-writer-wins, so a plugin can't override `role`). `aria-activedescendant` = the active option id, set raw by the
  popup (not PM-managed → survives the per-keystroke decoration re-apply). Options `role="option"` + `aria-selected`/
  `aria-disabled`; focus never leaves the editor. `[FACT: editor.tsx editorProps.attributes; slash-command.ts
  slashComboboxAttrs; slash-command.test.ts active-flip; §XIV]`

## Integration-block registry (E5) — the ADR-008 `inline` render surface
> E5 is the editor-side realization of ADR-008 (the capability/block registry) that AR-7 deferred to UI-3 #29
> (`docs/core/capability/current-business-rules.md:26` — "inline instances · TipTap re-home · BlockType union"). The
> editor is the `inline` renderer (ADR-008 §3.4); the definition home is AR-7's `CapabilityRegistry` in `@vida/core`.
- **BR-E5-1 · One inline node per integration capability, DERIVED from E1's data (the ADR-008 `inline` surface, CB1/CB2).**
  `INTEGRATION_BLOCK_EXTENSIONS` = `INLINE_BLOCK_DEFS.map(createIntegrationBlockNode)`, one node per
  `INTEGRATION_BLOCK_TYPE` value (11), node `name` = the `block_type`; spread into `useEditor` after the standard blocks.
  A parity test asserts every value ∈ `editor.schema.nodes`. The factory input `InlineBlockDef` is an inline SLICE (not
  AR-7's full `CapabilityDefinition`); MOD-notes #31 adapts the real def. `[FACT: integration-blocks.tsx; editor.tsx
  extensions; integration-blocks.test.tsx parity; ADR-008 §3.1/§3.4]`
- **BR-E5-2 · Inline config = node attrs per `config_schema` (CB2), lossless for the DECLARED schema.** The 7 typed
  capabilities declare `addAttributes()` from their `@vida/types` interface (`DailySummaryBlockAttrs {date,sections}`,
  `EntityLinkBlockAttrs`, `ChartBlockAttrs`, `TimelineBlockAttrs`, `PomodoroBlockAttrs`, `HabitsBlockAttrs`,
  `TaskChecklistBlockAttrs`), each attr with a `default`; ProseMirror round-trips declared attrs via `nodeFromJSON→toJSON`.
  The map is `satisfies Record<keyof …Attrs, AttrSpec>` — a COMPILE-TIME drift guard (interfaces are erased). Attrs are
  `rendered:false` (JSON-only; kept out of the HTML DOM — the HTML per-attr codec is deferred to E6). `[FACT:
  integration-blocks.tsx CONFIG_SCHEMAS + satisfies; integration-blocks.test.tsx round-trip; ADR-008 §data-model:122; CB2]`
  - **4 types have no schema yet** (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock` — no `@vida/types` interface);
    they register attr-less; their schema is authored by their MOD-*. `[UNKNOWN: schema pending]`
- **BR-E5-3 · Placeholders NEVER crash (they degrade), and preserve declared config.** The node type is in the schema, so
  any doc containing it parses. A doc carrying an UNDECLARED attr does not preserve it: raw PM `checkAttrs` throws
  `Unsupported attribute`, but TipTap's lenient content-load (neither `enableContentCheck` nor `errorOnInvalidContent`
  set) catches → warns → degrades to empty — never a crash. `[FACT: editor.tsx has neither flag; integration-blocks.test.tsx
  boundary test; ADR-008 §terminal-states]`
- **BR-E5-4 · The placeholder is the inline `empty/unavailable` terminal state (CB6), a React node-view composed from
  UI-1 tokens.** `ReactNodeViewRenderer(IntegrationBlockPlaceholder)` (the FIRST React node-view in the editor) →
  `NodeViewWrapper` + a Tamagui card on BASE tokens (`$colorSurfaceSecondary`/`$colorBorderDefault`/`$colorTextPrimary`/
  `$colorTextMuted`), `contentEditable={false}`, `role="note"` + accessible name, showing the label + description + a
  muted "Available when its module ships". No icon → no `lucide-react` dep. `[FACT: integration-blocks.tsx; §XIV; CB6]`
- **BR-E5-5 · HTML contract is type-identifying + the per-node `getAttrs` discriminator (the E6 seam).** `renderHTML` →
  `<div data-type="integration-block" data-block-type="<name>">` (atom, no content hole; config `rendered:false`);
  `parseHTML` `getAttrs` returns `false` unless `data-block-type === name` (all 11 share one tag selector — without it
  the first-registered node claims every div). `[FACT: integration-blocks.tsx parseHTML/renderHTML; integration-blocks.test.tsx discriminator]`
- **BR-E5-6 · Availability flipped ON; skeleton reconciled.** `AVAILABLE_INTEGRATION_BLOCKS` = all 11; slash entries
  gain a `run` inserting the node by type. The 9 stale per-type empty stubs were retired (`tag-extension.ts` kept — not
  an integration type); the placeholders live in ONE `integration-blocks.tsx` (data-derived). `[FACT: slash-commands.ts;
  git rm of the 9 stubs]`
- **BR-E5-7 · Boundary + no new dep.** Still no `@vida/core`/app import (MOD-notes #31 wires the real registry); no new
  dependency (`ReactNodeViewRenderer`/`NodeViewWrapper` ship in the installed `@tiptap/react`). `[FACT: boundary grep;
  package.json unchanged]`

## Markdown serializers (E6) — the custom TipTap-JSON ↔ Markdown codec (ADR-001 §8)
- **BR-E6-1 · Custom serializer, no off-the-shelf bridge.** `toMarkdown`/`fromMarkdown` own the JSON↔Markdown mapping;
  no `@tiptap/markdown` (reopens ADR-001) / `turndown` (drops the E5 `rendered:false` config attrs). `[FACT:
  serializers/*; ADR-001:100]`
- **BR-E6-2 · The lossless invariant is JSON→md→JSON.** `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live
  schema. The reverse over an arbitrary string is unsatisfiable (equivalent spellings) → `toMarkdown` emits ONE
  canonical form, `fromMarkdown` parses that CLOSED grammar and degrades on the rest. Canonical: italic→`_` (bold+italic
  `**_x_**` unambiguous, bold the OUTER mark); code/code-fence variable-length; hardBreak→two-space+`\n`. `[FACT:
  to-markdown.ts; from-markdown.ts; serializers.test.ts]`
- **BR-E6-3 · Implement the SCHEMA, not just the block enum.** Handles all 11 `STANDARD_BLOCK_TYPE` + every mark bare
  `StarterKit@3.30.0` registers (`bold`/`italic`/`strike`/`code`/`link`/`underline`) + the `hardBreak` node. `link`
  round-trips `href` only (`target`/`rel`/`class` lossy); `underline`→`<u>` HTML span. `[FACT: to-markdown.ts
  renderTextNode/serializeInline; @tiptap/starter-kit@3.30.0]`
- **BR-E6-4 · callout & integration blocks use HTML/comment carriers.** callout→`<div data-type="callout"
  data-variant>` (symmetric with E2's `renderHTML`; E6 hand-parses it — it's headless, no TipTap `parseHTML`).
  Integration→`integration_block_handling`: `comment` (`<!-- vida:integration type config -->`, config from
  `node.attrs` — lossless for the DECLARED schema per BR-E5-2; 7 typed full attrs, 4 schema-less type-identity only) ·
  `skip` · `placeholder` (both declared-lossy). `[FACT: to-markdown.ts serializeCallout/serializeIntegration;
  from-markdown.ts callout/comment branches]`
- **BR-E6-6 · Frontmatter via the additive `MarkdownSerializeOptions.frontmatter?`.** Flat YAML, scalars stringly-typed
  (declared-lossy, out of the document-side invariant). Parse populates `MarkdownParseResult.frontmatter`. `[FACT:
  @vida/types editor.ts:203; to-markdown.ts renderFrontmatter]`
- **BR-E6-7/8 · Pure, headless, deterministic; boundary + no new dep.** Data-only signatures (no `Editor`/DOM); import
  only `@vida/types` (+ editor-local `commands.ts` for integration labels); no `@vida/core`/app import; **zero new
  runtime dependency** (the closed grammar needs no lexer). `[FACT: serializers/*; package.json deps unchanged; boundary grep]`
- **BR-E6-9 · Degrade, never throw.** `fromMarkdown` on non-canonical input degrades (unknown block → paragraph;
  malformed integration config → warn) and never throws; `toMarkdown` on an unknown node → best-effort text. Warnings
  surface on `MarkdownParseResult.warnings` (parse only — `toMarkdown` returns a bare `string`). `[FACT: from-markdown.ts
  try/catch + object-guard; serializers.test.ts degradation suite]`

## Contract integrity
- **Runtime document assertion (not a cast).** `onChange` and `getDocument` return values pass through
  `assertEditorDocument` — top-level `type==='doc'` + `content` an array of `{type:string}`, throws otherwise. Tiptap
  `getJSON()` returns `JSONContent`; a bare cast would hide a shape drift vs `@vida/types.EditorNode` reaching
  E6/persistence. `[FACT: editor.tsx assertEditorDocument, wired into onUpdate + getDocument; editor.test.tsx negative matrix]`

## a11y (§XIV)
- The contenteditable host carries `role=textbox` + `aria-multiline` + an accessible name (`aria-label`/
  `aria-labelledby`, one REQUIRED — dev-warns if neither). Focus ring is `:focus-visible` (pointer-suppressed), on the
  frame. `[FACT: editor.tsx editorProps.attributes + warnMissingName; editor-styles.ts]`
