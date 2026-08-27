<!-- Entity Delivery Flow · TRACK B · slice B6 · IMPLEMENTATION-PLAN (gate-2 = build-steps).
     Promotes from the Approval-1 spec `b6-metadata-filters-tags.md`. Every step carries a [FACT: path:line] anchor.
     B6 spans TWO planes + THREE §XXVIII ① touches (listPages{tag} implement · listTags read · createTag facade), all
     A5-category. Doc-Gate-adjudicated sound. This plan grounds the MECHANISM (how each touch is built) empirically. -->

# IMPLEMENTATION-PLAN — B6 (metadata + filters + create-with-tags)

## G2 refinements to the approved spec (surfaced, not silent — §XXVI/§XXVIII)
- **R1 · `listPages({tag})` is a TWO-QUERY COMPOSE, not a raw JOIN.** The service reads through the DB-6 generic
  `Repository`, whose `findWhere(where: SQL)` runs over a **single table** (`repository.ts:213,379`) — a `pages`⋈
  `entity_tags` JOIN is not expressible through it, and reaching past the repo to `db.select().innerJoin()` would break
  the service's repo-only discipline. So the tag branch composes the EXISTING reads: (1) read the tagged page-ids from
  `entity_tags` (`liveEntityTags(and(eq(tag_id, filter.tag), eq(entity_type,'page')))` → `entity_id`s), then (2)
  `live(inArray(pages.id, ids) AND favorite/archived)`. `inArray` is a standard `drizzle-orm` export (VERIFIED
  importable from the core pkg) — a first use in `@vida/core`. `listPages` becomes `async` (it already returns a
  Promise; the tag branch adds an `await`). Empty tag → `[]` (no ids → skip the page read). `[FACT: repository.ts:213,379 (findWhere single-table SQL); service.ts:75-76,201-202 (liveEntityTags + getEntitiesByTag = tag_id read); service.ts:155-159 (the favorite/archived predicate build to extend); drizzle-orm inArray VERIFIED]`
- **R2 · Tag hooks live in a NEW `apps/web/src/app/notes/use-tags.ts` (rule-of-three).** The tag reads/writes are used by
  THREE surfaces — the filter bar, the create dialog, and the note-detail rail — so a shared module is justified (not the
  co-locate-in-one-file call B5 made). `use-note.ts` stays note-detail-scoped; `use-tags.ts` holds `useTags`/`useNoteTags`
  /`useTagNote`/`useUntagNote`/`useCreateTag`. `[FACT: b6 spec §3; components.md §VI (rule-of-three); use-note.ts (note-scoped) + use-notes-list.ts (collection-scoped) precedent]`
- **R3 · TWO tag controls, not one over-configured component.** The **create/rail** picker (`<TagPicker>`) is multi-select
  apply + **create-on-miss** (mirrors B3's `wiki-link-menu`); the **filter** tag control is a plain single-select UI-1
  `Menu` over `useTags()` — **no create row** (you filter by an existing tag). Two small pieces beat one `mode`-flagged
  component (components.md §VI: composition over configuration). `[FACT: b6 spec BR-B6-5; components.md §VI; wiki-link-menu.tsx (the picker to mirror); menu.tsx (UI-1 Menu for the filter)]`
- **R4 · "New Note" opens a create Dialog (title + tags), replacing B1's one-click create.** EC-8 is "set tags **on
  create**", so New Note → a UI-1 `Dialog` (optional title `Input` + `<TagPicker>`) → **Create** → `createPage({type:
  'note', title})` → `await tagEntity` per chosen tag → navigate to `/note/$id`. A user wanting a blank note leaves both
  empty + hits Create. This supersedes B1's `handleCreate = create.mutate()` (and its test). `[FACT: envision.md:32 (set tags on create); b6 spec §1 create-with-tags; notes-collection.tsx:77-79 (B1 handleCreate to replace); dialog.tsx (UI-1 Dialog)]`
- **R5 · `useNotesList()` → `useNotesList(filter)` — signature change ripples to the SINGLE call site.**
  `notes-collection.tsx:58` (the ONLY caller — verified) becomes `useNotesList(filter)` (filter from the store). The query
  key `['pages','list']` → `['pages','list', filter]`; `NOTES_LIST_KEY` stays the invalidation **prefix** (still covers
  the filtered key). The existing `notes-collection.test.tsx:17` mock (`useNotesList: vi.fn()`) **ignores args → does NOT
  break** on the new signature; the real test requirement is the NEW `vi.mock('./use-tags')` once the collection imports
  tag hooks for the create-Dialog (gate-2 fold). `[FACT: notes-collection.tsx:58 (sole call site); use-notes-list.ts:18,28-31; notes-collection.test.tsx:17-21]`

## Empirical grounding (locked before build)
- **[VERIFIED] The ① touch surface + repo pattern.** `createNotesService` builds repos via `createRepository(db, table,
  {deviceId, encryptedFields:[], softDelete:true})` and reads via `live*`/`findWhere(and(pred, isNull(deleted_at))!)`
  (`service.ts:58-76`). B6 adds a **read-only `tags` repo** the same way + a `liveTags` helper. `listPages` currently
  THROWS on `{tag}` (`service.ts:152-154`). `[FACT: service.ts:58-76,149-159; repository.ts:187,213]`
- **[VERIFIED] `inArray` is available** (`drizzle-orm` export, confirmed from the core pkg context) — needed for the tag
  branch's id-set read; first use in `@vida/core`, imported beside `and, eq, isNull, like` (`service.ts:16`). `[FACT: drizzle-orm inArray (verified typeof function); service.ts:16 (import site)]`
- **[VERIFIED] AR-6 `createTag` shape + no validation.** `SpacesService.createTag(input: CreateTagInput): Promise<TagRow>`
  where `CreateTagInput = { name; color?; icon?; description?; parent_tag_id? }` (`spaces/types.ts:20-27`); the impl is a
  bare `tagRepo.create({name, color:null,...})` — **no name validate, no dedup** (`spaces/service.ts:108-116`). So
  `createTag(name)` = `deps.spaces.createTag({ name: name.trim() })` + a B6 non-empty guard. `[FACT: spaces/types.ts:20-27; foundation/spaces/service.ts:108-116; spaces.ts:131 (TagRow = tags.$inferSelect)]`
- **[VERIFIED] `TagRow` re-export point.** `@vida/core/index.ts:68` already re-exports `EntityLinkRow`/`EntityTagRow`
  from `./db/schema/foundation/spaces` — B6 adds `TagRow` to that exact line (the ②-facing seam). `[FACT: index.ts:66-68]`
- **[VERIFIED] The `entity_type='page'` tag convention.** `tagEntity(tagId,'page',pageId)` writes `entity_type='page'`,
  `entity_id=pageId` — the same key B4's `getBacklinks('page', id)` uses; so the tag branch reads `entity_type='page'`
  and create-with-tags writes `'page'`. `[FACT: b4-link-panels.md (entity_type='page'); service.ts:204-205 (getTagsForEntity(entityType,entityId)); use-note.ts:135 (createEntityLink 'page')]`
- **[VERIFIED] The UI primitives B6 composes are barrel-exported.** `Button`/`Input`/`Card`/`Menu`/`Dialog`/`Popover`/
  `toast` all from `@vida/ui` (`index.ts:20-45`) — no new `@vida/ui` primitive, no new token (BR-B6-9). `[FACT: packages/ui/src/index.ts:20-45]`
- **[VERIFIED] `updatePageSchema` accepts `icon`/`cover_image`.** Both are `text()` cols on `pages` (`notes.ts:51,53`) and
  updatable via the `.strict()` `updatePageSchema` (`validators/note.ts`); the B2 rail + `useUpdateNote` already patch
  `is_favorite`/`is_archived` — icon/cover reuse the same mutation (BR-B6-7, invalidate list only). `[FACT: notes.ts:51,53; validators/note.ts updatePageSchema (icon/cover_image); use-note.ts:34-40]`
- **[VERIFIED] The collection test mock is whole-module.** `notes-collection.test.tsx:17` `vi.mock('./use-notes-list', …)`
  — R5 updates it (`useNotesList` takes filter; `useNotesGraphEdges` already stubbed by B5) + a new `vi.mock('./use-tags')`.
  `[FACT: notes-collection.test.tsx:17-18]`

## Build steps (victor:execute-plan-code works these in order)

### Plane 1 — `@vida/core` FIRST (the 3 §XXVIII touches; green before apps/web)
1. **`services/notes/service.ts`** — (a) import `inArray` (`service.ts:16`) + `tags, type TagRow` from
   `../../db/schema/foundation/spaces` (beside the `entityTags` import, `service.ts:27`; the AR-6 service itself is
   `../../foundation/spaces/service` per `types.ts:13` — do NOT infer a `services/foundation/` dir, it doesn't exist). (b) Add the read-only tags repo
   + helper: `const tagRepo = createRepository(db, tags, {deviceId, encryptedFields:[], softDelete:true})` +
   `const liveTags = () => tagRepo.findWhere(isNull(tags.deleted_at))`. (c) **Implement `listPages` `{tag}`** — replace
   the `throw` (`:152-154`) with: `if (filter.tag !== undefined) { const tagged = await liveEntityTags(and(eq(entityTags.
   tag_id, filter.tag), eq(entityTags.entity_type, 'page'))!); const ids = tagged.map(t => t.entity_id); if (ids.length
   === 0) return []; conds.push(inArray(pages.id, ids)) }`; make `listPages` `async`. (d) Add methods to the returned
   object: `listTags: () => liveTags()`, `async createTag(name) { const n = name.trim(); if (!n) throw new Error('Tag
   name cannot be empty'); return deps.spaces.createTag({ name: n }) }`. `[FACT: service.ts:16,27,75-76,149-159,201-206; spaces/service.ts:108-116]`
2. **`services/notes/types.ts`** — import `type TagRow` from `../../db/schema/foundation/spaces` (beside `EntityTagRow`,
   `types.ts:17`); add to the `NotesService` interface (after the tag reads, `types.ts:71`): `listTags(): Promise<TagRow[]>`
   + `createTag(name: string): Promise<TagRow>`. `[FACT: types.ts:17,68-71]`
3. **`@vida/core/index.ts:68`** — add `TagRow` to the `export type { EntityLinkRow, EntityTagRow } from './db/schema/foundation/spaces'`
   line → `{ EntityLinkRow, EntityTagRow, TagRow }`. `[FACT: index.ts:66-68]`
4. **`services/notes/__tests__/notes-service.test.ts`** — **REPLACE** the throwing assertion (`:192`
   `expect(() => svc.listPages({tag:'x'})).toThrow(/A5/)`) with a real tag-filter test: seed a tag (`spaces.createTag`),
   tag two pages (`svc.tagEntity`), `listPages({tag})` returns exactly those; an untagged page is excluded;
   `listPages({tag, favorite:true})` AND-narrows. Add: `listTags` (returns live tags, excludes a soft-deleted one);
   `createTag` (delegates to AR-6, trims, rejects `''`/`'  '`). `[FACT: notes-service.test.ts:184-192,407-408 (A5 tag seeding harness — spaces exposed); §A5 test block precedent]`
5. **Correct `current-spec.md`** — the false "tag branch live since A5" line is already fixed (Doc Gate); at gate CLOSE
   (§XXIX) re-promote with `listPages{tag}` + `listTags`/`createTag` shipped. **Gate:** `pnpm --filter @vida/core test`
   green (the replaced test passes) before any apps/web edit. `[FACT: current-spec.md:24-25 (fixed); b6 spec §4 item 1b]`

### Plane 2 — `apps/web`
6. **`stores/notes-view-store.ts` (EXTEND)** — add `export interface NotesFilter { favorite?: boolean; archived?:
   boolean; tag?: string }`; extend the state with `filter: NotesFilter` (default `{}`) + `setFilter(f: NotesFilter)`.
   Ephemeral UI state, beside `view` (BR-B6-2). `[FACT: notes-view-store.ts:14-22]`
7. **`app/notes/use-notes-list.ts` (EXTEND)** — `useNotesList(filter: NotesFilter)`: key `['pages','list', filter]`,
   queryFn `getNotesService().listPages(filter)` then the existing recency sort. `NOTES_LIST_KEY = ['pages','list']`
   stays the invalidation prefix. (The `toGraphEdges`/`useNotesGraphEdges` from B5 are untouched — they key off the
   filtered `items`.) `[FACT: use-notes-list.ts:18,28-39; b6 spec R5]`
8. **`app/notes/use-tags.ts` (NEW)** — `import type { TagRow } from '@vida/core'`. Reads: `useTags()` → `listTags()`, key
   `['tags','list']`; `useNoteTags(id)` → `getTagsForEntity('page', id)`, key `['tags','entity', id]`. Writes (mirror B4's
   fail-loud hooks — row-first, `onError` Toast, `onSuccess` invalidate `['tags']` + `NOTES_LIST_KEY`, NEVER `noteKey`):
   `useTagNote(id)` → `tagEntity(tagId,'page',id)`; `useUntagNote(id)` → `untagEntity(tagId,'page',id)`; `useCreateTag()`
   → `createTag(name)` (invalidate `['tags','list']`). `[FACT: use-note.ts:116-161 (fail-loud + invalidate pattern); service.ts:204,216,220 (getTagsForEntity/tagEntity/untagEntity)]`
9. **`app/notes/tag-picker.tsx` (NEW)** — `<TagPicker value onChange>` multi-select: a UI-1 `Popover`/`Input` combobox
   over `useTags()` filtered by the typed text (a pure `filterTags(tags, q)` helper — case-insensitive substring,
   empty→all, exact-match suppresses "+ Create"); selecting toggles a tag id in `value`; **"+ Create <name>"** →
   `useCreateTag()` then add. Mirror `wiki-link-menu.tsx` ARIA (combobox/listbox/option, `aria-activedescendant`, Esc).
   Reused by the create Dialog + the rail. `[FACT: wiki-link-menu.tsx; popover.tsx/input.tsx (UI-1); b6 spec BR-B6-5/BR-B6-10]`
10. **`app/notes/notes-collection.tsx` (EXTEND)** — (a) read `filter`/`setFilter` from the store, pass `filter` to
    `useNotesList(filter)`. (b) Add a `<NotesFilterBar>` above the `Tabs`: a **Favorites** toggle Button
    (`favorite:true`), an **Archived** toggle Button (`archived:true`), and a tag filter UI-1 `Menu` over `useTags()`
    (single-select → `tag:<id>`; "Clear" resets). Toggles show pressed state (§XIV). (c) **New Note** → open a create
    `Dialog` (title `Input` + `<TagPicker>`) → `createPage({type:'note', title})` → `await useTagNote`-style writes per
    chosen tag → navigate `/note/$id`. `[FACT: notes-collection.tsx:57-79,100-114; menu.tsx/dialog.tsx; b6 spec §1]`
11. **`app/note/note-detail.tsx` (EXTEND — the B2 rail)** — add **icon** + **cover** `Input`s over `pages.icon`/
    `cover_image` via `useUpdateNote` (invalidate list only, no re-seed — BR-B6-7); add the note's **tag chips**
    (`useNoteTags(id)` ids → names via `useTags`, each a removable `Card`/`Button` chip → `useUntagNote`; an "add" opens
    `<TagPicker>` → `useTagNote`). `[FACT: note-detail.tsx (the rail + useUpdateNote); use-note.ts:34-40; b6 spec §1]`

## Tests (write per step; TS types → default → all states → dark → responsive)
- **① (`notes-service.test.ts`)** — the replaced tag-filter test (step 4) + `listTags` live-only + `createTag`
  delegate/trim/reject-blank. `pnpm --filter @vida/core test` green. `[FACT: b6 spec §4 item 1b]`
- **`filterTags`** (pure helper) — substring match, empty→all, exact-match flag. `[FACT: BR-B6-5]`
- **`use-tags.ts` hooks** — `useTags`/`useNoteTags` read shapes; `useTagNote`/`useUntagNote`/`useCreateTag` fail-loud
  (spy Toast on reject) + invalidation keys (`['tags']` + `NOTES_LIST_KEY`, never `noteKey`). Mock `getNotesService()`.
  `[FACT: b1 test precedent; use-note.ts:132-161]`
- **`useNotesList(filter)`** — passes the filter to `listPages`; key includes the filter. `[FACT: R5]`
- **`TagPicker`** — filters candidates; create-on-miss calls `useCreateTag`; combobox ARIA; keyboard (jsdom). `[FACT: BR-B6-10]`
- **Collection** — the filter bar drives `listPages` via the store filter; New Note create-Dialog → `createPage` then
  `tagEntity`. **⚠ FOLD (g2-1): update `notes-collection.test.tsx:17` mock** (`useNotesList` takes a filter arg;
  `useNotesGraphEdges` already stubbed) **+ add `vi.mock('./use-tags')`** or every collection test throws. `[FACT: notes-collection.test.tsx:17-18]`
- **note-detail rail** — icon/cover patch via `useUpdateNote`; tag chip add/remove; no editor re-seed on a tag/metadata
  write (BR-B6-7). Update `note-detail`'s existing tests for the new rail content. `[FACT: b6 spec §4 item 5]`

## Gate checks (before ░Visual Gate░)
- `pnpm --filter @vida/core test` green (the `@vida/core` touch is real → **the package builds/tests first**) ·
  `pnpm --filter @vida/web test` green (new + existing) · root `pnpm typecheck` 0 · `pnpm --filter @vida/web lint` 0 ·
  `pnpm --filter @vida/core lint` 0 · `/component-audit` on the touched files clean. `[FACT: b6 spec §4 item 9]`

## Risks / watch-list
- **The ① touch is real — treat Plane 1 as its own mini Verification Gate.** Unlike B5 (pure app), B6 edits the frozen
  Track-A service. Land + test Plane 1 fully (typed-error + tag-filter + delegate tests green) BEFORE apps/web, and keep
  the §XXVIII deviation visible (D-6). A partial ① (e.g. `listPages{tag}` but not `listTags`) leaves apps/web unbuildable.
  `[FACT: b6 spec D-6; slice-map.md:25 (Verification Gate = live smoke on the real DB)]`
- **`listPages({tag})` two-query vs a future JOIN.** The compose (id-set then `inArray`) is correct + repo-consistent; at
  M1.1 tag/note counts it is within budget (the same shape as B4/B5 fan-outs). A single-query JOIN is a later optimization
  IF profiling shows need — not now, and NOT a raw `db.select` reach-around in this slice. `[FACT: R1; repository.ts:213]`
- **`createTag` name dedup is AR-6's gap, guarded at the UI.** AR-6 mints a duplicate on an existing name; B6 suppresses
  "+ Create" when the trimmed query exactly matches a candidate (BR-B6-5, the B3 precedent) so the UI never asks AR-6 to
  dup. The service guard only rejects blank. A tag-name-uniqueness rule, if ever wanted, is **MOD-spaces/AR-6's** job, not
  B6's. `[FACT: BR-B6-5; spaces/service.ts:108-116]`
- **New Note behavior change (R4).** The create Dialog supersedes B1's one-click New Note; the B1 collection test's
  New-Note assertion is updated (not just extended). Watch that the empty-title+empty-tags path still creates a blank note
  (EC-4 parity). `[FACT: R4; notes-collection.test.tsx (New Note assertion)]`
- **Filtered collection feeds B5's graph.** `nodeIds` now derives from the FILTERED `items`; the Neural view shows the
  filtered node set + its edges — intended (BR-B6-3), no B5 change. A filter yielding <2 nodes simply shows fewer/no
  edges. `[FACT: b6 spec BR-B6-3; b5 IMPLEMENTATION-PLAN (nodeIds from items)]`
