<!-- service/composition.md — Track A · §5 lens 5. Service dependency graph + repository wiring + seams to
     other services. Cited to service.ts / notes-service.ts. Born 2026-08-22 (recovery). -->

# Composition — dependency graph + wiring

## Factory dependencies (injected)

```
createNotesService(db, deviceId, {
  spaces:    SpacesService        // AR-6 — entity-link/tag WRITES
  backlinks: BacklinkResolver     // AR-8 — entity-link READS
  registry:  TaggableTypeRegistry // SP2 — entity_type validation (self-seeds ENTITY_TYPES)
})
```
`[FACT: service.ts:33-37,50-54]`

## Repository wiring

`cfg = { deviceId, encryptedFields: [], softDelete: true }` → 4 repos: `pageRepo`(pages) · `pageLinkRepo`
(page_links) · `attachmentRepo`(note_attachments) · `entityTagRepo`(entity_tags, **read-only**). `[FACT:
service.ts:55-60]`

## Assembly seam (② data plane)

`apps/web/src/services/notes-service.ts` `getNotesService()` builds the graph once (memoized): `getDb()` +
`getDeviceId()` → `registry` → `spaces` → `backlinks` → `notes`. Shared infra — MOD-journals reuses it (JR-1).
`[FACT: notes-service.ts:29-38; ../current-spec.md:49-50]`

## Seam map

```
                 ┌─ AR-6 SpacesService  (createLink/removeLink/tagEntity)  ← entity-link/tag WRITES
NotesService ────┤─ AR-8 BacklinkResolver (getBacklinksTo/getLinksFrom)    ← entity-link READS
                 ├─ DB-6 Repository × 4  (create/update/delete/findWhere)   → sync_queue enqueue
                 └─ TaggableTypeRegistry (isRegistered)                     ← NP-6/SP2 validation
```

Notes **composes**, never re-implements the substrates (ADR-018 §3.3). The `entity_tags` reads are a thin
read-repo (AR-8 precedent), never a write path. `[FACT: service.ts:1-9,246-279]`

## Downstream consumers (who depends on this service)

- ②a hooks (`apps/web/src/app/notes/hooks.ts`) — every read/mutation. `[FACT: ../current-spec.md:51-53]`
- the `[[` picker config (`note-detail.tsx`) — `resolveWikiLink`/`createPage`/`createPageLink` injected into
  `@vida/editor` (which stays `@vida/core`-free, WL-4). `[FACT: ../current-business-rules.md:58-59]`
- MOD-journals (later) — reuses `getNotesService()` + the `/summary` storage seam. `[FACT: ../current-spec.md:104]`
