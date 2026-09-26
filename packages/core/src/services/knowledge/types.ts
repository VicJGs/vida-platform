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
import type {
  KnowledgeObject,
  ObjectKind,
  KnowledgeContainer,
  Reference,
  StudyTopicStatus,
  TopicDifficulty,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { SpacesService } from '../../foundation/spaces'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
import type {
  CreateObjectKindSchema,
  UpdateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
  CreateKnowledgeContainerSchema,
  AddReferenceSchema,
} from '../../validators/knowledge'

/** The `entity_type` knowledge objects register in the shared taggable/pages registries
 *  (ADR-006 SP1 / Notes `pages`). Consumed by S2 (tags/links) + S6 (pages). */
export const KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'

export interface KnowledgeServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** AR-6 — entity-link/tag + tag WRITES (S2 delegates link/tag mutations here; the read/write-split
   *  command half). Required: linking/tagging is core to S2, not a deny-safe optional (NotesService precedent). */
  spaces: SpacesService
  /** AR-8 — entity-link READS (S2 `listLinks` delegates here; the query half). */
  backlinks: BacklinkResolver
}

/** S2 — a polymorphic link/tag target or member (entityType is validated fail-loud by `spaces`). Local by
 *  design (F3): NOT the `foundation/spaces` `TaggableRef`, whose only export path is the association-resolver
 *  barrel this slice deliberately does not compose — keeps the dep surface `{SpacesService, BacklinkResolver}`. */
export interface KnowledgeEntityRef {
  entityType: string
  entityId: string
}

// --- Zod-inferred input shapes (validators/knowledge.ts) --------------------
export type CreateObjectKindInput = z.infer<typeof CreateObjectKindSchema>
export type UpdateObjectKindInput = z.infer<typeof UpdateObjectKindSchema>
export type CreateKnowledgeObjectInput = z.infer<typeof CreateKnowledgeObjectSchema>
export type UpdateKnowledgeObjectInput = z.infer<typeof UpdateKnowledgeObjectSchema>
export type CreateKnowledgeContainerInput = z.infer<typeof CreateKnowledgeContainerSchema>
export type AddReferenceInput = z.infer<typeof AddReferenceSchema>

/** listContainers filter (KNO-14) — the query half; the view-regroup RENDER is P6. */
export interface ContainerFilter {
  containerType?: KnowledgeContainer['container_type']
}

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

/** KNO-13/41 — a `containerId` did not resolve (integrity at membership write). */
export class KnowledgeContainerNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge container not found: ${id}`)
    this.name = 'KnowledgeContainerNotFoundError'
  }
}

/** KNO-30/41 — a `references` row id did not resolve (distinct from the object error for catch-precision). */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Reference not found: ${id}`)
    this.name = 'ReferenceNotFoundError'
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

  // ── S2: containers (KNO-12/14) ────────────────────────────────────
  /** KNO-12 — create a Module/Area/Subject container. Nesting rides entity_tags, not parent_id (KN-7). */
  createContainer(input: CreateKnowledgeContainerInput): Promise<KnowledgeContainer>
  /** KNO-14 — list containers (query half; view-regroup RENDER is P6). Soft-delete filtered. */
  listContainers(filter?: ContainerFilter): Promise<KnowledgeContainer[]>
  /** Companion — soft-delete a container (guard-exists → KnowledgeContainerNotFoundError). */
  deleteContainer(id: string): Promise<void>

  // ── S2: references (KNO-29/30) ────────────────────────────────────
  /** KNO-29 — add a first-class Reference to an object (replaces resource_urls). Rejects an unresolved object. */
  addReference(objectId: string, input: AddReferenceInput): Promise<Reference>
  /** KNO-30 — list an object's live references. */
  listReferences(objectId: string): Promise<Reference[]>
  /** Companion — soft-delete a reference. */
  removeReference(id: string): Promise<void>

  // ── S2: cross-module links (KNO-10/11) ────────────────────────────
  /** KNO-10 — link an object to any registered entity via entity_links (never resource_type). Source anchor =
   *  the object id (page_id). Rejects an unresolved object; an unregistered targetRef.entityType throws
   *  UnknownEntityType (delegated to spaces). KNO-11 — call N times for many book links. */
  linkObject(objectId: string, targetRef: KnowledgeEntityRef, context?: string | null): Promise<EntityLinkRow>
  /** KNO-10 — remove a link (guard-exists on the object; spaces resolve-then-soft-delete). */
  unlinkObject(objectId: string, targetRef: KnowledgeEntityRef): Promise<void>
  /** KNO-10 — an object's outbound links (raw row; the NotesService raw-reader pattern). */
  listLinks(objectId: string): Promise<EntityLinkRow[]>

  // ── S2: tag membership (KNO-13/45) ────────────────────────────────
  /** KNO-13 — record container membership as an entity_tags row (scoped tag). Rejects an unresolved container
   *  or scopedTag (create-path silent-orphan guard, BR-S2-8b). Many-to-many (KN-7). */
  tagMembership(containerId: string, memberRef: KnowledgeEntityRef, scopedTag: string): Promise<EntityTagRow>
  /** KNO-13 — remove a membership (guard-exists on the container; scopedTag NOT guarded — remove stays cleanable). */
  untagMembership(containerId: string, memberRef: KnowledgeEntityRef, scopedTag: string): Promise<void>
  /** KNO-13/45 — list the members carrying a scoped tag (list-by-tag read; NotesService getEntitiesByTag precedent). */
  listMemberships(scopedTag: string): Promise<EntityTagRow[]>
}
