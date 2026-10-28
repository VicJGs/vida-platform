// ============================================================================
// SpacesService — tags · entity_tags · entity_links · spaces · enabled-blocks
// (AR-6 · ADR-006)
//
// Every mutation routes through the DB-6 generic Repository → co-transactional
// sync_queue enqueue. M1.0 pass-through (BR-13): each repo is created with an
// EMPTY [E] set (no field encryption; [E] marks are the M3 target). All tables
// are syncable soft-delete (softDelete: true) → delete() sets deleted_at +
// enqueues operation:'update' (BR-15).
//
// Junction writes are IDEMPOTENT (BR-14): findWhere the business UNIQUE key
// before insert — live row → no-op; soft-deleted row → revive (avoids the raw
// SQLite UNIQUE collision on re-tag-after-untag); absent → create. Junction
// removes RESOLVE-then-soft-delete by business key (BR-15).
//
// entity_type is validated against the TaggableTypeRegistry (BR-2) on every
// tag/link write; an unregistered type throws UnknownEntityType (fail-loud).
// ============================================================================

import { and, eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import {
  tags,
  entityTags,
  entityLinks,
  spaces,
  spaceEnabledBlocks,
  type TagRow,
  type EntityTagRow,
  type EntityLinkRow,
  type SpaceRow,
  type SpaceEnabledBlockRow,
} from '../../db/schema/foundation/spaces'
import type { TaggableTypeRegistry, CreateTagInput, CreateSpaceInput } from './types'
import { UnknownEntityType, InvalidTagNesting, InvalidSpaceNesting } from './types'

export interface SpacesService {
  // tags (SP3)
  createTag(input: CreateTagInput): Promise<TagRow>
  updateTag(id: string, patch: Partial<CreateTagInput>): Promise<TagRow>
  deleteTag(id: string): Promise<void>
  // entity_tags (SP1) — idempotent write / resolve-then-soft-delete
  tagEntity(tagId: string, entityType: string, entityId: string): Promise<EntityTagRow>
  untagEntity(tagId: string, entityType: string, entityId: string): Promise<void>
  // entity_links (SP4) — idempotent write / resolve-then-soft-delete
  createLink(pageId: string, entityType: string, entityId: string, context?: string | null): Promise<EntityLinkRow>
  removeLink(pageId: string, entityType: string, entityId: string): Promise<void>
  // spaces (SP5)
  createSpace(input: CreateSpaceInput): Promise<SpaceRow>
  updateSpace(id: string, patch: Partial<CreateSpaceInput>): Promise<SpaceRow>
  deleteSpace(id: string): Promise<void>
  // enabled_blocks palette (SP6) — idempotent junction
  addEnabledBlock(spaceId: string, capabilityDefId: string): Promise<SpaceEnabledBlockRow>
  removeEnabledBlock(spaceId: string, capabilityDefId: string): Promise<void>
}

export function createSpacesService(db: DrizzleDb, deviceId: string, registry: TaggableTypeRegistry): SpacesService {
  // M1.0 pass-through: empty [E] set; syncable soft-delete on every table (BR-13/BR-15).
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const tagRepo = createRepository(db, tags, cfg)
  const entityTagRepo = createRepository(db, entityTags, cfg)
  const entityLinkRepo = createRepository(db, entityLinks, cfg)
  const spaceRepo = createRepository(db, spaces, cfg)
  const enabledBlockRepo = createRepository(db, spaceEnabledBlocks, cfg)

  function assertRegistered(entityType: string): void {
    if (!registry.isRegistered(entityType)) throw new UnknownEntityType(entityType)
  }

  // BR-3 — walk the proposed parent chain; a hop back to `tagId` (or a
  // pre-existing loop) is a cycle. Create can't cycle (fresh id), so only
  // updateTag needs this; run defensively.
  async function assertNoTagCycle(tagId: string, parentId: string | null | undefined): Promise<void> {
    let cursor: string | null = parentId ?? null
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === tagId || seen.has(cursor)) throw new InvalidTagNesting(tagId)
      seen.add(cursor)
      const parent: TagRow | null = await tagRepo.findById(cursor)
      cursor = parent?.parent_tag_id ?? null
    }
  }

  // BR-5 — same nesting cycle guard for spaces.parent_space_id (SP5).
  async function assertNoSpaceCycle(spaceId: string, parentId: string | null | undefined): Promise<void> {
    let cursor: string | null = parentId ?? null
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === spaceId || seen.has(cursor)) throw new InvalidSpaceNesting(spaceId)
      seen.add(cursor)
      const parent: SpaceRow | null = await spaceRepo.findById(cursor)
      cursor = parent?.parent_space_id ?? null
    }
  }

  return {
    // --- tags ----------------------------------------------------------------
    createTag(input) {
      return tagRepo.create({
        name: input.name,
        color: input.color ?? null,
        icon: input.icon ?? null,
        description: input.description ?? null,
        parent_tag_id: input.parent_tag_id ?? null,
      })
    },

    async updateTag(id, patch) {
      if (patch.parent_tag_id !== undefined) await assertNoTagCycle(id, patch.parent_tag_id)
      return tagRepo.update(id, patch)
    },

    deleteTag(id) {
      return tagRepo.delete(id) // soft-delete (softDelete: true) → enqueue operation:'update'
    },

    // --- entity_tags (idempotent) --------------------------------------------
    async tagEntity(tagId, entityType, entityId) {
      assertRegistered(entityType)
      const existing = await entityTagRepo.findWhere(
        and(eq(entityTags.tag_id, tagId), eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId))!,
      )
      if (existing.length > 0) {
        const row = existing[0]
        if (row.deleted_at != null) return entityTagRepo.update(row.id, { deleted_at: null }) // revive
        return row // idempotent no-op
      }
      return entityTagRepo.create({ tag_id: tagId, entity_type: entityType, entity_id: entityId })
    },

    async untagEntity(tagId, entityType, entityId) {
      const existing = await entityTagRepo.findWhere(
        and(eq(entityTags.tag_id, tagId), eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId))!,
      )
      const live = existing.find((r) => r.deleted_at == null)
      if (live) await entityTagRepo.delete(live.id) // soft-delete → syncs as operation:'update'
    },

    // --- entity_links (idempotent) -------------------------------------------
    async createLink(pageId, entityType, entityId, context) {
      assertRegistered(entityType)
      const existing = await entityLinkRepo.findWhere(
        and(
          eq(entityLinks.page_id, pageId),
          eq(entityLinks.entity_type, entityType),
          eq(entityLinks.entity_id, entityId),
        )!,
      )
      if (existing.length > 0) {
        const row = existing[0]
        if (row.deleted_at != null) {
          return entityLinkRepo.update(row.id, { deleted_at: null, context: context ?? null })
        }
        return row // idempotent no-op
      }
      return entityLinkRepo.create({
        page_id: pageId,
        entity_type: entityType,
        entity_id: entityId,
        context: context ?? null,
      })
    },

    async removeLink(pageId, entityType, entityId) {
      const existing = await entityLinkRepo.findWhere(
        and(
          eq(entityLinks.page_id, pageId),
          eq(entityLinks.entity_type, entityType),
          eq(entityLinks.entity_id, entityId),
        )!,
      )
      const live = existing.find((r) => r.deleted_at == null)
      if (live) await entityLinkRepo.delete(live.id)
    },

    // --- spaces --------------------------------------------------------------
    createSpace(input) {
      return spaceRepo.create({
        root_tag_id: input.root_tag_id,
        name: input.name,
        icon: input.icon ?? null,
        default_view_id: input.default_view_id ?? null,
        parent_space_id: input.parent_space_id ?? null,
      })
    },

    async updateSpace(id, patch) {
      if (patch.parent_space_id !== undefined) await assertNoSpaceCycle(id, patch.parent_space_id)
      return spaceRepo.update(id, patch)
    },

    deleteSpace(id) {
      return spaceRepo.delete(id)
    },

    // --- enabled_blocks palette (idempotent junction) ------------------------
    async addEnabledBlock(spaceId, capabilityDefId) {
      const existing = await enabledBlockRepo.findWhere(
        and(eq(spaceEnabledBlocks.space_id, spaceId), eq(spaceEnabledBlocks.capability_def_id, capabilityDefId))!,
      )
      if (existing.length > 0) {
        const row = existing[0]
        if (row.deleted_at != null) return enabledBlockRepo.update(row.id, { deleted_at: null })
        return row
      }
      return enabledBlockRepo.create({ space_id: spaceId, capability_def_id: capabilityDefId })
    },

    async removeEnabledBlock(spaceId, capabilityDefId) {
      const existing = await enabledBlockRepo.findWhere(
        and(eq(spaceEnabledBlocks.space_id, spaceId), eq(spaceEnabledBlocks.capability_def_id, capabilityDefId))!,
      )
      const live = existing.find((r) => r.deleted_at == null)
      if (live) await enabledBlockRepo.delete(live.id)
    },
  }
}
