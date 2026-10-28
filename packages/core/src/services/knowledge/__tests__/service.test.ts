// ============================================================================
// mod-knowledge #50 ① · S1 — kinds + objects + hierarchy (LIF-128)
//
// Node / better-sqlite3 live-store harness (mirrors habits): REAL store, UNLOCKED vault (the
// sync-hash path runs even with empty [E]), migrate() applies 022_knowledge so the tables exist.
// Covers the S1 Verification Gate: seed idempotency + re-seed-when-cleared · kind CRUD · object CRUD
// happy · referential-integrity rejects (kind + parent) · cycle guard (self + ancestor) ·
// mastery NOT hand-settable (KN-9) · key_concepts JSON round-trip (the json<T> write/read boundary) ·
// faithful create echo (defaults backfilled, nullables null) · listObjects filtering · soft-delete
// hides + co-transactional sync_queue enqueue.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { knowledgeObjects, objectKinds } from '../../../db/schema/knowledge'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService, type SpacesService } from '../../../foundation/spaces/service'
import { TagNotFound, UnknownEntityType } from '../../../foundation/spaces/types'
import { createCapabilityRegistry } from '../../../foundation/capability'
import { createReviewEngine } from '../../../foundation/review'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../../notes'
import { AiDenied, type AiService, type AiRequest } from '../../../foundation/ai'
import type { IngestionGuard, IngestionAct, LeakDisclosure } from '../../../foundation/ingestion'
import {
  createKnowledgeService,
  ObjectKindNotFoundError,
  InvalidParentRefError,
  HierarchyCycleError,
  KnowledgeObjectNotFoundError,
  KnowledgeContainerNotFoundError,
  ReferenceNotFoundError,
  LabEntryNotFoundError,
  LabEntryNotConcludedError,
  LabEntryAlreadyPromotedError,
  type KnowledgeService,
  type KnowledgeServiceDeps,
} from '../index'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

interface Harness {
  svc: KnowledgeService
  db: DrizzleDb
  bsql: Database.Database
  spaces: SpacesService
  /** Base deps (notes wired; NO ai/ingestion) — S6 deny-safe/mapping tests rebuild the service with stubs. */
  deps: KnowledgeServiceDeps
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  // S2 deps: the shared registry seeds knowledge_object/container/reference from ENTITY_TYPES (no register()
  // needed); spaces = the write half, backlinks = the read half (NotesService harness recipe).
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  // S3 deps: the review engine composes the ONE capability registry (kind='study_method' partition).
  const capability = createCapabilityRegistry(db, 'test-device')
  const review = createReviewEngine(db, 'test-device', { capability })
  // S6 dep: the REAL notes service (its own deps mirror the knowledge harness — same registry/spaces/backlinks).
  const notes = createNotesService({ db, deviceId: 'test-device', spaces, backlinks, registry })
  const deps: KnowledgeServiceDeps = { db, deviceId: 'test-device', spaces, backlinks, review, notes }
  const svc = createKnowledgeService(deps)
  return { svc, db, bsql, spaces, deps }
}

/** Helper: seed + return a usable kind id (the `topic` default). */
async function seededTopicKindId(svc: KnowledgeService): Promise<string> {
  await svc.seedDefaultKinds()
  const kinds = await svc.listKinds()
  return kinds.find((k) => k.name === 'topic')!.id
}

describe('mod-knowledge S1 — kinds + objects + hierarchy', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // --- KNO-03 seed ----------------------------------------------------------
  it('seedDefaultKinds seeds topic/concept/definition with realms + is_default (KNO-03, BR-S1-2)', async () => {
    await h.svc.seedDefaultKinds()
    const kinds = await h.svc.listKinds()
    expect(kinds.map((k) => k.name).sort()).toEqual(['concept', 'definition', 'topic'])
    const byName = Object.fromEntries(kinds.map((k) => [k.name, k]))
    expect(byName.topic.learning_realm).toBeNull() // spine node, not a study target
    expect(byName.concept.learning_realm).toBe('understand')
    expect(byName.definition.learning_realm).toBe('memorize')
    expect(kinds.every((k) => k.is_default)).toBe(true)
  })

  it('seedDefaultKinds is idempotent — a second call adds nothing (KNO-03)', async () => {
    await h.svc.seedDefaultKinds()
    await h.svc.seedDefaultKinds()
    expect((await h.svc.listKinds()).length).toBe(3)
  })

  it('seedDefaultKinds RE-seeds when the registry is fully cleared (removable defaults, BR-S1-2)', async () => {
    await h.svc.seedDefaultKinds()
    // wipe (defaults are removable) — soft-delete all rows directly (no deleteKind in the S1 surface)
    for (const k of await h.svc.listKinds()) {
      await h.db.update(objectKinds).set({ deleted_at: Date.now() }).where(eq(objectKinds.id, k.id)).run()
    }
    expect((await h.svc.listKinds()).length).toBe(0)
    await h.svc.seedDefaultKinds()
    expect((await h.svc.listKinds()).length).toBe(3)
  })

  // --- KNO-01/02 kind CRUD --------------------------------------------------
  it('createKind + listKinds — user-extensible, soft-delete filtered (KNO-01/02)', async () => {
    const k = await h.svc.createKind({ name: 'theorem', learning_realm: 'understand' })
    expect(k.id).toBeTruthy()
    expect(k.name).toBe('theorem')
    expect(k.is_default).toBe(false) // default backfilled
    expect(k.default_method_id).toBeNull()
    expect(k.deleted_at).toBeNull() // faithful echo (not undefined) — MINOR-A regression
    expect((await h.svc.listKinds()).some((x) => x.id === k.id)).toBe(true)
  })

  it('createKind rejects an empty name (validator)', async () => {
    await expect(h.svc.createKind({ name: '' })).rejects.toThrow()
  })

  // --- KNO-04 createObject happy + faithful echo ----------------------------
  it('createObject echoes a FAITHFUL row — defaults backfilled, nullables null (KNO-04, BR-S1-6)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'Bayes theorem' })
    expect(obj.id).toBeTruthy()
    expect(obj.kind_id).toBe(kindId)
    expect(obj.title).toBe('Bayes theorem')
    expect(obj.is_exam_topic).toBe(false) // default backfilled
    expect(obj.sort_order).toBe(0) // default backfilled
    expect(obj.parent_object_id).toBeNull() // nullable coalesced (not undefined)
    expect(obj.description).toBeNull()
    expect(obj.key_concepts).toBeNull()
    expect(obj.mastery_level).toBeNull() // DERIVED — never set at birth (KN-9)
    expect(obj.status).toBeNull()
  })

  it('key_concepts round-trips through the json<T> TEXT boundary (write stringify → read parse)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({
      kind_id: kindId,
      title: 'Entropy',
      key_concepts: ['surprise', 'information', 'bits'],
    })
    expect(obj.key_concepts).toEqual(['surprise', 'information', 'bits'])
    // re-read from the store proves it persisted as parseable JSON, not "[object Object]" / a bind error
    const reread = await h.svc.getObject(obj.id)
    expect(reread!.key_concepts).toEqual(['surprise', 'information', 'bits'])
  })

  it('createObject nests under a parent via parent_object_id (KNO-04, KN-3)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const parent = await h.svc.createObject({ kind_id: kindId, title: 'Probability' })
    const child = await h.svc.createObject({ kind_id: kindId, title: 'Conditional', parent_object_id: parent.id })
    expect(child.parent_object_id).toBe(parent.id)
  })

  // --- KNO-08 referential integrity ----------------------------------------
  it('createObject rejects an unresolved kind_id (ObjectKindNotFoundError, KNO-08)', async () => {
    await expect(h.svc.createObject({ kind_id: 'nope', title: 'x' })).rejects.toBeInstanceOf(ObjectKindNotFoundError)
  })

  it('createObject rejects an unresolved parent_object_id (InvalidParentRefError, KNO-08)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    await expect(h.svc.createObject({ kind_id: kindId, title: 'x', parent_object_id: 'ghost' })).rejects.toBeInstanceOf(
      InvalidParentRefError,
    )
  })

  // --- KNO-08 cycle guard ---------------------------------------------------
  it('updateObject rejects self-parent (HierarchyCycleError, KNO-08)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const a = await h.svc.createObject({ kind_id: kindId, title: 'A' })
    await expect(h.svc.updateObject(a.id, { parent_object_id: a.id })).rejects.toBeInstanceOf(HierarchyCycleError)
  })

  it('updateObject rejects an ancestor-loop cycle (HierarchyCycleError, KNO-08)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const a = await h.svc.createObject({ kind_id: kindId, title: 'A' })
    const b = await h.svc.createObject({ kind_id: kindId, title: 'B', parent_object_id: a.id })
    // A → B would loop (B is already A's child)
    await expect(h.svc.updateObject(a.id, { parent_object_id: b.id })).rejects.toBeInstanceOf(HierarchyCycleError)
  })

  it('updateObject rejects an unresolved kind_id (ObjectKindNotFoundError, KNO-08 update path)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'X' })
    await expect(h.svc.updateObject(obj.id, { kind_id: 'nope' })).rejects.toBeInstanceOf(ObjectKindNotFoundError)
  })

  it('updateObject rejects an unresolved parent_object_id (InvalidParentRefError, KNO-08 update path)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'X' })
    await expect(h.svc.updateObject(obj.id, { parent_object_id: 'ghost' })).rejects.toBeInstanceOf(
      InvalidParentRefError,
    )
  })

  it('updateObject can detach to root (parent_object_id → null), skipping integrity checks (KNO-05)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const parent = await h.svc.createObject({ kind_id: kindId, title: 'P' })
    const child = await h.svc.createObject({ kind_id: kindId, title: 'C', parent_object_id: parent.id })
    const detached = await h.svc.updateObject(child.id, { parent_object_id: null })
    expect(detached.parent_object_id).toBeNull()
  })

  // --- KNO-05 update + mastery unsettable -----------------------------------
  it('updateObject mutates fields + re-reads faithfully (KNO-05)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'Old' })
    const updated = await h.svc.updateObject(obj.id, { title: 'New', is_exam_topic: true })
    expect(updated.title).toBe('New')
    expect(updated.is_exam_topic).toBe(true)
  })

  it('mastery_level can NOT be hand-set on update — the schema omits it (KN-9, the Antigravity bug fix)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'X' })
    // pass mastery_level via an untyped patch — the Zod schema strips the unknown key
    await h.svc.updateObject(obj.id, { title: 'Y', mastery_level: 99 } as never)
    const reread = await h.svc.getObject(obj.id)
    expect(reread!.mastery_level).toBeNull() // never written
  })

  // --- KNO-07 listObjects filter -------------------------------------------
  it('listObjects filters by kind / parent (incl. roots) / status (KNO-07)', async () => {
    const topicKind = await seededTopicKindId(h.svc)
    const conceptKind = (await h.svc.listKinds()).find((k) => k.name === 'concept')!.id
    const root = await h.svc.createObject({ kind_id: topicKind, title: 'Root', status: 'in_progress' })
    await h.svc.createObject({ kind_id: conceptKind, title: 'Child', parent_object_id: root.id })

    expect((await h.svc.listObjects({ kindId: topicKind })).length).toBe(1)
    expect((await h.svc.listObjects({ kindId: conceptKind })).length).toBe(1)
    expect((await h.svc.listObjects({ parentObjectId: null })).map((o) => o.title)).toEqual(['Root'])
    expect((await h.svc.listObjects({ parentObjectId: root.id })).map((o) => o.title)).toEqual(['Child'])
    expect((await h.svc.listObjects({ status: 'in_progress' })).length).toBe(1)
    expect((await h.svc.listObjects()).length).toBe(2)
  })

  // --- KNO-06 get + delete --------------------------------------------------
  it('getObject returns null for a missing id (KNO-06)', async () => {
    expect(await h.svc.getObject('missing')).toBeNull()
  })

  it('deleteObject soft-deletes — hidden from reads, row retained (KNO-04 CRUD, BR-S1-9)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'Doomed' })
    await h.svc.deleteObject(obj.id)
    expect(await h.svc.getObject(obj.id)).toBeNull()
    expect((await h.svc.listObjects()).length).toBe(0)
    // the row is retained with deleted_at set (soft delete)
    const raw = await h.db.select().from(knowledgeObjects).where(eq(knowledgeObjects.id, obj.id)).all()
    expect(raw.length).toBe(1)
    expect(raw[0]!.deleted_at).not.toBeNull()
  })

  it('deleteObject throws for a missing id (KnowledgeObjectNotFoundError)', async () => {
    await expect(h.svc.deleteObject('nope')).rejects.toBeInstanceOf(KnowledgeObjectNotFoundError)
  })

  // --- co-transactional sync_queue enqueue ---------------------------------
  it('createObject co-transactionally enqueues a sync_queue row (ADR-004 §3.4)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'Synced' })
    const q = await h.db.select().from(syncQueue).where(eq(syncQueue.row_id, obj.id)).all()
    expect(q.length).toBeGreaterThanOrEqual(1)
  })
})

describe('mod-knowledge S2 — containers + references + link/tag cross-cut', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  /** Helper: a seeded object to hang references/links on. */
  async function anObject(title = 'Bayes'): Promise<string> {
    const kindId = await seededTopicKindId(h.svc)
    return (await h.svc.createObject({ kind_id: kindId, title })).id
  }

  // --- KNO-12/14 containers -------------------------------------------------
  it('createContainer persists a {container_type,name} row + faithful echo (KNO-12)', async () => {
    const c = await h.svc.createContainer({ container_type: 'module', name: 'Health OS' })
    expect(c.id).toBeTruthy()
    expect(c.container_type).toBe('module')
    expect(c.name).toBe('Health OS')
    expect(c.deleted_at).toBeNull() // faithful echo (not undefined)
  })

  it('createContainer rejects an invalid container_type + empty name (validator)', async () => {
    await expect(h.svc.createContainer({ container_type: 'bogus' as never, name: 'X' })).rejects.toThrow()
    await expect(h.svc.createContainer({ container_type: 'area', name: '' })).rejects.toThrow()
  })

  it('listContainers filters by type + excludes soft-deleted (KNO-14, BR-S2-9)', async () => {
    const m = await h.svc.createContainer({ container_type: 'module', name: 'M' })
    await h.svc.createContainer({ container_type: 'area', name: 'A' })
    await h.svc.createContainer({ container_type: 'subject', name: 'S' })
    expect((await h.svc.listContainers()).length).toBe(3)
    expect((await h.svc.listContainers({ containerType: 'area' })).map((c) => c.name)).toEqual(['A'])
    await h.svc.deleteContainer(m.id)
    expect((await h.svc.listContainers()).length).toBe(2)
    expect((await h.svc.listContainers({ containerType: 'module' })).length).toBe(0)
  })

  it('deleteContainer guard-exists throws (KnowledgeContainerNotFoundError)', async () => {
    await expect(h.svc.deleteContainer('nope')).rejects.toBeInstanceOf(KnowledgeContainerNotFoundError)
  })

  // --- KNO-29/30 references -------------------------------------------------
  it('addReference persists object-scoped; listReferences returns only that object (KNO-29/30)', async () => {
    const objA = await anObject('A')
    const objB = await anObject('B')
    const r = await h.svc.addReference(objA, {
      title: 'Elements of Statistical Learning',
      source: 'book',
      url: 'https://x',
    })
    expect(r.id).toBeTruthy()
    expect(r.object_id).toBe(objA)
    expect(r.title).toBe('Elements of Statistical Learning')
    expect(r.source).toBe('book')
    expect(r.type).toBeNull() // nullable coalesced (faithful echo)
    await h.svc.addReference(objB, { title: 'other' })
    expect((await h.svc.listReferences(objA)).map((x) => x.title)).toEqual(['Elements of Statistical Learning'])
  })

  it('addReference rejects an unresolved object (KnowledgeObjectNotFoundError, BR-S2-8)', async () => {
    await expect(h.svc.addReference('ghost', { title: 'x' })).rejects.toBeInstanceOf(KnowledgeObjectNotFoundError)
  })

  it('removeReference soft-deletes — hidden from listReferences (companion)', async () => {
    const obj = await anObject()
    const r = await h.svc.addReference(obj, { title: 'doomed' })
    await h.svc.removeReference(r.id)
    expect((await h.svc.listReferences(obj)).length).toBe(0)
  })

  it('removeReference throws ReferenceNotFoundError for a missing id (MINOR-5 — precise error type)', async () => {
    await expect(h.svc.removeReference('nope')).rejects.toBeInstanceOf(ReferenceNotFoundError)
  })

  // --- KNO-10/11 links (write via spaces, read via backlinks) ---------------
  it('linkObject writes ONE link via spaces (page_id=objectId); listLinks reads it back (KNO-10)', async () => {
    const obj = await anObject()
    const link = await h.svc.linkObject(obj, { entityType: 'book', entityId: 'book-1' }, 'ch.3')
    expect(link.page_id).toBe(obj) // the object is the source anchor
    expect(link.entity_type).toBe('book')
    expect(link.entity_id).toBe('book-1')
    expect(link.context).toBe('ch.3')
    const links = await h.svc.listLinks(obj)
    expect(links.map((l) => l.entity_id)).toEqual(['book-1'])
  })

  it('linkObject supports MANY book links per object (KNO-11, restores linked_book_ids[])', async () => {
    const obj = await anObject()
    await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b1' })
    await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b2' })
    await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b3' })
    expect((await h.svc.listLinks(obj)).map((l) => l.entity_id).sort()).toEqual(['b1', 'b2', 'b3'])
  })

  it('linkObject is idempotent — a repeat link is a no-op, not a duplicate (spaces BR-14)', async () => {
    const obj = await anObject()
    const a = await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b1' })
    const b = await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b1' })
    expect(a.id).toBe(b.id)
    expect((await h.svc.listLinks(obj)).length).toBe(1)
  })

  it('linkObject rejects an unresolved object (KnowledgeObjectNotFoundError, BR-S2-8)', async () => {
    await expect(h.svc.linkObject('ghost', { entityType: 'book', entityId: 'b1' })).rejects.toBeInstanceOf(
      KnowledgeObjectNotFoundError,
    )
  })

  it('linkObject rejects an unregistered target entity_type (UnknownEntityType, delegated to spaces, BR-S2-7)', async () => {
    const obj = await anObject()
    await expect(h.svc.linkObject(obj, { entityType: 'not_a_real_type', entityId: 'x' })).rejects.toBeInstanceOf(
      UnknownEntityType,
    )
  })

  it('unlinkObject guards the object then soft-deletes the link (KNO-10, F4)', async () => {
    const obj = await anObject()
    await h.svc.linkObject(obj, { entityType: 'book', entityId: 'b1' })
    await h.svc.unlinkObject(obj, { entityType: 'book', entityId: 'b1' })
    expect((await h.svc.listLinks(obj)).length).toBe(0)
    await expect(h.svc.unlinkObject('ghost', { entityType: 'book', entityId: 'b1' })).rejects.toBeInstanceOf(
      KnowledgeObjectNotFoundError,
    )
  })

  // --- KNO-13/45 tag membership (write via spaces, read via entityTagRepo) --
  it('tagMembership records a membership via spaces; listMemberships reads it back (KNO-13)', async () => {
    const container = await h.svc.createContainer({ container_type: 'subject', name: 'Nutrition' })
    const tag = await h.spaces.createTag({ name: 'Nutrition' })
    const obj = await anObject()
    const m = await h.svc.tagMembership(container.id, { entityType: 'knowledge_object', entityId: obj }, tag.id)
    expect(m.tag_id).toBe(tag.id)
    expect(m.entity_id).toBe(obj)
    const members = await h.svc.listMemberships(tag.id)
    expect(members.map((x) => x.entity_id)).toEqual([obj])
  })

  it('tagMembership is many-to-many — one member in multiple containers/tags (KN-7)', async () => {
    const c1 = await h.svc.createContainer({ container_type: 'module', name: 'M1' })
    const c2 = await h.svc.createContainer({ container_type: 'module', name: 'M2' })
    const t1 = await h.spaces.createTag({ name: 'T1' })
    const t2 = await h.spaces.createTag({ name: 'T2' })
    const area = await h.svc.createContainer({ container_type: 'area', name: 'Shared Area' })
    // the Area container joins both modules (Areas may belong to multiple OS-modules)
    await h.svc.tagMembership(c1.id, { entityType: 'knowledge_container', entityId: area.id }, t1.id)
    await h.svc.tagMembership(c2.id, { entityType: 'knowledge_container', entityId: area.id }, t2.id)
    expect((await h.svc.listMemberships(t1.id)).map((x) => x.entity_id)).toEqual([area.id])
    expect((await h.svc.listMemberships(t2.id)).map((x) => x.entity_id)).toEqual([area.id])
  })

  it('tagMembership rejects an unresolved container (KnowledgeContainerNotFoundError, BR-S2-8)', async () => {
    const tag = await h.spaces.createTag({ name: 'T' })
    await expect(
      h.svc.tagMembership('ghost', { entityType: 'knowledge_object', entityId: 'x' }, tag.id),
    ).rejects.toBeInstanceOf(KnowledgeContainerNotFoundError)
  })

  it('tagMembership rejects a bogus scopedTag — no silent orphan (TagNotFound, F1/BR-S2-8b)', async () => {
    const container = await h.svc.createContainer({ container_type: 'subject', name: 'S' })
    const obj = await anObject()
    await expect(
      h.svc.tagMembership(container.id, { entityType: 'knowledge_object', entityId: obj }, 'no-such-tag'),
    ).rejects.toBeInstanceOf(TagNotFound)
    // and nothing was persisted (the orphan guard fired before the write)
    expect((await h.svc.listMemberships('no-such-tag')).length).toBe(0)
  })

  it('untagMembership guards the container then removes; scopedTag NOT guarded (F4)', async () => {
    const container = await h.svc.createContainer({ container_type: 'subject', name: 'S' })
    const tag = await h.spaces.createTag({ name: 'T' })
    const obj = await anObject()
    await h.svc.tagMembership(container.id, { entityType: 'knowledge_object', entityId: obj }, tag.id)
    await h.svc.untagMembership(container.id, { entityType: 'knowledge_object', entityId: obj }, tag.id)
    expect((await h.svc.listMemberships(tag.id)).length).toBe(0)
    // container guard fires on remove too
    await expect(
      h.svc.untagMembership('ghost', { entityType: 'knowledge_object', entityId: obj }, tag.id),
    ).rejects.toBeInstanceOf(KnowledgeContainerNotFoundError)
  })
})

// ============================================================================
// S3 — review engine ① delegation smoke (the ENGINE's own coverage lives in
// foundation/review/__tests__/engine.test.ts; here we prove KnowledgeService
// re-exposes the verbs against the composed engine + the resolveDefaultMethod
// kind-lookup wrapper that is the one non-pass-through).
// ============================================================================
describe('mod-knowledge S3 — review-engine delegation surface', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('KnowledgeService re-exposes methods/curves/bindings against the composed engine (KNO-15..19)', async () => {
    await h.svc.registerMethod({ id: 'feynman' })
    expect((await h.svc.listMethods()).map((m) => m.id)).toContain('feynman')

    const curve = await h.svc.defineCurve({ curve_kind: 'review', name: 'Custom', params: { ef: 2.5 } })
    expect((await h.svc.listCurves()).map((c) => c.id)).toContain(curve.id)

    const binding = await h.svc.bindMethod({
      targetType: 'topic',
      targetId: 'topic-1',
      methodId: 'feynman',
      curveId: curve.id,
    })
    expect((await h.svc.listBindings('topic', 'topic-1')).map((b) => b.id)).toContain(binding.id)

    await h.svc.unbindMethod(binding.id)
    expect((await h.svc.listBindings('topic', 'topic-1')).length).toBe(0)
    await h.svc.removeCurve(curve.id)
    expect((await h.svc.listCurves()).map((c) => c.id)).not.toContain(curve.id)
  })

  it('resolveDefaultMethod looks the kind up: default_method_id else null; ObjectKindNotFoundError on miss (KNO-20)', async () => {
    // a kind WITH an explicit override → tier 1
    const withMethod = await h.svc.createKind({
      name: 'drill-kind',
      learning_realm: 'memorize',
      default_method_id: 'flashcards',
    })
    expect(await h.svc.resolveDefaultMethod(withMethod.id)).toBe('flashcards')

    // a kind WITHOUT one → tier 2 = null (NO realm→id synthesis; that tier is S7)
    const noMethod = await h.svc.createKind({ name: 'plain-kind', learning_realm: 'memorize' })
    expect(await h.svc.resolveDefaultMethod(noMethod.id)).toBeNull()

    // unresolved kind → typed error
    await expect(h.svc.resolveDefaultMethod('ghost-kind')).rejects.toBeInstanceOf(ObjectKindNotFoundError)
  })
})

// ============================================================================
// S4 — review engine ②: rollupMastery over the parent_object_id tree + the
// derive/record delegation on the real knowledge surface (first service
// consumer of measurement.rollup + normalize — live-store).
// ============================================================================
describe('mod-knowledge S4 — rollupMastery over the object tree', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  /** a knowledge object (optionally under a parent). */
  async function anObject(title: string, parentObjectId?: string): Promise<string> {
    const kindId = await seededTopicKindId(h.svc)
    return (await h.svc.createObject({ kind_id: kindId, title, parent_object_id: parentObjectId ?? null })).id
  }

  it('rollupMastery = measurement.rollup of children, nulls excluded, bridged to 0–100 (KNO-24)', async () => {
    const parent = await anObject('Topic')
    const c1 = await anObject('c1', parent)
    const c2 = await anObject('c2', parent)
    await anObject('c3-unmeasured', parent) // no reviews → null → excluded from the rollup
    // record via the KnowledgeService surface (delegation → engine)
    await h.svc.recordReview({ objectId: c1, methodId: 'm', quality: 5 }) // → 100 → 1.0
    await h.svc.recordReview({ objectId: c2, methodId: 'm', quality: 3 }) // → 60  → 0.6
    // rollup([1.0, 0.6, null]) = 0.8 → 80 (the unmeasured child can't drag it down)
    expect(await h.svc.rollupMastery(parent)).toBe(80)
    // a leaf rolls up to its own derived mastery
    expect(await h.svc.rollupMastery(c1)).toBe(100)
  })

  it('rollupMastery recurses a 3-level tree (Unit → Topic → leaves), rolling up at each level (KNO-24)', async () => {
    const unit = await anObject('Unit')
    const topicA = await anObject('TopicA', unit) // node with leaves → 0.8
    const topicB = await anObject('TopicB', unit) // node with one leaf → 1.0
    const a1 = await anObject('a1', topicA)
    const a2 = await anObject('a2', topicA)
    const b1 = await anObject('b1', topicB)
    await h.svc.recordReview({ objectId: a1, methodId: 'm', quality: 5 }) // 100 → 1.0
    await h.svc.recordReview({ objectId: a2, methodId: 'm', quality: 3 }) // 60  → 0.6
    await h.svc.recordReview({ objectId: b1, methodId: 'm', quality: 5 }) // 100 → 1.0
    expect(await h.svc.rollupMastery(topicA)).toBe(80) // rollup([1.0,0.6]) = 0.8
    expect(await h.svc.rollupMastery(topicB)).toBe(100) // rollup([1.0]) = 1.0
    // Unit rolls up its Topics: rollup([0.8, 1.0]) = 0.9 → 90
    expect(await h.svc.rollupMastery(unit)).toBe(90)
  })

  it('rollupMastery returns null when the node + subtree are all unmeasured', async () => {
    const parent = await anObject('Topic')
    await anObject('leaf', parent) // no reviews anywhere
    expect(await h.svc.rollupMastery(parent)).toBeNull()
  })

  it('rollupMastery terminates on a corrupted parent_object_id cycle (visited-set backstop, BR-S4-4)', async () => {
    // Create two objects, then force a cycle DIRECTLY (bypassing the S1 create/update cycle guard) to simulate a
    // corrupted/synced row: A is a child of B and B is a child of A.
    const a = await anObject('A')
    const b = await anObject('B')
    await h.db.update(knowledgeObjects).set({ parent_object_id: b }).where(eq(knowledgeObjects.id, a)).run()
    await h.db.update(knowledgeObjects).set({ parent_object_id: a }).where(eq(knowledgeObjects.id, b)).run()
    // Must resolve (not infinite-loop) and, with no reviews, be unmeasured.
    expect(await h.svc.rollupMastery(a)).toBeNull()
  })

  it('rollupMastery guards an unresolved object', async () => {
    await expect(h.svc.rollupMastery('ghost')).rejects.toBeInstanceOf(KnowledgeObjectNotFoundError)
  })

  it('deriveMastery delegates to the engine on the knowledge surface (null → value)', async () => {
    const obj = await anObject('leaf')
    expect(await h.svc.deriveMastery(obj)).toBeNull()
    await h.svc.recordReview({ objectId: obj, methodId: 'm', quality: 4 })
    expect(await h.svc.deriveMastery(obj)).toBe(80) // 4/5 → 0.8 → 80
  })
})

// ============================================================================
// S5 — cross-module measurement source (KNO-25/26/27/42). getMasterySource
// composes S4's rollupMastery for objectMastery; the other two signals are
// deny-safe null (Education entities unbuilt). Subject = the spine
// knowledge_object (structure-data.md:28-30), not the subject container.
// ============================================================================
describe('mod-knowledge S5 — getMasterySource (Education measurement source)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  async function anObject(title: string, parentObjectId?: string): Promise<string> {
    const kindId = await seededTopicKindId(h.svc)
    return (await h.svc.createObject({ kind_id: kindId, title, parent_object_id: parentObjectId ?? null })).id
  }

  it('objectMastery = the spine rollup (concrete value); the two Education signals are null (KNO-25/26/27)', async () => {
    // The S4 3-level tree (Unit → Topic → leaves) → 90, asserted as a CONCRETE number through getMasterySource,
    // not `x === rollupMastery(x)` (NIT-1). The Subject-level object here is `unit` (top of the spine).
    const subject = await anObject('Subject')
    const topicA = await anObject('TopicA', subject)
    const topicB = await anObject('TopicB', subject)
    const a1 = await anObject('a1', topicA)
    const a2 = await anObject('a2', topicA)
    const b1 = await anObject('b1', topicB)
    await h.svc.recordReview({ objectId: a1, methodId: 'm', quality: 5 }) // 1.0
    await h.svc.recordReview({ objectId: a2, methodId: 'm', quality: 3 }) // 0.6
    await h.svc.recordReview({ objectId: b1, methodId: 'm', quality: 5 }) // 1.0

    const src = await h.svc.getMasterySource(subject)
    expect(src.objectMastery).toBe(90) // rollup([rollup([1.0,0.6])=0.8, rollup([1.0])=1.0]) = 0.9 → 90
    expect(src.assessmentResults).toBeNull() // KNO-27 seam — Education assessments unbuilt, never fabricated
    expect(src.paceVsSyllabus).toBeNull() // KNO-26 seam — Education syllabus-as-calendar unbuilt, never fabricated
  })

  it('an all-unmeasured subject yields all-null (no signal fabricated, KNO-42 discipline)', async () => {
    const subject = await anObject('Subject')
    await anObject('leaf', subject) // no reviews anywhere in the subtree
    const src = await h.svc.getMasterySource(subject)
    expect(src.objectMastery).toBeNull()
    expect(src.assessmentResults).toBeNull()
    expect(src.paceVsSyllabus).toBeNull()
  })

  it('an unresolved subjectRef throws KnowledgeObjectNotFoundError, not an all-null struct (BR-S5-5)', async () => {
    await expect(h.svc.getMasterySource('ghost')).rejects.toBeInstanceOf(KnowledgeObjectNotFoundError)
  })
})

// ============================================================================
// S6 — Pages-notes + Compound sets + Lab + AI/search/ingestion seams
// (KNO-28,31,32,33,34,35,36,37,43). Notes uses the REAL service; the ai/ingestion deny-safe + mapping
// tests inject stubs (S6 owns the mapping; the guard/model internals are #44/#45's tested territory).
// ============================================================================
describe('mod-knowledge S6 — pages-notes + compound sets + lab + seams', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  async function anObject(title = 'Photosynthesis'): Promise<string> {
    const kindId = await seededTopicKindId(h.svc)
    return (await h.svc.createObject({ kind_id: kindId, title })).id
  }

  // --- KNO-28 openObjectNote -------------------------------------------------
  it('openObjectNote creates a pages row keyed on knowledge_object (type=note), seeded with the object title in content', async () => {
    const objId = await anObject('Krebs cycle')
    const page = await h.svc.openObjectNote(objId)
    expect(page.type).toBe('note')
    expect(page.entity_type).toBe('knowledge_object')
    expect(page.entity_id).toBe(objId)
    // The notes service folds seed.title into the page CONTENT (an H1), not the title column (the editable
    // title/render is P6, KN-5). Grounded in seedContent (services/notes/service.ts:41-45).
    expect(page.content).toContain('Krebs cycle')
  })

  it('openObjectNote is idempotent — a second call returns the same page (never a knowledge_notes insert, KN-5)', async () => {
    const objId = await anObject()
    const first = await h.svc.openObjectNote(objId)
    const second = await h.svc.openObjectNote(objId)
    expect(second.id).toBe(first.id)
  })

  it('openObjectNote guards a bogus object → KnowledgeObjectNotFoundError', async () => {
    await expect(h.svc.openObjectNote('ghost')).rejects.toBeInstanceOf(KnowledgeObjectNotFoundError)
  })

  // --- KNO-31/32 compound sets ----------------------------------------------
  it('buildCompoundSet persists + round-trips the structured spec (JSON boundary; not is_default)', async () => {
    const spec = { rules: ['spaced-rep'], methods: ['flashcards'], params: { dailyCap: 20 } }
    const cs = await h.svc.buildCompoundSet('education', spec, 'My set')
    expect(cs.consumer_module).toBe('education')
    expect(cs.name).toBe('My set')
    expect(cs.is_default).toBe(false)
    expect(JSON.parse(cs.spec!)).toEqual(spec) // opaque JSON string at rest, parses back to the structure
  })

  it('buildCompoundSet accepts a null spec (opaque column nullable)', async () => {
    const cs = await h.svc.buildCompoundSet('skills')
    expect(cs.spec).toBeNull()
  })

  it('applyDefaultCompoundSet is anti-lost + idempotent — creates one default, second call returns the SAME set', async () => {
    const first = await h.svc.applyDefaultCompoundSet('education')
    expect(first.is_default).toBe(true)
    const second = await h.svc.applyDefaultCompoundSet('education')
    expect(second.id).toBe(first.id) // no duplicate (KN-11 anti-lost)
    const all = await h.svc.listCompoundSets('education')
    expect(all.filter((s) => s.is_default).length).toBe(1)
  })

  it('listCompoundSets is consumer-scoped', async () => {
    await h.svc.buildCompoundSet('education', { a: 1 })
    await h.svc.buildCompoundSet('finance', { b: 2 })
    expect(await h.svc.listCompoundSets('education')).toHaveLength(1)
    expect(await h.svc.listCompoundSets('finance')).toHaveLength(1)
  })

  // --- KNO-33 assistCompoundSet (extension-model, deny-safe) -----------------
  const anAiRequest: AiRequest = { defId: 'compound-assist', mode: 'on_device' }

  it('assistCompoundSet with NO ai dep → ai-unavailable (M1 default)', async () => {
    const res = await h.svc.assistCompoundSet('education', anAiRequest)
    expect(res.status).toBe('ai-unavailable')
  })

  it('assistCompoundSet maps a thrown AiDenied → ai-unavailable with the reason (deny-safe, surfaced not swallowed)', async () => {
    // Test stub: assistCompoundSet only calls askModel; the real service denies in M1 (ports absent).
    const throwingAi = {
      async askModel(): Promise<never> {
        throw new AiDenied('compound-assist', 'model_unavailable')
      },
    } as unknown as AiService
    const svc = createKnowledgeService({ ...h.deps, ai: throwingAi })
    const res = await svc.assistCompoundSet('education', anAiRequest)
    expect(res.status).toBe('ai-unavailable')
    expect(res.status === 'ai-unavailable' && res.reason).toContain('model_unavailable')
  })

  it('assistCompoundSet maps a successful askModel → ready with the suggestion (= AiResponse.content)', async () => {
    const okAi = {
      async askModel() {
        return { content: 'try interleaving' }
      },
    } as unknown as AiService
    const svc = createKnowledgeService({ ...h.deps, ai: okAi })
    const res = await svc.assistCompoundSet('education', anAiRequest)
    expect(res).toEqual({ status: 'ready', suggestion: 'try interleaving' })
  })

  // --- KNO-34/35/36 Knowledge Lab -------------------------------------------
  it('createLabEntry persists hypothesis + data_refs (JSON round-trip); conclusion/promoted null at birth', async () => {
    const entry = await h.svc.createLabEntry({ hypothesis: 'Sleep improves recall', data_refs: ['r1', 'r2'] })
    expect(entry.hypothesis).toBe('Sleep improves recall')
    expect(entry.data_refs).toEqual(['r1', 'r2']) // json<string[]> parsed on read
    expect(entry.conclusion).toBeNull()
    expect(entry.promoted_object_id).toBeNull()
  })

  it('concludeLabEntry sets the conclusion; a bogus id → LabEntryNotFoundError', async () => {
    const entry = await h.svc.createLabEntry({ hypothesis: 'H' })
    const concluded = await h.svc.concludeLabEntry(entry.id, 'Confirmed')
    expect(concluded.conclusion).toBe('Confirmed')
    await expect(h.svc.concludeLabEntry('ghost', 'x')).rejects.toBeInstanceOf(LabEntryNotFoundError)
  })

  it('promoteToObject on a concluded entry creates an object (title=hypothesis, desc=conclusion) + stamps promoted_object_id', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const entry = await h.svc.createLabEntry({ hypothesis: 'Caffeine and focus' })
    await h.svc.concludeLabEntry(entry.id, 'Positive at low doses')
    const object = await h.svc.promoteToObject(entry.id, { kind_id: kindId })
    expect(object.title).toBe('Caffeine and focus')
    expect(object.description).toBe('Positive at low doses')
    const [reloaded] = (await h.svc.listLabEntries()).filter((e) => e.id === entry.id)
    expect(reloaded!.promoted_object_id).toBe(object.id)
  })

  it('promoteToObject rejects an un-concluded entry → LabEntryNotConcludedError', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const entry = await h.svc.createLabEntry({ hypothesis: 'Unfinished' })
    await expect(h.svc.promoteToObject(entry.id, { kind_id: kindId })).rejects.toBeInstanceOf(LabEntryNotConcludedError)
  })

  it('promoteToObject rejects a re-promote → LabEntryAlreadyPromotedError', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const entry = await h.svc.createLabEntry({ hypothesis: 'Once' })
    await h.svc.concludeLabEntry(entry.id, 'Done')
    await h.svc.promoteToObject(entry.id, { kind_id: kindId })
    await expect(h.svc.promoteToObject(entry.id, { kind_id: kindId })).rejects.toBeInstanceOf(
      LabEntryAlreadyPromotedError,
    )
  })

  it('listLabEntries returns live entries (soft-delete filtered by construction)', async () => {
    await h.svc.createLabEntry({ hypothesis: 'A' })
    await h.svc.createLabEntry({ hypothesis: 'B' })
    expect(await h.svc.listLabEntries()).toHaveLength(2)
  })

  // --- KNO-37 search seam ----------------------------------------------------
  it('searchKnowledge returns the loud search-unavailable state (DB-8 seam), never throws or empties silently', async () => {
    expect(await h.svc.searchKnowledge('mitochondria')).toEqual({ status: 'search-unavailable' })
  })

  // --- KNO-43 autoPopulate seam (mapping via stub guards) --------------------
  const anAct = {} as IngestionAct // the stub checkIngestion ignores the act (S6 tests the MAPPING)

  it('autoPopulate with NO ingestion dep → ingestion-unavailable', async () => {
    const res = await h.svc.autoPopulate(anAct)
    expect(res).toEqual({ status: 'ingestion-unavailable' })
  })

  it('autoPopulate maps a PERMITTED decision → parser-unavailable (real M1 seam — no parsers built)', async () => {
    const permitting = {
      async checkIngestion() {
        return { permitted: true }
      },
    } as unknown as IngestionGuard
    const svc = createKnowledgeService({ ...h.deps, ingestion: permitting })
    expect(await svc.autoPopulate(anAct)).toEqual({ status: 'parser-unavailable' })
  })

  it('autoPopulate maps a DENIED decision → refused, passing the reason + disclosure through (refuse-not-downgrade)', async () => {
    const disclosure = {
      layer: 'native',
      whoSees: 'device only',
      whatLeaks: 'nothing',
      serverPosture: 'blind',
    } as LeakDisclosure
    const denying = {
      async checkIngestion() {
        return { permitted: false, reason: 'server_proxy_refused', disclosure }
      },
    } as unknown as IngestionGuard
    const svc = createKnowledgeService({ ...h.deps, ingestion: denying })
    const res = await svc.autoPopulate(anAct)
    expect(res).toEqual({ status: 'refused', reason: 'server_proxy_refused', disclosure })
  })

  // --- co-transactional sync_queue enqueue ----------------------------------
  it('buildCompoundSet + createLabEntry co-transactionally enqueue sync_queue rows (ADR-004 §3.4)', async () => {
    const cs = await h.svc.buildCompoundSet('education', { a: 1 })
    const entry = await h.svc.createLabEntry({ hypothesis: 'H' })
    const csq = await h.db.select().from(syncQueue).where(eq(syncQueue.row_id, cs.id)).all()
    const eq_ = await h.db.select().from(syncQueue).where(eq(syncQueue.row_id, entry.id)).all()
    expect(csq.length).toBeGreaterThanOrEqual(1)
    expect(eq_.length).toBeGreaterThanOrEqual(1)
  })
})
