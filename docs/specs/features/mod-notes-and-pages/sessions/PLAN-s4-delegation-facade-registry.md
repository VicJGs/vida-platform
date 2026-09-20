# Spec: feature:mod-notes-and-pages — S4 Delegation facade + registry

Status: draft
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-notes-and-pages (S4 — final slice).
Gate: §XXVI gate-1 = THIS spec. Authority: notes-and-pages.md (NOT-20/22/23/24/25/26/27/28).
Slice contract: docs/features/notes-and-pages/delivery/{slice-map,seam-contract,interpretation}.md (S4).
Builds ON S1–S3. Wires the hub's two hard delegation boundaries (AR-6 writes / AR-8 reads).

## 1. Identity
S4 completes `NotesService`: the entity-link **facade** (delegating to AR-6/AR-8), entity-tag **reads**, and the
merged `getBacklinks`. Notes composes, never re-implements the substrate.
- **What it is:** `createEntityLink`/`removeEntityLink` (→ AR-6 `SpacesService`), `getEntityLinksFrom`/`getBacklinks`
  (→ AR-8 `BacklinkResolver`), `getTagsForEntity`/`getEntitiesByTag` (read-only `entity_tags` repo).
- **What it is NOT:** tag WRITES (NOT-28 — ② calls `spaces.tagEntity` directly; not a notes facade); the page+entity
  MERGE shape in `getBacklinks` (G6-tentative → ② design-pass); the `entity_links`/`entity_tags` tables (AR-6 owns).
- **Rows:** NOT-20(entity-link half) · 22 · 23 · 24(service half) · 25 · 26 · 27 · 28(delegated-out).

## 2. Business Rules
- **BR-S4-1 (createEntityLink validates with the NOTES error, then delegates):** `createEntityLink` calls the S1
  `assertRegistered(entityType)` FIRST → notes' `UnregisteredEntityTypeError` on an unregistered type (NOT-20/21), THEN
  delegates the WRITE to `deps.spaces.createLink(pageId, entityType, entityId, context ?? null)`. A pure passthrough is
  rejected: `spaces.createLink` throws spaces' own `UnknownEntityType` (spaces/types.ts:37), which would break the notes
  error contract. The notes check short-circuits first; spaces' internal re-check passes (shared registry). [FACT: notes-and-pages.md:34 (NOT-20); spaces/service.ts:159,77; spaces/types.ts:37]
- **BR-S4-2 (write delegation, no re-implementation):** `createEntityLink`/`removeEntityLink` delegate to AR-6 — notes
  does NOT re-implement `entity_links` idempotence/UNIQUE (AR-6 owns it). [FACT: notes-and-pages.md:36-37 (NOT-22/23); spaces/service.ts:158-192]
- **BR-S4-3 (read delegation):** `getEntityLinksFrom(pageId)` → `deps.backlinks.getLinksFrom(pageId)`. [FACT: notes-and-pages.md:39 (NOT-25); backlink-resolver.ts:23-30]
- **BR-S4-4 (getBacklinks returns BOTH lists):** `getBacklinks(entityType, entityId)` → `{ entityLinks: await deps.backlinks.getBacklinksTo(entityType, entityId), pageLinks: await getPageLinksTo(entityId) }`. Returns the two lists UNMERGED; the grouped/merged presentation is G6-tentative → ②. [FACT: notes-and-pages.md:38 (NOT-24)]
- **BR-S4-5 (entity_tags READS only):** `getTagsForEntity(entityType, entityId)` / `getEntitiesByTag(tagId)` read
  `entity_tags` via a read-only repo (mirror `backlink-resolver.ts:36-53`); every query appends `isNull(deleted_at)`.
  Tag WRITES are AR-6's (NOT-28) — NOT a notes method. [FACT: notes-and-pages.md:40-42 (NOT-26/27/28); backlink-resolver.ts:36-53]
- **BR-S4-6 (async · factory shape):** carry over S1–S3.

**DECISION D-S4-1 (entity_tags read path).** A read-only `entityTagRepo = createRepository(db, entityTags, {deviceId,
encryptedFields:[], softDelete:true})` in the notes service (mirror the AR-8 BacklinkResolver read pattern). `SpacesService`
exposes NO entity_tags READ (only `tagEntity`/`untagEntity` writes), so notes owns the read repo. [FACT: spaces/service.ts SpacesService iface has no tag-read; backlink-resolver.ts:36-53]

**DECISION D-S4-2 (getBacklinks page-link branch — REFINES gate-1 F2).** `getBacklinks` calls `getPageLinksTo(entityId)`
UNCONDITIONALLY (not gated on `entityType ∈ {page,note,journal}` as F2 proposed). Grounding: a non-page `entityId` yields
`[]` from `getPageLinksTo` anyway (no page-link has that `target_page_id`; UUIDv7 → no id collision), so the branch adds an
UNCERTAIN hardcoded page-type set for zero correctness gain. Simpler + correct. [INTERP: page_links keyed by page ids; F2 set
(NOT-53 page/note/journal) is uncertain] — supersedes F2's conditional; flagged for Approval 1.

## 3. Contract (appended to `NotesService`)
```ts
createEntityLink(pageId: string, entityType: string, entityId: string, context?: string): Promise<EntityLinkRow> // NOT-22
removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>                            // NOT-23
getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>                                                      // NOT-25
getBacklinks(entityType: string, entityId: string): Promise<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }> // NOT-24
getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>                                   // NOT-26
getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>                                                          // NOT-27
```
Types `EntityLinkRow`/`EntityTagRow` from `../../db/schema/foundation/spaces`. No net-new error (reuses `UnregisteredEntityTypeError`). No net-new validator.

## 4. Acceptance
- [ ] `NotesService` gains the 6 S4 methods; `EntityLinkRow`/`EntityTagRow`/`entityTags` imported; barrel updated (export `EntityLinkRow`/`EntityTagRow` if consumers need them — else internal).
- [ ] `createEntityLink`: unregistered `entity_type` → notes' `UnregisteredEntityTypeError` (BR-S4-1); registered → delegates to `spaces.createLink`, returns the AR-6 `EntityLinkRow`; idempotent behavior is AR-6's (not re-implemented).
- [ ] `removeEntityLink` → `spaces.removeLink`; `getEntityLinksFrom` → `backlinks.getLinksFrom`.
- [ ] `getBacklinks` returns `{pageLinks, entityLinks}`; for a non-page entity `pageLinks` is `[]`; for a page target both populate (BR-S4-4/D-S4-2).
- [ ] `getTagsForEntity`/`getEntitiesByTag` read `entity_tags` excluding soft-deleted (BR-S4-5).
- [ ] `tsc --noEmit` 0; ESLint 0; `@vida/core` suite green (≥990 + new).
- [ ] **Verification Gate (live store):** createEntityLink registered→row + unregistered→UnregisteredEntityTypeError; the link appears in `getEntityLinksFrom` + `getBacklinks.entityLinks`; getBacklinks merges page-links (page target) + entity-links; tag via `spaces.tagEntity` then `getTagsForEntity`/`getEntitiesByTag` read it; removeEntityLink drops it.

## 5. Implementation Prompt
1. `types.ts` — append the 6 method sigs to `NotesService`; import `EntityLinkRow`, `EntityTagRow` from `../../db/schema/foundation/spaces`.
2. `service.ts` — import `entityTags` + `EntityLinkRow`/`EntityTagRow`; add `entityTagRepo = createRepository(db, entityTags, {deviceId, encryptedFields:[], softDelete:true})` (D-S4-1). Destructure `spaces, backlinks` from deps (now used).
3. `createEntityLink`: `assertRegistered(entityType)` (BR-S4-1) then `return spaces.createLink(pageId, entityType, entityId, context ?? null)`. `removeEntityLink`: `return spaces.removeLink(pageId, entityType, entityId)`.
4. `getEntityLinksFrom(pageId)` → `backlinks.getLinksFrom(pageId)`. `getBacklinks(entityType, entityId)` → `{ entityLinks: await backlinks.getBacklinksTo(entityType, entityId), pageLinks: await service.getPageLinksTo(entityId) }` (BR-S4-4/D-S4-2).
5. `getTagsForEntity(entityType, entityId)` → `entityTagRepo.findWhere(allOf(eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId), isNull(entityTags.deleted_at)))`. `getEntitiesByTag(tagId)` → `entityTagRepo.findWhere(allOf(eq(entityTags.tag_id, tagId), isNull(entityTags.deleted_at)))`.
6. Barrel + tests + gates (§4).

## 6. Open UNKNOWNs / Decisions Needed
- D-S4-1 (entity_tags read repo) + D-S4-2 (getBacklinks unconditional page-link, refines F2): leans stated; confirm at Approval 1. None blocking.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | mod-notes-and-pages (S4) | initial draft — gate-1, final slice |
