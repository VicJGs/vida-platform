// ============================================================================
// AssociationResolver — the tag/link unify⇄separate RESOLUTION layer
// (XCU-SP-27 · ADR-006 §3.3)
//
// A read-composition service OVER both `entity_tags` + `entity_links`. The user
// owns a switch (home: Preferences/Spaces, P6) that this service takes as the
// `mode` parameter (stateless — it reads no preference table):
//
//   • unified  → ONE homogeneous association relation: each tag-membership and
//     each outbound link normalized into a common `Association` edge, returned as
//     a single set (the entity's associations as one space). Each edge KEEPS its
//     `kind` so the two primitives stay distinct inside the one space (BR-4 —
//     never blur). This is a real OS derivation, not a display flag (ADR-006:90-92).
//   • separate → TWO heterogeneous typed relations, handled independently.
//
// The modes differ in RELATION STRUCTURE, not container — behavioral, not
// cosmetic. Storage is untouched either way (reversible; Option-C merged-table
// rejected, ADR-006:148-152). No dedup: a tag-membership and a link to the same
// id are semantically distinct associations.
//
// SCOPE (partial by design — the OUTGOING half):
//   Resolves an entity's OWN associations: its tag memberships (`entity_tags` by
//   (entity_type, entity_id)) + its OUTBOUND links (`entity_links` by page_id).
//   The INCOMING half (entities linking TO it) is AR-8's backlink resolver —
//   NOT here. Complete bidirectional space = this ⊕ AR-8. Cross-entity querying
//   (by filter/tag) is the views engine (ADR-007), not here.
//
// Reads go through the DB-6 Repository (`findWhere` decrypts — repository.ts:381)
// with an EMPTY [E] set (BR-13 M1.0 pass-through: no `key()` call, no vault lock).
// `findWhere` does NOT auto-filter soft-deletes → the explicit isNull is required.
// entity_type is registry-validated (BR-2), fail-loud, matching the write path.
// ============================================================================

import { and, eq, isNull } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { entityTags, entityLinks } from '../../db/schema/foundation/spaces'
import type { TaggableTypeRegistry } from './types'
import { UnknownEntityType } from './types'

/** An entity in the OPEN taggable/linkable registry (SP2). */
export interface TaggableRef {
  entityType: string
  entityId: string
}

/** The user-owned switch, supplied by the caller (the persisted toggle + surface are P6). */
export type AssociationMode = 'unified' | 'separate'

/** A tag membership this entity carries (from `entity_tags`). */
export interface TagAssociation {
  kind: 'tag'
  tagId: string
}

/** An outbound typed reference this entity (a page) authored (from `entity_links`). */
export interface LinkAssociation {
  kind: 'link'
  target: TaggableRef
  /** [E] surrounding-text snippet — plaintext in M1.0 (BR-13 pass-through). */
  context: string | null
}

/** One edge in the association space. Retains `kind` so primitives stay distinct (BR-4). */
export type Association = TagAssociation | LinkAssociation

/**
 * The resolution result, discriminated on `mode`:
 *  - `unified`  → one homogeneous relation (the association space as one set)
 *  - `separate` → two heterogeneous typed relations
 */
export type AssociationResult =
  | { mode: 'unified'; associations: Association[] }
  | { mode: 'separate'; tags: TagAssociation[]; links: LinkAssociation[] }

export interface AssociationResolver {
  /**
   * Resolve an entity's OUTGOING associations (its tag memberships + its outbound
   * links) as one association space (unified) or two (separate). Reads only;
   * tables untouched. Throws `UnknownEntityType` if `ref.entityType` is
   * unregistered (BR-2). Inbound refs are AR-8 — never returned here.
   */
  resolveAssociations(ref: TaggableRef, mode: AssociationMode): Promise<AssociationResult>
}

export function createAssociationResolver(
  db: DrizzleDb,
  deviceId: string,
  registry: TaggableTypeRegistry,
): AssociationResolver {
  // Mirror SpacesService (service.ts:69): empty [E] set = BR-13 M1.0 pass-through
  // (findWhere's decryptAll is a no-op, never calls key() → no vault lock);
  // softDelete:true is the table truth, but findWhere skips the filter (only
  // findAll/findById apply it) so every clause below adds isNull(deleted_at).
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const entityTagRepo = createRepository(db, entityTags, cfg)
  const entityLinkRepo = createRepository(db, entityLinks, cfg)

  // Deterministic order → stable association space. id is UUIDv7 (time-sortable),
  // so ascending id == creation order.
  function byId<T extends { id: string }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }

  async function readTags(ref: TaggableRef): Promise<TagAssociation[]> {
    const rows = await entityTagRepo.findWhere(
      // `and()` is typed SQL | undefined but is always defined here (all args are
      // non-undefined predicates) → non-null assertion is safe (matches service.ts).
      and(
        eq(entityTags.entity_type, ref.entityType),
        eq(entityTags.entity_id, ref.entityId),
        isNull(entityTags.deleted_at),
      )!,
    )
    return byId(rows).map((r) => ({ kind: 'tag' as const, tagId: r.tag_id }))
  }

  async function readOutboundLinks(ref: TaggableRef): Promise<LinkAssociation[]> {
    // page_id is the SOURCE anchor → this is the entity's OUTBOUND links only.
    // Inbound (target-idx read path) is AR-8's backlink resolver, not here.
    const rows = await entityLinkRepo.findWhere(
      // `and()` is SQL | undefined but always defined here → assert non-null (see readTags).
      and(eq(entityLinks.page_id, ref.entityId), isNull(entityLinks.deleted_at))!,
    )
    return byId(rows).map((r) => ({
      kind: 'link' as const,
      target: { entityType: r.entity_type, entityId: r.entity_id },
      context: r.context,
    }))
  }

  return {
    async resolveAssociations(ref, mode) {
      // BR-2 — fail-loud on an unregistered type, matching the write path.
      if (!registry.isRegistered(ref.entityType)) throw new UnknownEntityType(ref.entityType)

      const tags = await readTags(ref)
      const links = await readOutboundLinks(ref)

      if (mode === 'separate') return { mode: 'separate', tags, links }
      // unified: one homogeneous relation — tags then links, each edge keeps its
      // kind (BR-4, no blur/dedup). Same rows, a different relation structure.
      return { mode: 'unified', associations: [...tags, ...links] }
    },
  }
}
