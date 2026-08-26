<!-- current-spec — features/notes-and-pages · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: MOD-notes ① (2026-08-21).
     Refreshed: MOD-notes rebuild Track A close (A1-A8, 2026-08-25, branch mod-notes-rebuild). -->

# Current Spec — Notes & Pages (built slice)

**Status:** MOD-notes increment ① (LIF-131, M1.1) — the `@vida/core` Notes & Pages **service** over the DB-4 schema
— is COMPLETE (Track A, slices A1–A8, rebuilt ground-zero via the Entity Delivery Flow). The UI increment ② (Track B)
is **IN PROGRESS** — **slices B1 (`/notes` collection) + B2 (note detail) + B3 (`[[` note-link picker) are BUILT** (see
the ② sections below); B4–B7 (entity-link/backlink panels, neural edges, create-with-tags/filters, journal summary)
remain INTENDED. `[FACT: packages/core/src/services/notes/{service,types,index}.ts; apps/web/src/app/{notes,note}/*; packages/editor/src/extensions/wiki-link.ts]`

## What is BUILT (MOD-notes ① · A1–A8)

### Service (`packages/core/src/services/notes/{service,types,index}.ts`)
- **`createNotesService(db, deviceId, deps: { spaces, backlinks, registry })`** — factory returning the `NotesService`
  interface (object literal; **no `this`** — intra-service calls use closures so destructured consumption works, the
  ② shape). Four repositories (`pages` · `page_links` · `note_attachments` + a read-only `entity_tags`), all
  **empty-`[E]` pass-through** (M1.0, BR-DB6-3) + syncable soft-delete. `[FACT: service.ts:51-82]`

### Surface (returns Drizzle **Rows** — `PageRow`/`PageLinkRow`/`NoteAttachmentRow`/`EntityLinkRow`/`EntityTagRow`)
- **Pages (A1):** `createPage` · `getPage` · `updatePage` · `softDeletePage` · `getPageByJournalDate` ·
  `getPagesByType` · `getPagesForEntity` · **`listPages({favorite?, archived?, tag?})`** (the `tag` branch reads
  `entity_tags`, live since A5).
- **Page-links (A2, idempotent):** `createPageLink` (revive-or-noop, IR-11) · `removePageLink` · `getPageLinksFrom` ·
  `getPageLinksTo` (reverse read, ex-AR-8).
- **Wiki (A3):** `resolveWikiLink(text)` — title substring candidates (`like(title,'%q%')`, trim, empty→all live);
  mirrors the E4 slash-menu filter; never creates (IR-4).
- **Entity-note seed (A4):** `ensureEntityNote(pageType, entityType, entityId, seed)` — idempotent, seeds `content`
  with a deterministic minimal TipTap doc.
- **Tag reads (A5, net-new — AR-6 has no tag-read):** `getEntitiesByTag` · `getTagsForEntity`.
- **Facade → AR-6 (entity-link/tag WRITES):** `createEntityLink` · `removeEntityLink` · `tagEntity` · `untagEntity`
  (create/tag pre-validate `entity_type` vs the runtime registry, IR-2).
- **Facade → AR-8 (entity-link READS) + ①-merge:** `getEntityLinksFrom` (pure AR-8 delegate) · **`getBacklinks` =
  ①-merge `{ entityLinks (AR-8), pageLinks (A2) }`** (C4/G6 — supersedes the old-①'s entity-links-only).
- **Attachments (A6):** `addAttachment` (enforces the 25 MB per-attachment limit, ADR-003:185) · `getAttachments` ·
  `removeAttachment`. First BLOB surface.
- **Summary config (A7):** `getSummaryConfig(pageId)` · `setSummaryConfig(pageId, config)` — read/write the
  `pages.summary_config` text column (stringified JSON, IR-8); consumes `@vida/types JournalSummaryConfig`.
- **Cascade (A8):** `softDeletePage` triggers the service-driven cascade (page_links both sides · outgoing entity_links
  via AR-6 `removeLink` · entity_tags by `entity_id` via AR-6 `untagEntity` · note_attachments · page LAST).

### Validators (`packages/core/src/validators/note.ts`, EXTENDED)
- `createPageSchema` (journal_date required iff `type='journal'`, NP-2) · `updatePageSchema` (`.strict()`, updatable
  fields only) · `entityNoteSeedSchema` (A4 DTO) · `newAttachmentSchema` (A6 DTO) · `summaryConfigSchema` (A7, the
  Zod mirror of `@vida/types JournalSummaryConfig`). `EntityNoteSeed`/`NewAttachment` are single-homed `z.infer`
  DTOs in `services/notes/types.ts`; `JournalSummaryConfig` is CONSUMED from `@vida/types` (documented type exists).

### Typed errors (`services/notes/types.ts`)
- `JournalExistsError(journalDate)` (NP-2) · `UnregisteredEntityTypeError(entityType)` (NP-6/SP2) ·
  `AttachmentTooLargeError(sizeBytes)` (ADR-003:185, A6). Bespoke `extends Error` (AR-6/AR-8 convention;
  `data-flow.md §5`'s `ServiceError` divergence flagged for DB-11).

## Contract boundaries (what ① does NOT own — grounded)
- **`/summary` aggregation ENGINE → MOD-journals ①** (`summary(date)` registry + `buildDashboard`). ① keeps only
  `summary_config` storage (a `pages` column, A7). **The `buildJournalSummary` block-interface is a ② surface** (B7),
  consuming MOD-journals' engine — NOT an ① method `[FACT: contract.md:20; identity.md:19; interpretation.md §1.7]`.
- **entity-link/tag WRITES → AR-6**, entity-link READS → AR-8 (delegated, not re-implemented — ADR-018 §3.3).
- **Cascade is eventually-consistent, not transactional** (IR-13): per-entity soft-deletes, page-last, fail-loud,
  re-drivable; no cross-entity atomicity / no `*InTx` (not the platform model — no-FK, per-entity LWW blobs).
- **Deferred + HOMED:** `[E]` encryption → M3/DB-5 (pass-through now) · FTS5 → DB-8 · saved-view selection →
  MOD-spaces/ADR-007 · React-Query hooks → ② · wider `/summary` menu → M1.4.

## Tests (`services/notes/__tests__/notes-service.test.ts` — **57 cases**, green)
Per slice: A1 pages CRUD (6 types · NP-2 conflict · D-1 create-fresh · update `.strict()` · soft-delete · filters ·
listPages tag fail-loud pre-A5) · A2 page-links (idempotent revive/no-op · both-direction reads) · A3 resolveWikiLink
(substring · empty→all · never-creates) · A4 ensureEntityNote (idempotent · deterministic seed) · A5 tag reads +
facade (registry-validate · getBacklinks ①-merge) · A6 attachments (round-trip · thumbnail · 25 MB boundary · soft
delete) · A7 summary config (round-trip · null-unset/absent · missing-page reject · ZodError · empty-`{}` · corrupt→
fail-loud) · A8 cascade (full cascade + pre-state · self-link dedup · backlinks-into-P survive · idempotent re-drive ·
**fault-injection fail-loud** · unrelated untouched). `@vida/core` full suite **844/844**; typecheck 11/11; ESLint 0.

## What is BUILT (MOD-notes ② · B1 — the /notes collection surface)

### The collection surface (`apps/web/src/app/notes/`)
- **`/notes` route** (`index.tsx` → `notes-collection.tsx`) — replaces the AR-4 `<h2>` stub. Composes the four
  **hard-coded** `@vida/ui` renderers (`ListView`/`GalleryView`/`CalendarView`/`NeuralGraph`) behind an **ephemeral**
  `Tabs` view-switch (Zustand `notes-view-store.ts`; saved-view *selection* stays MOD-spaces/ADR-007). Neural =
  **nodes-only** (`edges={[]}`; page-link fan-out is B5). `[FACT: notes-collection.tsx]`
- **Four terminal states** derived app-side via UX-4 `deriveTerminalState` (isPending-first) + passed as the `state`
  prop; **empty carries a New Note create-CTA** (EC-4/EC-5). Row open + New Note → `/note/$id` (a B1 **enabling stub**
  route; B2 mounts the real editor). Default **recency order** (created_at desc) in `use-notes-list.ts`.
- **The first per-module data-plane wiring:** `notes-service.ts` `getNotesService()` (module-scope singleton;
  `createDrizzleProxy(getDbClient().driver)` + `getDeviceId()` + the AR-6/AR-8/registry deps) · `use-notes-list.ts`
  (`useNotesList`/`useCreateNote`, React-Query, invalidate-and-reread). `[FACT: apps/web/src/app/notes/*]`

### App-infra activated by B1 (the first module read+write consumer)
- **`db/device.ts`** — `ensureDeviceId()` (boot; UUIDv7 in `app_state`, N2) + sync `getDeviceId()`; **`App.tsx` boot**
  now `ensureDbReady → ensureDeviceId → initVault` (N1 before the first write). `[FACT: db/device.ts; App.tsx]`
- **The `values` worker op / RPC-proxy seam** — `createDrizzleProxy` issues `driver.values()` for every SELECT; the
  main-thread RPC-proxy driver's `values` was a **documented deferred seam** (worker.ts/`db/CLAUDE.md`: "lands with
  entity-CRUD, M1.1+"). B1 activated it (`worker.ts` op + `client.ts` proxy). Caught by the ░Visual Gate░ live (the
  collection first rendered "Couldn't load."); the app's prior main-thread read (`useSchemaVersion`) uses raw
  `driver.query`, so B1 is the first main-thread **Drizzle** consumer. `[FACT: apps/web/src/db/{worker,client}.ts]`

### Visual Gate (light, M1.0) — PASS
Real browser: empty (+create-CTA) + success × List/Gallery/Calendar/Neural × 375/768/1440; write path end-to-end
(New Note → `createPage`/`createInTx` round-trips through the worker); a11y (real `<h2>`, APG Tabs, role=status/list,
rows role=button, keyboard-reachable nodes); console clean. `@vida/web` **193 tests**; `@vida/core` **844**; tc 0; eslint 0.

## What is BUILT (MOD-notes ② · B2 — the note-detail surface)

### The detail surface (`apps/web/src/app/note/`)
- **`/note/$id` route** (`index.tsx` → `note-detail.tsx`) — fills the B1 enabling stub. Reads `$id` via
  `getRouteApi('/note/$id').useParams()` (decoupled-lazy pattern; does not pull the route config into the chunk).
  `[FACT: index.tsx; routes.tsx:70-74]`
- **Real `@vida/editor` mount (EC-6)** over `pages.content`, with local **autosave** (LF-2, no save button):
  `note-content-codec.ts` is the `content` (stringified TipTap JSON \| null) ⇄ `EditorDocument` codec; a corrupt
  value **degrades to a read-only editor + flag banner** (business-rules.md:29 — the ONE doc-mandated try/catch,
  distinct from the fail-loud config path). `apps/web` gained `@vida/editor` as a workspace dep. `[FACT: note-detail.tsx; note-content-codec.ts; editor.tsx:25-39]`
- **Single-writer autosave (BR-B2-4):** one debounced writer coalesces `{title, content}`; the content baseline is
  the **normalized** serialization so the editor's mount echo is a true no-op (no spurious save-per-open); the editor
  is seeded ONCE (`useMemo([])`) and never re-seeded from a refetch; writes invalidate `['pages','list']` only.
  `[FACT: note-detail.tsx usePageAutosave; use-note.ts]`
- **Editable title** over `pages.title` (header); **favorite/archive** discrete toggles (a SEPARATE mutation
  instance from autosave) reflecting from the returned `PageRow`, state conveyed by the menu-item **label** (not
  `aria-pressed` — invalid on `role=menuitem`). `[FACT: note-detail.tsx]`
- **Collapsible detail rail (EC-7)** — a `role="complementary"` panel (metadata: created/updated/word_count/
  favorite/archived) toggled from the header (`aria-expanded`/`aria-controls`); **responsive: side-by-side ≥768,
  stacked full-width <768** (a `flex:1` MainCol collapses to height-0 in a column under RNW `minHeight:0` — fixed to
  content-height/full-width when stacked; a live Visual-Gate catch). `[FACT: note-detail.tsx Root/MainCol/Rail]`
- **Confirm-gated soft-delete (EC-11)** — `@vida/ui Dialog dismissible={false}` → `softDeletePage` (A8 cascade) →
  navigate to `/notes`. `[FACT: note-detail.tsx; dialog.tsx:46-47]`
- **Read axis (BR-B2-2):** `deriveTerminalState` over `useNote` → loading / error (query reject) / not-found (null) /
  success; each rendered distinctly. `[FACT: note-detail.tsx; terminal-state.ts]`

### Visual Gate (light, M1.0) — PASS
Live browser: EC-6 editor mount + autosave persisted across reload; EC-7 rail toggle + narrow-stack; EC-11 confirm
delete → cascade → nav; favorite label-flip + rail reflect; success + not-found read states; × 1440/768/narrow; a11y
(dialog focus, landmarks, named textboxes, menu); console clean. `@vida/web` **214 tests** (28 note; 1 pre-existing
App.integration flake, green standalone — env CPU contention); typecheck 0; eslint 0 errors.
Specs: `docs/specs/features/mod-notes/ui-ux/{b2-note-detail,IMPLEMENTATION-PLAN-b2}.md`.

## What is BUILT (MOD-notes ② · B3 — the `[[` note-link picker)
The entity's reason-to-exist made real: *"how does a user link two notes?"* (EC-3, EC-2's `[[` half, EC-10). Spans two
planes — the **`@vida/editor`** picker mechanism + the **`apps/web`** service wiring. `[FACT: slice-map.md:32; b3-note-link-picker.md]`
- **`@vida/editor` (built fresh — a discontinued recovery-branch impl was reference only):** `extensions/wiki-link.ts`
  (`WikiLinkMark` storing `target_page_id` [NP-7], registered unconditionally so links render; `WikiLink` `@tiptap/
  suggestion` gated on an injected `wikiConfig`; `applyWikiSelection` = **row-first-then-mark, fail-loud** — reject → no
  mark, BR-B3-5) + `wiki-link-menu.tsx` (the combobox popup, `+ Create` row) + host combobox ARIA (`editorProps`, the
  single `role` writer) + the `.vida-wikilink` style. Editor stays `@vida/core`-free (injected config, BR-B3-2). See
  `packages/editor/src/CLAUDE.md`.
- **`apps/web` (note-detail wiring):** `useCreatePageLink`/`useCreateNoteFromLink` mutation hooks (mirror `useUpdateNote`
  — invalidate `NOTES_LIST_KEY`, `onError` Toast fail-loud; create-on-miss `onSuccess` toast) + `buildWikiConfig`
  (pure) → `query`=`resolveWikiLink` (candidates **as-is**, **no self-filter** — self-links are a valid handled case,
  BR-B3-7/D-4), `onCreate`=`createPage({type:'note'})`, `onSelect`=`createPageLink`. `[FACT: use-note.ts; note-detail.tsx buildWikiConfig]`
- **Behavior (doc-grounded):** `[[` → picker → `resolveWikiLink` candidates → select → **`createPageLink` (page_links,
  page↔page)** + insert the `wikiLink` mark; **create-on-miss** explicit ("+ Create") → stub `note` → then link; NP-5
  idempotent revive-or-noop; NP-7 resolve-by-id (survives rename); split from `/entity-link` (entity_links, B4).
### Visual Gate (light, M1.0) — PASS
Live browser: `[[` opens the picker at the caret; real-service candidates (incl. the current note — no self-filter);
create-on-miss → a REAL new note + link + styled indigo link; select-existing → the created note is searchable; NP-5
idempotent re-link (no error); NP-7 mark stores `target_page_id`; combobox ARIA (role/expanded/controls/activedescendant)
+ reverts on close; list invalidates live (the create-on-miss note joins the collection); × 375/1440; console clean.
`@vida/editor` **243 tests** (+19: wiki-link 10, wiki-link-menu 9) · `@vida/web` **217 tests** (+3 buildWikiConfig) ·
typecheck 0 · eslint 0 errors. Specs: `docs/specs/features/mod-notes/ui-ux/{b3-note-link-picker,IMPLEMENTATION-PLAN-b3}.md`.

## What is BUILT (MOD-notes ② · B4 — entity-link + backlink block bodies + link panels)
The note-detail's full link surface (EC-2 "Link + Links-out + Backlinks") — the **two Notes-native ADR-008 block bodies**
+ the **two rail panels**. Doc-fixed BUILT-in-B4 (`intent-coverage.md:68-69` GATE PASS · `block-registry.md:20-21`).
Spans two planes. `[FACT: b4-link-panels.md; intent-coverage.md:68-69]`
- **`@vida/editor` — the app-injected block-body seam** (`extensions/block-bodies.tsx`): `makeBlockBodyNode(type, render)`
  `.extend()`s the E5 `entityLink`/`backlink` nodes with a node-view (`BodyShell`) that **delegates to an app-injected
  `render` fn**, else the E5 `IntegrationBlockPlaceholder` (graceful — the other 10 blocks). `<VidaEditor>` gains a
  `blockBodies?: { entityLink?, backlink? }` prop; `editor.tsx` **swaps** (not appends) the two nodes. Editor stays
  `@vida/core`-free AND app-free (BR-1/BR-B4-4). `index.ts` exports `BlockBodies`/`BlockBodyRenderer`.
- **`apps/web` — the two bodies + the panels + the hooks:**
  - `entity-link-body.tsx` — the `entityLink` renderer: empty attrs → an inline page-picker (`resolveWikiLink`) → on
    select **`resolveEntityLink`** (row FIRST: `createEntityLink` awaited BEFORE the node commits; reject/cancel →
    `deleteNode`, BR-B4-6) → `updateAttributes({entityType:'page', entityId, label})`; filled → a navigable `<Link>`
    (title by id, NP-7) or a graceful "opens when its module ships" for an unshipped type (CB6).
  - `links-panels.tsx` — `<LinksOutPanel>` (`getPageLinksFrom` ⊕ `getEntityLinksFrom`, two DISTINCT groups, each row
    removable) + `<BacklinksPanel>` (`getBacklinks`, two distinct groups, **READ-ONLY** — BR-B4-7; the four
    `business-rules.md:32` terminal states). `BacklinksPanel` is ALSO the `/backlink` block body (shared, D-5).
  - `use-note.ts` (EXTENDED) — reads `useBacklinks`/`useLinksOut`/`useNoteTitle`; writes `useCreateEntityLink`/
    `useRemoveEntityLink`/`useRemovePageLink` (`onSuccess` invalidate `['links','back'/'out',id]` + `NOTES_LIST_KEY`,
    never `noteKey(id)`; `onError` Toast). `note-detail.tsx` renders the panels in the rail + injects `blockBodies`.
- **`@vida/core` barrel** — `EntityLinkRow`/`EntityTagRow` type re-exports added (the ②-facing Notes seam, seam-contract.md:12).
- **`entity_type='page'`** for a page target (matches the `getBacklinks('page', id)` key). `[[`/`page_links` and
  `/entity-link`/`entity_links` stay structurally + visually DISTINCT (BR-B4-1); `getBacklinks` merges them only at read.

### Visual Gate (light, M1.0) — PASS
Live browser (chrome-devtools): the rail Links-out + Backlinks (two distinct groups) · `/entity-link` insert → picker
(autoFocus + keyboard captured inside the atom node-view) → select page → an `entity_links` row **DISTINCT** from the
`[[` page_link (appears in the Entity links group, not Page links) → committed inline `🔗` reference · `/backlink` block
renders the backlinks panel inline (real body, not placeholder) · Backlinks populated (merged, read-only — no remove) ·
remove an entity-link → the Entity links group empties while the page-link stays · cross-note live update · title-by-id ·
375 stacked / 1440 side-by-side · console clean. `@vida/editor` **249 tests** (+6 block-bodies) · `@vida/web` **229 tests**
(+12: links-panels 6, entity-link-body 6) · typecheck 0 · eslint 0 errors. Shots `.claude/visual-gate/b4-*.png`.
Specs: `docs/specs/features/mod-notes/ui-ux/{b4-link-panels,IMPLEMENTATION-PLAN-b4}.md`.

## Status
2026-08-26 — **MOD-notes ① COMPLETE** (Track A, A1–A8) + **② B1+B2+B3+B4 BUILT** (Track B), branch `mod-notes-rebuild`. The ①→② seam is frozen
(`docs/features/notes-and-pages/delivery/seam-contract.md`). Specs: `docs/specs/features/mod-notes/service/`.
**Next: MOD-notes ② (Track B) — B5 (Neural note-graph edges).**
