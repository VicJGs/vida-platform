// ============================================================================
// services/knowledge — types (mod-knowledge #50 ① · S1 kinds + objects + hierarchy)
//
// Deps + the KnowledgeService interface + input types + typed errors. Factory-object
// shape, hoisted closures, no `this.` (the ② destructure-consumption shape; the
// habits/finance precedent). S1 declares the kind-registry + object-hierarchy surface;
// S2–S8 append (containers/refs/links/tags · review engine · mastery · measurement ·
// pages/compound/lab · flashcards · events) per docs/modules/knowledge/delivery/decomposition.md.
// ============================================================================

import type { z } from 'zod'
import type { KnowledgeObject, ObjectKind, StudyTopicStatus, TopicDifficulty } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type {
  CreateObjectKindSchema,
  UpdateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
} from '../../validators/knowledge'

/** The `entity_type` knowledge objects register in the shared taggable/pages registries
 *  (ADR-006 SP1 / Notes `pages`). Consumed by S2 (tags/links) + S6 (pages). */
export const KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'

export interface KnowledgeServiceDeps {
  db: DrizzleDb
  deviceId: string
}

// --- Zod-inferred input shapes (validators/knowledge.ts) --------------------
export type CreateObjectKindInput = z.infer<typeof CreateObjectKindSchema>
export type UpdateObjectKindInput = z.infer<typeof UpdateObjectKindSchema>
export type CreateKnowledgeObjectInput = z.infer<typeof CreateKnowledgeObjectSchema>
export type UpdateKnowledgeObjectInput = z.infer<typeof UpdateKnowledgeObjectSchema>

/** listObjects filter (KNO-07) — narrow the catalog read by hierarchy/kind/status. Container/tag
 *  grouping is S2 (entity_tags); search is S6 (FTS5). */
export interface ObjectFilter {
  kindId?: string
  parentObjectId?: string | null
  status?: StudyTopicStatus
  difficulty?: TopicDifficulty
}

// --- typed errors (KNO-41) ---------------------------------------------------

/** KNO-06/05/12 — a knowledge object id did not resolve. */
export class KnowledgeObjectNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge object not found: ${id}`)
    this.name = 'KnowledgeObjectNotFoundError'
  }
}

/** KNO-08 — a `kind_id` did not resolve in the registry (integrity at write). */
export class ObjectKindNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Object kind not found: ${id}`)
    this.name = 'ObjectKindNotFoundError'
  }
}

/** KNO-08 — a `parent_object_id` did not resolve (integrity at write). */
export class InvalidParentRefError extends Error {
  constructor(public readonly id: string) {
    super(`Parent object not found: ${id}`)
    this.name = 'InvalidParentRefError'
  }
}

/** KNO-08 — setting `parent_object_id` would create a cycle (self-parent or an ancestor loop). */
export class HierarchyCycleError extends Error {
  constructor(public readonly reason: string) {
    super(`Hierarchy cycle: ${reason}`)
    this.name = 'HierarchyCycleError'
  }
}

export interface KnowledgeService {
  // ── S1: kind registry ────────────────────────────────────────────
  /** KNO-03 — seed topic/concept(understand)/definition(memorize) as editable/removable defaults.
   *  Idempotent: no-ops unless the registry is EMPTY (a fully-cleared registry re-seeds — defaults
   *  are removable, BR-S1-2). NOT an is_default probe. */
  seedDefaultKinds(): Promise<void>
  /** KNO-01 — create a user-extensible kind (FLAT registry, no parent_kind_id). */
  createKind(input: CreateObjectKindInput): Promise<ObjectKind>
  /** KNO-02 — read the kind registry (soft-delete filtered). */
  listKinds(): Promise<ObjectKind[]>

  // ── S1: object hierarchy CRUD ─────────────────────────────────────
  /** KNO-04 — create an object nested under a Topic via `parent_object_id`. Rejects an unresolved
   *  `kind_id` (ObjectKindNotFoundError) or `parent_object_id` (InvalidParentRefError). `mastery_level`
   *  is DERIVED (KN-9) — not settable. */
  createObject(input: CreateKnowledgeObjectInput): Promise<KnowledgeObject>
  /** KNO-05 — mutate an object; re-checks kind + a parent change (existence + cycle). `mastery_level`
   *  cannot be set (omitted from the schema, KN-9). */
  updateObject(id: string, patch: UpdateKnowledgeObjectInput): Promise<KnowledgeObject>
  /** KNO-06 — read one object. */
  getObject(id: string): Promise<KnowledgeObject | null>
  /** KNO-07 — list/query objects by kind/parent/status/difficulty (soft-delete filtered). */
  listObjects(filter?: ObjectFilter): Promise<KnowledgeObject[]>
  /** KNO-04 (CRUD) — soft-delete an object (habits soft-delete precedent). */
  deleteObject(id: string): Promise<void>
}
