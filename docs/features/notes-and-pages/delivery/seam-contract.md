# Seam Contract — `NotesService` (mod-notes-and-pages ①)

> The service API `fe-notes-and-pages` (②) consumes. Return types are Drizzle `$inferSelect` **Row**
> types (`PageRow`/`PageLinkRow`/`NoteAttachmentRow`/`EntityLinkRow`/`EntityTagRow`), NOT the `@vida/types`
> interfaces — a `$inferSelect` row is not assignable to its `SyncableEntity` interface (`_sync_status`:
> plain text vs union) [FACT: memory [[drizzle-row-not-assignable-to-vida-types-interface]]; journals/sessions
> services return Row types]. Interface reconcile = DB-11. Input types are the Zod-validated shapes from
> `validators/note.ts`. All validating methods are `async` (Promise rejection, never sync throw) [NOT-42].

## Construction
```ts
interface NotesServiceDeps {
  db: DrizzleDb
  deviceId: string
  spaces: SpacesService          // AR-6 — entity-link/tag WRITES (delegated)
  backlinks: BacklinkResolver    // AR-8 — entity-link READS (delegated)
  registry: TaggableTypeRegistry // AR-6/ADR-006 SP2 — entity_type validation
}
function createNotesService(deps: NotesServiceDeps): NotesService   // object literal, no `this.`
```

## Interface (grouped by slice)

```ts
interface NotesService {
  // ── S1: Pages core ──────────────────────────────────────────────
  createPage(input: CreatePageInput): Promise<PageRow>            // NOT-01 · throws JournalExistsError | UnregisteredEntityTypeError
  getPage(id: string): Promise<PageRow | null>                   // NOT-02
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow> // NOT-03 · .strict() whitelist; type/journal_date/entity_*/deleted_at excluded
  softDeletePage(id: string): Promise<void>                      // NOT-04 · repository softDelete → operation:'update'
  getPageByJournalDate(date: string): Promise<PageRow | null>    // NOT-05 · NP-2 lookup + pre-write clash check
  getPagesByType(type: PageType): Promise<PageRow[]>             // NOT-06
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]> // NOT-07 · polymorphic reverse-lookup
  listPages(filters?: { favorite?: boolean; archived?: boolean }): Promise<PageRow[]> // NOT-08 · summary_config via updatePage (NOT-32)

  // ── S2: Entity notes + attachments ──────────────────────────────
  ensureEntityNote(pageType: PageType, entityType: string, entityId: string, seed: EntityNoteSeed): Promise<PageRow> // NOT-11/12 · idempotent, deterministic ZK-1 seed
  addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow> // NOT-29
  getAttachments(pageId: string): Promise<NoteAttachmentRow[]>   // NOT-30
  removeAttachment(id: string): Promise<void>                   // NOT-31 · soft-delete

  // ── S3: Page-links + wiki resolution ────────────────────────────
  createPageLink(sourcePageId: string, targetPageId: string, context?: string): Promise<PageLinkRow> // NOT-14 · idempotent: live no-op / soft-deleted revive / absent create
  removePageLink(sourcePageId: string, targetPageId: string): Promise<void> // NOT-16
  getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>       // NOT-17 · appends isNull(deleted_at)
  getPageLinksTo(pageId: string): Promise<PageLinkRow[]>        // NOT-17 · via idx_page_links_target
  resolveWikiLink(text: string): Promise<PageRow[]>            // NOT-18 · title-LIKE candidates (+ isNull(deleted_at))
  // NOT-19 create-on-miss is an EXPLICIT CALLER COMPOSE (② picker calls createPage('note') then
  // createPageLink) — NOT a bundled service method. No createNoteAndLink here (would manufacture ①
  // surface the doc homes to the caller). [FACT: notes-and-pages.md:32 "explicit caller compose"]

  // ── S4: Delegation facade + registry ────────────────────────────
  createEntityLink(pageId: string, entityType: string, entityId: string, context?: string): Promise<EntityLinkRow> // NOT-22 · → AR-6 (registry-validated)
  removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void> // NOT-23 · → AR-6
  getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>  // NOT-25 · → AR-8
  getBacklinks(entityType: string, entityId: string): Promise<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }> // NOT-24 · entityLinks always via AR-8; pageLinks ONLY when entityType ∈ page/note/journal (= getPageLinksTo(entityId)), else []; merge shape is ② G6-tentative
  getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]> // NOT-26 · read (AR-6 owns writes)
  getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>      // NOT-27 · read
}
```

## Input types (from `validators/note.ts` + net-new)
```ts
type CreatePageInput = z.infer<typeof createPageSchema>   // FACT: validators/note.ts — includes NP-2 journal_date refine
type UpdatePageInput = z.infer<typeof updatePageSchema>   // FACT: validators/note.ts — .strict() whitelist; type ≡ validator [NOT-03]
interface EntityNoteSeed { title?: string; type?: string; status?: string; [k: string]: unknown } // NOT-12 — parent local fields; seed reads these purely (net-new; confirm at S2 plan)
interface NewAttachment { filename: string; mimeType: string; encryptedBlob: Uint8Array; thumbnailBlob?: Uint8Array; sizeBytes: number } // NOT-29 (net-new; confirm at S2 plan)
```

## Typed errors (bespoke `extends Error`, stable `.name`)
```ts
class JournalExistsError extends Error { constructor(public journalDate: string) {…} }       // NOT-10
class UnregisteredEntityTypeError extends Error { constructor(public entityType: string) {…} } // NOT-21
// DuplicateLinkError — only if a hard conflict must surface (NP-5); page_links default is idempotent no-op [NOT-14]
```
`ServiceError` divergence (data-flow.md §5) → DB-11 reconcile; follow the live bespoke-Error precedent now [NOT-44].

## Delegation topology (the hub's whole point)
- **entity-link/tag WRITES** → `deps.spaces` (AR-6 `SpacesService`) — never re-implemented here [NOT-22/23/28].
- **entity-link READS** → `deps.backlinks` (AR-8 `BacklinkResolver`) [NOT-24/25].
- **entity_type validation** → `deps.registry` (open taggable-type registry) [NOT-20].
- **`page_links` + `pages` + `note_attachments`** → owned locally (this service's repositories).
