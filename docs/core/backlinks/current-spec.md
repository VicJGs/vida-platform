# Backlink resolution — CURRENT SPEC
# Durable ground-truth (§XXIX). Reflects shipped code as of AR-8 increment #1 (2026-08-04).

## What this is
The **read/resolve** side of the `[[wiki-link]]` system. Given the `entity_links` rows that AR-6's
`SpacesService` writes, it answers "what links here?" and "what does this page link to?". It is a
`@vida/core` service; it never mutates.

- **Code:** `packages/core/src/services/search/backlink-resolver.ts` (barrel `services/search/index.ts`;
  re-exported from `@vida/core`).
- **Reads:** `entity_links` (owned by AR-6 `foundation/spaces`; `schema/foundation/spaces.ts`).
- **Home rationale:** `services/` per-tier utility (ADR-018 §3.2), `search/` dir per delivery-plan §5:182.

## Contract
```ts
createBacklinkResolver(db: DrizzleDb, deviceId: string): BacklinkResolver

getBacklinksTo(entityType, entityId): Promise<EntityLinkRow[]>   // pages linking TO an entity
getLinksFrom(pageId): Promise<EntityLinkRow[]>                    // entities a page links TO
resolveLink(pageId, entityType, entityId): Promise<EntityLinkRow | null>  // one link; ≤1 live row
```
All queries filter `isNull(deleted_at)` (soft-delete aware). `getBacklinksTo` hits
`idx_entity_links_entity (entity_type, entity_id)`. `resolveLink` relies on the schema's
`UNIQUE(page_id, entity_type, entity_id)` (≤1 live row → `rows[0] ?? null`).

## R7 read-seam conformance (INT-1)
This resolver IS the documented read API modules pull entity-link data through — never a direct
`entity_links` read or a materialized cross-module index. Read-only (BL-1) + graceful-degrade (unknown →
`[]`, BL-3). See **BL-7**. `[capability-framework.md:66 R7 (INT-1) · ADR-007 §3.4 · ADR-011 §3.6]`

## Scope boundary (M1.0)
- **IN:** entity-link read/resolve only.
- **DEFERRED:** page↔page links (`page_links` table is M1.1 Notes & Pages) · preview-card data enrichment
  (target module tables are M1.1+) · `context` `[E]` decryption (M3; empty-`[E]` pass-through now) · all writes
  (AR-6 owns `createLink`/`removeLink`).

## Tests
`services/search/__tests__/backlink-resolver.test.ts` (8) — seeded through AR-6's real write path:
backlinks · links-from · soft-delete exclusion · partial exclusion · revive · empty/unknown · resolveLink
hit+null · composite-key isolation.
