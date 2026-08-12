# Spec: feature:ui-3-vida-editor — E3 (editor toolbar)
<!-- sub-unit spec under the UI-3 umbrella (_index.md §5, E3 row). -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-12-ui-3-vida-editor (E3 PLAN).
Parent: docs/specs/features/ui-3-vida-editor/_index.md · Ground truth: docs/editor/current-{spec,business-rules}.md

---

## 1. Identity
**E3 — the editor toolbar.** The formatting chrome for `<VidaEditor>`: a `role="toolbar"` row of controls that
**apply** formatting commands and **reflect** the active marks/block at the current selection. Composes UI-1 `Button`
+ `Menu` `[FACT: _index.md §5 E3 row "Formatting controls; composes UI-1 Button/Menu; reflects active marks"; BR-4]`.

**Scope IN:** the toolbar component + its mount into `<VidaEditor>` + active-state reflection via `useEditorState`
+ the a11y toolbar pattern (roving tabindex).
**Scope OUT (grounded):**
- **Slash menu** — E4 `[FACT: _index.md §5 E4]`.
- **Bubble/floating (selection-anchored) toolbar** — not in the umbrella's E3 row (which says "toolbar", the fixed
  chrome). A floating variant, if ever wanted, is a later enhancement. `[INTERP: _index.md §5]`
- **Image + Link controls** — both need a URL/attachment input surface the editor does not yet have: `image` is
  presentational with its attachment pipeline **deferred** (BR-E2-5), and `link` needs a URL prompt UI. Excluded from
  E3; they return with their input surfaces. `[FACT: docs/editor/current-business-rules.md BR-E2-5; StarterKit ships
  bold/italic/underline/strike/code/**link** — link present but URL-UI absent]`

## 2. Business Rules (E3)
- **BR-E3-1 · The toolbar mounts INSIDE `<VidaEditor>`; the raw `Editor` never leaks.** E1 deliberately curated the
  imperative handle to `setContent/focus/getDocument` and does **not** expose the Tiptap `Editor` `[FACT: editor.tsx
  VidaEditorHandle]`. The toolbar renders inside `VidaEditorImpl` (where `editor` is already in scope), above
  `<EditorContent>` within the frame — so consumers stay decoupled from Tiptap (BR-7 spirit) and no new editor-leak API
  is added. A detached/portal toolbar (app places it in a sticky header) is a **documented deferred option**, not E3.
  `[INTERP: BR-E1-1 encapsulation + _index.md §5]`
  - **Null-editor gate (BLOCKER fix, gate-1 B2):** `useEditor` returns `Editor | null` under E1's
    `immediatelyRender:false` — the editor mounts asynchronously `[FACT: editor.tsx:120; @tiptap/react d.ts useEditor
    Editor|null overload; editor.test.tsx waits for .ProseMirror]`. So `EditorToolbar` is rendered ONLY when `editor`
    is non-null (`{toolbar && editable && editor && <EditorToolbar editor={editor} … />}`), which keeps the
    `editor: Editor` (non-null) prop honest and prevents the `useEditorState` selector from dereferencing `null` on
    first render. The toolbar simply isn't in the tree until the editor exists (a frame-height reflow the Visual Gate
    confirms is not jarring). `[INTERP: BR-E1 mount model]`
  - **a11y sibling guarantee (gate-2 N-1):** the toolbar renders as a SIBLING above `<EditorContent>`, NOT inside the
    contenteditable — the `role=textbox` lives on the inner `.ProseMirror` host via `editorProps.attributes`, so
    toolbar controls sit BESIDE the textbox, never within it (no interactive-content-in-textbox nesting violation).
    `[FACT: editor.tsx:104-106,154-158]`
- **BR-E3-2 · Active state via `useEditorState`, not per-transaction re-render.** E1 runs Tiptap v3's default
  `shouldRerenderOnTransaction:false` — the editor does NOT re-render the React tree on every transaction `[FACT:
  e1 §8 handoff note; @tiptap/react@3.30.0 UseEditorOptions.shouldRerenderOnTransaction]`. The toolbar subscribes to a
  **selected slice** of editor state via `useEditorState({ editor, selector })` (present in `@tiptap/react@3.30.0`
  `[FACT: node_modules/.pnpm/@tiptap+react@3.30.0.../dist/index.d.ts:589 useEditorState; UseEditorStateOptions {editor,
  selector, equalityFn?}]`) so it re-renders **only** when a reflected value (active mark, active block, can-undo)
  changes — not on every keystroke.
  - ⚠ **MAT-2 · `useEditorState` gates the RE-RENDER, not the selector COMPUTE.** The selector runs on **every
    transaction**; it does O(controls) `editor.isActive(...)` + `editor.can()...` probes (~5 marks + undo/redo + block
    checks), and each `can()` builds a throwaway state. Standard Tiptap-toolbar practice and fine for normal docs, but
    NOT free — the React re-render is deduped, the per-keystroke compute is not. If the Visual Gate or a perf pass
    shows jank on large docs, narrow/memoize the probe set. Do not read this hook as "cost-free". `[FACT: useEditorState
    runs the selector per transaction; @tiptap/core can() allocates a state]`
- **BR-E3-3 · Toggle controls compose UI-1 `Button`; active-state is added by E3, UI-1 is NOT reopened.** UI-1 `Button`
  exposes `intent ∈ {primary,secondary,ghost,danger}` + `size` + `disabled` + `onPress` but **no toggle/pressed §VIII
  state** `[FACT: packages/ui/src/components/button.tsx ButtonProps; Intent type]`. E3 introduces a thin
  **`ToolbarButton`** that composes `<Button intent="ghost" size="sm">`, adds `aria-pressed={active}` for AT, and an
  **active background token** for the visual pressed state — it does NOT edit the merged `@vida/ui` package (wave
  discipline; UI-1 is Done). The missing primitive state is filed as **DEF-E3-a** for the DS owner (the DEF-register
  precedent), so a real `Button` toggle variant can subsume `ToolbarButton` later. `[INTERP: BR-4 "compose UI-1"; the
  UI-1 DEF-register precedent]`
  - ⚠ **Inline-vs-variant risk (Visual-Gate check):** `ghost` sets `backgroundColor:'transparent'` via a variant;
    E3's active background is applied as a direct Tamagui prop. Direct props resolve after variants in Tamagui, so the
    override is expected to hold — but this is exactly the [[injected-css-loses-to-tamagui-variants]] failure class, so
    the active fill MUST be verified in a real browser at the Visual Gate. Fallback if it doesn't hold: swap the whole
    `intent` (ghost↔secondary) between states (variant-clean). `[INTERP: memory + Tamagui resolution order]`
- **BR-E3-4 · Block-type + insert actions use UI-1 `Menu`.** "Turn into…" (block type) and "Insert…" (table/callout/
  divider) are `Menu`s whose `trigger` is a `Button` and whose `items` dispatch the command via `onSelect` `[FACT:
  packages/ui/src/components/menu.tsx MenuProps{trigger,items}, MenuItem{id,label,onSelect}]`. `Menu` has no
  checked/active `menuitemradio` state, so the **active block type is reflected on the trigger label** ("Heading 1 ▾"),
  not by a menu checkmark. `[FACT: MenuItem has no `selected`/`checked` field]`
  - **PREFLIGHT F2 · each Menu needs an accessible name.** UI-1 Menu requires an `aria-label`/`aria-labelledby` (a
    `role=menu` with no name fails §XIV — DEF-U7-d) `[FACT: menu.tsx aria-label prop]`. Pass `aria-label="Turn into"`
    (block-type) and `aria-label="Insert"` (insert). The trigger Buttons also carry accessible names.
- **BR-E3-4a · Callout insertion needs a command E2 did NOT ship — E3 adds it (BLOCKER fix, gate-1 B1).** The bespoke
  E2 Callout node has **no `addCommands`** — it only round-trips through JSON; "no command/UI insertion is in E2 scope"
  `[FACT: packages/editor/src/extensions/callout.ts (no addCommands); e2-standard-blocks.md:208]`. Table
  (`insertTable`) and divider (`setHorizontalRule`) are real registered commands, but callout is not. E3 **adds
  `setCallout(variant?)` to `callout.ts` via `addCommands()`** — the idiomatic Tiptap home for a node-insertion command,
  the SAME UI-3 feature/package (not reopening a merged external package). It inserts a fresh callout with an empty
  paragraph: `commands.insertContent({ type:'callout', attrs: variant ? {variant} : {}, content:[{type:'paragraph'}] })`.
  **The node's own attr `default` + `renderHTML normalizeVariant` resolve an omitted variant → `info`** — the command
  does NOT call the module-private `normalizeVariant` (gate-2 MAT-1: one source of truth, no private-symbol coupling).
  A round-trip test guards it. `[FACT: callout.ts variant default + renderHTML normalizeVariant:48; BR-E2-6 default info]`
- **BR-E3-5 · Every command is guarded by `editor.can()`.** A control is `disabled` when its command cannot run at the
  current selection (e.g. bold inside a code block; undo with empty history) — read from the same `useEditorState`
  selector via `editor.can().chain().focus().<cmd>().run()`. No dead/no-op clicks. `[FACT: @tiptap/core can() API]`
- **BR-E3-6 · Toolbar hidden when read-only.** When `editable===false` the toolbar does not render (a read-only editor
  has no formatting affordance — dead chrome is noise). Gated additionally by a `toolbar?: boolean` prop (default
  `true`). `[INTERP: BR-E1 editable semantics]`
- **BR-E3-7 · No new tokens, no raw values, B12 motion only.** Controls use DS base semantic tokens + the token scale
  for dimensions (`$md`/`$sm`, DEF-U8-h) `[FACT: BR-4; packages/ui/src/CLAUDE.md]`. The toolbar itself adds **no
  motion** (Menu's open transition is UI-1's, already B12-legal); the row is static. `[FACT: BR-6 B12]`
- **BR-E3-8 · Boundary preserved.** E3 adds only `@vida/ui` (`Button`,`Menu` — already a dep) + `@tiptap/react`
  (`useEditorState` — already a dep) usage. **No `@vida/core` / app import.** `[FACT: _index.md §4 boundary gate]`

## 3. Contract — API & composition
### `<VidaEditor>` — additive prop (no breaking change)
```ts
interface VidaEditorProps {
  // …E1/E2 props unchanged…
  toolbar?: boolean   // render the formatting toolbar. Default true. Ignored when editable===false (BR-E3-6).
}
```
No other public prop changes; `VidaEditorHandle` is unchanged (BR-E3-1 — no editor leak).

### `EditorToolbar` (internal component — `toolbar.tsx`, not exported from the barrel in E3)
```ts
interface EditorToolbarProps {
  editor: Editor          // NON-NULL — the mount site only renders EditorToolbar once `editor != null` (BR-E3-1
                          // null-editor gate); internal, never crosses the package boundary.
  'aria-label'?: string   // default 'Formatting'
}
```
- Reads active state through `useEditorState({ editor, selector })` → `{ marks: {bold,italic,underline,strike,code},
  can: {bold,italic,…,undo,redo}, activeBlock: BlockTypeKey }`. Equality is the default deepEqual (small flat object).
- **`ToolbarButton`** (internal): `{ active?: boolean; disabled?: boolean; onPress: () => void; 'aria-label': string;
  children }` → composes `<Button intent="ghost" size="sm" disabled aria-pressed={active} onPress>` + active-bg token.

### Control set (grounded in the registered schema)
`[FACT: StarterKit@3.30.0 bundles bold·italic·underline·strike·code·link·paragraph·heading·blockquote·codeBlock·
bulletList·orderedList·horizontalRule·undoRedo; E2 adds taskList·image·table·callout]`

| Group | Controls | Command | Reflected |
|-------|----------|---------|-----------|
| Marks | Bold · Italic · Underline · Strike · Code | `toggleBold` … `toggleCode` | `aria-pressed` = `isActive(mark)` |
| Block type (Menu) | Paragraph · H1 · H2 · H3 · Bullet list · Ordered list · Task list · Quote · Code block | `setParagraph`/`toggleHeading({level})`/`toggleBulletList`/`toggleOrderedList`/`toggleTaskList`/`toggleBlockquote`/`toggleCodeBlock` | trigger label = active block |
| Insert (Menu) | Table · Callout · Divider | `insertTable({rows:3,cols:3,withHeaderRow:true})` · **`setCallout()` (ADDED to callout.ts in E3 — BR-E3-4a)** · `setHorizontalRule` | — (one-shot) |
| History | Undo · Redo | `undo`/`redo` | `disabled` = `!can().undo()` |

> Image + Link intentionally excluded (BR scope-out — need URL/attachment input).

## 4. States (§VIII applicable subset)
- **Control resting** (ghost), **hover** (ghost hover fill — UI-1), **active/pressed** (toggle on, `aria-pressed`,
  active-bg), **disabled** (command can't run), **focus** (`:focus-visible` ring — UI-1 Button), **Menu open**
  (UI-1 Menu). No loading/empty/error at the toolbar (the editor's terminal states are the app's, UX-4).

## 5. Accessibility (§XIV) — APG toolbar pattern
- Container `role="toolbar"`, `aria-label="Formatting"` (overridable), `aria-orientation="horizontal"`.
- **Roving tabindex:** the toolbar is a **single tab stop**; `ArrowLeft/ArrowRight` move focus between controls,
  `Home/End` jump to first/last; only the focused control has `tabIndex=0`, the rest `-1`. Menu triggers participate
  as controls; opening a Menu hands off to UI-1 Menu's own menu-button keyboard model, and Esc/selection returns focus
  to the trigger (UI-1 Menu contract). `[FACT: WAI-ARIA APG toolbar; UI-1 Menu roving-focus contract]`
  - **M2 · The roving controller owns ONLY Left/Right/Home/End — never the vertical arrows.** UI-1 Menu binds
    `ArrowDown/ArrowUp` on its trigger to OPEN the menu `[FACT: menu.tsx onTriggerKeyDown ArrowDown/ArrowUp]`. The
    toolbar's container-level key handler must handle only horizontal + Home/End and must NOT `preventDefault`/consume
    `ArrowDown/ArrowUp` (else it swallows the menu-open key when focus is on a Menu-trigger control). `[FACT: gate-1 M2]`
  - **M3 · The roving order is the LIVE ENABLED set.** Because controls disable per selection (BR-E3-5, `editor.can()`),
    the controller recomputes the enabled sequence on each state change and NEVER parks `tabIndex=0` on a disabled
    control (the single tab stop would become unreachable). Mirror UI-1 Menu's `firstEnabled`/`stepWrap` dynamic-set
    handling, not a static index array. `[FACT: menu.tsx firstEnabled/stepWrap; gate-1 M3]`
- Toggle buttons expose `aria-pressed`; disabled controls are `disabled` (removed from the roving order while disabled, per M3).
- Focus is never stolen: mounting/updating the toolbar must not move focus out of the editing surface.
- **PREFLIGHT F4 · commands chain `.focus()` → focus returns to the editor after activation** (marks/blocks apply to
  the selection; the caret is back in the text — standard editor-toolbar behavior). This is intentional, not a focus
  bug; the toolbar's roving tabindex governs Tab/arrow traversal, not post-command focus. `[FACT: editor.chain().focus()]`

## 6. Acceptance
- [ ] `toolbar` renders inside `<VidaEditor>` (default on), hidden when `editable===false` or `toolbar={false}`.
- [ ] Each mark button toggles its mark AND shows `aria-pressed` reflecting `isActive` — verified after a selection
      change WITHOUT a full editor re-render (proves the `useEditorState` path, BR-E3-2).
- [ ] Block-type Menu turns the current block into each option; the trigger label reflects the active block.
- [ ] Undo/Redo dispatch and are `disabled` when `!editor.can()`.
- [ ] `role="toolbar"` + roving tabindex (arrows/Home/End) + `aria-pressed` verified (jsdom for roles/pressed/tabindex;
      geometry-free assertions only — the U7/U9 jsdom-defers-layout rule).
- [ ] Insert Menu inserts a **deterministic** table (`{rows:3,cols:3,withHeaderRow:true}`), a `setCallout()` callout
      (default `info`, round-trip test), and a divider.
- [ ] **Default-on regression owned (MAT-3):** existing E1/E2 stories + `editor.test.tsx` + `standard-blocks.test.tsx`
      audited/updated for the now-present toolbar; both suites green.
- [ ] Boundary clean: no `@vida/core`/app import; no raw hex (grep-gated); B12 (no toolbar motion). **First value-import
      of `Button`/`Menu` from `@vida/editor` — the built `@vida/ui` dist barrel imports clean** (N1,
      [[first-runtime-consumer-surfaces-latent-barrel-defects]]).
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck 11/11; `build-storybook` ✓.
- [ ] **Visual Gate (Victor, real browser, both themes):** active-bg override holds over ghost (BR-E3-3 risk);
      pressed/disabled/hover/focus legible; Menu opens/flips; theme crosses. A "Toolbar" story added.
- [ ] §XXIX currency: `docs/editor/current-*` refreshed (E3 surface), `editor-architecture.md` toolbar section,
      `packages/editor/src/CLAUDE.md`, umbrella §5 E3 → ✅.
- [ ] **DEF-E3-a filed** (UI-1 `Button` lacks a §VIII toggle/pressed state) to the DS DEF-register.
- [ ] Baseline drift fixed: drop the stale `EDITOR_VERSION` const (0.1.0 vs pkg 0.2.0→0.3.0); package.json is the
      source of truth. `[FACT: src/index.ts:2 vs package.json version]`

## 7. Implementation Prompt — build steps (materialize on Approval 2)
- **B0 · default-on regression audit (gate-2 MAT-3)** — `toolbar` defaults `true`, so EVERY existing render of
  `<VidaEditor>` (5 stories in `editor.stories.tsx`; the `editor.test.tsx` + `extensions/standard-blocks.test.tsx`
  renders) now gets a toolbar row. BEFORE building, audit those for assumptions that break under a default-on toolbar:
  role queries, focusable-count, "first focusable is the contenteditable", frame DOM-shape/snapshot. Update the E1/E2
  tests (add `toolbar={false}` where a test isolates the textbox, or adjust the assertion) and re-baseline the story
  descriptions. Rationale for keeping default-ON: an editor shipping its own formatting chrome is the correct product
  default (the umbrella's "editor shell + toolbar"); the regression is owned here, not dodged by a worse default.
- **B1 · version + cleanup** — `package.json` 0.2.0→0.3.0; remove `EDITOR_VERSION` from `index.ts` (unconsumed; drifted).
- **B1a · `setCallout` command (BR-E3-4a)** — add `addCommands()` to `extensions/callout.ts` exposing
  `setCallout(variant?: CalloutVariant)` → `insertContent({type:'callout', attrs: variant ? {variant} : {},
  content:[{type:'paragraph'}]})` (let the node's `default`/`renderHTML` resolve the variant — MAT-1, no
  `normalizeVariant` in the command). **PREFLIGHT F1:** also add the Tiptap module augmentation so `editor.chain()
  .setCallout()` typechecks — `declare module '@tiptap/core' { interface Commands<ReturnType> { callout: {
  setCallout: (variant?: CalloutVariant) => ReturnType } } }` (runtime `addCommands` alone does NOT type the chain).
  A getJSON round-trip test proves it inserts a well-formed callout (default `info`).
- **B2 · `internal/toolbar-state.ts`** — the `useEditorState` selector → `{marks, can, activeBlock}`; a pure
  `resolveActiveBlock(editor)` helper (paragraph/heading level/bulletList/orderedList/**taskList (nests in `taskItem` —
  test both the list and the item-cursor case)**/blockquote/codeBlock/callout) tested in isolation (N3).
- **B3 · `ToolbarButton`** (in `toolbar.tsx`) — composes `<Button intent="ghost" size="sm">` + `aria-pressed` +
  active-bg token; roving-tabindex-aware (`tabIndex` prop threaded).
- **B4 · `EditorToolbar`** (`toolbar.tsx`) — `role=toolbar` + roving-tabindex controller (**Left/Right/Home/End ONLY —
  never consume ArrowDown/Up, M2**; LIVE enabled-set, M3) + the three groups (mark buttons, block-type `Menu`, insert
  `Menu` with the pinned `insertTable({rows:3,cols:3,withHeaderRow:true})` + `setCallout()` + `setHorizontalRule`) +
  Undo/Redo; all commands via `editor.chain().focus().<cmd>().run()`, all guards via the B2 selector.
- **B5 · mount** — render `<EditorToolbar editor aria-label>` in `VidaEditorImpl` above `<EditorContent>` (inside the
  frame, divider below), gated by `toolbar && editable && editor` (the **null-editor gate**, BR-E3-1); add the
  `toolbar?: boolean` prop.
- **B6 · `internal/editor-styles.ts`** — toolbar row layout (`EditorFrame` stays `flexDirection:column` so the
  toolbar sits ABOVE `<EditorContent>` — N-2) + divider + active-bg via token var; no hex (grep-gated).
- **B7 · tests** — `toolbar.test.tsx` (render under UIProvider; each mark toggles + aria-pressed reflects after a
  selection set; block-type turn-into + label; insert table/callout/divider; undo/redo disabled-state; role=toolbar +
  roving tabindex arrows/Home/End; hidden when !editable/!toolbar) + `toolbar-state.test.ts` (resolveActiveBlock
  matrix). Story "Toolbar" in `editor.stories.tsx`.
  - **PREFLIGHT F3 · mark tests must seed content + a non-empty text selection first.** A `toggleBold` on an empty doc
    with a collapsed cursor is a no-op — seed a paragraph, `selectAll`/set a text range, THEN toggle and assert
    `isActive('bold')`/`aria-pressed`. Follow E1's `waitFor(editor.isEditable)` before asserting (immediatelyRender:false).
- **B8 · §XXIX currency + DEF-E3-a** — refresh current-*, `editor-architecture.md`, `CLAUDE.md`, umbrella row; file DEF.
- **B9 · Visual Gate (Victor)** — real browser, both themes (BR-E3-3 active-bg is the key check).

## 8. Deviations (§XXVIII) — recorded during implementation
- **DEV-1 · Callout insertion via `insertContent`, not a `setCallout` node command (BR-E3-4a mechanism swap).** The
  planned `addCommands` `setCallout` + `declare module '@tiptap/core'` chain augmentation compiled inside `callout.ts`
  but the in-source augmentation **did not propagate** to the toolbar's `ChainedCommands` type in this pnpm monorepo
  (node-module extensions' shipped-`.d.ts` augmentations do — e.g. `insertTable` — an in-source one didn't). Rather
  than force it with casts, the toolbar inserts via the already-typed `editor.chain().focus().insertContent(
  calloutInsertContent())` — the EXACT operation `setCallout` would run. `callout.ts` exports `calloutInsertContent(
  variant?)` (the canonical payload; the node's attr `default` still resolves an omitted variant → `info`). Net: no
  `@tiptap/core` direct dep, no augmentation, fully typed. BR-E3-4a's intent (toolbar inserts a callout + round-trip
  test) is met. Mechanical (which typed API), not a re-decision.
- **DEV-2 · `isolating: true` added to the E2 Callout node.** `insertContent({type:'callout', …})` "opened" the
  inserted slice (the inner paragraph flowed out, dropping the wrapper → two paragraphs, no callout). `isolating:true`
  makes the callout a closed container — the correct callout semantics (content never merges across its boundary) AND
  what the E3 insert path needs. A one-line behavior refinement to E2's node; the E2 round-trip/render tests still pass.
- **DEV-3 · B6 needs no injected CSS.** The toolbar is fully expressible in Tamagui — `ToolbarRow` (`styled(View)`:
  row/wrap/gap/bottom-divider) + `ToolbarButtonFrame` (the `active` VARIANT for the pressed-bg). So `editor-styles.ts`
  is untouched; the active-state is a variant (not injected CSS), which also satisfies BR-E3-3 / the @vida/ui
  "prop-driven state = variant" rule by construction (the inline-vs-variant risk never materializes).
- **DEV-4 · Test selection = a `TextSelection` within content, not `selectAll`.** `selectAll` yields an `AllSelection`
  spanning the doc boundaries, for which `isActive('heading'|'bold'|…)` returns false; the tests set
  `setTextSelection({from:1, to:size-1})` to reflect real cursor state.

## 9. Open Decisions
- [DECIDED] Toolbar mounts inside `<VidaEditor>` (BR-E3-1), not a separately-exported component — preserves E1's
  no-editor-leak boundary; detached-toolbar deferred.
- [DECIDED] Active-state = `useEditorState` selector (BR-E3-2) — the E1 §8 resolution.
- [DECIDED] Toggle active-state = `ToolbarButton` composing UI-1 Button + `aria-pressed` + active-bg; DEF-E3-a filed,
  UI-1 not reopened (BR-E3-3).
- [DECIDED] Control set grounded in the registered schema; Image + Link excluded (need URL/attachment UI).
- [OPEN — for Approval 1] Toolbar **layout inside vs above the frame** + the exact grouping/dividers is a Visual-Gate
  design call; the spec fixes behavior, the Visual Gate fixes the look. Flagged so Victor can steer at review.

## 10. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-12 | ui-3-vida-editor | E3 sub-spec authored at PLAN. Grounded control set (StarterKit v3 + E2), mount/active-state/toggle decisions vs the E1 precedent, APG toolbar a11y, DEF-E3-a (Button toggle state), baseline `EDITOR_VERSION` drift fold-in. |
| 2026-08-12 | ui-3-vida-editor | **IMPLEMENTED + post-impl /critique REVISE → resolved (no blockers).** Independent critic confirmed the Menu ref-composition, M2 arrow handling, insert payload, and isolating-serialization are correctly executed. Fixed MAT-A/B: the roving `rovingId` never reconciled to `effectiveRoving` when a control left the enabled set → added a reconcile `useEffect` (adopts the effective stop; refocuses only if a toolbar control owns focus — never steals from the editor). MAT-D: styled the mark glyphs (bold B / italic I / underlined U / struck S / mono `</>`). Nit: callout insert disabled inside a callout (no nesting). Added tests: mark-disabled-in-codeblock, never-zero-tab-stops, callout-nest-guard, no-focus-steal-on-mount. §XXVIII deviations DEV-1..4 recorded (§8). Automated: editor typecheck ✓ · **60 tests** ✓ · build + build-storybook ✓ · root typecheck 11/11 · boundary clean · no hex. |
| 2026-08-12 | ui-3-vida-editor | **Gate-2 /critique REVISE → resolved (no blockers).** Confirmed all gate-1 + preflight fixes landed correctly vs live `callout.ts`/`menu.tsx`/`editor.tsx`. Fixed 3 new material the edits opened: MAT-1 reconciled `setCallout` attrs payload (`variant ? {variant} : {}`, node resolves default — no private `normalizeVariant`); MAT-2 honest note that `useEditorState` gates re-render, not the per-transaction `can()` compute; MAT-3 added B0 default-on regression audit of E1/E2 stories+tests + acceptance line. Folded nits N-1 (a11y sibling guarantee), N-2 (frame column-direction), N-4 (dedup acceptance). |
| 2026-08-12 | ui-3-vida-editor | **/preflight PASS + 4 folds:** F1 `setCallout` needs a `@tiptap/core` Commands module augmentation to typecheck the chain (not just `addCommands`); F2 both Menus need `aria-label` (Turn into / Insert, DEF-U7-d); F3 mark tests must seed content + a text selection (empty-doc toggle is a no-op); F4 `.focus()` returns focus to the editor post-command (intentional). |
| 2026-08-12 | ui-3-vida-editor | **Gate-1 /critique REVISE → resolved.** Independent critic confirmed `useEditorState`/Underline/TaskList/Table/roving-viability TRUE. Fixed **2 blockers**: B1 `setCallout` does not exist (E2 shipped no insertion command) → E3 adds it to `callout.ts` (BR-E3-4a); B2 null-editor first render (`immediatelyRender:false` → `useEditor` is `Editor|null`) → mount null-gate (BR-E3-1). Fixed **3 material**: M1 pinned `insertTable` shape; M2 roving owns Left/Right/Home/End only (never Menu's ArrowDown/Up); M3 live enabled-set roving. Folded nits: N1 dist-barrel-clean acceptance, N3 taskList-nesting test note. |
