<!-- service/operations.md — Track A · §5 lens 1. The operation surface = the backend's "screens":
     every method, signature, typed-error set. Cited to service.ts / types.ts. References ../contract.md for
     the Row shapes. Born 2026-08-22 (recovery — retroactive proper spec). -->

# Operations — NotesService surface

`createNotesService(db: DrizzleDb, deviceId: string, deps: { spaces, backlinks, registry }): NotesService`
— a **factory returning an object literal** (NOT a class); intra-service calls use closure functions, never
`this.`, so destructured consumption (`const { createPage } = svc`) works. `[FACT: service.ts:50-54,66-68]`

All read methods append `isNull(deleted_at)` (findWhere runs predicates verbatim). Return types are Drizzle
**Rows** — see `contract.md`. `[FACT: service.ts:14]`

## Pages (8)

| Method | Signature | Returns | Errors |
|--------|-----------|---------|--------|
| `createPage` | `(input: CreatePageInput)` | `Promise<PageRow>` | `JournalExistsError` (NP-2), `UnregisteredEntityTypeError` (NP-6), ZodError |
| `getPage` | `(id: string)` | `Promise<PageRow \| null>` | — |
| `updatePage` | `(id, patch: UpdatePageInput)` | `Promise<PageRow>` | ZodError (`.strict()` whitelist) |
| `softDeletePage` | `(id)` | `Promise<void>` | — |
| `getPageByJournalDate` | `(date: string)` | `Promise<PageRow \| null>` | — |
| `getPagesByType` | `(type: PageType)` | `Promise<PageRow[]>` | — |
| `getPagesForEntity` | `(entityType, entityId)` | `Promise<PageRow[]>` | — |
| `listPages` | `(filter?: {favorite?, archived?})` | `Promise<PageRow[]>` | — |

`[FACT: service.ts:76-141; types.ts CreatePageInput:19 / UpdatePageInput:23-37]`

## Page-links — idempotent junction (4)

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `createPageLink` | `(sourcePageId, targetPageId, context?)` | `Promise<PageLinkRow>` | NP-5: live→no-op · soft-deleted→revive · absent→create |
| `removePageLink` | `(sourcePageId, targetPageId)` | `Promise<void>` | soft-deletes the live row only |
| `getPageLinksFrom` | `(pageId)` | `Promise<PageLinkRow[]>` | outbound |
| `getPageLinksTo` | `(pageId)` | `Promise<PageLinkRow[]>` | inbound |

`[FACT: service.ts:144-187]`

## Wiki-resolve + entity-note seed (2)

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `resolveWikiLink` | `(text: string)` | `Promise<PageRow[]>` | title `LIKE %text%`; **plaintext M1.0 only** (IR-3 → client-side at M3) |
| `ensureEntityNote` | `(pageType, entityType, entityId, seed: EntityNoteSeed)` | `Promise<PageRow>` | NP-8 idempotent; seed = pure function of parent fields (no `Date.now`/random) |

`[FACT: service.ts:190-214; seedContent:41-48; types.ts EntityNoteSeed:41-46]`

## Attachments (3)

| Method | Signature | Returns |
|--------|-----------|---------|
| `addAttachment` | `(pageId, file: NewAttachment)` | `Promise<NoteAttachmentRow>` |
| `getAttachments` | `(pageId)` | `Promise<NoteAttachmentRow[]>` |
| `removeAttachment` | `(id)` | `Promise<void>` |

`encrypted_blob`/`thumbnail_blob` coerce `Uint8Array`→`Buffer`. `[FACT: service.ts:217-243; types.ts NewAttachment:49-55]`

## Facades — entity-link/tag (6, delegated)

| Method | Delegates to | Notes |
|--------|--------------|-------|
| `createEntityLink` | AR-6 `spaces.createLink` | `assertRegistered` FIRST (Notes-surface rejection before delegating) |
| `removeEntityLink` | AR-6 `spaces.removeLink` | — |
| `getBacklinks` | AR-8 `backlinks.getBacklinksTo` | **entity-links only** at M1.0 (G6 merge tentative → ②d, U-1) |
| `getEntityLinksFrom` | AR-8 `backlinks.getLinksFrom` | — |
| `getTagsForEntity` | `entity_tags` read-repo | AR-6 owns writes |
| `getEntitiesByTag` | `entity_tags` read-repo | AR-6 owns writes |

`[FACT: service.ts:246-279]`

## Typed errors

- `JournalExistsError(journalDate)` — NP-2. `UnregisteredEntityTypeError(entityType)` — NP-6/SP2. Both
  bespoke `extends Error` (AR-6/AR-8 convention; the `data-flow.md §5` `ServiceError` divergence is flagged for
  DB-11). `[FACT: types.ts:108-120; ../current-spec.md:35-37]`
