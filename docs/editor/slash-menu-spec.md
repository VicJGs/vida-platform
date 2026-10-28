# Slash menu — spec of record (@vida/editor, E4)

> Durable description of the `/`-triggered block menu as built (§XXIX). Refreshed with the code. Forward spec:
> `docs/specs/features/ui-3-vida-editor/e4-slash-menu.md`. Ground truth for the surface: `docs/editor/current-*.md`.

## What it is

Type `/` inside `<VidaEditor>` → a caret-anchored, filterable popup of blocks. Arrow/Enter/Esc drive it while **focus
stays in the editor** (a WAI-ARIA **combobox**, not a menu). Selecting a block deletes the typed `/query` and inserts or
turns the current block into the chosen type. No public prop — a built-in of the editing surface (parity with the
default-on toolbar); inert until `/` is typed, so a read-only editor needs no gate.

## Mechanism (`@tiptap/suggestion` + `ReactRenderer`)

- **`extensions/slash-command.ts`** — an `Extension` whose `addProseMirrorPlugins` returns
  `Suggestion({ char:'/', allowSpaces:false, startOfLine:false, allow, items, command, render })`.
  - `allow: ({editor}) => !editor.isActive('codeBlock')` — `/` stays literal in code (BR-E4-10).
  - `items: ({query}) => filterSlashItems(SLASH_MENU_ITEMS, query)`.
  - `command: ({editor, range, props}) => props.run?.(editor, range)` — `props` is the selected item; a disabled
    (deferred) item has no `run` → a no-op.
  - `render()` → a `ReactRenderer(SlashMenu)`: `onStart` creates it + `props.mount(element)` (v3 managed positioning via
    the plugin's own floating-ui — E4 imports none); `onUpdate` → `updateProps`; `onKeyDown` handles `Escape`/`Tab`
    (`exitSuggestion`) then forwards to the popup's imperative handle; `onExit` unmounts + `destroy()`.
- **Positioning** is the plugin's (`props.mount`) — no tippy.js, no manual caret-rect math.

## Command set (`slash-commands.ts`)

An editor-local `SlashMenuItem` view-model (NOT `@vida/types.SlashCommand`, whose `block_type` is integration-only —
BR-7 kept). `SLASH_MENU_ITEMS`:

- **Standard blocks (usable now)** — Text · Heading 1/2/3 · Bulleted/Numbered/Task list · Quote · Code block · Divider ·
  Table · Callout. Each `run(editor, range) = editor.chain().focus().deleteRange(range).<cmd>().run()`. Heading/Text use
  SET semantics (`setNode('heading',{level})`/`setParagraph()` — turn-into), deliberately NOT E3's toggle. Table =
  `insertTable({rows:3,cols:3,withHeaderRow:true})`; Callout = `insertContent(calloutInsertContent())`. **Image is
  excluded** — no attachment/URL surface yet (BR-E4-4a, E3 parity).
- **Integration blocks (deferred)** — the 11 `INTEGRATION_BLOCK_COMMANDS` are **derived** into disabled entries
  (`available:false`, `run:undefined`). They render dimmed, are skipped by ↑/↓, and selecting one is a no-op. The
  `isBlockAvailable(type)` seam (an empty set in M1.0) flips them on when E5 registers their node-views — no E4 rewrite.
- **Filter** — `filterSlashItems`: case-insensitive substring over `title` + `keywords`; empty query → the full list; a
  no-match query → a disabled "No blocks" row. Deferred entries stay in results (searching "summary" surfaces the coming
  Daily-summary block, dimmed).

## Popup (`slash-menu.tsx`)

A `forwardRef` `role="listbox"` panel wrapped in `<Theme name="Menu">` (the portal-scope lesson — the ReactRenderer
element sits outside the editor frame; ReactRenderer renders as a React portal inside `<EditorContent>`, so it inherits
the app's Tamagui context). Rows are `role="option"` + `aria-selected`/`aria-disabled`, grouped by category (Basic ·
Media · Platform blocks · Embeds). Reuses the UI-1 Menu sub-theme token language ($background/$border/$itemBackgroundHover/
$itemText, `$md` radius via the token scale) — fully Tamagui, **no injected CSS**, no motion. The imperative
`onKeyDown({event})` moves `selectedIndex` (wrap, skip disabled) on ↑/↓, activates on Enter, returns `false` for
printables (they fall through to the editor to re-filter).

## Accessibility (§XIV) — combobox

- **The host is the combobox.** While the menu is open, `editor.tsx`'s `editorProps.attributes` (a FUNCTION of state)
  flips the host `role` textbox→**combobox** and adds `aria-expanded`/`aria-controls`/`aria-haspopup`. This is the
  **single `role` writer** — a ProseMirror plugin CANNOT override `role` (PM consumes `view._props`/editorProps before
  plugins with first-writer-wins), so the flip must live in editorProps (post-impl B1; the plugin approach was a proven
  no-op).
- **`aria-activedescendant`** = the active option's id, set raw on the host by the popup as the selection moves (not
  PM-managed → survives the per-keystroke decoration re-apply; cleared on close/unmount).
- Focus never leaves the editor; ↑/↓ skip disabled options; Esc closes; Tab closes without trapping.

## Boundary

`@vida/editor` stays presentational: E4 adds only `@tiptap/suggestion` (new) + `@tiptap/react` `ReactRenderer` + `@vida/ui`
`Theme`/tokens. No `@vida/core`/app import.

## Tests / verify

`slash-commands.test.ts` (view-model + filter + each `run` closure on a real editor), `slash-menu.test.tsx` (listbox/
option roles + aria + imperative keyboard + host aria-activedescendant), `extensions/slash-command.test.ts` (plugin
registers; `insertContent('/')` trips detection → `slashActive` true → combobox attrs; code-block guard). Stories "Slash
menu (popup)" (stub-rendered chrome) + "Slash menu (live)" (real `/` trigger). `pnpm --filter @vida/editor typecheck &&
build && test` (102 tests).
