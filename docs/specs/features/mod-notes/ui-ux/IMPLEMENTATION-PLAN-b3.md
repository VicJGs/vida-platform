<!-- Entity Delivery Flow · TRACK B · slice B3 · the §XXVI gate-2 artifact (IMPLEMENTATION-PLAN → ░preflight░ +
     empirical g2). Built AFTER Approval 1 on b3-note-link-picker.md. Every API below is EMPIRICALLY verified against
     the installed packages + shipped source (not asserted from memory) — the "empirical" half of gate-2. Grounded in
     the aspect docs via the spec's BR-B3-* (each step cites the rule it satisfies). -->

# IMPLEMENTATION-PLAN — B3 · the `[[` note-link picker

## A. Empirical verifications (gate-2 — done before writing a line)
| # | Claim the impl relies on | How verified | Result |
|---|---|---|---|
| E1 | `@tiptap/react` exports `Extension`, `ReactRenderer`, `Mark`, `mergeAttributes` | `@tiptap/react/dist/index.d.ts` `export * from '@tiptap/core'`; core d.ts declares `Mark` + exports `mergeAttributes` | ✅ all resolve |
| E2 | `@tiptap/suggestion` default `Suggestion` + `exitSuggestion` + `SuggestionProps`/`SuggestionKeyDownProps` | slash-command.ts imports them + `@vida/editor` builds; `@tiptap/suggestion@3.30.0` | ✅ proven by E4 |
| E3 | `char: '[['` (multi-char) works; `allowSpaces:true` makes the match greedy-to-EOL | `@tiptap/suggestion@3.30.0` `escapeForRegEx(char)` + match regex (Doc-Gate MATERIAL-1) | ✅ works; greedy noted (D-5) |
| E4 | `createPage({ type:'note', title })` typechecks | `validators/note.ts:27-28` `createPageSchema {type:PageTypeSchema, title:z.string().nullish()}` → `CreatePageInput` | ✅ `title:string` OK |
| E5 | `createPageLink(source,target):Promise<PageLinkRow>`, `resolveWikiLink(text):Promise<PageRow[]>` | `services/notes/types.ts:48,56` | ✅ frozen A2/A3 |
| E6 | `PageRow.title` is `string \| null` → `r.title ?? 'Untitled'` | `db/schema/notes.ts:42 title text()` (no `.notNull`) | ✅ null-safe |
| E7 | RQ v5 `useMutation({mutationFn,onSuccess:()=>invalidateQueries({queryKey:NOTES_LIST_KEY}),onError})` | `use-note.ts:17,29-35` (the shipped pattern) | ✅ mirror it |
| E8 | The host-ARIA merge point is `editor.tsx`'s `attributes(state)` fn | `editor.tsx:117-122` (`...slashComboboxAttrs(slashActive(state))`) | ✅ add `...wikiComboboxAttrs(wikiActive(state))` |
| E9 | Registering a new `Mark` won't break existing editor schema-parity tests | gate-2 verified: parity tests use SUBSET assertions over `schema.**nodes**` (`standard-blocks.test.tsx:48-72`), never an exact `schema.marks` set; `headless()` doesn't include `WikiLinkMark`. Still RUN the suite at step 7 (hygiene) | ✅ non-issue (R-1 retired) |

## B. File plan (order — editor package first, then app; each step names its BR + the pattern it mirrors)

### 1 · `packages/editor/src/extensions/wiki-link.ts` — NEW (the mark + the `[[` Suggestion + the pure apply)
Mirrors `extensions/slash-command.ts` structure (BR-B3-1). Two extensions + a pure, testable `applyWikiSelection`.
```ts
import { Extension, Mark, ReactRenderer, mergeAttributes, type Editor, type Range } from '@tiptap/react'
import { PluginKey, type EditorState } from '@tiptap/pm/state'
import Suggestion, { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { WIKI_LISTBOX_ID, WikiLinkMenu, type WikiLinkMenuHandle, type WikiLinkMenuProps } from '../wiki-link-menu'

export interface WikiLinkCandidate { id: string; title: string }          // BR-B3-4 (id-based)
export interface WikiLinkCreateRequest { __create: string }                // BR-B3-6 create sentinel
export interface WikiLinkConfig {                                          // BR-B3-2 injected (editor stays @vida/core-free)
  query(text: string, signal: AbortSignal): Promise<WikiLinkCandidate[]>   // → resolveWikiLink; reject→[] app-side (BR-B3-8)
  onCreate(text: string): Promise<WikiLinkCandidate>                        // → createPage (BR-B3-6)
  onSelect(candidate: WikiLinkCandidate): Promise<void>                     // → createPageLink; awaited BEFORE the mark (BR-B3-5)
}
export const WikiSuggestionPluginKey = new PluginKey('vidaWikiLink')       // mirrors SlashSuggestionPluginKey
export function stripWikiClose(q: string): string { return q.replace(/\]+$/, '') } // D-5 (trim typed `]]`)

// BR-B3-5 — row FIRST (awaited), mark SECOND; a rejection throws BEFORE the mark → no dangling reference. EXTRACTED
// from Suggestion.command so the order + reject-no-mark path are unit-testable (this is the risk surface, §D).
export async function applyWikiSelection(editor: Editor, range: Range, item: WikiLinkCandidate | WikiLinkCreateRequest, cfg: WikiLinkConfig): Promise<void> {
  const candidate = '__create' in item ? await cfg.onCreate(item.__create) : item   // BR-B3-6
  await cfg.onSelect(candidate)                                                       // BR-B3-5 (throws here → no mark below)
  editor.chain().focus().deleteRange(range)
    .insertContent({ type: 'text', text: candidate.title, marks: [{ type: 'wikiLink', attrs: { targetPageId: candidate.id } }] })
    .run()
}

export const WikiLinkMark = Mark.create({                                  // BR-B3-4 — inline mark, id-based, registered UNCONDITIONALLY
  name: 'wikiLink', inclusive: false,
  addAttributes() { return { targetPageId: { default: null,
    parseHTML: (el) => el.getAttribute('data-target-page-id'),
    renderHTML: (a) => (a.targetPageId ? { 'data-target-page-id': a.targetPageId as string } : {}) } } },
  parseHTML() { return [{ tag: 'a[data-wikilink]' }] },
  renderHTML({ HTMLAttributes }) { return ['a', mergeAttributes({ 'data-wikilink': '', class: 'vida-wikilink' }, HTMLAttributes), 0] },
})

export function wikiActive(state: EditorState): boolean {                  // BR-B3-9 (mirror slashActive)
  return !!(WikiSuggestionPluginKey.getState(state) as { active?: boolean } | undefined)?.active
}
export function wikiComboboxAttrs(active: boolean): Record<string, string> { // BR-B3-9 (merged in editor.tsx)
  return active ? { role: 'combobox', 'aria-expanded': 'true', 'aria-controls': WIKI_LISTBOX_ID, 'aria-haspopup': 'listbox' } : {}
}

// render lifecycle — copy createRenderer() from slash-command.ts verbatim, swap SlashMenu→WikiLinkMenu + the plugin key.
export interface WikiLinkOptions { config: WikiLinkConfig | null }
export const WikiLink = Extension.create<WikiLinkOptions>({
  name: 'wikiLinkSuggestion',
  addOptions() { return { config: null } },
  addProseMirrorPlugins() {
    const cfg = this.options.config
    if (!cfg) return []                                                    // BR-B3-2 — no config → picker off (zero cost)
    return [ Suggestion<WikiLinkCandidate, WikiLinkCandidate | WikiLinkCreateRequest>({
      editor: this.editor, pluginKey: WikiSuggestionPluginKey,
      char: '[[', allowSpaces: true, startOfLine: false,                   // BR-B3-1 / D-5
      allowedPrefixes: null,                                              // allow mid-word `[[` (suggestion default [' '] would suppress it)
      allow: ({ editor }) => !editor.isActive('codeBlock'),
      items: ({ query, signal }) => cfg.query(stripWikiClose(query), signal).catch(() => []), // BR-B3-8 query soft-fail (the ONE kept from residue)
      command: ({ editor, range, props }) => { void applyWikiSelection(editor, range, props, cfg).catch(() => {}) }, // BR-B3-5: error UX is the app's hook onError; this .catch only guards unhandled-rejection AFTER the app surfaced it
      render: createWikiRenderer,
    }) ]
  },
})
export default WikiLink
```
⚠ **BR-B3-5 nuance (the Doc-Gate MATERIAL-2 correction):** the `.catch(() => {})` on the command looks like the
discontinued impl's bug, but it is NOT — there the rejection was surfaced *nowhere*; here the `useCreatePageLink`/
`useCreateNoteFromLink` **hook `onError` Toast** surfaces it (step 8), so this `.catch` only suppresses the
already-handled promise's unhandled-rejection. The `applyWikiSelection` throw still guarantees **no mark on failure**.
A test asserts reject→no-mark (§D).

### 2 · `packages/editor/src/wiki-link-menu.tsx` — NEW (the combobox popup)
Mirror `slash-menu.tsx` (BR-B3-12): `forwardRef` `role="listbox"` under `<Theme name="Menu">`; Panel/OptionRow/OptionTitle
styled parts (the SAME Menu sub-theme tokens — `$background`/`$border`/`$md`/`$itemBackgroundHover`/`$itemText`, radius via
the scale, DEF-U8-h); imperative `onKeyDown` (↑/↓ wrap, Enter, printables fall through); `aria-activedescendant` on the
host via raw `setAttribute` (slash-menu.tsx:122-131 precedent). Row set = candidates + a trailing **"+ Create '<query>'"**
row when `stripWikiClose(query).trim()` is non-empty (BR-B3-6); `loading` → "Searching…"; empty non-loading → "Type to
search pages". `WIKI_LISTBOX_ID='vida-wikilink-listbox'`, `wikiOptionId(i)`. No injected CSS, no motion.

### 3 · `packages/editor/src/editor.tsx` — EDIT (register + wire the prop)
- Import `WikiLink`, `WikiLinkMark`, `wikiActive`, `wikiComboboxAttrs`, `type WikiLinkConfig` from `./extensions/wiki-link`.
- Add prop: `wikiConfig?: WikiLinkConfig` to `VidaEditorProps` (BR-B3-2).
- In `useEditor.extensions`: add `WikiLinkMark` (UNCONDITIONAL — BR-B3-4 load-safety) + `WikiLink.configure({ config: wikiConfig ?? null })`. Order after `SlashCommand`.
- In `attributes(state)`: append `...wikiComboboxAttrs(wikiActive(state))` beside the existing `...slashComboboxAttrs(...)` (E8; only one is active at a time).
- `wikiConfig` read through a ref IF it must not recreate the editor — ⚠ **R-2:** `useEditor` deps are `[]` (created once, editor.tsx:124); a changing `wikiConfig` won't re-register. The app passes a **mount-stable** `useMemo` config (id-stable, step 9), so `configure({config})` at creation is sufficient; document that wikiConfig is read-once-at-mount (parity with `defaultValue`). No ref needed.

### 3b · `packages/editor/src/internal/editor-styles.ts` — EDIT (the link's visual style — editor-package edit)
Add a token-var CSS rule for `.vida-wikilink` (the class `WikiLinkMark.renderHTML` emits) — the E2 callout/injected-CSS
precedent (editor-styles.ts:33-63): a distinct link colour + underline; **no raw hex** (BR-E2-7), no motion. This is why
the mark is visually a link at all; it lives in the editor package (NIT-1).
⚠ **A-1 (audit — cite-tokens-from-emitted-output):** the colour var MUST be one actually EMITTED at runtime — grep the
built CSS / `variables.css` for an accent/link semantic var (`--colorAccent*`/`--colorTextLink` may NOT exist; the DS-2
palette + DEF-U5-e "unwired var" trap). If no link/accent var is emitted, use an emitted base var (`--colorTextPrimary`
+ underline) rather than invent one — verify BEFORE writing the rule, not assume.

### 4 · `packages/editor/src/index.ts` — EDIT
Add `export type { WikiLinkConfig, WikiLinkCandidate } from './extensions/wiki-link'` (the app's binding surface).

### 5 · `packages/editor/src/extensions/wiki-link.test.ts` — NEW
`applyWikiSelection`: (a) select-existing → `onSelect` called, mark inserted with `targetPageId`; (b) create-miss →
`onCreate` then `onSelect` then mark; (c) **`onSelect` rejects → throws, NO mark inserted** (the BR-B3-5 guarantee);
(d) `onCreate` rejects → throws before `onSelect`. `stripWikiClose('foo]]')==='foo'`. Use a real headless editor
(`new Editor({extensions:[Document,Paragraph,Text,WikiLinkMark]})`) — the E4 test precedent (`insertContent`, TextSelection).

### 6 · `packages/editor/src/wiki-link-menu.test.tsx` — NEW
RTL: renders candidates + the "+ Create" row for a non-empty query; ↑/↓ wraps `aria-selected`; Enter dispatches the
selected item (or the create sentinel); loading shows "Searching…". Mirror `slash-menu.test.tsx`.

### 7 · BUILD + verify the package
`pnpm --filter @vida/editor typecheck && build && test`. ⚠ **R-1:** confirm no existing editor test asserts a fixed
mark/schema set that the new `wikiLink` mark breaks; if one does, extend it (the mark is legitimately new). Build
regenerates the clean dist (the stale wiki residue was cleared at baseline).

### 8 · `apps/web/src/app/note/use-note.ts` — EDIT (the mutation-hook seam — BR-B3-10, Doc-Gate BLOCKER-2 fix)
```ts
import { toast } from '@vida/ui'                                            // add
import type { PageLinkRow } from '@vida/core'                               // add (PageRow already imported)
export function useCreatePageLink(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetId: string): Promise<PageLinkRow> => getNotesService().createPageLink(id, targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),   // v5 object-form (BR-B3-10)
    onError: () => toast({ title: "Couldn't create link", intent: 'danger' }),      // BR-B3-5 fail-loud (never silent)
  })
}
export function useCreateNoteFromLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string): Promise<PageRow> => getNotesService().createPage({ type: 'note', title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
    onError: () => toast({ title: "Couldn't create note", intent: 'danger' }),
  })
}
```

### 9 · `apps/web/src/app/note/note-detail.tsx` — EDIT (wire the config into the B2 mount)
- Import `type { WikiLinkConfig } from '@vida/editor'`; `useCreatePageLink`, `useCreateNoteFromLink` from `./use-note`.
- In `NoteDetailLoaded`: instantiate `const createLink = useCreatePageLink(id)`, `const createNote = useCreateNoteFromLink()`.
- Build the mount-stable config (BR-B3-2/6/7/10):
```ts
const wikiConfig = useMemo<WikiLinkConfig>(() => ({
  query: (text) => getNotesService().resolveWikiLink(text)
    .then((rows) => rows.map((r) => ({ id: r.id, title: r.title ?? 'Untitled' }))), // candidates AS-IS, no self-filter (BR-B3-7/D-4); E6 null-safe
  onCreate: (text) => createNote.mutateAsync(text).then((r) => ({ id: r.id, title: r.title ?? text })),
  onSelect: (c) => createLink.mutateAsync(c.id).then(() => undefined),      // hook toasts on error; applyWikiSelection awaits → no mark on reject
}), [id, createLink, createNote])
```
- Pass to the editor: `<VidaEditor … wikiConfig={corrupt ? undefined : wikiConfig} />` (no picker in the read-only corrupt state).
- ⚠ **Scope boundary (slice-map-fixed):** B3 = **EC-3, the picker only** (search-by-title · resolve-by-id · create-on-miss).
  It CREATES the `page_links` row + renders the link as styled content (step 3b). **In-content link click-to-navigate is
  NOT part of EC-3** — B3 builds no click handler; traversal affordances live where the plan homes them (graph node-click
  = EC-1/B5; Links-out/Backlinks panels = B4). Not a B3 decision. `[FACT: slice-map.md:32 (B3=EC-3,EC-2,EC-10); envision.md EC-1/EC-3]`

### 10 · `apps/web/src/app/note/note-detail.test.tsx` — EDIT
The `wikiConfig` wiring: `query` maps rows to candidates as-is (incl. the current page — no self-filter, BR-B3-7);
`onSelect` calls `createPageLink(id, target)`; `onCreate` calls `createPage({type:'note',title})`. Assert the hooks
invalidate `NOTES_LIST_KEY`. (The editor-internal picker behavior is covered by steps 5-6; here we test the app binding.)

## C. What is NOT touched (scope fence)
`services/notes/*` (① frozen A1–A8 — B3 consumes, authors none) · `packages/ui` (composes, builds nothing) · the E6/E7/E8
serializers (a `wikiLink` mark degrades to its text under BR-E6-9 "never throws"; Export = B6, out of B3) · B4 panels /
B5 edges / B6 tags / B7 summary · Yjs (NP-4 → M4).

## D. Test surface (the risk-first order)
1. `wiki-link.test.ts` — `applyWikiSelection` order + **reject→no-mark** (the BR-B3-5 guarantee, the highest risk) + `stripWikiClose`.
2. `wiki-link-menu.test.tsx` — keyboard + create-row + loading.
3. `note-detail.test.tsx` — config wiring (candidates as-is incl. self, create-on-miss, hook invalidation).
4. Full: `pnpm --filter @vida/editor test` + `pnpm --filter @vida/web test` (Node 24) · root `typecheck` 0 · `eslint` 0 · `@vida/editor build`.

## E. Acceptance = the spec §4 ░Visual Gate░ (unchanged). Then §XXIX currency (current-spec.md ② B3 + editor CLAUDE.md).

## F. Open risks carried into build
- ~~**R-1** (E9): a new mark vs an existing schema-parity test~~ — RETIRED at gate-2 (subset assertions only; no schema-marks set test). Suite still run at step 7.
- **R-2** (§3): `wikiConfig` is read-once-at-mount (editor `[]` deps) — the app passes an id-stable memo; documented, no ref.
- **R-3** (D-5): `allowSpaces:true` greedy-to-EOL — mitigated by `stripWikiClose` + `LIKE` tolerance; watch at the Visual Gate (type past a title, confirm the search still resolves).
- **A-1** (step 3b): the `.vida-wikilink` colour var must be EMITTED — grep the built CSS before writing the rule (above).
- **A-2** (audit — mark parse-precedence): the schema already carries StarterKit's `link` mark (parses `<a href>`); the new `wikiLink` parses `a[data-wikilink]` (no href). They SHOULD be disjoint (a wiki-link has `data-target-page-id`, no `href`), but a test must confirm a `wikiLink`-marked node does NOT also acquire the `link` mark on a getJSON round-trip (the E5 `getAttrs`-discriminator class). For our JSON-persistence path (not HTML paste) this is low-risk, but assert it. `[FACT: packages/editor CLAUDE.md marks incl. `link`; E5 getAttrs discriminator precedent]`
