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

import { and, eq, gte, isNull, lt, type SQL } from 'drizzle-orm'
import type {
  KnowledgeObject,
  ObjectKind,
  KnowledgeContainer,
  Reference,
  CompoundSet,
  KnowledgeLabEntry,
  EffectType,
  ReviewEvent,
} from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  knowledgeObjects,
  objectKinds,
  knowledgeContainers,
  references,
  compoundSets,
  knowledgeLabEntries,
  type KnowledgeObjectRow,
  type ObjectKindRow,
  type KnowledgeContainerRow,
  type ReferenceRow,
  type CompoundSetRow,
  type KnowledgeLabEntryRow,
} from '../../db/schema/knowledge'
import {
  tags,
  entityTags,
  type EntityTagRow,
  type EntityLinkRow,
} from '../../db/schema/foundation/spaces'
import { reviewEvents } from '../../db/schema/foundation/knowledge-review'
import type { PageRow } from '../../db/schema/notes'
import type { RecordReviewInput } from '../../foundation/review'
import type { AiRequest } from '../../foundation/ai'
import type { IngestionAct } from '../../foundation/ingestion'
import { TagNotFound } from '../../foundation/spaces'
import { rollup } from '../../foundation/measurement'
import {
  CreateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
  CreateKnowledgeContainerSchema,
  AddReferenceSchema,
  BuildCompoundSetSchema,
  CreateLabEntrySchema,
  ConcludeLabEntrySchema,
  PromoteToObjectSchema,
} from '../../validators/knowledge'
import {
  KNOWLEDGE_OBJECT_ENTITY_TYPE,
  KnowledgeObjectNotFoundError,
  ObjectKindNotFoundError,
  InvalidParentRefError,
  HierarchyCycleError,
  KnowledgeContainerNotFoundError,
  ReferenceNotFoundError,
  LabEntryNotFoundError,
  LabEntryNotConcludedError,
  LabEntryAlreadyPromotedError,
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
  type MasterySource,
  type CompoundSetSpec,
  type CreateLabEntryInput,
  type PromoteToObjectInput,
  type AiAssistResult,
  type KnowledgeSearchResult,
  type AutoPopulateResult,
  type KnowledgeDayDigest,
} from './types'

/** KNO-03 — the shipped default kinds (KN-4 realms). `topic` = a spine node → realm null (not a study
 *  target); concept = understand, definition = memorize (Ultralearning; identity.md:8-9). All editable/removable. */
const SEED_KINDS: readonly CreateObjectKindInput[] = [
  { name: 'topic', learning_realm: null, is_default: true },
  { name: 'concept', learning_realm: 'understand', is_default: true },
  { name: 'definition', learning_realm: 'memorize', is_default: true },
]

// --- S8 domain-event fan-out (KNO-38/39/40) ---------------------------------
// Milliseconds per day. Module-LOCAL const (the review engine's DAY_MS is module-private with no shared export;
// each consumer owns its own — habits/service.ts:78 + review/engine.ts:54 both do). Used by getDayKnowledgeDigest.
const DAY_MS = 86_400_000

// Domain event names → EffectEvent.transition (NOT effectType — H1/BR-KN-S8-4). effectType is a catalogue member.
const EVT_REVIEW_RECORDED = 'review.recorded'
const EVT_MASTERY_CHANGED = 'mastery.changed'

// The catalogue effectType SETS each domain event fans out to (H3). review.recorded → measurement (mastery
// re-derive, KNO-39) + gamification (award_xp, KNO-39); mastery.changed → Education measurement source (KNO-40).
// object.created/lab.concluded push NOTHING — the Journal is pull-aggregated (ADR-004 §3.2.5:84), served by the
// registerKnowledgeJournal digest, and no consumer names a keyed/additive effect for them (No-Guessing, H3).
const REVIEW_RECORDED_EFFECTS: readonly EffectType[] = ['emit_measurement_signal', 'award_xp']
const MASTERY_CHANGED_EFFECTS: readonly EffectType[] = ['emit_measurement_signal']

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
// S6 — `spec` stays the OPAQUE JSON string (@vida/types `CompoundSet.spec: string` at rest — never parsed here;
// the write boundary serialized it, a consumer parses if it needs the structure, headline #5). Only _sync_status casts.
const toCompoundSet = (r: CompoundSetRow): CompoundSet => ({
  ...r,
  _sync_status: r._sync_status as CompoundSet['_sync_status'],
})
// S6 — `data_refs` is json<string[]>() ($type lie): parse on read (the key_concepts precedent), unlike `spec` which
// @vida/types keeps a string. `hypothesis`/`conclusion` are [E] plaintext pass-through in M1.0.
const toLabEntry = (r: KnowledgeLabEntryRow): KnowledgeLabEntry => ({
  ...r,
  data_refs: parseJsonArray<string>(r.data_refs as unknown as string | null),
  _sync_status: r._sync_status as KnowledgeLabEntry['_sync_status'],
})

export function createKnowledgeService(deps: KnowledgeServiceDeps): KnowledgeService {
  const { db, deviceId, spaces, backlinks, review, notes, ai, ingestion, effects } = deps

  const kindsRepo = createRepository(db, objectKinds, { deviceId, softDelete: true, encryptedFields: [] })
  const objectsRepo = createRepository(db, knowledgeObjects, { deviceId, softDelete: true, encryptedFields: [] })
  // S2 WRITE repos (own tables).
  const containersRepo = createRepository(db, knowledgeContainers, { deviceId, softDelete: true, encryptedFields: [] })
  const referencesRepo = createRepository(db, references, { deviceId, softDelete: true, encryptedFields: [] })
  // S6 WRITE repos (own tables). encryptedFields:[] M1.0 pass-through ([E] spec/hypothesis/conclusion → M3/DB-5).
  const compoundSetsRepo = createRepository(db, compoundSets, { deviceId, softDelete: true, encryptedFields: [] })
  const labEntriesRepo = createRepository(db, knowledgeLabEntries, { deviceId, softDelete: true, encryptedFields: [] })
  // S2 READ-ONLY repos (junction/tag reads; link/tag WRITES delegate to `spaces`, BR-S2-6). findWhere/findById only.
  const entityTagRepo = createRepository(db, entityTags, { deviceId, softDelete: true, encryptedFields: [] })
  const tagsRepo = createRepository(db, tags, { deviceId, softDelete: true, encryptedFields: [] })
  // S8 READ-ONLY repo for the Journal digest count (reviews recorded that day). review_events is append-only
  // (no softDelete — the engine's eventsRepo setup, engine.ts:98); the engine owns the WRITE path (recordReview).
  const reviewEventsRepo = createRepository(db, reviewEvents, { deviceId, encryptedFields: [] })

  // --- S8 domain-event fan-out (KNO-38/39/40) -------------------------------
  // Emit-only PUSH onto the effect rail: post-commit, failure-isolated, rail-idempotent, dormant without a
  // registered handler (BR-KN-S8-1/2/3; the habits/service.ts:143-158 precedent). subjectNaturalKey = the
  // occurrence's UUIDv7 id (a review_event.id — the exactly-once grain per ADR-004 §3.2.5:100 + effects BR-2;
  // NOT a bare transition, which would dedup distinct reviews). targetRef = the affected object.
  const fanOut = async (
    subjectNaturalKey: string,
    transition: string,
    targetRef: string,
    effectTypes: readonly EffectType[],
  ): Promise<void> => {
    if (!effects) return // M1 default: no rail wired → whole fan-out dormant (BR-KN-S8-7)
    for (const effectType of effectTypes) {
      // Dormant guard (BR-KN-S8-2): a non-projection effect with no handler would throw NoEffectHandler.
      if (!effects.registry.resolve(effectType)) continue
      try {
        await effects.rail.applyEffect({ subjectNaturalKey, transition, effectType, targetRef })
      } catch {
        // Post-commit, failure-isolated (BR-KN-S8-1): the persisted mutation stands; a handler throw is non-fatal.
      }
    }
  }

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

  /** KNO-25 — the KN-10 cross-module mastery SOURCE for Education (`business-rules.md` KN-10:51-55). Knowledge
   *  exposes the 3-signal source; Education owns the Program-level rollup + the syllabus-as-calendar entity.
   *  `subjectRef` = the Subject-level `knowledge_object` id on the `parent_object_id` spine (`structure-data.md:
   *  28-30` — all of Subject/Unit/Topic/kinds ARE knowledge_objects), NOT the `container_type='subject'` container.
   *  Subject-level-ness is positional (no level attribute), so the ref is trusted from the caller; the existence
   *  guard rides `rollupMastery` (→ KnowledgeObjectNotFoundError, BR-S5-5). */
  async function getMasterySource(subjectRef: string): Promise<MasterySource> {
    const objectMastery = await rollupMastery(subjectRef) // signal 1 (KNO-24): rolls the spine up; 0–100 | null
    // SEAM (KNO-26/27): Education's assessments + syllabus-as-calendar entities are unbuilt → both signals are
    // null, never fabricated (BR-S5-2/3/4; No-Guessing). `null` = unmeasured = the KNO-42 flag. No logger seam
    // exists at this service layer → the return type + this comment ARE the visibility (F3). Computed here once
    // Education's entities land (a mismatch-detection read of KNO-42 also unlocks then).
    return { objectMastery, assessmentResults: null, paceVsSyllabus: null }
  }

  // --- S6: pages-notes (KNO-28) ---------------------------------------------
  /** KNO-28 (BR-S6-1/2) — the object's knowledge note is a `pages` row keyed on the knowledge `entity_type` (KN-5),
   *  NEVER a `knowledge_notes` insert (retired). `ensureEntityNote` is idempotent (returns existing or creates);
   *  PageType `'note'` + `entity_type='knowledge_object'` is the KN-5 distinguisher (conventions.md:14-15). Seed
   *  title defaults to the object title. */
  async function openObjectNote(objectId: string): Promise<PageRow> {
    const obj = await objectsRepo.findById(objectId)
    if (obj == null) throw new KnowledgeObjectNotFoundError(objectId)
    return notes.ensureEntityNote('note', KNOWLEDGE_OBJECT_ENTITY_TYPE, objectId, { title: obj.title })
  }

  // --- S6: compound sets (KNO-31/32) ----------------------------------------
  /** KNO-31 (BR-S6-3) — build a per-consumer compound set. `spec` = a structured blob serialized to the opaque [E]
   *  JSON TEXT column at the write boundary (@vida/types keeps it `string` at rest; plain text() column → the assigned
   *  string needs no cast, unlike json<T>() `data_refs`). `consumer_module` OPEN (no CHECK). */
  async function buildCompoundSet(
    consumerModule: string,
    spec?: CompoundSetSpec | null,
    name?: string | null,
  ): Promise<CompoundSet> {
    const v = BuildCompoundSetSchema.parse({ consumer_module: consumerModule, spec, name })
    const row = await compoundSetsRepo.create({
      consumer_module: v.consumer_module,
      name: v.name ?? null,
      spec: v.spec != null ? JSON.stringify(v.spec) : null, // opaque JSON blob at the boundary (headline #5)
      is_default: false, // notNull default false — backfill (create echoes input)
      deleted_at: null,
    } satisfies CreateInput<typeof compoundSets>)
    return toCompoundSet(row)
  }

  /** KNO-32 (BR-S6-4) — anti-lost + idempotent (KN-11): return the consumer's existing default set, else create one
   *  so no user is forced to personalize. The default's `spec` contents are a design-pass (No-Guessing: null, not
   *  an invented rule-set) — the point is the row EXISTS. */
  async function applyDefaultCompoundSet(consumerModule: string): Promise<CompoundSet> {
    const existing = await compoundSetsRepo.findWhere(
      and(
        eq(compoundSets.consumer_module, consumerModule),
        eq(compoundSets.is_default, true),
        isNull(compoundSets.deleted_at),
      )!,
    )
    if (existing.length > 0) return toCompoundSet(existing[0]!)
    const row = await compoundSetsRepo.create({
      consumer_module: consumerModule,
      name: null,
      spec: null, // shipped-default placeholder; personalizable later (design-pass, No-Guessing)
      is_default: true,
      deleted_at: null,
    } satisfies CreateInput<typeof compoundSets>)
    return toCompoundSet(row)
  }

  /** KNO-31 companion (BR-S6-5) — the consumer's live sets (findWhere skips the soft-delete filter → add it). */
  async function listCompoundSets(consumerModule: string): Promise<CompoundSet[]> {
    const rows = await compoundSetsRepo.findWhere(
      and(eq(compoundSets.consumer_module, consumerModule), isNull(compoundSets.deleted_at))!,
    )
    return rows.map(toCompoundSet)
  }

  // --- S6: AI-assist (KNO-33) — extension-model, deny-safe -------------------
  /** KNO-33 (BR-S6-6) — opt-in, consent-gated AI-assist. `askModel` THROWS `AiDenied` on every deny path (the real
   *  service denies in M1: both ports absent) → mapped to `ai-unavailable`; absent `ai` dep ⇒ `ai-unavailable`. The
   *  caller supplies the `AiRequest` (mode + consent proof); Knowledge never auto-applies nor holds a model key.
   *  `consumerModule` is the M2 suggestion scope (unused in M1 — no suggestion is generated; deny-safe). */
  async function assistCompoundSet(_consumerModule: string, req: AiRequest): Promise<AiAssistResult> {
    if (ai == null) return { status: 'ai-unavailable' }
    try {
      const res = await ai.askModel(req)
      return { status: 'ready', suggestion: res.content }
    } catch (err) {
      return { status: 'ai-unavailable', reason: err instanceof Error ? err.message : String(err) }
    }
  }

  // --- S6: Knowledge Lab (KNO-34/35/36) -------------------------------------
  /** KNO-34 (BR-S6-7) — start a lab entry. `data_refs` = json<string[]>() → stringify at the boundary (the
   *  key_concepts precedent; one cast). `conclusion`/`promoted_object_id` null at birth. */
  async function createLabEntry(input: CreateLabEntryInput): Promise<KnowledgeLabEntry> {
    const v = CreateLabEntrySchema.parse(input)
    const row = await labEntriesRepo.create({
      hypothesis: v.hypothesis,
      data_refs: (v.data_refs != null ? JSON.stringify(v.data_refs) : null) as unknown as string[] | null,
      conclusion: null, // birth: not concluded
      promoted_object_id: null, // birth: not promoted
      deleted_at: null,
    } satisfies CreateInput<typeof knowledgeLabEntries>)
    return toLabEntry(row)
  }

  /** KNO-35 (BR-S6-8) — set the conclusion (re-conclude allowed — no immutability rule). Re-read for a faithful full
   *  row (update echoes only the patch). */
  async function concludeLabEntry(id: string, conclusion: string): Promise<KnowledgeLabEntry> {
    const v = ConcludeLabEntrySchema.parse({ conclusion })
    if ((await labEntriesRepo.findById(id)) == null) throw new LabEntryNotFoundError(id)
    await labEntriesRepo.update(id, { conclusion: v.conclusion } as UpdateInput<typeof knowledgeLabEntries>)
    const updated = await labEntriesRepo.findById(id)
    return toLabEntry(updated as KnowledgeLabEntryRow)
  }

  /** KNO-36 (BR-S6-9) — promote a concluded, un-promoted entry into a catalog object (title=hypothesis,
   *  description=conclusion), then stamp `promoted_object_id`. `createObject` validates kind + parent (KNO-04/08). The
   *  `lab.concluded` EVENT fan-out is S8 (decomposition.md:32,108) — NOT emitted here. */
  async function promoteToObject(entryId: string, input: PromoteToObjectInput): Promise<KnowledgeObject> {
    const v = PromoteToObjectSchema.parse(input)
    const entry = await labEntriesRepo.findById(entryId)
    if (entry == null) throw new LabEntryNotFoundError(entryId)
    if (entry.conclusion == null) throw new LabEntryNotConcludedError(entryId)
    if (entry.promoted_object_id != null) throw new LabEntryAlreadyPromotedError(entryId)
    const object = await createObject({
      kind_id: v.kind_id,
      parent_object_id: v.parent_object_id ?? null,
      title: entry.hypothesis,
      description: entry.conclusion,
    })
    // Create-then-stamp (a failed create leaves nothing to orphan). The stamp is a separate write — eventually
    // consistent per the platform no-FK app-layer convention (not wrapped in a tx here); a future S8 that emits
    // `lab.concluded` post-commit could co-transact if strict atomicity is ever required.
    await labEntriesRepo.update(entryId, {
      promoted_object_id: object.id,
    } as UpdateInput<typeof knowledgeLabEntries>)
    return object
  }

  /** KNO-34 companion (BR-S6-10) — live lab entries (findWhere skips the soft-delete filter → add it). */
  async function listLabEntries(): Promise<KnowledgeLabEntry[]> {
    const rows = await labEntriesRepo.findWhere(isNull(knowledgeLabEntries.deleted_at))
    return rows.map(toLabEntry)
  }

  // --- S6: search seam (KNO-37) — DB-8 deferred -----------------------------
  /** KNO-37 (BR-S6-11) — FTS5 `fts_knowledge` is unbuilt (DB-8) → a loud typed unavailable state, never a silent
   *  empty list (the platform-wide `'search-unavailable'` convention). `query` unused until DB-8 lands. */
  async function searchKnowledge(_query: string): Promise<KnowledgeSearchResult> {
    return { status: 'search-unavailable' }
  }

  // --- S6: auto-population seam (KNO-43) — ingestion, deny-safe --------------
  /** KNO-43 (BR-S6-12) — opt-in device-side auto-population. Map the optional ingestion guard's `IngestionDecision`:
   *  absent ⇒ `ingestion-unavailable`; `!permitted` ⇒ `refused` (refuse-not-downgrade); `permitted` ⇒
   *  `parser-unavailable` (source parsers are deferred, decomposition.md:90 — the real M1 seam). `checkIngestion`
   *  never touches the mediator (guard.ts:48-81). */
  async function autoPopulate(act: IngestionAct): Promise<AutoPopulateResult> {
    if (ingestion == null) return { status: 'ingestion-unavailable' }
    const d = await ingestion.checkIngestion(act)
    // `reason` is always set on a deny path (guard.ts:52/60/66/77) — a deny without a reason is unreachable.
    if (!d.permitted) return { status: 'refused', reason: d.reason!, disclosure: d.disclosure }
    return { status: 'parser-unavailable' }
  }

  // --- S8: review.recorded / mastery.changed fan-out (KNO-39/40) -------------
  /** KNO-39/40 (BR-KN-S8-3/4) — wrap the engine's `recordReview` so a review recorded THROUGH the knowledge
   *  service fans out post-commit. `review.recorded` fires unconditionally (a review WAS recorded); `mastery.changed`
   *  fires ONLY when `quality != null` (H4b: it is the re-derive OUTPUT, `contract.md:70`, and per BR-KN-S4-3 the
   *  derive-on-read mastery moves only on a non-null quality — a null-quality review would send Education a false
   *  "changed"). Grain = the returned `ev.id` (exactly-once per review); targetRef = the reviewed object.
   *  Flashcards' direct `review.recordReview` deliberately does NOT route here (fires nothing in M1, BR-KN-S7-5). */
  async function recordReview(input: RecordReviewInput): Promise<ReviewEvent> {
    const ev = await review.recordReview(input)
    await fanOut(ev.id, EVT_REVIEW_RECORDED, ev.object_id, REVIEW_RECORDED_EFFECTS)
    if (ev.quality != null) await fanOut(ev.id, EVT_MASTERY_CHANGED, ev.object_id, MASTERY_CHANGED_EFFECTS)
    return ev
  }

  // --- S8: dated Journal digest (KNO-38/39) ---------------------------------
  /** KNO-38/39 (BR-KN-S8-6) — the day's objects-created + reviews-recorded counts, over the UTC-day window of the
   *  `YYYY-MM-DD` date (`Date.parse(`${date}T00:00:00Z`)` — the habits:79/checkins:104 date→ms convention;
   *  per-user-tz day boundaries are a documented refinement). Feeds the `registerKnowledgeJournal` summary. This is
   *  the PULL path by which `object.created`/`review.recorded` reach the daily dashboard (ADR-004 §3.2.5:84). */
  async function getDayKnowledgeDigest(date: string): Promise<KnowledgeDayDigest> {
    const from = Date.parse(`${date}T00:00:00Z`)
    const to = from + DAY_MS
    // count() (not findWhere) — it skips decryptAll on rows we only tally AND auto-applies the soft-delete
    // filter (count/findAll/findById do; findWhere does not). objectsRepo is softDelete:true → deleted objects
    // are excluded automatically; reviewEventsRepo is append-only (no deleted_at) → notDeleted() is a no-op.
    const objectsCreated = await objectsRepo.count(
      and(gte(knowledgeObjects.created_at, from), lt(knowledgeObjects.created_at, to)) as SQL,
    )
    const reviewsRecorded = await reviewEventsRepo.count(
      and(gte(reviewEvents.reviewed_at, from), lt(reviewEvents.reviewed_at, to)) as SQL,
    )
    return { objectsCreated, reviewsRecorded }
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
    // NB: recordReview is the S8 WRAPPER (fan-out), not the bare engine reference — see the S8 block below.
    recordReview,
    getDue: review.getDue,
    dueIn: review.dueIn,
    deriveMastery: review.deriveMastery,
    rollupMastery,
    // S5 — cross-module measurement source (KNO-25/26/27/42)
    getMasterySource,
    // S6 — pages-notes + compound sets + lab + ai/search/ingestion seams (KNO-28,31,32,33,34,35,36,37,43)
    openObjectNote,
    buildCompoundSet,
    applyDefaultCompoundSet,
    listCompoundSets,
    assistCompoundSet,
    createLabEntry,
    concludeLabEntry,
    promoteToObject,
    listLabEntries,
    searchKnowledge,
    autoPopulate,
    // S8 — Journal digest (KNO-38/39); the event fan-out rides recordReview above (KNO-39/40)
    getDayKnowledgeDigest,
  }
}
