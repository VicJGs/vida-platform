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
import {
  createKnowledgeService,
  ObjectKindNotFoundError,
  InvalidParentRefError,
  HierarchyCycleError,
  KnowledgeObjectNotFoundError,
  type KnowledgeService,
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
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
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
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createKnowledgeService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
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
    await expect(
      h.svc.createObject({ kind_id: kindId, title: 'x', parent_object_id: 'ghost' }),
    ).rejects.toBeInstanceOf(InvalidParentRefError)
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
    await expect(h.svc.updateObject(obj.id, { parent_object_id: 'ghost' })).rejects.toBeInstanceOf(InvalidParentRefError)
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
