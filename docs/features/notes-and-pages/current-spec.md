<!-- current-spec — features/notes-and-pages · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: MOD-notes ① (2026-08-21).
     Refreshed: MOD-notes rebuild Track A close (A1-A8, 2026-08-25, branch mod-notes-rebuild). -->

# Current Spec — Notes & Pages (built slice)

**Status:** MOD-notes increment ① (LIF-131, M1.1) — the `@vida/core` Notes & Pages **service** over the DB-4 schema
— is COMPLETE (Track A, slices A1–A8, rebuilt ground-zero via the Entity Delivery Flow). The UI increment ② (② UI:
`/notes` routes/screens, TipTap mount, `[[` picker, view renderers, panels, journal summary block) remains INTENDED
(Track B, not yet built). `[FACT: packages/core/src/services/notes/{service,types,index}.ts]`

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

## Status
2026-08-25 — **MOD-notes ① COMPLETE** (Track A, A1–A8), branch `mod-notes-rebuild`. The ①→② seam is frozen
(`docs/features/notes-and-pages/delivery/seam-contract.md`). Specs: `docs/specs/features/mod-notes/service/`.
**Next: MOD-notes ② (Track B, UI surface, add-frontend-component) — B1–B7.**
