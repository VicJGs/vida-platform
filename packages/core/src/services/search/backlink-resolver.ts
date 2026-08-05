// ============================================================================
// BacklinkResolver — the READ/resolve side of entity_links (AR-8 · increment #1)
//
// The QUERY half of the [[wiki-link]] system. AR-6's SpacesService owns the
// WRITE half (createLink / removeLink, SP4 — foundation/spaces/service.ts); this
// service NEVER mutates.
//   • getBacklinksTo — pages that link TO an entity (backlink panel; hits idx_entity_links_entity)
//   • getLinksFrom   — entities a given page links TO
//   • resolveLink    — one specific link (preview-card path); ≤1 live row (UNIQUE(page_id,entity_type,entity_id))
//
// Scope (M1.0): entity_links only. page↔page links (page_links) + preview-card
// data enrichment are DEFERRED — pages/module tables are M1.1+. context [E]
// decryption is M3 (empty-[E] pass-through today, BR-13). No registry validation
// on reads: an unknown entity_type simply yields [] (fail-loud is a write-path
// guard owned by AR-6, spaces/service.ts:76).
// ============================================================================

import { and, eq, isNull } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { entityLinks, type EntityLinkRow } from '../../db/schema/foundation/spaces'

export interface BacklinkResolver {
  /** Backlinks: every page that links TO this entity (read path = idx_entity_links_entity). */
  getBacklinksTo(entityType: string, entityId: string): Promise<EntityLinkRow[]>
  /** Forward links: every entity a given page links TO. */
  getLinksFrom(pageId: string): Promise<EntityLinkRow[]>
  /** Resolve ONE specific link (preview-card path); null if absent or soft-deleted. */
  resolveLink(pageId: string, entityType: string, entityId: string): Promise<EntityLinkRow | null>
}

export function createBacklinkResolver(db: DrizzleDb, deviceId: string): BacklinkResolver {
  // Repo-config identical to AR-6's SpacesService (empty [E] pass-through + soft-delete) so
  // context decryption stays correct when [E] activates at M3. `deviceId` is unused on the
  // read path (findWhere never writes) but RepositoryConfig requires it (repository.ts:179).
  const entityLinkRepo = createRepository(db, entityLinks, {
    deviceId,
    encryptedFields: [] as string[],
    softDelete: true,
  })

  // findWhere runs the predicate VERBATIM (repository.ts:379) — it does NOT apply notDeleted()
  // like findById/findAll/count. Soft-delete exclusion is the caller's job → every query below
  // appends isNull(deleted_at). drizzle and() is `SQL | undefined`; `!` mirrors AR-6 (service.ts:165).
  return {
    getBacklinksTo(entityType, entityId) {
      return entityLinkRepo.findWhere(
        and(
          eq(entityLinks.entity_type, entityType),
          eq(entityLinks.entity_id, entityId),
          isNull(entityLinks.deleted_at),
        )!,
      )
    },

    getLinksFrom(pageId) {
      return entityLinkRepo.findWhere(
        and(eq(entityLinks.page_id, pageId), isNull(entityLinks.deleted_at))!,
      )
    },

    async resolveLink(pageId, entityType, entityId) {
      const rows = await entityLinkRepo.findWhere(
        and(
          eq(entityLinks.page_id, pageId),
          eq(entityLinks.entity_type, entityType),
          eq(entityLinks.entity_id, entityId),
          isNull(entityLinks.deleted_at),
        )!,
      )
      return rows[0] ?? null
    },
  }
}
