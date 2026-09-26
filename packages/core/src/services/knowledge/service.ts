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
import type { KnowledgeObject, ObjectKind } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  knowledgeObjects,
  objectKinds,
  type KnowledgeObjectRow,
  type ObjectKindRow,
} from '../../db/schema/knowledge'
import {
  CreateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
} from '../../validators/knowledge'
import {
  KnowledgeObjectNotFoundError,
  ObjectKindNotFoundError,
  InvalidParentRefError,
  HierarchyCycleError,
  type KnowledgeService,
  type KnowledgeServiceDeps,
  type CreateObjectKindInput,
  type CreateKnowledgeObjectInput,
  type UpdateKnowledgeObjectInput,
  type ObjectFilter,
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

export function createKnowledgeService(deps: KnowledgeServiceDeps): KnowledgeService {
  const { db, deviceId } = deps

  const kindsRepo = createRepository(db, objectKinds, { deviceId, softDelete: true, encryptedFields: [] })
  const objectsRepo = createRepository(db, knowledgeObjects, { deviceId, softDelete: true, encryptedFields: [] })

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

  return {
    seedDefaultKinds,
    createKind,
    listKinds,
    createObject,
    updateObject,
    getObject,
    listObjects,
    deleteObject,
  }
}
