<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B6 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in the DOC-FIXED homing: slice-map.md:35 homes B6 as
     "metadata + filters + create-with-tags" covering EC-8 + EC-9; the seam is frozen at seam-contract.md:42 (B6 ←
     listPages filters + tagEntity + updatePage metadata). Authority = the 5 aspect docs + these delivery docs + the
     frozen ① seam (A1 listPages / A5 tag facade are real, tested code) + the shipped @vida/ui primitives (UI-1/UI-2) +
     B1's notes-collection.tsx (the collection B6 adds filters to) + B2's note-detail.tsx (the rail B6 adds icon/cover
     to) + B3's wiki-link picker (the search+create-on-miss precedent B6's tag picker mirrors). No-Guessing: every
     claim is [FACT: path:line], [INTERP: from fact], or a drift resolved at THIS gate — never an open decision left
     dangling. B6 is the LARGEST Track-B slice: it spans two planes AND makes two minimal §XXVIII deviations on the
     frozen ① seam (a net-new listTags read + a createTag facade), both category-identical to A5's tag surface. -->

# B6 — metadata + filters + create-with-tags  (MOD-notes ② · slice B6)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md`. The **authority** is the 5 aspect docs
(`docs/features/notes-and-pages/{contract,business-rules,conventions,identity,structure-data}.md`) + ADR-002 §5.2 +
**ADR-006 (Spaces / tags substrate)** + the **frozen ① seam** (`current-spec.md:23-25,32-33` — A1 `listPages` + A5
`tagEntity`/`getTagsForEntity` are real, tested code) + the delivery docs (`slice-map.md:35,50-51`, `seam-contract.md:42`,
`envision.md:32-33`) + the M1.1 scope (`m1.1-delivery-plan.md:194,232` — Notes ② owns "page metadata favorite/archive/
icon/cover"; the nestable color/icon **tags-browser + inline picker** is MOD-spaces ②). **Patterns to mirror (shipped):**
B1's `notes-collection.tsx` + `use-notes-list.ts` (the collection + its React-Query hook — B6 adds filters); B2's
`note-detail.tsx` metadata rail + `use-note.ts` `useUpdateNote` (the favorite/archive toggles + patch mutation — B6 adds
icon/cover); B3's `wiki-link-menu.tsx` + `buildWikiConfig` (the **search + create-on-miss picker** — B6's tag picker
mirrors it); A5's `tagEntity`/`untagEntity` facade + `getEntitiesByTag`/`getTagsForEntity` reads (the "Notes owns tag
reads, AR-6 has none; write facade delegates to AR-6" pattern the two ① touches extend). **No new design token, no new
`@vida/ui` primitive** is introduced by B6 (the tag chips + filter controls compose UI-1 Button/Menu/Popover/Input/Card).
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; feature docs = `docs/features/notes-and-pages/`;
other cites are repo-root-relative.)* `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B6 is the **sixth ② slice**. It delivers **EC-8** ("can **set tags on create** — delegates the write to AR-6, composes
the Spaces entity-tag picker") and **EC-9** ("built-in **favorite/archive/tag filters** + a favorites-only filter — ①
builds `listPages({favorite,archived,tag})`"), plus the `slice-map.md:35` metadata prose (favorite/archive already
shipped in B2 → B6 adds **icon/cover**). **Doc-fixed BUILT-in-B6** (`slice-map.md:35,50-51` · `seam-contract.md:42` ·
`envision.md:32-33` · `intent-coverage.md:54-55` GATE PASS) — this spec RECORDS and DETAILS it, it re-decides nothing.
`[FACT: slice-map.md:35,50-51; seam-contract.md:42; envision.md:32-33; intent-coverage.md:54-55]`

It **spans two planes plus THREE minimal ① touches** (the critic's Doc-Gate catch: `listPages({tag})` was never
implemented — see D-6):
- **`apps/web` (the bulk):** a **filter bar** on the collection driving `listPages({favorite,archived,tag})`; a
  **create-with-tags** New Note flow (a tag picker mirroring B3's `[[` picker → `createPage` then `tagEntity`); **icon/
  cover** editing in the B2 note-detail rail; the filter UI state in the `notes-view-store` (ephemeral, like `view`).
- **`@vida/core` — three minimal §XXVIII deviations on the frozen ① seam** (§6 D-6), all category-identical to A5
  (net-new tag READS Notes owns + a one-line DELEGATE to a built AR-6 write):
  - **Implement the `listPages({tag})` branch** — TODAY it **THROWS** (`service.ts:152-154`: `throw new Error('listPages({tag})
    is available from slice A5')`; the A1 fail-loud placeholder A5 never wired). A5 shipped the junction *reads*
    (`getEntitiesByTag`/`getTagsForEntity`) but never JOINed `entity_tags` into `listPages`. B6 — the first consumer of
    the tag filter — completes the branch: a server-side JOIN `entity_tags` on `entity_type='page'` + `tag_id`, honoring
    the existing AND-with-favorite/archived + `isNull(deleted_at)`. Replaces the throwing test (`notes-service.test.ts:192`).
    `[FACT: services/notes/service.ts:152-154 (throws); notes-service.test.ts:184-192 (asserts the throw); current-spec.md:24-25 divergence — corrected at gate close]`
  - **`listTags(): Promise<TagRow[]>`** — a **net-new READ** over the `tags` table (a read-only repo mirroring A5's
    `entity_tags` read repo). Needed because the frozen seam exposes tag *writes* + per-entity tag junction reads, but
    **no way to enumerate tag definitions with their names** (the filter dropdown + create picker both need names, which
    live on `tags`, not on the `entity_tags` junction). Home = the Notes read surface (A5's "Notes owns tag reads — AR-6
    has none"). `[FACT: current-spec.md:32 (A5 net-new tag reads); spaces.ts:131 (TagRow); service.ts:201-206 (entity_tags read repo pattern)]`
  - **`createTag(name: string): Promise<TagRow>`** — a **write facade → AR-6** `deps.spaces.createTag({ name })`
    (delegate, like A5's `tagEntity`/`untagEntity`), **with a B6-side `name` trim + non-empty guard** (AR-6 `createTag`
    is a bare `tagRepo.create` — it does NOT validate the name nor dedup by name; `service.ts:108-116`). Needed so
    create-with-tags has a **create-on-miss** path (B3's picker precedent) — otherwise the picker is empty until
    MOD-spaces ships tag creation, and EC-8 is not live-demonstrable. `[FACT: foundation/spaces/service.ts:40,108-116 (createTag = bare create, no validate/dedup); spaces/types.ts:20-21 (CreateTagInput.name: plain string); current-spec.md:33 (A5 write facade delegates to AR-6)]`

**Why two planes (not a pure-app slice like B5):** B5 fed a prop into an already-complete renderer. B6 needs to *filter
by tag* and *enumerate tag definitions*, neither of which the frozen seam can do (`listPages({tag})` throws; no
`listTags`). The deviations are the **minimum** to close those gaps — completing a documented-but-unimplemented branch +
a read Notes already owns the category of (A5) + a one-line delegation to an AR-6 method that is **already built**. B6
authors **no new tag storage, no tag CRUD engine, no @vida/ui primitive.** `[FACT: seam-contract.md:25-26 (A5 tag surface); foundation/spaces/service.ts:40-42; service.ts:152-154]`

**In scope (EC-8 [structural], EC-9 [structural]; slice-map.md:35,50-51):**
- **Collection filter bar (EC-9).** A control row on `/notes` exposing the three ① `listPages` filter params as explicit
  "show only" toggles: **Favorites** (`favorite: true`), **Archived** (`archived: true`), and a **tag filter** (pick one
  tag → `tag: <tagId>`, once B6 implements the branch). Default = no filter (`{}`, B1's set); a toggle is applied only
  when set (BR-B6-2 — no invented default-hide). The active filter is passed to `listPages(filter)`; the collection (all
  4 views + the Neural node set) reflects the filtered result. `[FACT: envision.md:33; seam-contract.md:20,42; services/notes/service.ts:149-159 (listPages favorite/archived done, tag throws); intent-coverage.md:55]`
- **Filter state is ephemeral UI state in the `notes-view-store`.** Filters live beside `view` in Zustand (ephemeral
  "open view" UI state, BR-RT-6 / engineering §XVII) — NOT React Query (not entity data), NOT a persisted saved-view
  (that is the deferred ADR-007 MOD-spaces system). `useNotesList` keys on `['pages','list', filter]` and passes the
  filter to `listPages`; a link/note write's `['pages','list']`-prefix invalidation still reaches the filtered key.
  `[FACT: notes-view-store.ts:3-8 (ephemeral-only doctrine); use-note.ts:18 (NOTES_LIST_KEY prefix); engineering.md §XVII]`
- **Create-with-tags (EC-8).** The New Note affordance gains a **tag picker** (mirrors B3's `[[` picker — a combobox
  over `listTags()` candidates with a **"+ Create <name>" create-on-miss** row). On confirm: `createPage({type:'note'})`
  → for each chosen tag `tagEntity(tagId, 'page', pageId)` → navigate to `/note/$id`. A brand-new tag typed in the picker
  → `createTag(name)` first, then applied. **Row-first, fail-loud** (the tag write is awaited; a rejection surfaces a
  Toast, mirroring B3/B4). `[FACT: envision.md:32; seam-contract.md:26,42; services/notes/service.ts:216 (tagEntity); b3-note-link-picker.md (search+create-on-miss picker); use-note.ts:57-79 (fail-loud create hooks)]`
- **icon/cover metadata editing (slice-map.md:35 prose).** The B2 note-detail rail gains **icon** (a short text/emoji)
  and **cover_image** (a text URL/ref) editors over the two `pages` columns, via the existing `useUpdateNote` patch
  mutation. favorite/archive already ship in B2's rail — B6 completes the "favorite/archive/icon/cover" metadata set.
  `[FACT: slice-map.md:35; m1.1-delivery-plan.md:194; notes.ts:51,53 (icon, cover_image cols); updatePageSchema (icon/cover_image updatable); note-detail.tsx (the rail); use-note.ts:34-40 (useUpdateNote)]`
- **A note's current tags shown + removable in the detail rail.** The rail lists the note's applied tags
  (`getTagsForEntity('page', id)` resolved to names via `listTags`), each removable (`untagEntity`) and addable (the
  same tag picker). This is the read-back of EC-8's write (parity with B4's Links-out removable rows). `[FACT: services/notes/service.ts:204,220 (getTagsForEntity, untagEntity); b4-link-panels.md (removable Links-out precedent)]`

**Explicitly OUT (later slices / other modules — do NOT build):**
- **The nestable, color/icon tags-BROWSER + management UI (create/edit/delete/nest/recolor tags) → MOD-spaces ②
  (LIF-141).** B6 ships a **minimal** picker (apply existing + create-a-plain-named-tag), mirroring how B1 shipped
  hard-coded renderers while the view-BUILDER is MOD-spaces. Tag color/icon/nesting/description authoring is NOT B6.
  `[FACT: m1.1-delivery-plan.md:232 ("tags browser + inline entity-tag picker, nestable, color/icon" = MOD-spaces); intent-coverage.md:39 (F-1: tag-CRUD UI = MOD-spaces ②)]`
- **Multi-tag filter / predicate filters / saved filters / favorites-as-a-space.** `listPages` takes ONE `tag`; B6
  filters by one tag. Boolean/predicate filter composition + saved filters + "favorites as a Space" → **MOD-spaces ②
  views** (ADR-007). `[FACT: services/notes/service.ts:149 (single tag param); envision.md:41,45 (routed to MOD-spaces); slice-map.md:57-58]`
- **Sort / grouping / manual-order / pagination / nest-by-type.** The collection keeps B1's recency default; the
  configurable sort/grouping/pagination/manual-order → **MOD-spaces ② + the Spaces Views design-pass + DB-11** (manual
  order needs a schema column). `[FACT: use-notes-list.ts:32-36 (recency default, not the sort system); envision.md:50-54; slice-map.md:58]`
- **Export / `/summary` / FTS5 search.** Export dialog is composed elsewhere; `/summary` → **B7**; FTS5 search UI → the
  **DB-8** seam. `[FACT: slice-map.md:36,59; b5-neural-graph-edges.md §1 OUT]`
- **`entity_links`/backlinks/graph-edges.** Those are B4/B5; B6 touches only tags + page metadata + the collection
  filter. `[FACT: slice-map.md:33-34]`
- **Encrypting the tag `name`/`color` (`[E]`).** M1.0 pass-through (AR-6 BR-13); field `[E]` → M3/DB-5. `[FACT: foundation/spaces/service.ts:5-9; intent-coverage.md:156]`

**Patterns to mirror (read before authoring — same layer):**
- **B3's picker** — `wiki-link-menu.tsx` (combobox popup + "+ Create" row) + `buildWikiConfig` (query → candidates,
  onCreate, onSelect; candidates AS-IS). B6's tag picker is the tag analog. `[FACT: packages/editor/src/wiki-link-menu.tsx; note-detail.tsx buildWikiConfig; b3-note-link-picker.md]`
- **B4's fail-loud write hooks** — `useCreateEntityLink`/`useRemoveEntityLink` (row-first, `onError` Toast, invalidate).
  B6's `useTagNote`/`useUntagNote`/`useCreateTag` mirror them. `[FACT: use-note.ts:132-161]`
- **B1's list hook + key** — `useNotesList` / `NOTES_LIST_KEY = ['pages','list']`; B6 extends the key with the filter.
  `[FACT: use-notes-list.ts:18,28-39]`
- **B2's patch mutation + rail** — `useUpdateNote(id)` (invalidate list only) + the metadata rail. B6's icon/cover reuse
  both. `[FACT: use-note.ts:34-40; note-detail.tsx]`
- **A5's tag surface (the deviation category)** — `services/notes/service.ts` `tagEntity`/`untagEntity` (delegate) +
  `getEntitiesByTag`/`getTagsForEntity` (net-new reads). `listTags`/`createTag` join this exact surface. `[FACT: services/notes/service.ts:201-221; current-spec.md:32-33]`

## 2. Business rules (invariants B6 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B6-1 · The collection filter is the ① `listPages({favorite,archived,tag})` — no client-side re-filter.** The
  filter state maps directly to the three ① params; `useNotesList(filter)` passes them to `listPages`; the DB does the
  filtering. B6 adds no post-read `.filter()` over pages. ⚠ **The `{tag}` branch does NOT exist yet — it THROWS
  (`service.ts:152-154`); B6 IMPLEMENTS it server-side (D-6, ① touch 1)**, so this rule is only satisfiable after that
  branch lands (a client `.filter()` is forbidden precisely because the server branch must exist). `[FACT: services/notes/service.ts:149-159 (favorite/archived filter server-side; :152-154 tag throws); envision.md:33]`
- **BR-B6-2 · Filter state is ephemeral UI state (Zustand `notes-view-store`), keyed into the query; the three filters
  are explicit "show only" toggles that map 1:1 to the ① `listPages` params — no invented default.** Filters live beside
  `view`; `useNotesList` keys `['pages','list', filter]`. Not persisted (no saved-view), not React-Query state. Each
  control maps directly to a ① param — Favorites → `favorite:true`, Archived → `archived:true`, Tag → `tag:<id>` — and is
  applied only when the user sets it. **The default is the empty filter `{}` = B1's behavior byte-for-byte** (all live
  pages, recency order); the docs specify explicit filters, NOT a default-hide-archived (that would be an invention). A
  filter is opt-in exactly like the favorites filter. `[FACT: notes-view-store.ts:2-7,14-17; use-notes-list.ts:18,28-39; engineering.md §XVII; envision.md:33 (favorite/archive/tag filters — explicit); seam-contract.md:20; services/notes/service.ts:156-159 (each param a discrete predicate); slice-map.md:57 (saved-view selection = MOD-spaces)]`
- **BR-B6-3 · Filtering must not blank the write path or the terminal states.** `deriveTerminalState` still drives
  loading/empty/error/populated per the filtered read; a filter that yields zero rows shows the **empty** state (with
  its create-CTA), distinct from loading. The Neural node set + edges fan-out (B5) operate over the filtered `items`. A
  **stale/deleted tag filter** (the active `tag` was soft-deleted elsewhere, or matches no live page) resolves to zero
  rows → the same filtered-empty state (no error); a soft-deleted tag simply drops out of `listTags()` (BR-B6-6) so the
  filter control no longer offers it. `[FACT: notes-collection.tsx:65,71-72 (state + nodeIds from items); b5-neural-graph-edges.md BR-B5-3 (edges keyed on the node set); components.md §VIII]`
- **BR-B6-4 · create-with-tags is row-first + fail-loud, mirroring B3/B4.** On New Note confirm: `createPage` →
  `await tagEntity(tagId,'page',pageId)` for each chosen tag (a new-typed tag → `await createTag(name)` FIRST) → then
  navigate. A tag-write rejection surfaces a Toast ("Couldn't add tag") and does **not** silently drop the tag; the note
  itself is already created (create precedes tagging — a partial-tag failure leaves a real note, re-taggable in the
  rail). `[FACT: b3-note-link-picker.md BR-B3-5 (row-first fail-loud); use-note.ts:62,138 (onError Toast); IR-13 (per-entity eventual consistency — a partial failure is re-drivable)]`
- **BR-B6-5 · The tag picker mirrors B3: search existing (`listTags`) + explicit create-on-miss (`createTag`), never
  silent — and B6 OWNS the name guard (AR-6 does not).** Candidates are `listTags()` results filtered by the typed text
  (case-insensitive substring, empty→all — the B3 `resolveWikiLink` match shape); a no-**exact**-match offers an
  explicit **"+ Create <name>"** row (suppressed when the trimmed query exactly equals an existing candidate — the B3
  precedent, which also prevents duplicate-name creation). No auto-create on blur. ⚠ **AR-6 `createTag` is a bare
  `tagRepo.create` — it does NOT validate the name and does NOT dedup by name** (`service.ts:108-116`; `CreateTagInput.
  name` is a plain `string`), so B6 **trims + rejects an empty/blank name** before calling `createTag`. Empty tag list
  (`listTags() → []`) → the picker shows only the "+ Create" row (or a "No tags yet" hint when the query is empty).
  `[FACT: b3-note-link-picker.md (search+create-on-miss + exact-match suppression); services/notes/service.ts:156-161 (resolveWikiLink substring match to mirror); foundation/spaces/service.ts:108-116 (createTag = bare create, no validate/dedup); spaces/types.ts:20-21 (CreateTagInput.name plain string)]`
- **BR-B6-6 · `listTags` returns LIVE tag definitions only; `createTag` delegates to AR-6.** `listTags` reads the
  `tags` table with the `isNull(deleted_at)` discipline (NP-9 / IR-6, verbatim-read); `createTag(name)` calls
  `deps.spaces.createTag({ name: name.trim() })` (color/icon/nesting default null — MOD-spaces authors those). Both,
  plus the `listPages({tag})` branch (BR-B6-1), are `@vida/core` additions gated as a §XXVIII deviation (D-6),
  category-identical to A5. `[FACT: current-spec.md:28 (NP-9 every read appends isNull(deleted_at)); foundation/spaces/service.ts:40,108; seam-contract.md:25-26 (A5 read/delegate split)]`
- **BR-B6-7 · icon/cover editing reuses `useUpdateNote` — invalidate the list only, never re-seed the editor.** The rail
  writes `icon`/`cover_image` through the same B2 patch mutation (invalidate `['pages','list']`, never `noteKey(id)`,
  so the mounted editor is not re-seeded — BR-B2-4). `[FACT: use-note.ts:34-40; note-detail.tsx (BR-B2-4 no-re-seed); updatePageSchema (icon/cover_image updatable)]`
- **BR-B6-8 · A note's tag chips read via `getTagsForEntity` ⊕ `listTags` (id→name), removable via `untagEntity`.** The
  rail resolves the note's `entity_tags` (`getTagsForEntity('page', id)` → tag_ids) to display names/colors (join against
  `listTags`), each chip removable (`untagEntity`, soft-delete NP-9); the tag-reads use a `['tags',…]` / `['links',…]`
  key so a tag write refreshes them live (parity with B4/B5 EC-10). `[FACT: services/notes/service.ts:204,220; spaces.ts:39-41 (tag name/color); use-note.ts:116-127 (the invalidation pattern)]`
- **BR-B6-9 · No new `@vida/ui` primitive, no new token; tag chips + filter controls compose UI-1/UI-2.** The filter bar
  = UI-1 Button/Menu/Popover + Input; a tag chip = a small Card/Button with the `sm` radius (design §V chips) + the tag
  color as a border/dot (color is data, not a token). No injected CSS beyond shipped primitives; motion only from them.
  `[FACT: components.md §VI (compose not configure); design.md §V (sm radius = chips); §1 OUT (no @vida/ui edit)]`
- **BR-B6-10 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** Filter controls: default/
  hover/focus(-visible ring)/active/selected/disabled; combobox ARIA on the tag picker (role=combobox/listbox/option,
  `aria-expanded`/`aria-activedescendant` — the B3 pattern); filter toggles announce pressed state; 44×44 touch targets;
  the filter bar reflows at 375/768/1440 (stacks under the header on mobile); contrast AA; a filtered-empty state
  announced via `role=status`. `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; b3-note-link-picker.md (combobox ARIA)]`

## 3. Contract (the B6 surface)
```ts
// ── @vida/core — three minimal §XXVIII deviations on the frozen NotesService seam (D-6) ────────────────
// services/notes/service.ts — (1) IMPLEMENT the listPages({tag}) branch (replace the throw at :152-154):
//   JOIN entity_tags on (entity_type='page' AND tag_id=filter.tag), AND-composed with favorite/archived,
//   isNull(deleted_at) on BOTH pages and entity_tags. Replaces the throwing test (notes-service.test.ts:192).
// services/notes/types.ts — extend the interface (all category-identical to the A5 tag surface):
interface NotesService {
  // ... A1–A8 unchanged; listPages signature unchanged — its {tag} branch now WORKS ...
  listTags(): Promise<TagRow[]>                    // NEW net-new READ — live tag definitions (name/color/icon), NP-9
  createTag(name: string): Promise<TagRow>         // NEW write facade → AR-6 deps.spaces.createTag({name:name.trim()}); B6 guards empty
}
// services/notes/service.ts — add a read-only `tags` repo (mirror the A5 entity_tags read repo) + the two methods.
// @vida/core index.ts — re-export TagRow (like B4 added EntityLinkRow/EntityTagRow) for the ②-facing seam.

// ── apps/web — filter state (extend the ephemeral view store) ─────────────────────────────────────────
// stores/notes-view-store.ts — add filter state beside `view` (ephemeral UI state, BR-B6-2):
interface NotesFilter { favorite?: boolean; archived?: boolean; tag?: string }
interface NotesViewState {
  view: NotesView; setView(v: NotesView): void
  filter: NotesFilter; setFilter(f: NotesFilter): void        // NEW
}

// ── apps/web — the list hook takes the filter (extend B1) ─────────────────────────────────────────────
// use-notes-list.ts:
export function useNotesList(filter: NotesFilter) // queryKey ['pages','list', filter]; queryFn listPages(filter) + recency sort
// (the ['pages','list'] PREFIX still covers the filtered key — link/note writes invalidate as before)

// ── apps/web — tag hooks (mirror B4's fail-loud write hooks + a listTags read) ────────────────────────
// use-note.ts (or a new use-tags.ts):
export function useTags(): UseQueryResult<TagRow[]>            // listTags(), key ['tags','list']
export function useNoteTags(id: string)                        // getTagsForEntity('page', id), key ['tags','entity', id]
export function useTagNote(id: string)                         // tagEntity(tagId,'page',id) — row-first, onError Toast, invalidate ['tags'] + list
export function useUntagNote(id: string)                       // untagEntity(...) — soft-delete, invalidate ['tags'] + list
export function useCreateTag()                                 // createTag(name) — onError Toast, invalidate ['tags','list']

// ── apps/web — create-with-tags (extend New Note) + the tag picker + the filter bar + icon/cover rail ─
// notes-collection.tsx — a <NotesFilterBar> above the Tabs; New Note → a create-with-tags flow (picker → createPage → tagEntity[])
// note-detail.tsx      — the rail gains icon/cover inputs (useUpdateNote) + the note's tag chips (add/remove via the picker)
// a <TagPicker> composed from UI-1 Popover/Input/Menu — search useTags() candidates + "+ Create <name>" (mirrors wiki-link-menu.tsx)
```
- `TagRow` = `{ id; name; color|null; icon|null; parent_tag_id|null; description|null; ...sync }` — **already the
  `$inferSelect` of the AR-6 `tags` table**; B6 re-exports the TYPE only (no schema/table touch). `[FACT: spaces.ts:34-47,131]`
- The **pure** tag-candidate filter (`filterTags(tags, query)` — case-insensitive substring, empty→all) is a **named
  helper, unit-tested first**, mirroring `resolveWikiLink`'s match. `[FACT: services/notes/service.ts:156-161; BR-B6-5]`
- The **pure** `NotesFilter → listPages` mapping is the identity (same field names) — no adapter; the query key carries
  the filter object. `[FACT: services/notes/service.ts:149; seam-contract.md:20]`

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:35)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-9 MUST (filters):** the collection filter bar filters live — **Favorites** shows only favorited notes;
   **Archived** shows only archived notes; picking a **tag** shows only notes carrying it (proving the newly-implemented
   `listPages({tag})` branch works — no throw). Each verified vs the DB (`listPages` result). Combining favorite + tag
   narrows (AND). Clearing all restores the default unfiltered set (`{}`, B1's — no invented default-hide, BR-B6-2).
1b. **① tag branch (D-6 touch 1):** `pnpm --filter @vida/core test` — the replaced tag-filter test passes (no longer
   asserts the `/A5/` throw); `listPages({tag})` returns exactly the pages carrying that live tag.
2. **EC-9 MUST (filtered-empty):** a filter that matches nothing renders the **empty** terminal state (distinct from
   loading), with its create-CTA; switching views under a filter keeps the filtered set across List/Gallery/Calendar/
   Neural (Neural nodes+edges reflect the filtered node set).
3. **EC-8 MUST (create-with-tags):** New Note → the tag picker opens → typing filters existing tags (`listTags`) →
   selecting one or more + confirm creates a note **already carrying those tags** (verified via the detail rail's chips
   and `getTagsForEntity`); **create-on-miss** — typing a brand-new name + "+ Create" makes a real tag (`createTag`) and
   applies it; the picker is a combobox (ARIA verified).
4. **BR-B6-4 (fail-loud):** with `tagEntity` forced to reject, the New Note flow surfaces a "Couldn't add tag" Toast and
   the note still exists (create precedes tagging) — no silent tag drop.
5. **Rail metadata (slice-map.md:35):** in the note detail, editing **icon** and **cover** persists across reload
   (`updatePage`); the note's **tag chips** show, a chip removes (`untagEntity`) and the picker adds — live, without
   re-seeding the mounted editor (BR-B6-7, no editor churn on tag/metadata writes).
6. **Live update (EC-10 parity):** applying/removing a tag updates the detail chips AND (if the tag filter is active) the
   collection, via the `['tags']`/`['links']`-namespace invalidation — inside the 30s staleTime window (BR-B6-8).
7. **All states × {light | dark} × {375 · 768 · 1440}:** filter bar (default/selected/disabled), tag picker (open/
   filtered/create-on-miss/empty-no-tags), rail metadata, filtered-empty; the bar reflows/stacks at 375. Screenshots as
   evidence.
8. **§XIV a11y sweep:** filter toggles announce pressed state; the tag picker is a keyboard-navigable combobox
   (role/expanded/activedescendant, Esc closes, focus returns); chips are removable by keyboard; 44×44 targets; contrast
   AA; a VoiceOver trace of filter → create-with-tags → apply.
9. **Gates:** `pnpm --filter @vida/web test` + `pnpm --filter @vida/core test` green · root `typecheck` 0 · `eslint` 0 ·
   `/component-audit` + `victor:quality-gate-components` + `-engineering` PASS.
10. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` + `current-business-rules.md` (the ② filter/tag/
    metadata surface + the two new ① tag methods `listTags`/`createTag`) at gate close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. **① deviation (D-6) — `@vida/core` first, its own Verification Gate mindset (THREE touches):**
   - **(1) Implement `listPages({tag})`** in `services/notes/service.ts` — replace the `throw` at :152-154 with a
     server-side read: JOIN `entity_tags` on `entity_type='page'` + `tag_id = filter.tag`, AND-composed with the existing
     favorite/archived predicates, `isNull(deleted_at)` on both pages and entity_tags. **REPLACE** the throwing assertion
     at `notes-service.test.ts:192` with a real tag-filter test (a tagged page is returned; an untagged one is not;
     tag+favorite AND-narrows). `[FACT: service.ts:152-159; notes-service.test.ts:184-192]`
   - **(2) `listTags()`** — add a **read-only `tags` repo** (mirror the A5 `entity_tags` read repo) + `listTags()` (live
     rows, `isNull(deleted_at)`). **(3) `createTag(name)`** — `deps.spaces.createTag({ name: name.trim() })` with a
     non-empty guard (throw/reject on blank — AR-6 doesn't validate). `services/notes/types.ts` — extend the interface.
     `@vida/core` `index.ts` — re-export `TagRow`. Tests: `listTags` (live-only) · `createTag` (delegates, trims,
     rejects blank) — extend `notes-service.test.ts`. Also correct the false `current-spec.md:24-25,67` "tag branch live
     since A5" claim. `pnpm --filter @vida/core test` green before touching apps/web.
2. **The pure helper** `filterTags(tags: TagRow[], query: string): TagRow[]` (case-insensitive substring, empty→all) —
   unit-test first (mirror `resolveWikiLink`).
3. `stores/notes-view-store.ts` — add `filter: NotesFilter` + `setFilter`.
4. `use-notes-list.ts` — `useNotesList(filter)` keys `['pages','list', filter]`, passes `filter` to `listPages`; keep the
   recency sort. (Verify the collection's Neural edges hook still keys off the filtered `items` — BR-B6-3.)
5. `use-note.ts` (or `use-tags.ts`) — `useTags`/`useNoteTags` reads + `useTagNote`/`useUntagNote`/`useCreateTag` writes
   (row-first, `onError` Toast, invalidate `['tags']` + `NOTES_LIST_KEY`, never `noteKey(id)`).
6. `<TagPicker>` (apps/web component, composes UI-1 Popover/Input/Menu) — search `useTags()` via `filterTags` + a
   "+ Create <name>" row (`useCreateTag`); the B3 combobox ARIA. Reused by both New Note and the rail.
7. `notes-collection.tsx` — `<NotesFilterBar>` (favorites toggle, archived toggle, tag `<TagPicker>` in filter mode)
   above the Tabs; New Note → open `<TagPicker>` in create mode → `createPage` → `tagEntity[]` → navigate.
8. `note-detail.tsx` — rail: icon/cover `<Input>`s (`useUpdateNote`) + the note's tag chips (`useNoteTags` → names via
   `useTags`, removable; add via `<TagPicker>`).
9. Tests: helper `filterTags`; the hooks (fail-loud, invalidation keys, lazy reads); the filter bar drives `listPages`
   with the store filter; create-with-tags calls `createPage` then `tagEntity`; the rail metadata/chip flows. TS types
   first → default → all states → dark → responsive.
10. `pnpm --filter @vida/web test` + `@vida/core` green · typecheck 0 · eslint 0 → `/component-audit` → `/critique` →
    the ░Visual Gate░.

## 6. Decisions — none open (all doc-fixed at this Doc Gate)
- **D-1 · Filter = the ① `listPages({favorite,archived,tag})`, one tag, server-side — doc-fixed (but the `{tag}` branch
  must be BUILT).** EC-9 names exactly these; the seam (`seam-contract.md:20,42`) freezes the single-`tag` param;
  multi-tag/predicate/saved filters are MOD-spaces views. ⚠ The `{tag}` branch is **not yet implemented** (`service.ts:152-154`
  throws) — B6 completes it server-side (D-6 touch 1); no client-side re-filter (BR-B6-1). Not a choice. `[FACT: envision.md:33; seam-contract.md:20,42; service.ts:152-154; slice-map.md:57-58]`
- **D-2 · Filter state = ephemeral Zustand beside `view`, keyed into the query — the shipped pattern.** The store's
  own doctrine (ephemeral UI state only; no persisted saved-view) + engineering §XVII place it there; the `['pages',
  'list', filter]` key is standard RQ. `[FACT: notes-view-store.ts:3-8; engineering.md §XVII]`
- **D-3 · create-with-tags mirrors B3's picker (search + create-on-miss), row-first fail-loud — the shipped precedent.**
  B3 established the combobox-with-create-on-miss; B4 established row-first fail-loud tag/link writes. B6's tag picker is
  the tag analog, not a new mechanism. `[FACT: b3-note-link-picker.md; use-note.ts:132-161]`
- **D-4 · The minimal tag surface (apply existing + create-plain-tag) is B6; the nestable color/icon tags-BROWSER is
  MOD-spaces — doc-fixed, the B1 precedent.** `m1.1-delivery-plan.md:232` + `intent-coverage.md:39` (F-1) home the tag
  management/browser UI to MOD-spaces ②; B6 ships the minimal picker MOD-spaces later supersedes, exactly as B1 shipped
  hard-coded renderers vs the MOD-spaces view-builder. Not a scope choice — a ratified split. `[FACT: m1.1-delivery-plan.md:232; intent-coverage.md:39,54; slice-map.md:35 ("shared → MOD-spaces picker")]`
- **D-5 · icon/cover editing extends B2's rail via `useUpdateNote` — doc-fixed metadata set.** `slice-map.md:35` +
  `m1.1-delivery-plan.md:194` list "favorite/archive/icon/cover" as Notes ② metadata; favorite/archive already ship in
  B2's rail, so B6 completes the set on the same surface/mutation. `[FACT: slice-map.md:35; m1.1-delivery-plan.md:194; notes.ts:51,53; use-note.ts:34-40]`
- **D-6 · THREE ① touches (`listPages({tag})` branch + `listTags` read + `createTag` facade) are a §XXVIII deviation,
  category-identical to A5 — grounded, not scope-creep. ✅ Doc-Gate-ADJUDICATED SOUND (independent critic, 2026-08-26).**
  The frozen seam (a) **throws** on `listPages({tag})` (`service.ts:152-154` — A1's fail-loud placeholder that A5 left
  unwired) and (b) exposes tag *writes* + per-entity junction reads but **no tag-definition enumeration** (the filter +
  create picker both need tag *names*, on `tags`, not `entity_tags`). A5 already established "Notes owns net-new tag
  READS (AR-6 has none)" + "write facade delegates to AR-6" — all three touches join that exact surface: touch 1
  completes a documented branch of an EXISTING method (a read Notes owns); `listTags` is the same category as A5's
  `getTagsForEntity`; `createTag` is a one-line delegate to AR-6's **already-built** method (+ a B6 non-empty guard,
  since AR-6 validates nothing). The rich tag CRUD/browser stays MOD-spaces (D-4). Same class as B1 activating the
  deferred `values` worker seam (the first consumer closes a documented gap). **The test — B6 adds READS Notes owns the
  category of + a DELEGATE to a built AR-6 write, and authors zero tag storage/CRUD/UI — holds** (independent Doc Gate
  verified `listTags` genuinely absent everywhere, AR-6 `createTag` real, A5 owns tag reads; the only correction was the
  COUNT: three touches, not two — the critic caught `listPages({tag})` unimplemented). `[FACT: service.ts:152-154 (tag throws); current-spec.md:32-33 (A5 tag surface); foundation/spaces/service.ts:40,108-116 (createTag built, no validate); b1-notes-collection.md (values-seam activation precedent); seam-contract.md:50 (a landed-signature change runs §XXVIII)]`
- **Doc-FIXED (NOT decisions) — grounded above, do not reopen:** no client-side re-filter (BR-B6-1) · no new @vida/ui
  primitive/token (BR-B6-9) · fail-loud row-first writes (BR-B6-4) · live tag-read discipline `isNull(deleted_at)`
  (BR-B6-6) · no editor re-seed on metadata/tag writes (BR-B6-7) · full state/a11y/responsive coverage (BR-B6-10).
  Multi-tag/sort/grouping/manual-order/pagination/saved-filters/Export/`/summary`/FTS5 are OUT (§1).
