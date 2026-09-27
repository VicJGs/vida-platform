// ============================================================================
// services/knowledge — the service (mod-knowledge #50 ①)
//
// S1: the kind registry + the knowledge-object hierarchy (KNO-01..09, 41).
// Factory-object, hoisted closures, no `this.` (the ② destructure shape; the habits precedent).
// Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through ([E] fields → M3/DB-5).
//   knowledge_objects / object_kinds → softDelete:true (deleted_at; list reads filter it).
//
// create() ECHOES the input row (not a DB re-read), so the create serializers backfill every
// notNull-default column → the returned row is FAITHFUL (repository-create-returns-input-row seam).
//
// JSON columns (`key_concepts` = json<string[]>() = a TEXT column with a $type<string[]> LIE): the
// M1.0 repo does NOT auto-serialize non-encrypted values (encryptRow is a pass-through with an empty
// [E] set — repository.ts:125), so the service stringifies at the WRITE boundary and parses on READ.
// This is the gamification json-column precedent + encryptRow's own M3 stringify convention
// (repository.ts:130). Exactly ONE cast per boundary (serializeObjectCreate / toKnowledgeObject),
// commented — NOT scattered `as any`. Knowledge is the first service to consume json<T>() columns.
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { KnowledgeObject, ObjectKind, KnowledgeContainer, Reference } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  knowledgeObjects,
  objectKinds,
  knowledgeContainers,
  references,
  type KnowledgeObjectRow,
  type ObjectKindRow,
  type KnowledgeContainerRow,
  type ReferenceRow,
} from '../../db/schema/knowledge'
import {
  tags,
  entityTags,
  type EntityTagRow,
  type EntityLinkRow,
} from '../../db/schema/foundation/spaces'
import { TagNotFound } from '../../foundation/spaces'
import { rollup } from '../../foundation/measurement'
import {
  CreateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
  CreateKnowledgeContainerSchema,
  AddReferenceSchema,
} from '../../validators/knowledge'
import {
  KnowledgeObjectNotFoundError,
  ObjectKindNotFoundError,
  InvalidParentRefError,
  HierarchyCycleError,
  KnowledgeContainerNotFoundError,
  ReferenceNotFoundError,
  type KnowledgeService,
  type KnowledgeServiceDeps,
  type CreateObjectKindInput,
  type CreateKnowledgeObjectInput,
  type UpdateKnowledgeObjectInput,
  type ObjectFilter,
  type CreateKnowledgeContainerInput,
  type AddReferenceInput,
  type ContainerFilter,
  type KnowledgeEntityRef,
} from './types'

/** KNO-03 — the shipped default kinds (KN-4 realms). `topic` = a spine node → realm null (not a study
 *  target); concept = understand, definition = memorize (Ultralearning; identity.md:8-9). All editable/removable. */
const SEED_KINDS: readonly CreateObjectKindInput[] = [
  { name: 'topic', learning_realm: null, is_default: true },
  { name: 'concept', learning_realm: 'understand', is_default: true },
  { name: 'definition', learning_realm: 'memorize', is_default: true },
]

/** Defensive JSON read (the habits/checkins boundary): degrade malformed JSON to null, never throw an
 *  opaque SyntaxError out of a read (a future sync row / manual DB edit could carry bad JSON). */
function parseJsonArray<T>(value: string | null): T[] | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as T[]
  } catch {
    return null
  }
}

// --- Row → @vida/types interface --------------------------------------------
const toObjectKind = (r: ObjectKindRow): ObjectKind => ({
  ...r,
  _sync_status: r._sync_status as ObjectKind['_sync_status'],
})
const toKnowledgeObject = (r: KnowledgeObjectRow): KnowledgeObject => ({
  ...r,
  // key_concepts is a json<string[]> TEXT column (a $type lie): stored as a JSON string at runtime,
  // parsed back here. r.key_concepts is TYPED string[] but is a string → cast to the read shape.
  key_concepts: parseJsonArray<string>(r.key_concepts as unknown as string | null),
  _sync_status: r._sync_status as KnowledgeObject['_sync_status'],
})
// S2 — no json<T> columns on containers/references (all text/enumText, BR-S2-10): only the _sync_status
// union cast is needed (the Drizzle-row-not-assignable seam [[drizzle-row-not-assignable-to-vida-types-interface]]).
const toContainer = (r: KnowledgeContainerRow): KnowledgeContainer => ({
  ...r,
  _sync_status: r._sync_status as KnowledgeContainer['_sync_status'],
})
const toReference = (r: ReferenceRow): Reference => ({
  ...r,
  _sync_status: r._sync_status as Reference['_sync_status'],
})

export function createKnowledgeService(deps: KnowledgeServiceDeps): KnowledgeService {
  const { db, deviceId, spaces, backlinks, review } = deps

  const kindsRepo = createRepository(db, objectKinds, { deviceId, softDelete: true, encryptedFields: [] })
  const objectsRepo = createRepository(db, knowledgeObjects, { deviceId, softDelete: true, encryptedFields: [] })
  // S2 WRITE repos (own tables).
  const containersRepo = createRepository(db, knowledgeContainers, { deviceId, softDelete: true, encryptedFields: [] })
  const referencesRepo = createRepository(db, references, { deviceId, softDelete: true, encryptedFields: [] })
  // S2 READ-ONLY repos (junction/tag reads; link/tag WRITES delegate to `spaces`, BR-S2-6). findWhere/findById only.
  const entityTagRepo = createRepository(db, entityTags, { deviceId, softDelete: true, encryptedFields: [] })
  const tagsRepo = createRepository(db, tags, { deviceId, softDelete: true, encryptedFields: [] })

  // --- kind registry (KNO-01/02/03) -----------------------------------------

  async function createKind(input: CreateObjectKindInput): Promise<ObjectKind> {
    const v = CreateObjectKindSchema.parse(input)
    const row = await kindsRepo.create({
      name: v.name,
      learning_realm: v.learning_realm ?? null,
      default_method_id: v.default_method_id ?? null,
      is_default: v.is_default ?? false, // notNull default false — backfill (create echoes input)
      deleted_at: null, // faithful echo (a new row is not deleted) — parity with createObject
    } satisfies CreateInput<typeof objectKinds>)
    return toObjectKind(row)
  }

  async function listKinds(): Promise<ObjectKind[]> {
    const rows = await kindsRepo.findWhere(isNull(objectKinds.deleted_at))
    return rows.map(toObjectKind)
  }

  async function seedDefaultKinds(): Promise<void> {
    // Idempotent: re-seed ONLY when the registry is empty (BR-S1-2 — defaults are removable, so a
    // fully-cleared registry re-seeds; NOT an is_default probe).
    if ((await listKinds()).length > 0) return
    for (const k of SEED_KINDS) await createKind(k)
  }

  // --- integrity helpers (KNO-08) -------------------------------------------

  async function assertKindExists(kindId: string): Promise<void> {
    if ((await kindsRepo.findById(kindId)) == null) throw new ObjectKindNotFoundError(kindId)
  }

  async function assertParentExists(parentId: string): Promise<void> {
    if ((await objectsRepo.findById(parentId)) == null) throw new InvalidParentRefError(parentId)
  }

  // --- S2 integrity helpers (KNO-08 pattern; fail-loud, never a silent orphan) ---
  async function assertObjectExists(objectId: string): Promise<void> {
    if ((await objectsRepo.findById(objectId)) == null) throw new KnowledgeObjectNotFoundError(objectId)
  }
  async function assertContainerExists(containerId: string): Promise<void> {
    if ((await containersRepo.findById(containerId)) == null) throw new KnowledgeContainerNotFoundError(containerId)
  }

  /** Walk the desired parent's ancestor chain; reject a self-parent or a loop that reaches `objectId`. */
  async function assertNoCycle(objectId: string, desiredParentId: string): Promise<void> {
    if (desiredParentId === objectId) throw new HierarchyCycleError('an object cannot be its own parent')
    const seen = new Set<string>()
    let cursor: string | null = desiredParentId
    while (cursor) {
      if (cursor === objectId) throw new HierarchyCycleError(`cycle through ${objectId}`)
      if (seen.has(cursor)) break // a pre-existing cycle in stored data — stop walking, don't hang
      seen.add(cursor)
      const parent: KnowledgeObjectRow | null = await objectsRepo.findById(cursor)
      if (!parent) break
      cursor = parent.parent_object_id
    }
  }

  // --- object hierarchy CRUD (KNO-04/05/06/07) ------------------------------

  async function createObject(input: CreateKnowledgeObjectInput): Promise<KnowledgeObject> {
    const v = CreateKnowledgeObjectSchema.parse(input)
    await assertKindExists(v.kind_id)
    if (v.parent_object_id != null) await assertParentExists(v.parent_object_id)
    const row = await objectsRepo.create({
      kind_id: v.kind_id,
      parent_object_id: v.parent_object_id ?? null,
      title: v.title,
      description: v.description ?? null,
      // json<string[]> write boundary (see file header): stringify + one cast, here only.
      key_concepts: (v.key_concepts != null ? JSON.stringify(v.key_concepts) : null) as unknown as string[] | null,
      mastery_level: null, // DERIVED (KN-9) — the SERVICE initializes null (no signal at birth); the
      //                      validator blocks USER-setting. create() echoes input, so coalesce here → faithful null.
      status: v.status ?? null,
      difficulty: v.difficulty ?? null,
      is_exam_topic: v.is_exam_topic ?? false, // notNull default — backfill
      sort_order: v.sort_order ?? 0, // notNull default — backfill
      deleted_at: null, // faithful echo (a new row is not deleted)
    } satisfies CreateInput<typeof knowledgeObjects>)
    return toKnowledgeObject(row)
  }

  async function updateObject(id: string, patch: UpdateKnowledgeObjectInput): Promise<KnowledgeObject> {
    const v = UpdateKnowledgeObjectSchema.parse(patch)
    const existing = await objectsRepo.findById(id)
    if (!existing) throw new KnowledgeObjectNotFoundError(id)
    if (v.kind_id !== undefined) await assertKindExists(v.kind_id)
    if (v.parent_object_id !== undefined && v.parent_object_id !== existing.parent_object_id) {
      if (v.parent_object_id != null) {
        await assertParentExists(v.parent_object_id)
        await assertNoCycle(id, v.parent_object_id)
      }
    }
    const dbPatch: Record<string, unknown> = {}
    if (v.kind_id !== undefined) dbPatch.kind_id = v.kind_id
    if (v.parent_object_id !== undefined) dbPatch.parent_object_id = v.parent_object_id
    if (v.title !== undefined) dbPatch.title = v.title
    if (v.description !== undefined) dbPatch.description = v.description
    if (v.key_concepts !== undefined) dbPatch.key_concepts = v.key_concepts != null ? JSON.stringify(v.key_concepts) : null
    if (v.status !== undefined) dbPatch.status = v.status
    if (v.difficulty !== undefined) dbPatch.difficulty = v.difficulty
    if (v.is_exam_topic !== undefined) dbPatch.is_exam_topic = v.is_exam_topic
    if (v.sort_order !== undefined) dbPatch.sort_order = v.sort_order
    await objectsRepo.update(id, dbPatch as UpdateInput<typeof knowledgeObjects>)
    // Re-read for a faithful full row (update echoes only the patch).
    const updated = await objectsRepo.findById(id)
    return toKnowledgeObject(updated as KnowledgeObjectRow)
  }

  async function getObject(id: string): Promise<KnowledgeObject | null> {
    const row = await objectsRepo.findById(id)
    return row ? toKnowledgeObject(row) : null
  }

  async function listObjects(filter: ObjectFilter = {}): Promise<KnowledgeObject[]> {
    const clauses: SQL[] = [isNull(knowledgeObjects.deleted_at)]
    if (filter.kindId !== undefined) clauses.push(eq(knowledgeObjects.kind_id, filter.kindId))
    if (filter.parentObjectId !== undefined) {
      clauses.push(
        filter.parentObjectId === null
          ? isNull(knowledgeObjects.parent_object_id)
          : eq(knowledgeObjects.parent_object_id, filter.parentObjectId),
      )
    }
    if (filter.status !== undefined) clauses.push(eq(knowledgeObjects.status, filter.status))
    if (filter.difficulty !== undefined) clauses.push(eq(knowledgeObjects.difficulty, filter.difficulty))
    const rows = await objectsRepo.findWhere(clauses.length === 1 ? clauses[0]! : and(...clauses)!)
    return rows.map(toKnowledgeObject)
  }

  async function deleteObject(id: string): Promise<void> {
    if ((await objectsRepo.findById(id)) == null) throw new KnowledgeObjectNotFoundError(id)
    await objectsRepo.delete(id) // soft delete (softDelete:true → sets deleted_at)
  }

  // --- S2: containers (KNO-12/14) -------------------------------------------

  async function createContainer(input: CreateKnowledgeContainerInput): Promise<KnowledgeContainer> {
    const v = CreateKnowledgeContainerSchema.parse(input)
    const row = await containersRepo.create({
      container_type: v.container_type,
      name: v.name,
      deleted_at: null, // faithful echo (create echoes input; a new row is not deleted)
    } satisfies CreateInput<typeof knowledgeContainers>)
    return toContainer(row)
  }

  async function listContainers(filter: ContainerFilter = {}): Promise<KnowledgeContainer[]> {
    const clauses: SQL[] = [isNull(knowledgeContainers.deleted_at)] // findWhere skips the soft-delete filter
    if (filter.containerType !== undefined) {
      clauses.push(eq(knowledgeContainers.container_type, filter.containerType))
    }
    const rows = await containersRepo.findWhere(clauses.length === 1 ? clauses[0]! : and(...clauses)!)
    return rows.map(toContainer)
  }

  async function deleteContainer(id: string): Promise<void> {
    await assertContainerExists(id)
    await containersRepo.delete(id) // soft delete
  }

  // --- S2: references (KNO-29/30) -------------------------------------------

  async function addReference(objectId: string, input: AddReferenceInput): Promise<Reference> {
    const v = AddReferenceSchema.parse(input)
    await assertObjectExists(objectId) // fail-loud: no reference on a non-existent object (BR-S2-8)
    const row = await referencesRepo.create({
      object_id: objectId,
      title: v.title,
      source: v.source ?? null,
      url: v.url ?? null,
      type: v.type ?? null,
      deleted_at: null, // faithful echo
    } satisfies CreateInput<typeof references>)
    return toReference(row)
  }

  async function listReferences(objectId: string): Promise<Reference[]> {
    const rows = await referencesRepo.findWhere(
      and(eq(references.object_id, objectId), isNull(references.deleted_at))!,
    )
    return rows.map(toReference)
  }

  async function removeReference(id: string): Promise<void> {
    if ((await referencesRepo.findById(id)) == null) throw new ReferenceNotFoundError(id)
    await referencesRepo.delete(id) // soft delete
  }

  // --- S2: cross-module links (KNO-10/11) — write via spaces, read via backlinks ---

  async function linkObject(
    objectId: string,
    targetRef: KnowledgeEntityRef,
    context?: string | null,
  ): Promise<EntityLinkRow> {
    await assertObjectExists(objectId)
    // Source anchor = the object id in page_id (plain TEXT, no FK — a generic source anchor). spaces validates
    // targetRef.entityType against the registry (fail-loud UnknownEntityType) + is idempotent (KN-6; never resource_type).
    return spaces.createLink(objectId, targetRef.entityType, targetRef.entityId, context ?? null)
  }

  async function unlinkObject(objectId: string, targetRef: KnowledgeEntityRef): Promise<void> {
    await assertObjectExists(objectId) // guard the source (F4); spaces.removeLink no-ops on a missing link row
    await spaces.removeLink(objectId, targetRef.entityType, targetRef.entityId)
  }

  async function listLinks(objectId: string): Promise<EntityLinkRow[]> {
    // Raw-reader (NotesService precedent); getLinksFrom already filters soft-deletes.
    return backlinks.getLinksFrom(objectId)
  }

  // --- S2: tag membership (KNO-13/45) — write via spaces, read via entityTagRepo ---

  async function tagMembership(
    containerId: string,
    memberRef: KnowledgeEntityRef,
    scopedTag: string,
  ): Promise<EntityTagRow> {
    await assertContainerExists(containerId)
    // Create-path silent-orphan guard (BR-S2-8b): spaces.tagEntity blind-inserts an unresolved tag_id, so verify
    // the scoped tag resolves to a LIVE tags row (findById applies notDeleted) before delegating.
    if ((await tagsRepo.findById(scopedTag)) == null) throw new TagNotFound(scopedTag)
    return spaces.tagEntity(scopedTag, memberRef.entityType, memberRef.entityId)
  }

  async function untagMembership(
    containerId: string,
    memberRef: KnowledgeEntityRef,
    scopedTag: string,
  ): Promise<void> {
    await assertContainerExists(containerId) // guard the container (F4); scopedTag NOT guarded — remove stays cleanable
    await spaces.untagEntity(scopedTag, memberRef.entityType, memberRef.entityId)
  }

  async function listMemberships(scopedTag: string): Promise<EntityTagRow[]> {
    // List-by-tag (getEntitiesByTag precedent); findWhere skips the soft-delete filter → add it.
    return entityTagRepo.findWhere(
      and(eq(entityTags.tag_id, scopedTag), isNull(entityTags.deleted_at))!,
    )
  }

  // --- S3: review engine ① (KNO-15..20) — delegate to the composed `review` engine (D1) ---
  // The engine (foundation/review) owns methods/curves/bindings logic; Knowledge owns the SURFACE. The engine
  // is a no-`this.` factory object, so its verbs are re-exposed by bare method reference (no rebinding needed).
  // resolveDefaultMethod is the one non-pass-through: it looks the kind up here (Knowledge owns object_kinds)
  // then delegates the pure resolution (KNO-20 / BR-S3-5).
  async function resolveDefaultMethod(kindId: string): Promise<string | null> {
    const kind = await kindsRepo.findById(kindId)
    if (kind == null) throw new ObjectKindNotFoundError(kindId)
    return review.resolveDefaultMethod({
      default_method_id: kind.default_method_id,
      learning_realm: kind.learning_realm,
    })
  }

  /** KNO-24 — roll mastery UP the `parent_object_id` spine via `measurement.rollup` (knowledge-specific: the generic
   *  engine must not know `knowledge_objects`). A node with children = rollup of their derived progress (nulls
   *  excluded — an unmeasured child can't drag a parent down); a leaf = the engine's derive. The recursion carries a
   *  visited-set backstop: S1 guards `parent_object_id` at CREATE-time only, so a corrupted/synced row must not loop
   *  the walk (BR-S4-4). Internal recursion is in [0,1]; the public value is bridged to 0–100 (BR-S4-5). */
  async function rollupMastery(objectId: string): Promise<number | null> {
    await assertObjectExists(objectId)
    const seen = new Set<string>()
    const nodeProgress = async (id: string): Promise<number | null> => {
      if (seen.has(id)) return null // cycle/visited backstop — never re-count or infinite-loop
      seen.add(id)
      const children = await objectsRepo.findWhere(
        and(eq(knowledgeObjects.parent_object_id, id), isNull(knowledgeObjects.deleted_at))!,
      )
      if (children.length === 0) {
        const m = await review.deriveMastery(id) // 0–100 | null
        return m === null ? null : m / 100 // → [0,1]
      }
      const childProgress = await Promise.all(children.map((c) => nodeProgress(c.id)))
      return rollup(childProgress.map((progress) => ({ progress }))) // [0,1] | null (nulls excluded)
    }
    const result = await nodeProgress(objectId)
    return result === null ? null : Math.round(result * 100) // [0,1] → 0–100
  }

  return {
    seedDefaultKinds,
    createKind,
    listKinds,
    createObject,
    updateObject,
    getObject,
    listObjects,
    deleteObject,
    // S2
    createContainer,
    listContainers,
    deleteContainer,
    addReference,
    listReferences,
    removeReference,
    linkObject,
    unlinkObject,
    listLinks,
    tagMembership,
    untagMembership,
    listMemberships,
    // S3 — review engine ① (bare-reference delegation; the engine is a no-`this.` factory object)
    listMethods: review.listMethods,
    registerMethod: review.registerMethod,
    listCurves: review.listCurves,
    defineCurve: review.defineCurve,
    removeCurve: review.removeCurve,
    bindMethod: review.bindMethod,
    listBindings: review.listBindings,
    unbindMethod: review.unbindMethod,
    resolveDefaultMethod,
    // S4 — review engine ② (engine verbs by bare reference; rollupMastery is the knowledge-specific wrapper)
    recordReview: review.recordReview,
    getDue: review.getDue,
    dueIn: review.dueIn,
    deriveMastery: review.deriveMastery,
    rollupMastery,
  }
}
