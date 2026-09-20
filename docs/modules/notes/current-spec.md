# Notes & Pages — current-spec (as-built)

> §XXIX living doc. The `@vida/core` **Notes & Pages service** — the in-degree-14 connective HUB — over the
> finished DB-4 schema (`schema/notes.ts` + migration `033_notes.ts`). Every claim cites the code as-is.
> Authority (intent): `docs/specs/foundation/backend-intent/parts/notes-and-pages.md` (NOT-01…54).
> Delivery: `docs/features/notes-and-pages/delivery/*`. Slices ship incrementally (see Status).

## Status
- **S1 — Service shell + Pages core: BUILT** (2026-09-19, LIF-131). `services/notes/{types,service,index}.ts` + live-store tests (14). @vida/core 979 green.
- S2 (entity notes + attachments) · S3 (page-links + wiki) · S4 (delegation facade + registry): PENDING.

## Construction
`createNotesService(deps): NotesService` — factory-object, hoisted closures, no `this.` [FACT: services/notes/service.ts:35-38].
Deps `{db, deviceId, spaces, backlinks, registry}` [FACT: services/notes/types.ts:19-30]; S1 exercises only `registry`
(spaces/backlinks are injected for S4). `pageRepo = createRepository(db, pages, {deviceId, encryptedFields:[], softDelete:true})`
[FACT: service.ts:41-42].

## Contract (S1 — built)
Returns Drizzle `PageRow` (`typeof pages.$inferSelect`), not the `@vida/types` `Page` interface (DB-11 reconcile) [FACT: schema/notes.ts:110].
- `createPage(input: CreatePageInput): Promise<PageRow>` — validate → NP-2 clash check → registry-validate `entity_type` → create [FACT: service.ts:53-74].
- `getPage(id): Promise<PageRow|null>` · `updatePage(id, patch: UpdatePageInput): Promise<PageRow>` · `softDeletePage(id): Promise<void>` [FACT: service.ts:76-86].
- `getPageByJournalDate(date): Promise<PageRow|null>` · `getPagesByType(type): Promise<PageRow[]>` · `getPagesForEntity(entityType, entityId): Promise<PageRow[]>` · `listPages({favorite?,archived?}): Promise<PageRow[]>` [FACT: service.ts:48-52,88-107].
- Errors: `JournalExistsError(journalDate)`, `UnregisteredEntityTypeError(entityType)` — bespoke `extends Error`, stable `.name` [FACT: types.ts:49-64]. `ServiceError` reconcile → DB-11.
- Input types: `CreatePageInput`/`UpdatePageInput` = `z.infer` of `validators/note.ts` [FACT: types.ts:33-36].

## Composition seams (delegation topology — built at S2–S4)
- entity-link/tag **WRITES** → AR-6 `SpacesService` (`deps.spaces`) — S4.
- entity-link **READS** → AR-8 `BacklinkResolver` (`deps.backlinks`) — S4.
- `entity_type` validation → `deps.registry.isRegistered` (open taggable-type registry) — S1 (create) + S4 (links).
- `page_links` (S3) + `note_attachments` + entity-note seed (S2) — owned locally.

## Deferred / homed elsewhere (not in this service)
`/summary` aggregation engine → journals · wider `/summary` menu → M1.4 · pomodoro lens → Sessions realm ·
Views selection primitive + neural data-prep → design-pass/AR-8 · FTS5 → DB-8 · templates apply → ADR-009 ·
`[E]` field encryption wiring → M3/DB-5 (M1.0 pass-through) · hard-delete cascade → Part 2 ·
`word_count` derivation → editor/FTS (① stores the caller-supplied value, default 0). [FACT: notes-and-pages.md §4a]
