# Spec: feature:ui-3-vida-editor — E4 (slash menu)
<!-- sub-unit spec under the UI-3 umbrella (_index.md §5, E4 row). -->
Status: approved         <!-- draft → approved → implemented · Approval 1 granted 2026-08-12 (documented scope) -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-12-ui-3-e4-slash-menu (E4 PLAN).
Parent: docs/specs/features/ui-3-vida-editor/_index.md · Ground truth: docs/editor/current-{spec,business-rules}.md

---

## 1. Identity
**E4 — the slash menu.** A `/`-triggered command palette inside `<VidaEditor>`: type `/` in the text, a filterable
popup appears anchored at the caret, arrow/Enter/Esc drive it **without leaving the editor**, and selecting an item
inserts (or turns the current block into) the chosen block. Composes UI-1's Menu **token/visual language** + the
Tiptap **Suggestion** utility `[FACT: _index.md §5 E4 row "`/`-triggered block-insertion menu; composes UI-1
Menu/Popover; type-ahead. Lists integration-block commands…"; BR-4]`.

**Scope IN:**
- The Tiptap **Suggestion** plugin wiring (`char:'/'`) as a TipTap `Extension` + its mount into `<VidaEditor>`.
- The popup list component (filterable, keyboard-driven, combobox/listbox a11y) rendered via `@tiptap/react`
  `ReactRenderer`.
- The **command set**: standard-block commands (insert/turn-into — all backed by already-registered E1/E2 nodes) +
  the 11 `INTEGRATION_BLOCK_COMMANDS` surfaced as **deferred (disabled) entries** until E5 lands their node-views.
- Type-ahead filtering on the query after `/`.

**Scope OUT (grounded):**
- **The integration-block node-views / a runtime `BlockRegistry`** — E5 `[FACT: _index.md §5 E5 row; BR-3]`. E4 only
  *lists* integration commands and marks them unavailable; it inserts **no** integration node (ProseMirror throws on an
  unknown node type — inserting a `dailySummary` node before E5 registers its schema would crash) `[FACT:
  @tiptap/pm/model unknown-node throws; _index.md §5 E4↔E5 note "resolve to E5's placeholders"]`.
- **`@`-mentions / entity `[[wiki-link]]` autocomplete** — a separate suggestion surface (entity-link is its own
  integration block + backlink concern, MOD-notes), not the block slash menu. `[INTERP: CLAUDE.md §8 entity linking]`
- **A drag-handle / `+` block-insert affordance** — a different insertion UI, not in the umbrella's E4 row. `[INTERP]`
- **Redefining `@vida/types.SlashCommand`** — BR-7 forbids it; E4 adds an editor-local view-model instead (§3, BR-E4-3).

## 2. Business Rules (E4)

- **BR-E4-1 · The slash menu is a Tiptap `Suggestion` plugin, not a UI-1 `Menu`/`Popover` mount.** A UI-1 `Menu`/
  `Popover` is a **trigger-slot** component: it `cloneElement`s a button, opens on click, positions off the button's
  rect, and **moves DOM focus into the panel** `[FACT: packages/ui/src/components/menu.tsx cloneElement + roving DOM
  focus; popover.tsx trigger cloneElement]`. A slash menu is the inverse — **no trigger element** (anchored to the
  caret), opened by typing `/`, and **focus MUST stay in the contenteditable** so the user keeps typing to filter.
  That is the WAI-ARIA **combobox** model (like UI-1 `Select`: focus on the input, highlight via
  `aria-activedescendant`), **not** the menu-button roving-focus model. So E4 uses `@tiptap/suggestion`'s
  `Suggestion({char, items, command, render})` plugin — the plugin owns the trigger detection, the `/query` decoration,
  the caret-anchored positioning (via **`props.mount(element)`** — the plugin's own MANAGED positioning; E4 imports NO
  floating-ui and does no `getBoundingClientRect` math), and the key routing — and E4 supplies the popup
  view. **BR-4 ("compose UI-1 primitives + tokens") is honored at the token/visual layer** (the popup reuses the Menu
  sub-theme + panel token language), not by mounting the Menu component. `[FACT: @tiptap/suggestion Suggestion() render
  lifecycle onStart/onUpdate/onKeyDown/onExit + props.mount managed positioning — read-docs-first suggestion.mdx
  2026-08-12]` `[CORRECTION (gate-1 B2): an earlier draft claimed @floating-ui/dom is a resolvable @tiptap/react
  transitive dep — it is NOT (only an OPTIONAL peer of @tiptap/react/menus, unresolvable from @vida/editor). E4 needs
  none: props.mount owns positioning. A future manual-positioning fallback calling computePosition would require adding
  @floating-ui/dom as an EXPLICIT package.json dep — never a hoisted optional peer.]` `[INTERP: the umbrella's "composes UI-1 Menu/Popover" is a visual-composition note, not
  a literal-mount mandate — the E2 "block set from the enum" / E3 "callout via insertContent" gate-time-correction
  precedent]`

- **BR-E4-2 · New dep: `@tiptap/suggestion@^3.30.0`.** Not in the tree (StarterKit does not pull it; `@tiptap/pm` has
  no `suggestion` subpath) `[FACT: pnpm store has no @tiptap/suggestion; packages/editor/node_modules/@tiptap/pm has no
  suggestion dir]`. Added family-pinned `^3.30.0` (E1/E2 "add each dep at the unit that needs it, pinned to the tiptap
  family" precedent) `[FACT: package.json all @tiptap/* at ^3.30.0]`. `ReactRenderer` comes from the **already-present**
  `@tiptap/react` `[FACT: package.json @tiptap/react ^3.30.0]`.
  - **B0 verify (gate-1 M1) — DONE at preflight:** `@tiptap/suggestion@3.30.0` INSTALLED + API confirmed against its
    shipped d.ts: `Suggestion({char, allowSpaces, startOfLine, pluginKey, decorationClass, command, items, render,
    allow, …})`; **`props.mount` managed positioning present** (d.ts:375 `mount: SuggestionMount`); `SuggestionProps` =
    `{editor, range, query, items:I[], command:(sel)=>void, mount, clientRect?, decorationNode}`. `@floating-ui/dom` is
    `@tiptap/suggestion`'s OWN resolved dep (managed positioning) — E4 still imports none (B2). `[FACT: node_modules/
    .pnpm/@tiptap+suggestion@3.30.0.../dist/index.d.ts:8-16,175-177,251-321,375,408; installed 2026-08-12]`

- **BR-E4-3 · E4 owns an editor-local `SlashMenuItem` view-model; `@vida/types.SlashCommand` is NOT redefined (BR-7).**
  `@vida/types.SlashCommand.block_type` is typed `IntegrationBlockType` `[FACT: packages/types/src/editor.ts:150]` — it
  **structurally cannot** describe a standard-block insert (heading/list/quote/…). Yet `SLASH_COMMAND_CATEGORY` includes
  `'basic'` and `'media'`, which the 11 `INTEGRATION_BLOCK_COMMANDS` (all `'platform'`/`'embed'`) never use `[FACT:
  editor.ts:157 SLASH_COMMAND_CATEGORY = ['basic','media','platform','embed']; commands.ts categories]` — `basic`/
  `media` are unused HEADROOM in the enum (evidence a standard-block command surface was foreseen), **not** a contract
  that binds E4's category assignments; E4 authors its own standard-block entries and picks their categories. E4
  introduces a package-local view-model that unifies both without touching `@vida/types`:
  ```ts
  interface SlashMenuItem {
    id: string
    title: string
    description?: string
    icon?: string              // Lucide name (hint; icon rendering is a later polish — see §9)
    keywords: readonly string[] // extra filter terms (e.g. the '/summary' shortcut, 'h1', 'bullet')
    category: SlashCommandCategory        // reuse the @vida/types enum for grouping
    available: boolean          // false → deferred integration block (disabled until E5)
    run?: (editor: Editor, range: Range) => void  // omitted when !available
  }
  ```
  The 11 integration entries are **derived from `INTEGRATION_BLOCK_COMMANDS`** (reusing E1's data, BR-E1-4) with
  `available:false, run:undefined`; the standard-block entries are authored in E4 with real `run` closures. `[INTERP:
  BR-7 + the LV-3a "local union ≡ @vida/types, no cross-package edge" precedent (export-dialog `ExportFormat`)]`

- **BR-E4-4 · Standard-block commands dispatch the already-registered E1/E2 commands, after deleting the `/query`.**
  Each `run(editor, range)` = `editor.chain().focus().deleteRange(range).<command>().run()` — `deleteRange(range)`
  removes the typed `/…` trigger text (the Suggestion `command` callback hands back the `range`), then the real command
  runs `[FACT: @tiptap/suggestion command({editor, range, props})]`. The list/quote/code/table/divider/callout command
  NAMES match the ones the shipped E3 toolbar dispatches `[FACT: toolbar.tsx toggleBulletList/toggleOrderedList/
  toggleBlockquote/toggleCodeBlock/insertTable/setHorizontalRule + calloutInsertContent]`; the **heading command
  deliberately differs from E3** — see the ⚠ note below the table.
  The set (all backed by a registered node — no unknown-node risk):

  | Item | Category | Command chained after `deleteRange(range)` |
  |------|----------|--------------------------------------------|
  | Heading 1 / 2 / 3 | basic | `setNode('heading', {level})` |
  | Bulleted list | basic | `toggleBulletList()` |
  | Numbered list | basic | `toggleOrderedList()` |
  | Task list | basic | `toggleTaskList()` |
  | Quote | basic | `toggleBlockquote()` |
  | Code block | basic | `toggleCodeBlock()` |
  | Divider | basic | `setHorizontalRule()` |
  | Table | media | `insertTable({rows:3, cols:3, withHeaderRow:true})` (the E3-pinned shape) |
  | Callout | media | `insertContent(calloutInsertContent())` (E3's typed payload — no `setCallout` command exists, DEV-1) |
  | ~~Image~~ | media | **EXCLUDED** — `setImage` exists but yields an empty `<img>` (no URL/attachment UI); see BR-E4-4a |

  `[FACT: StarterKit v3 + E2 registered nodes; extensions/callout.ts calloutInsertContent; docs/editor/current-spec.md
  E2/E3 sections]`
  - **⚠ BR-E4-4b · Heading uses `setNode('heading', {level})` (turn-INTO), deliberately NOT E3's `toggleHeading({level})`
    (gate-1 B1).** E3's toolbar is a TOGGLE button — pressing H1 on an existing H1 returns it to paragraph `[FACT:
    toolbar.tsx toggleHeading({level})]`. A slash **pick** has turn-into semantics: choosing "Heading 1" should SET the
    block to H1 unconditionally, never toggle it back to paragraph. `setNode('heading', {level})` is the set-semantics
    command `[FACT: @tiptap/core setNode(typeOrName, attributes?) exists — core d.ts; verified at gate-1]`. This is a
    deliberate, grounded divergence, recorded so the two surfaces reading the same block differently is intentional, not
    drift. (`setParagraph()` for "Text" is likewise a set, not a toggle.) `[INTERP: slash = choose-target, toolbar =
    toggle-state]`
  - **BR-E4-4a · Image via the slash menu inserts nothing usable yet (attachment pipeline deferred, BR-E2-5).** `image`
    is presentational with no URL/upload UI `[FACT: current-business-rules.md BR-E2-5]`. Inserting `setImage({src:''})`
    yields an empty `<img>`. Same reason E3 **excluded** Image from the toolbar. → **Image is OUT of E4's command set**
    for the same grounding; it returns when the attachment surface exists. `[INTERP: BR-E2-5 + e3-toolbar.md scope-out
    parity]`
  - **Paragraph ("Text")** is included as the "turn back into a paragraph" escape (`setParagraph()`), category basic.

- **BR-E4-5 · Integration entries are shown DISABLED (graceful degradation), never inserted, until E5.** All 11 are
  `available:false` in M1.0 — rendered as dimmed options with a "available when its module ships" affordance, **not**
  filtered out (showing the full future surface is the capability-framework graceful-degradation model, and it exercises
  the disabled-option a11y path for the Visual Gate) `[FACT: capability-framework.md V3 graceful degradation; BR-3]`.
  E4 exposes the availability as a **seam** — a predicate `isBlockAvailable(type): boolean` defaulting to `false` for
  every `IntegrationBlockType` — so E5's registry flips entries live without an E4 rewrite (the "deferred seam"
  precedent: AR-9 no-flush stub, E1 Yjs seam). `[INTERP: _index.md §5 E4↔E5 note; BR-2 deferred-seam pattern]`

- **BR-E4-6 · The popup re-establishes the Tamagui sub-theme scope (portal-scope lesson).** `ReactRenderer` positions
  its element outside normal DOM flow (floating-ui) — if the popup reads `name:'Menu'` sub-theme tokens (`$background`/
  `$border`/`$itemBackgroundHover`/…) it MUST be re-wrapped in `<Theme name="Menu">`, exactly as UI-1 Menu/Select/
  Popover re-wrap their portalled panels `[FACT: menu.tsx <Theme name="Menu"> around MenuPanel; packages/ui/src/CLAUDE.md
  portal-scope rule]`. `[INTERP: same portal-detachment class → [[cite-tokens-from-emitted-output-not-source-files]]]`
  - **⚠ RISK (verify at preflight/impl):** `ReactRenderer` renders inside the editor's React tree, so it *should*
    inherit `UIProvider`/Tamagui context; but the `name:'Menu'` sub-theme scope is NOT inherited from UI-1 Menu (a
    different subtree) — E4 supplies its own `<Theme name="Menu">` wrapper. If `ReactRenderer` turns out NOT to inherit
    the app's `UIProvider` context, the popup wraps in `<UIProvider><Theme name="Menu">…`. Resolve empirically at B-impl.
    `[UNKNOWN: ReactRenderer context inheritance — verify at implementation]`

- **BR-E4-7 · Filtering is prefix/substring over `title` + `keywords` + `shortcut`, case-insensitive; empty query =
  full list.** `Suggestion` passes the `query` (text after `/`) to `items({query})`; E4 filters the unified list. A
  filter that empties the list renders a disabled "No blocks" option (the UI-1 Menu empty-row precedent) `[FACT:
  @tiptap/suggestion items({query}); menu.tsx empty "No actions" row]`. Integration entries remain in the filtered
  results (dimmed) so a user searching "summary" still sees the (deferred) Daily-summary block. `[INTERP]`

- **BR-E4-8 · Only when editable; menu suppressed in read-only.** The Suggestion plugin is added unconditionally to the
  extensions array (it is inert unless `/` is typed), but a read-only editor cannot type, so no menu opens; no extra
  gate needed beyond E1's `editable` `[FACT: editor.tsx editable]`. (Contrast E3's toolbar, which needed an explicit
  `editable` render-gate because it is always-visible chrome.) `[INTERP]`

- **BR-E4-9 · Boundary preserved.** E4 adds only `@tiptap/suggestion` (new) + `@tiptap/react` `ReactRenderer`
  (already a dep) + `@vida/ui` `Theme`/tokens (already a dep). **No `@vida/core` / app import.** `[FACT: _index.md §4
  boundary gate]`

- **BR-E4-10 · The menu does NOT trigger inside a code block (gate-1 M4).** In a `codeBlock`, `/` is literal text a
  user types constantly (paths, regex, comments); opening the block menu there is a UX defect. The Suggestion `allow`
  predicate gates it: `allow: ({ editor }) => !editor.isActive('codeBlock')`. `[FACT: @tiptap/suggestion `allow?:
  (props) => boolean` — suggestion d.ts:273; @tiptap/core editor.isActive('codeBlock')]`

## 3. Contract — API & composition
### `<VidaEditor>` — NO public API change
E4 adds the slash menu to the editor's internal extension array. **No new prop**, no handle change — the umbrella
"editor shell + slash menu" ships the menu as a built-in of the editing surface (parity with the toolbar being
default-on). A `slashMenu?: boolean` opt-out is **deferred unless review wants it** (§9 open) — default-on, like E3.
`[INTERP: e3-toolbar.md default-on rationale]`

### `extensions/slash-command.ts` (internal) — the Suggestion extension
```ts
// A TipTap Extension whose addProseMirrorPlugins returns Suggestion({...}). Not barrel-exported.
export const SlashCommand: Extension  // configured with char:'/', pluginKey, items, command, render
```
- `char: '/'`, `allowSpaces: false`, `startOfLine: false` (Notion-style: trigger mid-block after typing `/`).
- **`allow: ({ editor, range }) => !editor.isActive('codeBlock')`** — suppress the menu inside a `codeBlock`, where `/`
  is literal code a user types constantly (BR-E4-10). `[FACT: @tiptap/suggestion `allow` predicate; editor.isActive]`
- `items({ query }) → SlashMenuItem[]` — BR-E4-7 filter over the unified list (`SLASH_MENU_ITEMS`).
- `command({ editor, range, props }) → props.run?.(editor, range)` — a disabled item has no `run`, so selecting it is a
  no-op that keeps the menu semantics honest (it also should not be selectable — see §5). `[FACT: @tiptap/suggestion
  command signature]`
- `render()` → `{ onStart, onUpdate, onKeyDown, onExit }` driving a `ReactRenderer(SlashMenu, { props, editor })`;
  `onStart` calls `props.mount(component.element)` (v3 auto-positions); `onKeyDown` forwards to
  `component.ref?.onKeyDown(props)` (returns `true` when the popup consumed the key — ↑/↓/Enter/Esc); `onExit`
  unmounts + destroys. `[FACT: read-docs-first suggestion.mdx render lifecycle + props.mount + component.ref.onKeyDown]`

### `slash-menu.tsx` (internal) — the popup view (`ReactRenderer` target)
```ts
interface SlashMenuProps {                 // props Suggestion passes each update
  items: readonly SlashMenuItem[]
  command: (item: SlashMenuItem) => void   // dispatch a selection (Suggestion wires deleteRange+run)
  query: string
}
interface SlashMenuHandle { onKeyDown(p: { event: KeyboardEvent }): boolean } // imperative — forwardRef+useImperativeHandle
```
- `forwardRef<SlashMenuHandle, SlashMenuProps>` — the imperative `onKeyDown` handle (the E1 editor-handle pattern):
  `ArrowDown`/`ArrowUp` move `selectedIndex` (wrap, **skip `available:false`**), `Enter` activates the selected item,
  `Escape` returns `true` so `render().onKeyDown` can close. Returns `false` for unhandled keys (lets typing pass
  through to the editor to keep filtering). `[FACT: read-docs-first component.ref.onKeyDown pattern]`
- Renders a `role="listbox"` panel (reusing the `MenuPanel` token language — `$background`/`$border`/`$md` radius via
  the token scale, DEF-U8-h) wrapped in `<Theme name="Menu">` (BR-E4-6); rows are `role="option"` with
  `aria-selected`, dimmed + `aria-disabled` when `!available`. Grouped by `category` with non-interactive group labels.
- **No DOM focus moves into the popup** — the editor keeps focus; the active option is reflected via
  `aria-activedescendant` on the editor host (§5).

### `slash-commands.ts` (NEW) + `commands.ts` (E1, reused unchanged)
`SLASH_MENU_ITEMS` (the unified list) + `isBlockAvailable` + `filterSlashItems` live in a **new** `slash-commands.ts`;
`commands.ts` stays the pure integration TYPE MAP (preflight F3). The integration entries are **derived** from the
existing `INTEGRATION_BLOCK_COMMANDS` (BR-E4-3) — E1's data is not duplicated. `[FACT: commands.ts
INTEGRATION_BLOCK_COMMANDS]`

## 4. States (§VIII applicable subset)
- **Option resting / hover / active (selected)** — the `aria-selected` row highlight = the Menu `active` variant token
  (`$itemBackgroundHover`), instant (B12). **disabled** (`!available`) — dimmed, non-selectable. **empty** (filter
  matches nothing) — a disabled "No blocks" option. No loading/error (the command list is static, in-memory).
- **Menu open/closed** is driven by the Suggestion plugin (typing `/` … Esc / select / delete the `/`). Enter motion is
  a **Visual-Gate design call** (§9) — default is no motion (static appear), B12-safe by construction; if added, it
  reuses the Menu enter pattern (opacity + small translate, reduced-motion `@media`). `[INTERP: BR-6 B12; e3 added no
  motion]`

## 5. Accessibility (§XIV) — APG combobox/listbox pattern
The slash menu is a **combobox popup** where the editor is the input and focus never leaves it.
- The **popup** is `role="listbox"` with an accessible name (`aria-label="Slash commands"`); each row is `role="option"`
  with a stable `id` and `aria-selected={i===selectedIndex}`; deferred rows add `aria-disabled="true"`. `[FACT: WAI-ARIA
  APG combobox + listbox]`
- The **editor host** (the `.ProseMirror` contenteditable) gets, WHILE the menu is open: `aria-expanded="true"`,
  `aria-controls=<listbox id>`, `aria-activedescendant=<active option id>` — set in `render().onStart`/`onUpdate` and
  cleared in `onExit` (mutating `editor.view.dom` attributes; the Suggestion plugin already owns the host). This is what
  lets a screen reader announce the highlighted option while the caret stays in the text. `[FACT: @tiptap/suggestion
  exposes editor.view.dom; APG combobox aria-activedescendant]` `[INTERP: mutation mechanism — the host is the combobox]`
  - **⚠ verify (impl) — gate-1 M5:** the host already carries `role="textbox"` + `aria-multiline` (E1) `[FACT: editor.tsx
    editorProps.attributes]`. `aria-activedescendant` is spec'd on a `role="combobox"`, and some AT will NOT announce it
    on a bare `role="textbox"`. So while the menu is open the host role likely must FLIP to `combobox` (set with the
    other combobox attrs, restored to `textbox` on close) — confirm which AT behavior holds at impl and pick
    textbox-vs-combobox then. **The flip must be driven through PM's decoration channel (§7 B3), not raw `setAttribute`
    — PM re-applies host attrs every keystroke and would clobber a raw flip.** Honest limit: **jsdom can only assert the
    attributes are PRESENT/cleared, not that a screen reader announces them** — the announce-correctness is a real-AT
    manual check (VoiceOver), §XIV. `[UNKNOWN: textbox vs combobox host role while open — resolve at impl with a real-AT
    trace]`
- **Keyboard (all via the Suggestion `onKeyDown` fork — the editor never loses focus):** `↑/↓` move selection (wrap,
  skip disabled), `Enter` activates, `Esc` closes (returns to typing), `Tab` — closes (do not trap; let Tab move focus,
  the UI-1 Menu convention). Any printable key falls through to the editor and re-filters. `[FACT: menu.tsx Tab closes
  without trap; read-docs-first onKeyDown returns true/false]`
- **Selecting a disabled (deferred) option is a no-op** — `↑/↓` skip them so they are never the `selectedIndex`; a
  pointer click on one does nothing (`run` undefined). Announced via `aria-disabled`. `[INTERP: BR-E4-5]`
- Focus is never stolen: opening/closing the popup must not move focus out of the editing surface (jsdom asserts
  `document.activeElement` stays the editor host — the jsdom `activeElement` technique). `[FACT: editor.test.tsx:89-93
  asserts document.activeElement is the editor host after ref.focus() — the focus-into-editor precedent (gate-1 M2:
  corrected from toolbar.test.tsx, whose activeElement asserts inter-control roving, not focus-stays-in-editor)]`

## 6. Acceptance
- [ ] Typing `/` in an editable `<VidaEditor>` opens a caret-anchored popup listing the standard-block commands +
      the 11 integration commands (dimmed); typing filters by title/keywords/shortcut; Esc / deleting the `/` closes it.
- [ ] Selecting **Heading 1/2/3, Bulleted/Numbered/Task list, Quote, Code block, Divider, Table, Callout, Text** each
      deletes the `/query` and applies the correct command — verified by a getJSON assertion per item (Table = the
      pinned `{3×3, header}`; Callout = a well-formed `info` callout via `calloutInsertContent`). **Image is excluded**
      (BR-E4-4a).
- [ ] All 11 integration entries render **disabled** (`available:false`), are **skipped by ↑/↓**, and inserting one is a
      **no-op** (no node inserted, no throw) — proving the E5 seam degrades gracefully (BR-E4-5).
- [ ] `role="listbox"` + `role="option"` + `aria-selected` + `aria-disabled`; the editor host gains
      `aria-expanded`/`-controls`/`-activedescendant` while open and clears them on close (jsdom, geometry-free — the
      U7/U9 layout-defer rule). Focus stays on the editor host throughout (no-focus-steal test).
- [ ] Keyboard: ↑/↓ wrap + skip disabled, Enter activates, Esc closes, printable keys re-filter — all without the
      editor losing focus (asserted via the imperative `SlashMenuHandle.onKeyDown` return contract + a `document
      .activeElement` check).
- [ ] Empty filter → a disabled "No blocks" option (no crash).
- [ ] Typing `/` **inside a `codeBlock` does NOT open the menu** (the `allow` predicate, BR-E4-10) — `/` stays literal
      text; verified by a getJSON/isActive assertion.
- [ ] **New dep `@tiptap/suggestion@^3.30.0`** added, family-pinned; **`ReactRenderer` from `@tiptap/react`** (no new
      React-renderer dep). Popup tokens resolve (Menu sub-theme via `<Theme name="Menu">`) — verified in the Visual Gate.
- [ ] Boundary clean: no `@vida/core`/app import; no raw hex (grep-gated); the built `@vida/ui` dist barrel imports
      clean where E4 value-imports `Theme`/tokens (N1, [[first-runtime-consumer-surfaces-latent-barrel-defects]]).
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck 11/11; `build-storybook` ✓.
- [ ] **Visual Gate (Victor, real browser, both themes):** the popup paints on the Menu sub-theme (bg/border/hover),
      dimmed integration rows are legible, selected-row highlight holds, dark mode crosses, caret-anchoring is correct.
      A "Slash menu" story added (a `defaultOpen`-style story or a scripted `/` so the popup is reviewable).
- [ ] §XXIX currency: `docs/editor/current-*` refreshed (E4 surface), `docs/editor/slash-menu-spec.md` filled (the
      0-byte stub), `packages/editor/src/CLAUDE.md` E4 section, umbrella §5 E4 → ✅.

## 7. Implementation Prompt — build steps (materialized post-preflight; the gate-2 IMPLEMENTATION-PLAN)
> Cleared to build on Approval 2. API is FACT-grounded (§2 BR-E4-2 B0-DONE); the build order is dependency-first.
- **B0 · dep + version** — `@tiptap/suggestion@^3.30.0` **already added** at preflight (installed 3.30.0); bump
  `@vida/editor` 0.3.0→**0.4.0**. `[FACT: package.json now has @tiptap/suggestion]`
- **B1 · `slash-commands.ts` (NEW file — preflight F3)** — keep `commands.ts` as the pure integration TYPE MAP; the
  slash view-model lives in a sibling `slash-commands.ts`: the `SlashMenuItem` type + `SLASH_MENU_ITEMS` (standard-block
  entries with `run(editor, range)` closures + the 11 integration entries **derived from `INTEGRATION_BLOCK_COMMANDS`**,
  `available:false, run:undefined`) + `isBlockAvailable(type)` seam + `filterSlashItems(items, query)`. Import `Range`
  (and `Editor`) as **types** from `@tiptap/core` (preflight F5) `[FACT: suggestion d.ts uses `Range` from @tiptap/pm/
  state re-exported by @tiptap/core; editor.tsx already imports @tiptap/react types]`. **No icon dep** — `icon` is a
  Lucide-name hint string, NOT rendered in E4 (title-only rows); Lucide integration is a later polish (preflight F7).
- **B2 · `slash-menu.tsx`** — the `forwardRef<SlashMenuHandle, SlashMenuProps>` popup: `role="listbox"` panel wrapped in
  `<Theme name="Menu">`, options grouped by category (non-interactive labels), `role="option"` +
  `aria-selected`/`aria-disabled`, imperative `onKeyDown(p)` (↑/↓ wrap **skipping `!available`**, Enter activates, Esc
  returns `true`; returns `false` otherwise so typing passes through). Reuse the `MenuPanel` token language
  (`$background`/`$border`/`$itemBackgroundHover`, `$md` radius via the token scale — DEF-U8-h).
- **B3 · `extensions/slash-command.ts`** — the `Extension` whose `addProseMirrorPlugins` returns `Suggestion({ char:'/',
  allowSpaces:false, startOfLine:false, pluginKey, allow: ({editor})=>!editor.isActive('codeBlock'),
  items:({query})=>filterSlashItems(SLASH_MENU_ITEMS, query), command:({editor, range, props})=>props.run?.(editor,
  range), render })`. `render()` → `ReactRenderer(SlashMenu, {props, editor})` + `props.mount(component.element)` in
  `onStart` (capture the `unmount` return); `onKeyDown` → `component.ref?.onKeyDown(props)`; `onExit` → `unmount?.();
  component.destroy()`. `[FACT: suggestion d.ts command/items/allow/render + SuggestionProps.mount; onExit unmount
  example d.ts:373]`
  - **⚠ Host aria — drive through ProseMirror, NOT raw `view.dom.setAttribute` (gate-2 MAT).** PM re-applies the host's
    managed attributes as a **document decoration** (`computeDocDeco`→`patchAttributes`) on **every** transaction — i.e.
    every filter keystroke while the menu is open `[FACT: prosemirror-view computeDocDeco:5907 / patchAttributes:1723]`.
    A raw `setAttribute` for the role `textbox`→`combobox` flip would be clobbered/fragile. So set the open-state host
    attrs through PM's own channel — a small plugin whose `props.attributes(state)` reads the suggestion plugin state
    and returns `{ role: open?'combobox':'textbox', 'aria-expanded', 'aria-controls', 'aria-activedescendant': <active
    option id> }` — so PM OWNS them and re-applies (never clobbers) them each keystroke; `aria-activedescendant` tracks
    the live `selectedIndex`. Composes with E1's static `editorProps.attributes` (E1 = base `role=textbox`; the plugin
    overrides while open). `[INTERP: prosemirror-view decoration model + editor.tsx editorProps.attributes]`
  - **command wiring (preflight F4):** the popup calls `props.command(item)` (its `SlashMenuProps.command`); Suggestion
    routes that to the config `command({editor, range, props: item})` which runs `item.run?.(editor, range)`. A disabled
    item has `run:undefined` → a genuine no-op (also unreachable via ↑/↓, B2). `[FACT: suggestion d.ts:175-177 example
    `({editor,range,props}) => props.command(props.props)`; SuggestionProps.command:(sel)=>void:310]`
- **B4 · mount** — spread `SlashCommand` into `editor.tsx`'s `useEditor` extensions array (after StarterKit/Placeholder/
  `STANDARD_BLOCK_EXTENSIONS`). The plugin lives on the editor, inert until `/` typed, so `immediatelyRender:false`'s
  null-editor path is unaffected (no React chrome added; contrast E3's always-visible toolbar gate). No new public prop.
- **B5 · styles** — reuse the Menu token language; if option layout needs a rule a styled panel can't reach, a minimal
  `internal/slash-menu-styles.ts` (the editor-styles precedent) — **no raw hex** (grep-gated). No motion (§9 DECIDED).
- **B6 · tests (preflight F2 — unit-in-isolation, NOT jsdom keystroke simulation)** — ProseMirror's `/`-detection is
  fragile in jsdom, so test the UNITS directly, not by simulating typing:
  - `slash-commands.test.ts` — `filterSlashItems` matrix (title/keywords/shortcut, case-insensitive, empty→full);
    integration-derivation parity (all 11 present, `available:false`, `run` undefined); each standard `run(editor,
    range)` closure, called **directly** on a real editor with a seeded `/x` range, deletes the range + applies the
    command (getJSON assertion per item — Heading=`setNode` set-semantics, Table `{3×3,header}`, Callout `info`); the
    `allow` predicate returns false in a codeBlock.
  - `slash-menu.test.tsx` — render `<SlashMenu>` under `UIProvider` with mocked props: `role=listbox`/`option`,
    `aria-selected` tracks `selectedIndex`, `aria-disabled` on integration rows; imperative `onKeyDown` — ↑/↓ wrap +
    skip disabled, Enter calls `command` with the selected item, Esc returns true, printable returns false; empty
    items → "No blocks" disabled option. (Geometry-free — the U7/U9 jsdom layout-defer rule.)
  - a light **integration** test: add `SlashCommand` to an editor, assert the plugin is registered + `allow`/`items`/
    `command` config functions behave (call them via the plugin state / directly) — without asserting popup pixels.
  - Story "Slash menu" in `editor.stories.tsx` (a scripted-open or a stub-rendered `<SlashMenu>` so the popup is
    Visual-Gate-reviewable in both themes).
- **B7 · §XXIX currency** — refresh `current-*`, fill `docs/editor/slash-menu-spec.md`, `CLAUDE.md` E4 section,
  umbrella §5 E4 → ✅.
- **B8 · Visual Gate (Victor)** — real browser, both themes.

## 8. Deviations (§XXVIII) — recorded during implementation
- **DEV-1 · Core types import from `@tiptap/react`, not `@tiptap/core` (preflight F5 path correction).** pnpm's strict
  isolation doesn't expose `@tiptap/core` to `@vida/editor` directly; `@tiptap/react` does `export * from '@tiptap/core'`
  and is the codebase's import site for `Editor`/`Range` (the toolbar.tsx precedent). Mechanical (which re-export path),
  not a re-decision — `Range`/`Editor` are the same types.
- **DEV-2 · Host combobox ARIA moved from a ProseMirror plugin to `editorProps.attributes` (post-impl /critique B1 —
  a real bug the plugin approach masked).** The gate-2 plan set `role`/`aria-expanded`/`-controls` via a plugin's
  `props.attributes(state)`. Post-impl the critic RUNTIME-PROVED that ProseMirror's `computeDocDeco` consumes
  `view._props` (E1's static `editorProps.attributes` `role:'textbox'`) BEFORE plugins with **first-writer-wins**, so a
  plugin can only ADD absent keys and can NEVER override `role` — the `textbox`→`combobox` flip silently never happened
  (the headline a11y feature dead). Fix: `role` has ONE writer — E1's `editorProps.attributes` became a **function of
  state** merging `slashComboboxAttrs(slashActive(state))` (combobox while open, base textbox otherwise); the plugin was
  deleted. `aria-activedescendant` stays a raw popup setAttribute (not PM-managed → survives). Proven by a real
  active-flip test (`insertContent('/')` trips detection → `slashActive` true → role=combobox; stays false in a code
  block). `[FACT: prosemirror-view computeDocDeco/someProp first-writer-wins; slash-command.test.ts active-flip]`
- **DEV-3 · No injected CSS (fully Tamagui).** The popup is expressible entirely in Tamagui styled components under
  `<Theme name="Menu">` (reusing the Menu sub-theme token language) — so `internal/editor-styles.ts` is untouched and
  no `slash-menu-styles.ts` was needed (the E3 DEV-3 precedent). B5's conditional injected-CSS did not materialize.
- **DEV-4 · ReactRenderer↔Tamagui context UNKNOWN → RESOLVED SOUND (no code change).** The critic traced the installed
  `@tiptap/react`: `ReactRenderer` renders via `editor.contentComponent` as a **React portal inside `<EditorContent>`**,
  so it inherits the app's `UIProvider`/Tamagui context by React-tree position (portals preserve tree context, not DOM
  position). The popup's `<Theme name="Menu">` re-wrap is correct and sufficient; no extra `<UIProvider>` needed. The
  BR-E4-6 `[UNKNOWN]` is closed. (Still a Visual-Gate glance that Menu tokens paint.)

## 9. Decisions (all grounded — no open decisions for review; Approval 1 granted 2026-08-12)
- **[DECIDED — documented scope] Command-set = standard-blocks (real inserts) + the 11 integration entries shown
  disabled (graceful E5 seam).** NOT a review fork — the documentation already fixes it: the capability-framework
  graceful-degradation model (declared-but-unavailable renders a non-error deferred state, never a crash) + `BR-3` +
  the `SLASH_COMMAND_CATEGORY` `basic`/`media` headroom + the umbrella E4 row's "lists integration commands" (satisfied
  by showing them) together resolve the scope with no residual choice. Integration-only would be a menu of 11 dead
  placeholders — inconsistent with the graceful-degradation model, not a live alternative. `[FACT: capability-framework.md
  V3; _index.md §5 E4 row + BR-3; editor.ts:157 categories]`
- **[DECIDED] Enter motion = none (static appear).** B12-safe by construction; E3 added no chrome motion (parity). A
  Menu-style enter is a later polish, not E4 behavior. `[FACT: e3-toolbar.md DEV-3 no toolbar motion; BR-6 B12]`
- **[DECIDED] No `slashMenu?: boolean` prop.** Default-on parity with the toolbar being a built-in of the editing
  surface; a consumer opt-out is added only if a real consumer needs it (YAGNI). `[INTERP: e3 default-on precedent]`
- **[DECIDED] Suggestion utility over a hand-rolled ProseMirror plugin** — the idiomatic, lower-risk path; v3's
  `props.mount` removes the tippy.js/positioning burden (BR-E4-1/2).
- **[DECIDED] editor-local `SlashMenuItem`, `@vida/types.SlashCommand` untouched (BR-E4-3, BR-7).**
- **[DECIDED] Image excluded (BR-E4-4a) — attachment pipeline deferred, E3 parity.**

## 10. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-12 | ui-3-e4-slash-menu | E4 sub-spec authored at PLAN. Integration-check: `@tiptap/suggestion` absent (new dep); UI-1 Menu/Popover are trigger-anchored + focus-moving → not mountable, slash menu is a combobox (Suggestion plugin + ReactRenderer, focus stays in editor). /read-docs-first Tiptap v3 suggestion (props.mount managed positioning, component.ref.onKeyDown). Command-set scope tension (integration-only vs +standard) + `SlashCommand.block_type` integration-only type constraint → editor-local `SlashMenuItem` view-model; integration entries deferred-disabled (E5 seam). Portal-scope + combobox-a11y grounded. |
| 2026-08-12 | ui-3-e4-slash-menu | **Gate-1 /critique REVISE → resolved (independent critic).** Fixed **2 blockers**: B1 heading command `setNode('heading',{level})` deliberately diverges from E3's `toggleHeading` (turn-into vs toggle) — recorded as BR-E4-4b + false "e3 table backs setNode" provenance dropped; B2 the `@floating-ui/dom` "@tiptap/react transitive dep" FACT was FALSE (it's an optional peer of `@tiptap/react/menus`, unresolvable) → deleted, E4 uses `props.mount` only. Fixed **material**: M1 B0-verify the resolved suggestion minor ships `props.mount`; M2 no-focus-steal cite corrected toolbar.test→editor.test:89-93; M3 `basic`/`media` = enum headroom (evidence, not a contract); M4 **added BR-E4-10** `allow: !isActive('codeBlock')` (`/` in code must stay literal) + acceptance; M5 host role may flip textbox→combobox while open, jsdom proves presence not announce. Image row marked EXCLUDED (was ambiguously listed). Critic CONFIRMED-SOUND: architecture, all standard-block command names registered, `SlashCommand.block_type` constraint, §9 scope not manufactured. |
| 2026-08-12 | ui-3-e4-slash-menu | **Approval 1 granted** (documented scope — Victor: no decisions left, the docs resolve all gaps). §9 "open decisions" reframed to DECIDED-and-grounded (command-set = graceful-degradation model; no motion; no opt-out prop). Status → approved. The 2 remaining items are empirical verify-at-impl UNKNOWNs (ReactRenderer↔Tamagui context; textbox↔combobox host role), not decisions. Next: /preflight → gate-2 /critique → Approval 2. |
| 2026-08-12 | ui-3-e4-slash-menu | **Gate-2 /critique SHIP** (independent critic — every d.ts citation verified TRUE against the installed 3.30.0; all 11 commands chainable + names match E3 `toolbar.tsx` line-for-line; F5 `Range` re-export from `@tiptap/core` confirmed; boundary clean). Fixed 2 MATERIAL: (1) stale §3 fragment "commands.ts — one addition / (or extend commands.ts)" → `slash-commands.ts` NEW, `commands.ts` unchanged; (2) host-aria **decoration-clobber** — PM re-applies host attrs every keystroke (`computeDocDeco`/`patchAttributes`), so the role flip + aria-activedescendant must be driven via a PM plugin `props.attributes(state)`, NOT raw `view.dom.setAttribute` (§7 B3 + §5 M5 updated). No blockers; cleared for Approval 2. |
| 2026-08-12 | ui-3-e4-slash-menu | **IMPLEMENTED + post-impl /critique REVISE → resolved (1 real blocker).** Built B0–B8: `slash-commands.ts` (view-model+filter+seam), `slash-menu.tsx` (combobox popup), `extensions/slash-command.ts` (Suggestion+render), mounted in `editor.tsx`; 40 new tests. Post-impl critic RUNTIME-PROVED **B1**: the host `role`→combobox flip via a plugin was DEAD (PM consumes editorProps `role:'textbox'` before plugins, first-writer-wins) → moved the combobox ARIA into `editor.tsx`'s `editorProps.attributes` function (single `role` writer), deleted the plugin, added a real active-flip test. Critic CONFIRMED-SOUND: all 12 `run` closures under real PM, aria-activedescendant id space, lifecycle/cleanup, key routing, and (traced) ReactRenderer↔Tamagui context inheritance (DEV-4, UNKNOWN closed). §8 DEV-1..4 recorded. Automated: editor typecheck ✓ · **102 tests** ✓ · build + build-storybook ✓ · root typecheck 11/11 · boundary clean · no hex. |
| 2026-08-12 | ui-3-e4-slash-menu | **/preflight PASS + 4 folds.** INSTALLED `@tiptap/suggestion@3.30.0` + verified the full API against its shipped d.ts (`props.mount`:375, `allow`:273, `command`/`items`/`SuggestionProps`) — B0-verify DONE, BR-E4-1/2/10 now FACT (no API UNKNOWN left). Folds: **F2** jsdom strategy = unit-in-isolation (view-model/filter + `run` closures called directly + popup component with mocked props), NOT `/`-keystroke simulation (fragile in ProseMirror+jsdom); **F3** `SLASH_MENU_ITEMS` in a NEW `slash-commands.ts`, `commands.ts` stays the pure integration TYPE MAP; **F4** command wiring pinned (popup `props.command(item)` → config `command` → `item.run?.(editor,range)`; disabled=no-op); **F5** `Range`/`Editor` imported as types from `@tiptap/core`; **F7** no icon/Lucide dep (title-only rows, icon is a hint string). §7 materialized as the IMPLEMENTATION-PLAN. |
