# Notes & Pages — current-spec (as-built)

> §XXIX living doc. The `@vida/core` **Notes & Pages service** — the in-degree-14 connective HUB — over the
> finished DB-4 schema (`schema/notes.ts` + migration `033_notes.ts`). Every claim cites the code as-is.
> Authority (intent): `docs/specs/foundation/backend-intent/parts/notes-and-pages.md` (NOT-01…54).
> Delivery: `docs/features/notes-and-pages/delivery/*`. Slices ship incrementally (see Status).

## Status
- **S1 — Service shell + Pages core: BUILT** (2026-09-19, LIF-131). `services/notes/{types,service,index}.ts` + live-store tests. @vida/core 979 green.
- **S2 — Entity notes + attachments: BUILT** (2026-09-19). `ensureEntityNote` + `seedContent` + attachments; `newAttachmentSchema` appended to validators/note.ts. @vida/core 985 green (+6).
- **S3 — Page-links + wiki resolution: BUILT** (2026-09-19). `createPageLink` (idempotent+revive) + `removePageLink` + `getPageLinksFrom`/`getPageLinksTo` + `resolveWikiLink`. @vida/core 990 green (+5).
- **S4 — Delegation facade + registry: BUILT** (2026-09-19). entity-link facade (→AR-6/AR-8) + entity-tag reads + `getBacklinks`. @vida/core 995 green (+5).
- **① BACKEND COMPLETE** (S1–S4, 2026-09-19). ② `fe-notes-and-pages` (UI) is a separate issue.

## Construction
`createNotesService(deps): NotesService` — factory-object, hoisted closures, no `this.` [FACT: services/notes/service.ts:35-38].
Deps `{db, deviceId, spaces, backlinks, registry}` [FACT: services/notes/types.ts:19-30]; S1 exercises only `registry`
(spaces/backlinks are injected for S4). `pageRepo = createRepository(db, pages, {deviceId, encryptedFields:[], softDelete:true})`
[FACT: service.ts:41-42].

## Contract (S1 — built)
Returns Drizzle `PageRow` (`typeof pages.$inferSelect`), not the `@vida/types` `Page` interface (DB-11 reconcile) [FACT: schema/notes.ts:110].
- `createPage(input: CreatePageInput): Promise<PageRow>` — validate → NP-2 clash check → registry-validate `entity_type` → create [FACT: service.ts:53-74].
- `getPage(id): Promise<PageRow|null>` · `updatePage(id, patch: UpdatePageInput): Promise<PageRow>` (metadata only — `content` is NOT in the `.strict()` whitelist) · `softDeletePage(id): Promise<void>` [FACT: service.ts:76-86].
- `writePageContent(id, content: EditorDocument): Promise<PageRow>` — the IR-7 editor-body write path (serializes to the `content` text column via the repo), SEPARATE from `updatePage`'s LWW metadata patch so M4 can re-home `content` to the CRDT merge without touching callers (added 2026-10-20, notes-entity-usability S2) [FACT: service.ts writePageContent; interpretation.md:159].
- `getPageByJournalDate(date): Promise<PageRow|null>` · `getPagesByType(type): Promise<PageRow[]>` · `getPagesForEntity(entityType, entityId): Promise<PageRow[]>` · `listPages({favorite?,archived?}): Promise<PageRow[]>` [FACT: service.ts:48-52,88-107].
- Errors: `JournalExistsError(journalDate)`, `UnregisteredEntityTypeError(entityType)` — bespoke `extends Error`, stable `.name` [FACT: types.ts:49-64]. `ServiceError` reconcile → DB-11.
- Input types: `CreatePageInput`/`UpdatePageInput` = `z.infer` of `validators/note.ts` [FACT: types.ts:33-36].

## Contract (S2 — built)
- `ensureEntityNote(pageType, entityType, entityId, seed: EntityNoteSeed): Promise<PageRow>` — NP-8 idempotent (find-then-create by `(pageType, entity_type, entity_id)` via `getPagesForEntity`); `content` = `seedContent(seed)`, a deterministic minimal `EditorDocument` JSON (fixed leading fields + sorted dynamic keys, no Date/random) [FACT: service.ts seedContent + ensureEntityNote].
- `addAttachment(pageId, file: NewAttachment): Promise<NoteAttachmentRow>` · `getAttachments(pageId): Promise<NoteAttachmentRow[]>` · `removeAttachment(id): Promise<void>` over `note_attachments` [FACT: schema/notes.ts:91-107; service.ts].
- `NewAttachment` is camelCase (`Uint8Array` blobs); the service maps to snake_case columns. **First blob consumer:** Drizzle types `blob('buffer')` as `Buffer` but the platform-neutral value is `Uint8Array` (libsodium at M3); a documented boundary cast bridges it — blob-type reconcile → DB-11/M3.
- `newAttachmentSchema` appended to `validators/note.ts` (no `entityNoteSeedSchema` — seed is caller-internal). `EntityNoteSeed`/`NewAttachment` are plain TS types.

## Contract (S3 — built)
- `createPageLink(source, target, context?): Promise<PageLinkRow>` — NP-5 idempotent: live → no-op · soft-deleted → **revive** · absent → create (full `UNIQUE(source,target)` mandates revive; mirror AR-6 `createLink`). The existing-check query intentionally includes soft-deleted rows. [FACT: service.ts createPageLink; migrations/033_notes.ts:91]
- `removePageLink(source, target): Promise<void>` — resolve-then-soft-delete (no-op if absent). `getPageLinksFrom`/`getPageLinksTo(pageId): Promise<PageLinkRow[]>` — direction reads, `isNull(deleted_at)`. [FACT: service.ts; NOT-16/17]
- `resolveWikiLink(text): Promise<PageRow[]>` — NP-7: non-deleted pages with `title` LIKE `%text%` (candidates; caller binds a concrete `target_page_id` → id-based, rename-safe). Excludes null-title + soft-deleted. M1.0 uses plain LIKE (no wildcard-escape; title→FTS5/DB-8 at M3). [FACT: service.ts resolveWikiLink; NOT-18/50]

## Contract (S4 — built)
- `createEntityLink(pageId, entityType, entityId, context?): Promise<EntityLinkRow>` — validates with the NOTES `UnregisteredEntityTypeError` (S1 assertRegistered) THEN delegates the WRITE to **AR-6** `spaces.createLink` (a pure passthrough would leak spaces' `UnknownEntityType`). `removeEntityLink` → `spaces.removeLink`. Notes never re-implements entity_links idempotence. [FACT: service.ts; NOT-20/22/23; spaces/service.ts:158-192]
- `getEntityLinksFrom(pageId): Promise<EntityLinkRow[]>` → **AR-8** `backlinks.getLinksFrom`. `getBacklinks(entityType, entityId): Promise<{pageLinks, entityLinks}>` → `entityLinks` via AR-8 `getBacklinksTo` + `pageLinks` via local `getPageLinksTo(entityId)` (unconditional; non-page id → `[]`); UNMERGED (G6 merge → ②). [FACT: service.ts; NOT-24/25]
- `getTagsForEntity(entityType, entityId)` / `getEntitiesByTag(tagId): Promise<EntityTagRow[]>` — read-only `entity_tags` repo (AR-6 owns writes; ② calls `spaces.tagEntity` directly). [FACT: service.ts; NOT-26/27/28]

## Delegation topology (as-built)
`NotesServiceDeps = {db, deviceId, spaces: SpacesService (AR-6), backlinks: BacklinkResolver (AR-8), registry: TaggableTypeRegistry}`. Locally-owned repos: `pages`, `page_links`, `note_attachments`, + a read-only `entity_tags` repo. Delegated: entity-link writes→AR-6, entity-link reads→AR-8, tag writes→AR-6.

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
