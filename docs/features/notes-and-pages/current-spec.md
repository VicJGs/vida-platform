<!-- current-spec — features/notes-and-pages · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: MOD-notes ① (2026-08-21).
     Refreshed: MOD-notes rebuild Track A close (A1-A8, 2026-08-25, branch mod-notes-rebuild). -->

# Current Spec — Notes & Pages (built slice)

**Status:** MOD-notes increment ① (LIF-131, M1.1) — the `@vida/core` Notes & Pages **service** over the DB-4 schema
— is COMPLETE (Track A, slices A1–A8, rebuilt ground-zero via the Entity Delivery Flow). The UI increment ② (Track B)
is **IN PROGRESS** — **slice B1 (the `/notes` collection surface) is BUILT** (see the ② section below); B2–B7 (real
editor mount, `[[` picker, panels, neural edges, create-with-tags/filters, journal summary) remain INTENDED.
`[FACT: packages/core/src/services/notes/{service,types,index}.ts; apps/web/src/app/notes/*]`

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

## Status
2026-08-25 — **MOD-notes ① COMPLETE** (Track A, A1–A8) + **② B1 BUILT** (Track B opened), branch `mod-notes-rebuild`. The ①→② seam is frozen
(`docs/features/notes-and-pages/delivery/seam-contract.md`). Specs: `docs/specs/features/mod-notes/service/`.
**Next: MOD-notes ② (Track B, UI surface, add-frontend-component) — B1–B7.**
