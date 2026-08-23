<!-- current-spec — features/notes-and-pages · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: MOD-notes ① (2026-08-21). -->

# Current Spec — Notes & Pages (built slice)

**Status:** MOD-notes increment ① (LIF-131, M1.1) shipped the `@vida/core` Notes & Pages **service** over the
DB-4 schema. Increment **②a (the app data plane)** wires it into React; **②b (the `/notes` collection surface)** is the
rendered browse surface; **②c (the note editor + autosave + `[[` picker)** is now built — the authoring surface. The
remaining ② units (②d panels · ②e search) remain INTENDED. `[FACT: this branch — packages/core/src/services/notes/, apps/web/src/{db,services,app/notes,note-detail.tsx}, packages/editor/src/extensions/wiki-link.ts]`

## What is BUILT (MOD-notes ① · add-backend-component)

### Service (`packages/core/src/services/notes/{service,types,index}.ts`)
- **`createNotesService(db, deviceId, deps: { spaces, backlinks, registry })`** — a factory returning the
  `NotesService` interface (object literal; no `this` — intra-service calls use closure functions so destructured
  consumption works). Four repositories (`pages`/`page_links`/`note_attachments` + a read-only `entity_tags`),
  all **empty-`[E]` pass-through** (M1.0, BR-DB6-3) + syncable soft-delete.

### Surface (returns Drizzle **Rows** — `PageRow`/`PageLinkRow`/`NoteAttachmentRow`/`EntityLinkRow`/`EntityTagRow`)
- **Pages:** `createPage` · `getPage` · `updatePage` · `softDeletePage` · `getPageByJournalDate` ·
  `getPagesByType` · `getPagesForEntity` · `listPages({favorite?,archived?})`
- **Page-links (idempotent):** `createPageLink` · `removePageLink` · `getPageLinksFrom` · `getPageLinksTo`
- **Wiki + seed:** `resolveWikiLink(text)` (title LIKE candidates) · `ensureEntityNote(pageType, entityType, entityId, seed)`
- **Attachments:** `addAttachment` · `getAttachments` · `removeAttachment`
- **Facade → AR-6 `SpacesService` (entity-link WRITES):** `createEntityLink` · `removeEntityLink`
- **Facade → AR-8 `BacklinkResolver` (entity-link READS):** `getBacklinks` · `getEntityLinksFrom`
- **`entity_tags` READS** (AR-6 owns writes): `getTagsForEntity` · `getEntitiesByTag`

### Validators (`packages/core/src/validators/note.ts`, EXTENDED)
- `createPageSchema` (journal_date required iff `type='journal'`, NP-2) · `updatePageSchema` (`.strict()`,
  whitelist = updatable fields only; `type`/`journal_date`/`entity_*`/`deleted_at` excluded). `UpdatePageInput`
  type is narrowed to match the `.strict()` whitelist (type ≡ validator).

### Typed errors (`services/notes/types.ts`)
- `JournalExistsError(journalDate)` (NP-2) · `UnregisteredEntityTypeError(entityType)` (NP-6/SP2). Bespoke
  `extends Error` (AR-6/AR-8 convention; `data-flow.md §5`'s `ServiceError` divergence flagged for DB-11).

## What is BUILT (MOD-notes ②a · the app data plane — add-frontend-component)
The `apps/web` wiring that lets React read/write pages through the ① service against the local SQLite worker — NO HTTP.
- **Worker seam closed** (`db/worker.ts` + `db/client.ts`): the Drizzle-proxy read path `values` (positional arrays) is
  now a live worker op + client method; `exec`/`batch` stay the deferred seam (unused by the sqlite-proxy callback).
- **Main-thread `DrizzleDb`** (`db/drizzle.ts` `getDb()`): `createDrizzleProxy(getDbClient().driver)`, memoized, with
  `.transaction` wrapped by a **non-reentrant async mutex (DP-8)** — whole transactions serialize (each `begin…commit`
  runs to completion before the next), so concurrent writes can't interleave `BEGIN…BEGIN`. Reads bypass → concurrent.
- **Device id** (`db/device-id.ts` + `db/boot.ts`): `getOrCreateDeviceId` persists a UUIDv7 in the device-local
  `app_state` KV (mirrors `first-run-repo.ts`), resolved in `ensureDbReady()`; `getDeviceId()` is sync post-boot, throws
  before. Never synced (structural — `app_state` has no `_sync_*`).
- **Service accessor** (`services/notes-service.ts` `getNotesService()`): builds the ① dep graph (registry → spaces →
  backlinks → notes) over `getDb()` + `getDeviceId()`, memoized. Shared infra (MOD-journals reuses it, JR-1).
- **React-Query hooks** (`app/notes/hooks.ts`): `usePages`/`usePage`/`usePagesByType`/`useBacklinks` (each with a
  `deriveTerminalState` `state`) + `useCreatePage`/`useUpdatePage`/`useSoftDeletePage`/`useCreatePageLink`/
  `useRemovePageLink` (invalidate-and-reread, no optimistic — BR-RT-4; per-mutation invalidation matrix).
- **Tests:** 13 jsdom (device-id · DP-8 wire-order serialization · client `values` RPC · hooks read+invalidate) +
  a CI-only e2e `notes-data-plane.spec.ts` (values-seam positional read-back + reload-persist over the real worker,
  via the QA-1 `db` fixture on the durable `app_state` table). `@vida/web` 193 tests green; typecheck 0; ESLint 0; build ✓.

## What is BUILT (MOD-notes ②b · the `/notes` collection surface — add-frontend-component)
The rendered browse surface over `note`-type pages, composing the M1.0 UI-2 views over the ②a data plane.
- **Route** `apps/web/src/app/notes/index.tsx` (replaces the AR-4 stub): `usePagesByType('note')` → the multi-mode top
  view (List default · Gallery · Neural), terminal state from the hook (never re-derived). Per-page detail route
  `note/$id` (`app/note-detail.tsx`, placeholder — editor is ②c); `routes.tsx` wires both.
- **View switcher** (`view-switcher.tsx`): the `hasMultiModeTopView` selector over the ephemeral `activeNotesView`
  Zustand slice (`stores/notes-ui-store.ts`); renderers hard-coded, saved-view selection deferred (ADR-007).
- **`NoteCard`** (`note-card.tsx`): an interactive UI-1 Card → navigates to `note/$id`; the List/Gallery `renderItem`.
- **Neural** degrades to `NeuralGraph` empty (graph-prep deferred).
- **Creation = the command-bar action** (`commands.ts` → registered in `shell/command-bar.tsx`): a MOD-notes
  `CommandProvider` "New note" (⌘K) — createPage → invalidate (`notesKeys`, `keys.ts`) → navigate. The service is
  DYNAMIC-imported in the run (keeps the eager shell bundle light, BR-7).
- **Dark-capable** (token-only, zero hex); app is light-only M1.0 (no theme store) → no rendered dark pass.
- **Tests:** route per state · switcher · card navigate · store · the command run (create/invalidate/navigate/toast) ·
  the `@vida/core` `PageRow` barrel export (B1). typecheck 0 · ESLint 0.

## What is BUILT (MOD-notes ②c · the note editor + autosave + `[[` picker — add-frontend-component)
The authoring surface at `note/$id`, mounting the M1.0 `@vida/editor` `VidaEditor` (its FIRST `apps/web` consumer).
- **Editor mount + autosave** (`apps/web/src/app/note-detail.tsx` — replaces the ②b placeholder): `usePage(id)` →
  state switch (loading · **empty→"Note not found"** [a missing id is `empty`, not error — EM-9] · error · success);
  on success a `NoteEditorSurface` **keyed `key={id}`** (the route reuses one instance — EM-2) mounts `VidaEditor`
  seeded from `pages.content` (parsed guarded → empty doc on null/corrupt — EM-4). An **editable title** (`@vida/ui`
  `Input`, `aria-label`→`aria-labelledby` of the editor) persists via `useUpdatePage` on blur (EM-6). A save indicator
  (`role=status`) reflects Saved/Saving…/Save failed (EM-7).
- **Autosave hook** (`apps/web/src/app/notes/use-note-autosave.ts`): debounced (≈600 ms) `useUpdatePage({id,patch:{content}})`;
  **skip-once mount-echo flag** (NOT string-equality — TipTap normalizes the seed, EM-3); **flush on unmount/id-change**
  (no lost edit on fast navigate — EM-10); `mutate` via a ref so the cleanup doesn't fire mid-life.
- **The `[[` wiki-link picker** — a new `@vida/editor` surface (its home, per the `SlashCommand` precedent):
  - `packages/editor/src/extensions/wiki-link.ts` — the `wikiLink` **MARK** (inline, carries `targetPageId`; registered
    ALWAYS so existing links render — NP-7) + the `WikiLink` **Suggestion** extension (`char:'[['`,
    `allowedPrefixes:null`, async `items`+`AbortSignal`), GATED on an injected `wikiLink` config; `applyWikiSelection`
    writes the `page_links` row FIRST then applies the mark atomically (WL-2b), create-on-miss via a `{__create}`
    sentinel (WL-3).
  - `packages/editor/src/wiki-link-menu.tsx` — the combobox popup (candidate list + a "+ Create '<query>'" row +
    loading; roving keyboard, Esc). Host combobox ARIA merges via `wikiComboboxAttrs` in editor.tsx's editorProps.
  - `packages/editor/src/serializers/to-markdown.ts` — `case 'wikiLink' → [[label]]` (EMIT-ONLY; `from-markdown` has no
    `[[]]` rule → md→JSON reads it as text; PDF/DOCX degrade to text — WL-6).
  - `apps/web/src/app/note-detail.tsx` wires the injected config: `query`→`resolveWikiLink`, `onCreate`→`createPage`
    (+invalidate lists/type), `onSelect`→`createPageLink(currentId, targetId)` (+invalidate backlinks/pagelinks).
  - `@vida/editor` stays free of `@vida/core` (data injected — WL-4); `@vida/editor` v0.9.0.
- **Tests:** `packages/editor/src/extensions/wiki-link.test.ts` (mark/ARIA/`[[`-activate/WL-2b order/create-on-miss/
  emit-only) · `apps/web/src/app/note-detail.test.tsx` (state branches · title rename · label wiring) ·
  `apps/web/src/app/notes/use-note-autosave.test.ts` (skip-once · debounce · flush). `@vida/editor` 234 green ·
  `@vida/web` 218 green · typecheck 0 · build ✓. ⚠ real-browser Visual Gate + `/component-audit` owed — runs
  **locally in Brave** (chrome-devtools MCP; the vault + empty-doc fixes were live-verified there 2026-08-22),
  not blocked on any host/CI upgrade. ⚠ Re-running the jsdom Vitest suites locally needs **Node 22** (`.nvmrc`=22;
  only v20.20.2 installed → jsdom/undici load error). The green counts hold (prior run); `nvm install 22` to reproduce.

## Contract boundaries (what ① does NOT own — grounded)
- **`/summary` aggregation ENGINE → MOD-journals ①** (`summary(date)` registry + `buildDashboard`). ① keeps only
  `summary_config` storage (a `pages` column). The `buildJournalSummary` block-interface is a ② surface.
- **entity-link/tag WRITES → AR-6**, entity-link READS → AR-8 (delegated, not re-implemented — ADR-018 §3.3).
- **Deferred + HOMED:** `[E]` encryption → M3/DB-5 (pass-through now) · FTS5 → DB-8 · saved-view selection →
  design-pass · React-Query hooks → ② · wider `/summary` menu → M1.4.

## Tests (`services/notes/__tests__/notes-service.test.ts` — 16 cases, green)
Page CRUD (6 types), NP-2 conflict, destructure-safety, update contract, page-link idempotency + revive,
resolveWikiLink, ensureEntityNote idempotent+deterministic, NP-6 (page + delegated link), facade delegation,
entity_tags reads, attachments. `@vida/core` full suite green; typecheck 0; ESLint 0.

## What is BUILT (MOD-notes ② UI refinements — the notebook consumer, 2026-08-23)
From the recovery's Visual-Gate review (7 findings F1–F7); the editor changes (E1–E3) live in `@vida/editor`
(see `docs/editor/current-spec.md`). The `apps/web` Notes changes:
- **NoteCard containment (N1/F3):** fixed a `@vida/ui` **Card** defect — a variant literally named `padding`
  collided with the built-in style prop → 0 inset on EVERY card; renamed the variant `padding`→`pad`. `[FACT:
  packages/ui/src/components/card.tsx; memory tamagui-variant-name-collides-with-style-prop]`
- **On-page "New note" button (N2/F2):** header + empty-state buttons (`useCreatePage`→navigate), ADDITIVE to the
  ⌘K command. `[FACT: app/notes/index.tsx]`
- **Delete affordance (N3/F1):** a note-detail Delete → confirm `Dialog` → `useSoftDeletePage` (NP-9) → back to
  /notes. `[FACT: app/note-detail.tsx]`
- **Calendar view (N4):** the missed §9 4th view — `@vida/ui CalendarView` bucketing notes by `created_at` + month
  nav; `NotesView` union + switcher gained `calendar`. `[FACT: app/notes/index.tsx, view-switcher.tsx, stores/notes-ui-store.ts]`
- The note editor page now reads as a **Notion-like notebook** (E1 seamless page · E2 sticky toolbar above the title ·
  E3 slash-menu scroll-into-view) — `note-detail.tsx` passes the title via the editor's `header` slot.
- **Still owed (②d/②e — NEXT fresh session):** N5 Neural note-nodes · N6 backlink/entity panels · N7 page metadata
  (favorite/archive/icon/cover) · N8 FTS5 search UI. Then the consolidated Visual Gate + Victor review + §XXIX.

## Status
2026-08-23 — MOD-notes ① + ②a + ②b + ②c + **② UI refinements (E1–E3 · N1–N4)** IMPLEMENTED + **committed** on
`mod-notes-2a-data-plane` (WIP checkpoint). typecheck 0 (`@vida/editor`/`@vida/ui`/`@vida/web`); live-verified in
Brave. Spec: `docs/features/notes-and-pages/delivery/slice-map.md` (Rev 3). **Next (fresh session): N5–N8** →
consolidated real-browser Visual Gate (375/768/1440 + a11y + `/component-audit`) → Victor review → commit →
S6 `core-vault-init-on-db-open`. ⚠ Node 22 to re-run the jsdom suites locally (the E1–E3/N1 changes need test updates).
