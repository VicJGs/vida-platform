// ============================================================================
// Spaces substrate — types + typed errors  (AR-6 · ADR-006)
//
// The taggable-type registry contract (SP2) + the fail-loud error set. Row
// shapes come from the Drizzle schema ($inferSelect); the service inputs are
// the caller-supplied fields (managed id/timestamps/_sync_* handled by the
// Repository).
// ============================================================================

/** SP2 — the open taggable/linkable entity-type registry. Seeded from
 *  `_registry.ts` ENTITY_TYPES; a module registers its types at build (no
 *  schema edit, no SQL CHECK). */
export interface TaggableTypeRegistry {
  /** Register a new taggable/linkable entity_type at runtime. */
  register(entityType: string): void
  isRegistered(entityType: string): boolean
  list(): string[]
}

export interface CreateTagInput {
  name: string
  color?: string | null
  icon?: string | null
  description?: string | null
  parent_tag_id?: string | null
}

export interface CreateSpaceInput {
  root_tag_id: string
  name: string
  icon?: string | null
  default_view_id?: string | null
  parent_space_id?: string | null
}

// --- Typed errors (spec §2 fail-loud) — never a silent partial --------------
export class UnknownEntityType extends Error {
  constructor(public readonly entityType: string) {
    super(`entity_type '${entityType}' is not registered as taggable/linkable (SP2/BR-2)`)
    this.name = 'UnknownEntityType'
  }
}

export class InvalidTagNesting extends Error {
  constructor(public readonly tagId: string) {
    super(`tag '${tagId}' parent_tag_id chain forms a cycle (BR-3)`)
    this.name = 'InvalidTagNesting'
  }
}

export class TagNotFound extends Error {
  constructor(public readonly tagId: string) {
    super(`No tag found for id '${tagId}'`)
    this.name = 'TagNotFound'
  }
}

export class SpaceNotFound extends Error {
  constructor(public readonly spaceId: string) {
    super(`No space found for id '${spaceId}'`)
    this.name = 'SpaceNotFound'
  }
}

export class InvalidSpaceNesting extends Error {
  constructor(public readonly spaceId: string) {
    super(`space '${spaceId}' parent_space_id chain forms a cycle (BR-5)`)
    this.name = 'InvalidSpaceNesting'
  }
}
