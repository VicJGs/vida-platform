// ============================================================================
// AR-6 — Spaces substrate tests (Node / better-sqlite3, db-6 harness)
//
// Proves the AR-6 charter:
//   • migration 003 creates the 6 tables; version → 3
//   • SP2 — TaggableTypeRegistry seeded (space/tag), runtime register, NO 'view'
//   • BR-7/BR-13 — mutations enqueue one sync_queue row (db-6 seam; pass-through)
//   • BR-14 — tagEntity/createLink/addEnabledBlock are idempotent (no raw UNIQUE)
//   • BR-15 — untagEntity soft-deletes (operation:'update') + re-tag revives
//   • BR-2  — unregistered entity_type → UnknownEntityType
//   • BR-3  — a parent_tag_id cycle → InvalidTagNesting
//   • V3/V4/V5 — ViewEngine: fan-out, ungrouped bucket, degrade-never-crash, states
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate, currentVersion } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { entityTags, views } from '../../../db/schema/foundation/spaces'
import { eq } from 'drizzle-orm'
import { initVault } from '../../../encryption/vault'
import { createTaggableTypeRegistry } from '../registry'
import { createSpacesService, type SpacesService } from '../service'
import { UnknownEntityType, InvalidTagNesting, InvalidSpaceNesting } from '../types'
import { createViewsService } from '../../views/service'
import { createViewEngine } from '../../views/engine'
import { createViewProviderRegistry } from '../../views/provider-registry'
import type { ReadProvider } from '../../views/types'
import { ViewNotFound } from '../../views/types'

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

async function setup(): Promise<{ svc: SpacesService; db: DrizzleDb; driver: SqliteDriver }> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // bootstraps app_state (DB-7 ensureInfra) + 001 sync_queue + 002 sessions + 003 spaces
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  return { svc: createSpacesService(db, 'test-device', registry), db, driver }
}

describe('AR-6 — migration 003 wiring', () => {
  it('creates the 6 Spaces tables and advances version to 3', async () => {
    const { driver } = await setup()
    const names = (
      await driver.values(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tags','entity_tags','entity_links','spaces','space_enabled_blocks','views')`,
      )
    ).flat()
    expect(names).toEqual(
      expect.arrayContaining([
        'tags',
        'entity_tags',
        'entity_links',
        'spaces',
        'space_enabled_blocks',
        'views',
      ]),
    )
    // Spaces migration applied (>=3); the exact latest belongs to whichever migration is last
    // (AR-7 added 004) — the table set above is the real proof migration 003 ran.
    expect(await currentVersion(driver)).toBeGreaterThanOrEqual(3)
    await driver.close()
  })

  it('tags has NO SQL UNIQUE(name) (retired — [E] ciphertext, BR-3)', async () => {
    const { driver } = await setup()
    const ddl = (
      await driver.values(`SELECT sql FROM sqlite_master WHERE type='table' AND name='tags'`)
    ).flat()[0] as string
    expect(ddl).not.toMatch(/name\s+TEXT\s+NOT NULL\s+UNIQUE/i)
    await driver.close()
  })
})

describe('AR-6 — TaggableTypeRegistry (SP2)', () => {
  it('is seeded with the foundation set (space, tag) and has no "view"', () => {
    const r = createTaggableTypeRegistry()
    expect(r.isRegistered('space')).toBe(true)
    expect(r.isRegistered('tag')).toBe(true)
    expect(r.isRegistered('view')).toBe(false)
  })
  it('register adds a new type at runtime', () => {
    const r = createTaggableTypeRegistry()
    // A synthetic, deliberately-unregistered type — the open registry (SP2) accepts
    // arbitrary user-extensible strings. NOT a real ENTITY_TYPES member, so future
    // DB-4 domain appends (e.g. 'task', group #4) never re-break this fixture.
    const t = 'custom_user_type'
    expect(r.isRegistered(t)).toBe(false)
    r.register(t)
    expect(r.isRegistered(t)).toBe(true)
  })
})

describe('AR-6 — SpacesService enqueue + BR-2', () => {
  it('createTag enqueues one sync_queue row (create)', async () => {
    const { svc, db, driver } = await setup()
    await svc.createTag({ name: 'Spanish' })
    const q = await db.select().from(syncQueue).all()
    expect(q).toHaveLength(1)
    expect(q[0].table_name).toBe('tags')
    expect(q[0].operation).toBe('create')
    await driver.close()
  })

  it('BR-2 — tagEntity with an unregistered entity_type throws UnknownEntityType', async () => {
    const { svc, driver } = await setup()
    const tag = await svc.createTag({ name: 'x' })
    await expect(svc.tagEntity(tag.id, 'not_a_type', 'e1')).rejects.toBeInstanceOf(UnknownEntityType)
    await driver.close()
  })
})

describe('AR-6 — junction idempotency (BR-14) + soft-delete (BR-15)', () => {
  it('tagEntity twice is an idempotent no-op — no raw UNIQUE error, one live row', async () => {
    const { svc, db, driver } = await setup()
    const tag = await svc.createTag({ name: 't' })
    const a = await svc.tagEntity(tag.id, 'space', 's1')
    const b = await svc.tagEntity(tag.id, 'space', 's1') // must NOT throw
    expect(b.id).toBe(a.id)
    const rows = await db.select().from(entityTags).where(eq(entityTags.tag_id, tag.id)).all()
    expect(rows).toHaveLength(1)
    await driver.close()
  })

  it('untagEntity soft-deletes (deleted_at set) and enqueues operation:update', async () => {
    const { svc, db, driver } = await setup()
    const tag = await svc.createTag({ name: 't' })
    const et = await svc.tagEntity(tag.id, 'space', 's1')
    await svc.untagEntity(tag.id, 'space', 's1')

    const rows = await db.select().from(entityTags).where(eq(entityTags.id, et.id)).all()
    expect(rows[0].deleted_at).not.toBeNull() // soft-deleted, row still present
    // sync_queue holds the earlier 'create' AND the untag 'update' (distinct UNIQUE slots):
    // assert an 'update' row exists and NO 'delete' row (soft, not hard — BR-15).
    const q = await db.select().from(syncQueue).where(eq(syncQueue.row_id, et.id)).all()
    const ops = q.map((r) => r.operation)
    expect(ops).toContain('update')
    expect(ops).not.toContain('delete')
    await driver.close()
  })

  it('re-tag after untag revives the row (no raw UNIQUE collision)', async () => {
    const { svc, db, driver } = await setup()
    const tag = await svc.createTag({ name: 't' })
    const first = await svc.tagEntity(tag.id, 'space', 's1')
    await svc.untagEntity(tag.id, 'space', 's1')
    const revived = await svc.tagEntity(tag.id, 'space', 's1') // must NOT throw UNIQUE
    expect(revived.id).toBe(first.id)
    expect(revived.deleted_at).toBeNull()
    const rows = await db.select().from(entityTags).where(eq(entityTags.tag_id, tag.id)).all()
    expect(rows).toHaveLength(1)
    await driver.close()
  })
})

describe('AR-6 — tag nesting cycle guard (BR-3)', () => {
  it('updateTag that points a tag at its own descendant throws InvalidTagNesting', async () => {
    const { svc, driver } = await setup()
    const a = await svc.createTag({ name: 'a' })
    const b = await svc.createTag({ name: 'b', parent_tag_id: a.id }) // b under a
    // Now make a a child of b → a→b→a cycle.
    await expect(svc.updateTag(a.id, { parent_tag_id: b.id })).rejects.toBeInstanceOf(
      InvalidTagNesting,
    )
    await driver.close()
  })

  it('updateSpace that points a space at its own descendant throws InvalidSpaceNesting (BR-5)', async () => {
    const { svc, driver } = await setup()
    const rootTag = await svc.createTag({ name: 'root' })
    const a = await svc.createSpace({ root_tag_id: rootTag.id, name: 'A' })
    const b = await svc.createSpace({ root_tag_id: rootTag.id, name: 'B', parent_space_id: a.id })
    await expect(svc.updateSpace(a.id, { parent_space_id: b.id })).rejects.toBeInstanceOf(
      InvalidSpaceNesting,
    )
    await driver.close()
  })
})

describe('AR-6 — ViewEngine resolution (V3/V4/V5)', () => {
  const fakeProvider = (entityType: string, rows: unknown[]): ReadProvider => ({
    entityType,
    async list() {
      return rows
    },
  })

  it('selected type with no provider → empty + degraded note, never throws (BR-11)', async () => {
    const { db, driver } = await setup()
    const views = createViewsService(db, 'test-device')
    const v = await views.createView({ name: 'v', layout: 'list', filter: { entity_types: ['task'] } })
    const engine = createViewEngine() // empty registry
    const res = await engine.resolve(v)
    expect(res.state).toBe('empty')
    expect(res.rows).toHaveLength(0)
    expect(res.degraded[0]).toMatch(/no provider.*task/)
    await driver.close()
  })

  it('provider returns rows → success; missing group-by field → ungrouped bucket (BR-10)', async () => {
    const { db, driver } = await setup()
    const views = createViewsService(db, 'test-device')
    const v = await views.createView({
      name: 'v',
      layout: 'board',
      filter: { entity_types: ['task'] },
      grouping: { field: 'status' },
    })
    const registry = createViewProviderRegistry()
    registry.register(fakeProvider('task', [{ id: '1', status: 'done' }, { id: '2' }])) // 2nd lacks status
    const engine = createViewEngine(registry)
    const res = await engine.resolve(v)
    expect(res.state).toBe('success')
    expect(res.rows).toHaveLength(2)
    const keys = res.groups.map((g) => g.key)
    expect(keys).toEqual(expect.arrayContaining(['done', 'ungrouped']))
    await driver.close()
  })

  it('a provider that throws → state error, degrade never crash (BR-12)', async () => {
    const { db, driver } = await setup()
    const views = createViewsService(db, 'test-device')
    const v = await views.createView({ name: 'v', layout: 'list', filter: { entity_types: ['task'] } })
    const registry = createViewProviderRegistry()
    registry.register({
      entityType: 'task',
      async list() {
        throw new Error('provider boom')
      },
    })
    const engine = createViewEngine(registry)
    const res = await engine.resolve(v)
    expect(res.state).toBe('error')
    expect(res.degraded[0]).toMatch(/failed/)
    await driver.close()
  })
})

describe('XS-views — ViewsService.listViews (first-consumer-pull, mod-tasks S8)', () => {
  it('returns LIVE rows only, ordered by created_at then id (findAll has no ORDER BY)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const a = await svc.createView({ name: 'a', layout: 'list' })
    const b = await svc.createView({ name: 'b', layout: 'board', filter: { entity_types: ['task'] } })
    const gone = await svc.createView({ name: 'gone', layout: 'list' })
    await svc.deleteView(gone.id) // soft-delete → excluded

    const rows = await svc.listViews()
    expect(rows.map((r) => r.id)).not.toContain(gone.id)
    expect(rows.map((r) => r.id)).toEqual(
      [a, b].sort((x, y) => x.created_at - y.created_at || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)).map((r) => r.id),
    )
    // deterministic across calls
    expect((await svc.listViews()).map((r) => r.id)).toEqual(rows.map((r) => r.id))
    await driver.close()
  })

  it('empty store → []', async () => {
    const { db, driver } = await setup()
    expect(await createViewsService(db, 'test-device').listViews()).toEqual([])
    await driver.close()
  })
})

describe('XS-views — ViewsService.cloneView (XCU-05)', () => {
  it('clone a global view into a Space → new id, space_id set, content copied verbatim (BR-clone-2/3)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({
      name: 'Global board',
      layout: 'board',
      filter: { entity_types: ['task'] },
      grouping: { field: 'status' },
      sort: { by: 'created_at' },
    })
    expect(source.space_id).toBeNull()

    const clone = await svc.cloneView(source.id, 'sp1')
    expect(clone.id).not.toBe(source.id) // fresh id (BR-clone-1)
    expect(clone.space_id).toBe('sp1') // redirected (BR-clone-2)
    expect(clone.name).toBe('Global board') // verbatim, no rename
    expect(clone.layout).toBe('board')
    expect(clone.filter).toBe(source.filter) // raw TEXT identical (BR-clone-3)
    expect(clone.grouping).toBe(source.grouping)
    expect(clone.sort).toBe(source.sort)
    await driver.close()
  })

  it('duplicate in the same Space (targetSpaceId = source.space_id) is independent (BR-clone-1)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({ name: 'orig', layout: 'list', space_id: 'sp1' })
    const clone = await svc.cloneView(source.id, source.space_id)
    expect(clone.id).not.toBe(source.id)
    expect(clone.space_id).toBe('sp1')

    // editing the clone leaves the source untouched
    await svc.updateView(clone.id, { name: 'changed' })
    const stillOrig = await svc.getView(source.id)
    expect(stillOrig.name).toBe('orig')
    await driver.close()
  })

  it('clone a Space-owned view with targetSpaceId=null → global (BR-clone-2)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({ name: 'v', layout: 'list', space_id: 'sp1' })
    const clone = await svc.cloneView(source.id, null)
    expect(clone.space_id).toBeNull()
    await driver.close()
  })

  it('clone of an absent id rejects ViewNotFound (BR-clone-4)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    await expect(svc.cloneView('missing', 'sp1')).rejects.toBeInstanceOf(ViewNotFound)
    await driver.close()
  })

  it('clone of a soft-deleted source rejects ViewNotFound (findById filters deleted_at)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({ name: 'v', layout: 'list' })
    await svc.deleteView(source.id) // soft-delete
    await expect(svc.cloneView(source.id, null)).rejects.toBeInstanceOf(ViewNotFound)
    await driver.close()
  })

  it('live-store: clone persists the row AND enqueues a co-transactional sync_queue create (BR-clone-6, F1)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({ name: 'v', layout: 'list' })
    const clone = await svc.cloneView(source.id, 'sp1')

    // the cloned row persists + reads back
    const rows = await db.select().from(views).where(eq(views.id, clone.id)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].space_id).toBe('sp1')

    // both the source create AND the clone create are enqueued (atomicity = both present)
    const q = await db.select().from(syncQueue).where(eq(syncQueue.row_id, clone.id)).all()
    expect(q).toHaveLength(1)
    expect(q[0].table_name).toBe('views')
    expect(q[0].operation).toBe('create')
    await driver.close()
  })

  it('clone does NOT write the spaces table (no default_view_id wiring, BR-clone-5)', async () => {
    const { db, driver } = await setup()
    const svc = createViewsService(db, 'test-device')
    const source = await svc.createView({ name: 'v', layout: 'list' })
    const clone = await svc.cloneView(source.id, 'sp1')
    const q = await db.select().from(syncQueue).where(eq(syncQueue.row_id, clone.id)).all()
    // only the views insert — no 'spaces' write (which a default_view_id wire would be)
    expect(q.every((r) => r.table_name === 'views')).toBe(true)
    await driver.close()
  })
})
