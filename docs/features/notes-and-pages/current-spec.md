<!-- current-spec — features/notes-and-pages · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: MOD-notes ① (2026-08-21). -->

# Current Spec — Notes & Pages (built slice)

**Status:** MOD-notes increment ① (LIF-131, M1.1) shipped the `@vida/core` Notes & Pages **service** over the
DB-4 schema. Increment **②a (the app data plane)** is now built — the `apps/web` wiring that makes the ① service
reachable from React. The remaining ② rendered units (②b views · ②c editor + `[[` picker · ②d panels · ②e search)
remain INTENDED. `[FACT: this branch — packages/core/src/services/notes/, apps/web/src/{db,services,app/notes}]`

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

## Status
2026-08-21 — MOD-notes ① IMPLEMENTED (branch `ui-1-vida-ui-primitives`/successor). Spec:
`docs/specs/features/mod-notes/_index.md`. Next: MOD-notes ② (UI surface, add-frontend-component).
