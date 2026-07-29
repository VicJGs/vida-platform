// ============================================================================
// TaggableTypeRegistry — the open taggable/linkable entity-type registry
// (AR-6 · ADR-006 §3.2, SP2)
//
// Seeded from the shared `_registry.ts` ENTITY_TYPES (the foundation set:
// page/note/journal/tag/space). A module makes its entities taggable/linkable
// by `register()`ing their type at build — NO SQL CHECK, NO schema edit (the
// live `session_attachments.entity_type` precedent). Governs BOTH `entity_tags`
// and `entity_links` (one registry — SP4).
// ============================================================================

import { ENTITY_TYPES } from '../../db/schema/_registry'
import type { TaggableTypeRegistry } from './types'

export function createTaggableTypeRegistry(): TaggableTypeRegistry {
  const types = new Set<string>(ENTITY_TYPES)
  return {
    register(entityType) {
      types.add(entityType)
    },
    isRegistered(entityType) {
      return types.has(entityType)
    },
    list() {
      return [...types]
    },
  }
}
