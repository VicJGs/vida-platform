<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B3 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in the 5 ASPECT DOCS (the intent authority) —
     contract.md · business-rules.md · conventions.md · identity.md · structure-data.md + ADR-002/003/006 — then the
     shipped @vida/editor (E4 slash-menu) / apps/web (B2 mount) code. The delivery docs (slice-map/seam-contract/
     envision) and the DISCONTINUED recovery-branch `[[` impl are REFERENCE ONLY (2026-08-26, Victor): that version was
     discontinued because it was implemented incorrectly, and the frozen delivery contract can itself carry drift — the
     aspect docs win. No-Guessing: every claim is [FACT: path:line], [INTERP: from fact], or a drift resolved at THIS
     gate — never an open decision left dangling into build. -->

# B3 — the `[[` note-link picker  (MOD-notes ② · slice B3)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md`. The **authority** is the 5 aspect docs
(`docs/features/notes-and-pages/{contract,business-rules,conventions,identity,structure-data}.md`) + ADR-002 §5.2 /
ADR-003 / ADR-006 + the shipped `@vida/editor` E4 slash-menu (the pattern to mirror). The **vision source** is
`delivery/envision.md` EC-3/EC-2/EC-10 (approved greybox) — used only where it agrees with the aspect docs.
⚠ **Two artifacts are REFERENCE ONLY, never authority:** (a) the discontinued recovery-branch `[[` impl (git
`1dae63a`, branch `mod-notes-2a-data-plane`) — discontinued because it was implemented incorrectly (§6 D-1); (b) the
frozen delivery `seam-contract.md`/`slice-map.md` rows — a decomposition artifact that can drift from the aspect docs
(the A7/A8 precedent, [[aspect-docs-outrank-rebuild-decomposition-artifacts]]). No new design token is introduced by B3.
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; feature docs = `docs/features/notes-and-pages/`;
other cites are repo-root-relative.)* `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B3 is the **third ② slice** and the entity's reason-to-exist made real: *"how does a user link two notes?"*
`[FACT: identity.md:7 "a single web of meaning ([[links]] + backlinks + graph)"; task Goal]`. It adds the **`[[`
note-link picker** — a `@tiptap/suggestion` autocomplete surface **in `@vida/editor`** (a custom TipTap extension,
separate from the `/` slash menu) — and wires it, in `apps/web` `note-detail.tsx`, to the frozen A2/A3 service surface.
It **spans two planes** (a fact the seam-contract's one-liner "B3 ← resolveWikiLink + createPageLink" understates —
§6 D-2): `[FACT: conventions.md "the 12 platform blocks are custom TipTap extensions in @vida/editor"; e4-slash-menu.md:31]`

1. **`@vida/editor` (the picker mechanism, built fresh):** a `WikiLink` `@tiptap/suggestion` extension + a `WikiLinkMenu`
   combobox popup + a `wikiLink` inline mark (stores `target_page_id`) + host combobox ARIA + a new **injected** config
   prop on `<VidaEditor>`. The editor stays `@vida/core`-free — data is injected (BR-B3-2). `[FACT: packages/editor/src/CLAUDE.md "Boundary"; conventions.md]`
2. **`apps/web` (the wiring):** in `note-detail.tsx`, build the injected config from `getNotesService()` —
   `query→resolveWikiLink`, `onCreate→createPage`, `onSelect→createPageLink` — and pass it to `<VidaEditor>`.

**In scope (EC-3, EC-2 [the `[[` half], EC-10 — envision.md:26-27,34; grounded in the aspect docs):**
- **`[[` trigger → picker.** Typing `[[` opens an autocomplete picker (a WAI-ARIA **combobox** — focus stays in the
  editor; ↑/↓/Enter/Esc drive it), the sibling of E4's `SlashCommand`. `[FACT: conventions.md "Typing [[ opens the autocomplete picker"; e4-slash-menu.md:31 (homed to MOD-notes); packages/editor CLAUDE.md E4]`
- **Query → candidate pages.** The injected `query(text)` calls `resolveWikiLink(text)` (A3 — title `LIKE` over live
  pages, empty→all, never creates). `[FACT: contract.md:16; seam-contract.md:23; services/notes/types.ts:56 resolveWikiLink]`
- **Select an existing page → write a `page_links` row.** Selection calls `createPageLink(currentPageId, target.id)`
  (A2 — idempotent revive-or-noop, `UNIQUE(source_page_id, target_page_id)`), then inserts the in-content reference.
  `[FACT: conventions.md "selection writes a page_links row by target_page_id"; NP-5; NP-7; structure-data.md:14 (page_links = page↔page); services/notes/types.ts:48 createPageLink]`
- **Create-on-miss — explicit, never silent.** No title match → a distinct **"+ Create '<text>'"** row →
  `createPage({ type: 'note', title })` → then link it. A typo never silently creates a stray page. `[FACT: conventions.md "no-match offers + Create (create-on-miss → stub note)"; business-rules.md:39; contract.md:16 (G2)]`
- **Stored/rendered by `target_page_id` (NP-7).** The inline reference stores `target_page_id`; the **link** survives
  rename + title collisions (clicking always resolves to the right page). Never resolve a link by matching title text
  at render. `[FACT: NP-7; conventions.md landmine "Never resolve [[links]] by title string"; business-rules.md:31 "link inserted as target_page_id"]`
- **Fail-loud on the write (EC-10 + constitution §5).** A rejected `createPageLink`/`createPage` surfaces (an error
  Toast) and inserts **no** in-content reference — never a swallowed catch. `[FACT: business-rules.md:37 "no catch swallows"; :39; §5 fail-loud]`
- **Feels immediate + undoable (EC-10, feel).** The reference insert is a single undoable editor transaction (Ctrl-Z
  removes it); a success Toast; the caches B4-Backlinks / B5-graph read (`['pages','list']`) invalidate so they reflect
  the new link live. `[FACT: envision.md:34 EC-10; business-rules.md:40 (local-first, async surface)]`

**Explicitly OUT (later slices / other affordances — do NOT build):**
- **`/entity-link` (page → any *registered entity*, `entity_links`) + the Links-out / Backlinks panels** → **B4**.
  `[[` is page↔page (`page_links`) and is **kept DISTINCT** from `/entity-link` (page→entity, `entity_links`). ⚠ The
  discontinued E4 spec conflated them ("entity `[[wiki-link]]`") — the aspect docs split them; B3 follows the docs (§6
  D-3). `[FACT: structure-data.md:14 (page_links=page↔page) vs contract.md:14,27 (entity_links=page→entity); slice-map.md:33 (panels=B4); e4-slash-menu.md:31 (the conflation)]`
- **The Backlinks/Links panel content in the rail** → B4 (B3 writes the forward `page_links` row; the reverse view is
  B4's `getBacklinks`/`getPageLinksTo`). **Neural edges** → B5. **Tag/filter chrome, Export** → B6. **`/summary`** → B7. `[FACT: slice-map.md:33-36; business-rules.md:32 (backlinks)]`
- **Yjs content sync (NP-4).** Content persists as a TipTap-JSON snapshot via B2's autosave in M1.0 (the Yjs authority
  inversion is M4 — the shell keeps it a no-rewrite swap). B3 wires no Yjs. `[FACT: NP-4; conventions.md landmine "Never write pages.content through LWW … Yjs (NP-4)"; packages/editor CLAUDE.md "Yjs=deferred seam"; ADR-003]`
- **Field `[E]` encryption** (M1.0 pass-through) → M3/DB-5; **FTS5** → DB-8. `[FACT: slice-map.md:59]`

**Pattern to mirror (read before authoring — same layer):**
- **The `[[` picker mirrors E4's `SlashCommand`** — `Extension` → `Suggestion({char, items, command, render})` driving a
  `ReactRenderer(<Menu>)`; `onKeyDown` forwards Escape/Tab → `exitSuggestion`; combobox, focus stays in editor. `[FACT: packages/editor/src/extensions/slash-command.ts; slash-menu.tsx; packages/editor CLAUDE.md "Shipped (E4)"]`
- **Host combobox ARIA is the editor's SINGLE `role` writer** — `editor.tsx`'s `editorProps.attributes(state)` merges
  `slashComboboxAttrs(slashActive(state))`; B3 adds `wikiComboboxAttrs(wikiActive(state))` the SAME way (a plugin
  cannot flip the host `role` — first-writer-wins). `[FACT: editor.tsx:109-122; packages/editor CLAUDE.md "⚠ Combobox a11y"; [[prosemirror-editorprops-attributes-beats-plugin]]]`
- **The editor mount B3 extends** — `note-detail.tsx:265` `<VidaEditor defaultValue onChange …>`; B3 adds a `wikiConfig`
  prop here, wired to `getNotesService()`. `[FACT: apps/web/src/app/note/note-detail.tsx:265-271; app/notes/notes-service.ts:28 getNotesService]`
- **Injected-config boundary** — the E5 integration-blocks + E1 Yjs-seam precedent: `@vida/editor` declares an interface,
  the app supplies it; no `@vida/core` import in the package. `[FACT: packages/editor CLAUDE.md "Boundary"/"Shipped (E5)"]`

## 2. Business rules (invariants B3 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B3-1 · The `[[` picker is a `@tiptap/suggestion` combobox, the sibling of E4's slash menu — focus never leaves
  the editor.** A new `WikiLink` `Extension` registers a `Suggestion({ char: '[[', allowSpaces: true, startOfLine:
  false, allow: !isActive('codeBlock') })` whose `render()` drives a `ReactRenderer(WikiLinkMenu)` (v3 `props.mount()`
  managed positioning; `onKeyDown` forwards Escape/Tab → `exitSuggestion`). It is NOT a UI-1 `Menu`/`Popover` (those are
  trigger-anchored + focus-moving). ⚠ **`allowSpaces: true` is a DELIBERATE divergence from E4's `allowSpaces: false`
  (resolved at gate, §6 D-5):** page titles contain spaces (a `[[` search must match "My Great Note"), whereas `/`
  block-commands are single-token. The tradeoff is a known `@tiptap/suggestion` behavior — with `allowSpaces:true` the
  match is greedy to end-of-line; the query is bounded by `stripWikiClose` (drop a typed trailing `]]`) and the `LIKE`
  search tolerates trailing noise (the user selects before typing past the title). `[FACT: extensions/slash-command.ts allowSpaces:false (E4 mirror); packages/editor CLAUDE.md E4; @tiptap/suggestion@3.30.0 (E4 dep, already installed) — greediness verified at gate]`
- **BR-B3-2 · The editor stays `@vida/core`-free — the picker's data is INJECTED via a new `wikiConfig?` prop.**
  `<VidaEditor>` gains `wikiConfig?: WikiLinkConfig` (`{ query, onCreate, onSelect }`); the extension is gated on it —
  **no config → no plugin (zero cost)**; the app (note-detail) supplies it from `getNotesService()`. The package imports
  no `@vida/core`. `[FACT: packages/editor CLAUDE.md "Boundary"; the E5 injected-config + E1 Yjs-seam precedent]`
- **BR-B3-3 · `[[` writes to `page_links` (page↔page) — NOT `entity_links`.** Selection resolves to a `target_page_id`
  and writes ONE `page_links` row via `createPageLink(currentPageId, target.id)`. `page_links` is the page↔page relation
  (`entity_links` = page→entity, a distinct `/entity-link` affordance owned by B4). `[FACT: structure-data.md:14; conventions.md; contract.md:14; NP-5; slice-map.md:33 (entity-link=B4)]`
- **BR-B3-4 · Resolve-by-id, survives rename (NP-7).** The in-content reference is a `wikiLink` **inline mark** carrying
  `target_page_id` (the display text = the title captured at insert). The stored **link** is id-based → survives rename
  + title collisions; the reference NEVER resolves by matching title text at render. The `wikiLink` mark is registered
  **UNCONDITIONALLY** (independent of `wikiConfig`) so any note whose content already carries a `[[`-link renders (a
  mark absent from the schema is dropped on load). `[FACT: NP-7; business-rules.md:31; conventions.md landmine; structure-data.md:14; [INTERP: unconditional-mark = load-safety, the E5 "register so content renders" precedent]]`
- **BR-B3-5 · Row FIRST, then the mark, and the rejection is SURFACED — not swallowed (the discontinued impl's precise
  bug, §6 D-1).** `applyWikiSelection` awaits `onSelect` (`createPageLink`) — or `onCreate`→`onSelect` for create-on-miss
  — BEFORE it applies the in-content mark; **if the write rejects it throws before the mark**, so content never renders a
  `[[`-link with no backing `page_links` row. ⚠ **The discontinued impl already had this ordering right** (its
  `applyWikiSelection` awaited `onSelect` first); its defect was the CALLER — the sync `Suggestion.command` did
  `void applyWikiSelection(...).catch(() => {})`, so a rejected write was surfaced **nowhere**. B3's fix is therefore at
  two points: (a) the **write's error UX is surfaced app-side** — the `useCreatePageLink`/`useCreateNoteFromLink`
  mutation hooks carry an `onError` Toast (the B2 `useUpdateNote` pattern), so the failure is never silent; (b) the
  editor `command` awaits the apply and, since the app already surfaced the error, `.catch`es only to avoid an unhandled
  rejection — it does NOT own the (already-fired) error UX. The apply is extracted from `Suggestion.command` (which is
  sync) so the order + reject-before-mark path are unit-testable without driving the full Suggestion flow. `[FACT: business-rules.md:37 "no catch swallows"; :39 (create-on-miss explicit); §5 fail-loud; 1dae63a extensions/wiki-link.ts (apply=row-first; command=void apply().catch(()=>{}) the swallow); note-detail.tsx:102-103 (B2 mutate onError Toast pattern)]`
- **BR-B3-6 · Create-on-miss is an explicit, user-chosen row (IR-4 / G2).** A non-empty query with no exact-or-any match
  still shows a **"+ Create '<text>'"** option; selecting it calls `onCreate(text)` → `createPage({ type: 'note',
  title: text })` → then links it. `resolveWikiLink` itself NEVER creates (A3/IR-4). A typo never silently creates a
  page. `[FACT: conventions.md "create-on-miss → stub note"; business-rules.md:39; contract.md:16 (G2); services/notes/types.ts:35 createPage(input)]`
- **BR-B3-7 · `createPageLink` is idempotent revive-or-noop (NP-5 / IR-11) — re-linking is a no-op; the picker does NOT
  filter the current page.** `source = current page id`, `target = candidate id`; `UNIQUE(source, target)` →
  re-selecting an already-linked page writes nothing new (A2 revive-or-noop). The picker presents `resolveWikiLink`'s
  candidates **as-is** — a self-link `(P, P)` is a **documented, handled case** (the A8 cascade carries a **"self-link
  dedup"** test; the schema has no `source != target` constraint), so the picker must not strip a capability the model
  supports. *(An earlier draft filtered the current page as a "UX default" — that was a drift: it removed a valid
  capability, §6 D-4.)* `[FACT: NP-5; seam-contract.md:17 (A2 revive-or-noop IR-11); current-spec.md:71 (A8 "self-link dedup" — self-links valid+handled); structure-data.md:14 (UNIQUE(source,target), no self constraint)]`
- **BR-B3-8 · The query soft-fails to "keep typing"; only the WRITE is loud.** `query(text)` maps to
  `resolveWikiLink(text)`; a query rejection degrades to `[]` (the picker shows "no match / + Create", the user keeps
  typing) — the ONE doc-sanctioned soft-fail, and the one behavior B3 **keeps** from the discontinued impl (its
  `items: … .catch(() => [])` was already doc-correct here — the swallow bug was on the WRITE, BR-B3-5, not the query).
  This is distinct from BR-B3-5 (the write is loud). Debounce (~150ms) coalesces keystrokes before hitting the service;
  a stale in-flight query is ignored. `[FACT: business-rules.md:31 "query error, keep typing"; :37 (writes loud); 1dae63a (items .catch(()=>[]) — the doc-correct query soft-fail); IR-4]`
- **BR-B3-9 · Host combobox ARIA merges into `editorProps.attributes` — the single `role` writer.** While the picker is
  open the editor host is `role=combobox` + `aria-expanded`/`-controls`/`-haspopup` via
  `wikiComboboxAttrs(wikiActive(state))` merged in `editor.tsx` (a plugin cannot flip the host `role`); the popup is a
  `role=listbox` of `role=option` rows; `aria-activedescendant` is set on the host by the popup as selection moves.
  Coexists with `slashComboboxAttrs` (only one suggestion is active at a time). `[FACT: editor.tsx:117-122 (the attributes(state) merge) + :109-116 (the single-role-writer comment); packages/editor CLAUDE.md "⚠ Combobox a11y"; [[prosemirror-editorprops-attributes-beats-plugin]]; WAI-ARIA combobox]`
- **BR-B3-10 · Linking feels immediate + undoable, and updates dependents live (EC-10) — via the mutation-hook seam,
  not an ad-hoc invalidate.** The link write goes through a **`useCreatePageLink(id)`** mutation hook (create-on-miss
  through **`useCreateNoteFromLink()`**), each mirroring `useUpdateNote`: `mutationFn` → the service call, `onSuccess` →
  `queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY })` (the **v5 object form + the shared `NOTES_LIST_KEY`
  constant** — never a re-inlined `['pages','list']` positional call), `onError` → a danger Toast (BR-B3-5). On success:
  a single undoable editor transaction inserts the reference (Ctrl-Z removes it); the list invalidation lets a
  create-on-miss note join the collection and B4-Backlinks / B5-graph reflect the link. **Toast policy (Visual-Gate
  reconciled):** a **create-on-miss** SUCCESS toast confirms the note created off-screen (EC-10's informative toast —
  "Created …", `useCreateNoteFromLink`); a **plain link is silent-immediate** (the styled link appears at once — the B2
  silent-success convention; a toast on every `[[` would be noise). It invalidates `NOTES_LIST_KEY` ONLY — **never
  `noteKey(id)`** (the B2 no-re-seed rule, BR-B2-4). No optimistic cache write (BR-RT-4).
  `[FACT: envision.md:34 EC-10; use-note.ts:17,29-35 (NOTES_LIST_KEY + useMutation v5 object-form onSuccess/onError pattern); business-rules.md:40; state-conventions/CLAUDE.md BR-RT-4]`
- **BR-B3-11 · Content persists via B2's autosave as a TipTap-JSON snapshot (NP-4 Yjs = M4 deferral).** The mark lands
  in `pages.content`; B2's single-writer autosave persists it via `updatePage({ content })`. NP-4's "content via Yjs"
  is the **M4** authority inversion — B3 adds no Yjs; the editor shell keeps the content source swappable. `[FACT: NP-4; packages/editor CLAUDE.md "Yjs=deferred seam"; note-detail.tsx (B2 autosave); ADR-003]`
- **BR-B3-12 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** Every picker state × light/dark
  × 375/768/1440: **idle** (inert until `[[`), **loading** ("Searching…"), **results** (listbox), **no-match**
  ("+ Create '<text>'" + hint), **error-on-write** (Toast, picker closes, no mark), plus keyboard (↑/↓ wrap, Enter
  selects, Esc closes — focus stays in editor), focus-visible, contrast AA. Popup composes the Menu sub-theme token
  language (no injected CSS, no motion, radius via the token scale — DEF-U8-h). `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; slash-menu.tsx (token/a11y precedent)]`

## 3. Contract (the B3 surface)
```ts
// packages/editor/src/extensions/wiki-link.ts — NEW (the [[ suggestion + the wikiLink mark)
export interface WikiLinkCandidate { id: string; title: string }              // a page the picker can link to
export interface WikiLinkCreateRequest { __create: string }                    // the create-on-miss sentinel (BR-B3-6)
export interface WikiLinkConfig {                                              // INJECTED by the app (BR-B3-2)
  query(text: string, signal: AbortSignal): Promise<WikiLinkCandidate[]>       // → resolveWikiLink; reject → [] (BR-B3-8)
  onCreate(text: string): Promise<WikiLinkCandidate>                           // → createPage({type:'note',title}) (BR-B3-6)
  onSelect(candidate: WikiLinkCandidate): Promise<void>                        // → createPageLink; awaited BEFORE the mark (BR-B3-5)
}
export const WikiLinkMark: Mark                                                // inline mark, stores target_page_id (BR-B3-4)
export const WikiLink: Extension<{ config: WikiLinkConfig | null }>            // the [[ Suggestion; null → off (BR-B3-2)
export function applyWikiSelection(editor, range, item, cfg): Promise<void>    // row-first-then-mark, loud (BR-B3-5) — extracted/testable
export function wikiActive(state: EditorState): boolean                        // picker open? (BR-B3-9)
export function wikiComboboxAttrs(active: boolean): Record<string, string>     // host combobox ARIA (BR-B3-9)

// packages/editor/src/wiki-link-menu.tsx — NEW (the combobox popup: loading | results | "+ Create" | keyboard)
export const WikiLinkMenu: ForwardRefExoticComponent<WikiLinkMenuProps & RefAttributes<WikiLinkMenuHandle>>

// packages/editor/src/editor.tsx — EXTEND: add wikiConfig?: WikiLinkConfig to VidaEditorProps; register
//   WikiLinkMark (unconditional) + WikiLink.configure({config: wikiConfig ?? null}); merge wikiComboboxAttrs(...)
// packages/editor/src/index.ts — EXTEND: export type { WikiLinkConfig, WikiLinkCandidate }

// apps/web/src/app/note/use-note.ts — NEW hooks (mirror useUpdateNote — v5 object-form invalidate + onError Toast):
export function useCreatePageLink(id: string): UseMutationResult<PageLinkRow, Error, string>   // createPageLink(id, targetId); onSuccess invalidate NOTES_LIST_KEY; onError Toast (BR-B3-5/7/10)
export function useCreateNoteFromLink(): UseMutationResult<PageRow, Error, string>             // createPage({type:'note',title}); onSuccess invalidate NOTES_LIST_KEY; onError Toast (BR-B3-6)

// apps/web/src/app/note/note-detail.tsx — EXTEND: instantiate the hooks, build the injected config (id-stable), pass it:
//   const createLink = useCreatePageLink(id)          // the mutation-hook seam — NOT an ad-hoc invalidate (BR-B3-10)
//   const createNote = useCreateNoteFromLink()
//   const wikiConfig = useMemo<WikiLinkConfig>(() => ({
//     query:   (text) => getNotesService().resolveWikiLink(text)                                   // read → direct (transient, uncached)
//                          .then(rows => rows.map(r => ({ id: r.id, title: r.title ?? 'Untitled' }))), // candidates AS-IS, no self-filter (BR-B3-7); r.title is string|null
//     onCreate:(text) => createNote.mutateAsync(text).then(r => ({ id: r.id, title: r.title ?? text })), // hook toasts on error; invalidates list
//     onSelect:(c)    => createLink.mutateAsync(c.id).then(() => {}),                              // awaited by applyWikiSelection BEFORE the mark; reject → no mark + hook Toast (BR-B3-5)
//   }), [id, createLink, createNote])
//   <VidaEditor … wikiConfig={corrupt ? undefined : wikiConfig} />   // no picker in the read-only corrupt state
```
- The editor owns the picker MECHANISM + the `wikiLink` mark; the app owns the SERVICE binding + cache invalidation +
  Toast. `applyWikiSelection` (extracted from the async `Suggestion.command`) enforces BR-B3-5 order and is the unit-test
  surface for the failure path.
- `WikiLinkMenu` = a `forwardRef` `role="listbox"` under `<Theme name="Menu">`; rows `role="option"` + `aria-selected`;
  a trailing **"+ Create '<query>'"** row when the query is non-empty; imperative `onKeyDown` (↑/↓ wrap, Enter, printables
  fall through). Mirrors `slash-menu.tsx`.

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:38)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-3 MUST:** in a note, typing `[[` opens the picker; typing filters by title (`resolveWikiLink`); ↑/↓/Enter/Esc
   drive it with focus in the editor; selecting a page inserts the link AND (verified) writes a `page_links` row.
2. **Create-on-miss MUST (never silent):** a no-match query shows **"+ Create '<text>'"**; choosing it creates a `note`
   page (appears in `/notes`) and links it; a typo that is NOT chosen creates nothing.
3. **Resolve-by-id (NP-7):** after linking Note A→Note B, renaming B does not break the link (it still opens B).
4. **Fail-loud (BR-B3-5):** if the link write rejects (inject a failure), an error Toast shows and **no** dangling `[[`
   reference is left in the content; the query soft-fail (rejected search → "keep typing / + Create") is distinct.
5. **EC-10 (feel):** the insert is a single Ctrl-Z-undoable transaction; a success Toast; the collection reflects a
   create-on-miss note live.
6. **All picker states × {light | dark} × {375 · 768 · 1440}:** idle · loading ("Searching…") · results · no-match
   ("+ Create") · error-on-write. Screenshots as evidence.
7. **§XIV a11y sweep:** host flips `role=combobox`/`aria-expanded` while open; popup `role=listbox`/`option` +
   `aria-activedescendant`; keyboard-only walk; focus never leaves the editor; contrast AA; a VoiceOver trace of the link flow.
8. **Gates:** `pnpm --filter @vida/editor test` + `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 ·
   `@vida/editor` **build** clean (dist regenerated — the stale-wiki residue was cleared at baseline) · `/component-audit`
   + `victor:quality-gate-components` + `victor:quality-gate-engineering` PASS.
9. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` (the ② B3 surface) + `packages/editor/src/CLAUDE.md`
   ("Shipped — `[[` wiki-link") at gate close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `packages/editor/src/extensions/wiki-link.ts` — the `WikiLinkMark` (inline, `target_page_id` attr) + the `WikiLink`
   Suggestion extension + `applyWikiSelection` (row-first-then-mark, loud) + `wikiActive`/`wikiComboboxAttrs` +
   `stripWikiClose` (drop a typed trailing `]]` from the query). **Unit-tested first** — `applyWikiSelection` order +
   reject-before-mark is the risk surface.
2. `packages/editor/src/wiki-link-menu.tsx` — the `WikiLinkMenu` combobox popup (loading / results / "+ Create" states;
   keyboard handle; Menu sub-theme tokens; no injected CSS/motion). Mirror `slash-menu.tsx`.
3. `packages/editor/src/editor.tsx` — add `wikiConfig?` to `VidaEditorProps`; register `WikiLinkMark` (unconditional) +
   `WikiLink.configure({ config: wikiConfig ?? null })`; merge `wikiComboboxAttrs(wikiActive(state))` into
   `editorProps.attributes`. `index.ts` — export the two config types. Then `pnpm --filter @vida/editor build`.
4. `apps/web/src/app/note/use-note.ts` — add `useCreatePageLink(id)` + `useCreateNoteFromLink()` mutation hooks
   (mirror `useUpdateNote`: v5 `invalidateQueries({ queryKey: NOTES_LIST_KEY })` `onSuccess`; a danger Toast `onError`).
5. `apps/web/src/app/note/note-detail.tsx` — instantiate the two hooks; build the `useMemo` config over
   `getNotesService()` (query maps candidates as-is; `onCreate`/`onSelect` → the hooks' `mutateAsync`); pass `wikiConfig`;
   suppress it in the corrupt read-only state.
6. Tests: editor — `applyWikiSelection` order/reject-no-mark, `stripWikiClose`, menu keyboard + create-row, `[[` opens
   (`wikiActive` true), unconditional mark round-trips content; web — the hooks (invalidate `NOTES_LIST_KEY`, `onError`
   Toast) + the config wiring (query maps candidates, create-on-miss). TS types first → default → all picker states →
   dark → responsive → (no motion).

## 6. Decisions — none open (all doc-fixed at this Doc Gate)
- **D-1 · The discontinued recovery-branch `[[` impl is REFERENCE ONLY (Victor, 2026-08-26).** Build fresh from the
  aspect docs. That version (`1dae63a`) was discontinued because it was implemented incorrectly — concretely, its
  `Suggestion.command` did `void applyWikiSelection(...).catch(() => {})`, **swallowing** a failed `createPageLink`/
  `createPage`, which violates business-rules.md:37 ("no catch swallows") + :39 (create-on-miss explicit). B3 keeps only
  its doc-consistent *shape* (config injection; a `wikiLink` mark storing `target_page_id`, which satisfies NP-7) and
  makes the write **loud** (BR-B3-5). `[FACT: 1dae63a extensions/wiki-link.ts; business-rules.md:37,39]`
- **D-2 · The frozen `seam-contract.md`/`slice-map.md` B3 rows are a REFERENCE, not authority; the aspect docs win.**
  Their model ("`[[` → resolveWikiLink → createPageLink; page↔page; create-on-miss; NP-5/NP-7") happens to AGREE with
  the aspect docs, so B3 adopts it — but the one-liner "B3 ← resolveWikiLink + createPageLink" **understates** that B3
  builds a whole `@vida/editor` extension (conventions.md: custom TipTap extensions live in the package). Scope = §1's
  two planes, grounded in conventions.md, not the seam-contract line. `[FACT: seam-contract.md:39; conventions.md; [[aspect-docs-outrank-rebuild-decomposition-artifacts]]]`
- **D-3 · `[[` = `page_links` (page↔page), split from `/entity-link` = `entity_links` (page→entity) — the aspect docs
  over the E4 conflation.** The discontinued E4 spec called it "entity `[[wiki-link]]`" (folding it into the entity-link
  concern); structure-data.md:14 + conventions.md + contract.md:14 are unambiguous that `[[` writes `page_links` and
  `/entity-link` (B4) writes `entity_links`. B3 follows the docs. `[FACT: structure-data.md:14; contract.md:14,27; e4-slash-menu.md:31 (the conflation)]`
- **Doc-FIXED (NOT decisions) — grounded above, do not reopen:** injected config / editor stays `@vida/core`-free
  (conventions.md, BR-B3-2) · resolve-by-`target_page_id`/survives-rename/never-title-match (NP-7, BR-B3-4) · row-first
  fail-loud (business-rules.md:37,39, BR-B3-5) · explicit create-on-miss → stub note (conventions.md, BR-B3-6) ·
  idempotent NP-5, candidates as-is / no self-filter (current-spec.md:71, BR-B3-7) · query soft-fail (business-rules.md:31, BR-B3-8) · combobox
  ARIA via editorProps (editor.tsx:109-122, BR-B3-9) · content via JSON snapshot, Yjs=M4 (NP-4, BR-B3-11). The
  `/entity-link` + Backlinks panels (B4), neural edges (B5), tags/filters/Export (B6), `/summary` (B7) are OUT (§1).
- **D-4 · NO self-filter — a self-link is a documented, handled case (drift corrected, Victor 2026-08-26).** Two earlier
  drafts got this wrong: first a filter dressed as `[INTERP: identity.md:7 "link two notes"]` (a MISCITE — that phrase is
  the task Goal, not identity.md:7), then a "gate-resolved UX default" filter. **Both were drift** — they stripped a
  capability the model supports: `current-spec.md:71` documents an A8 cascade **"self-link dedup"** test, so a `(P,P)`
  `page_links` row is anticipated and handled; the schema has no `source != target` constraint and `createPageLink` has
  no self-guard. The picker therefore presents `resolveWikiLink`'s candidates **as-is** (BR-B3-7) — it neither strips nor
  special-cases the current page. `[FACT: current-spec.md:71 (A8 "self-link dedup"); structure-data.md:14 (UNIQUE(source,target), no self constraint); services/notes/service.ts createPageLink (no self-guard)]`
- **D-5 · `allowSpaces: true` diverges from E4's `allowSpaces: false` — deliberate, gate-resolved (Doc-Gate MATERIAL-1
  fix).** `[[` must match multi-word titles (page titles carry spaces), so the suggestion allows spaces; `/` slash
  commands are single-token, so E4 forbids them. The known consequence (`@tiptap/suggestion@3.30.0`, verified at gate):
  `allowSpaces:true` makes the match greedy to end-of-line. Mitigation: `stripWikiClose` trims a typed trailing `]]`, the
  `resolveWikiLink` `LIKE` tolerates trailing noise, and the picker is open (the user selects before typing past the
  title). Not a §XXVIII escape-hatch — the debounced search + close-strip bound it (BR-B3-1/8). `[FACT: slash-command.ts allowSpaces:false; @tiptap/suggestion@3.30.0 match regex — greediness verified at gate]`
- **Out-of-scope housekeeping (NOT a B3 change):** the stale `@vida/editor` dist wiki residue (from `1dae63a`) was
  cleared at baseline (`clean` + rebuild → dist matches src); the 0-byte `apps/web/src/app/notes/[id].tsx` route residue
  is inert under code-based routing — both left for their standalone cleanups. `[FACT: baseline this session; routes.tsx code-based]`
