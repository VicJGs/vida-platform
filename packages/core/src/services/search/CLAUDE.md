# services/search — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
Cross-cutting platform read/query utilities over the AR-6 `entity_links`/`entity_tags` substrate.
- `backlink-resolver.ts` — **BUILT** (AR-8 increment #1): read-only entity-link resolver
  (`getBacklinksTo` · `getLinksFrom` · `resolveLink`). Reads only; AR-6's `SpacesService` owns the writes.
- FTS5 full-text search — **pending**, streams in at DB-8 (#60).
- neural-graph data-prep — **pending** (AR-8 increment #2).

## Owning ADR / context
search-service

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
`backlink-resolver.ts` built + tested (AR-8 increment #1, 2026-08-04); FTS5 search + neural-graph data-prep
still per-feature/pending (ADR-017). Read-only: no writes originate here (AR-6 owns entity_link mutation).
Types + Zod live in @vida/types.
