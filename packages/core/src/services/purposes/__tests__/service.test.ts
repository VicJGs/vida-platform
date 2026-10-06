// ============================================================================
// mod-purposes-and-goals #55 ① · S1 — spine CRUD (values · purposes · targets)
//
// Node / better-sqlite3 live-store harness (mirrors projects/learning-education): REAL store, UNLOCKED vault
// (the sync-hash path runs even with empty [E]), migrate() applies 007_purpose + 019_purposes so the tables
// exist. Exercises the encrypt/persist + create-echoes-input backfill + override-slot + soft-delete seams a
// mocked test bypasses. Maps 1:1 to slice-map S1 + seam-contract §surface (spine CRUD).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createPurposesService } from '../service'
import { type PurposesService, ValueNotFoundError, PurposeNotFoundError, TargetNotFoundError } from '../types'

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
  svc: PurposesService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createPurposesService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-purposes S1 — values CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates a value with NN-default backfill + reads it back (live persist probe)', async () => {
    const v = await h.svc.createValue({ name: 'Family' })
    expect(v.id).toBeTruthy()
    expect(v.name).toBe('Family')
    expect(v.sort_order).toBe(0) // create echoes input → service backfills NN default
    expect(v.deleted_at).toBeNull()
    const read = await h.svc.getValue(v.id)
    expect(read?.name).toBe('Family')
  })

  it('updates, no-op-guards an empty patch, and soft-deletes (hidden from list)', async () => {
    const v = await h.svc.createValue({ name: 'Health', sort_order: 2 })
    const upd = await h.svc.updateValue(v.id, { description: 'physical + mental' })
    expect(upd.description).toBe('physical + mental')
    expect(upd.sort_order).toBe(2) // untouched
    const noop = await h.svc.updateValue(v.id, {})
    expect(noop.id).toBe(v.id)
    await h.svc.archiveValue(v.id)
    expect(await h.svc.getValue(v.id)).toBeNull() // soft-deleted → findById returns null
    expect(await h.svc.listValues()).toHaveLength(0)
  })

  it('rejects update/archive of an unknown value', async () => {
    await expect(h.svc.updateValue('nope', { name: 'x' })).rejects.toBeInstanceOf(ValueNotFoundError)
    await expect(h.svc.archiveValue('nope')).rejects.toBeInstanceOf(ValueNotFoundError)
  })
})

describe('mod-purposes S1 — purposes CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('backfills NN defaults + leaves progress as a NULL override slot (PG-4)', async () => {
    const p = await h.svc.createPurpose({ title: 'Be present' })
    expect(p.status).toBe('in_progress') // backfill
    expect(p.is_primary).toBe(false)
    expect(p.sort_order).toBe(0)
    expect(p.progress).toBeNull() // override slot — NULL ⇒ derive, never coerced to 0
    expect(p.value_id).toBeNull()
    expect(p.deleted_at).toBeNull()
  })

  it('honours an explicit progress override + value_id link', async () => {
    const val = await h.svc.createValue({ name: 'Growth' })
    const p = await h.svc.createPurpose({ title: 'Master a craft', value_id: val.id, progress: 40, is_primary: true })
    expect(p.progress).toBe(40)
    expect(p.value_id).toBe(val.id)
    expect(p.is_primary).toBe(true)
    const read = await h.svc.getPurpose(p.id)
    expect(read?.progress).toBe(40)
  })

  it('updates, soft-deletes, and rejects unknown ids', async () => {
    const p = await h.svc.createPurpose({ title: 'x' })
    const upd = await h.svc.updatePurpose(p.id, { status: 'completed', progress: 100 })
    expect(upd.status).toBe('completed')
    expect(upd.progress).toBe(100)
    await h.svc.archivePurpose(p.id)
    expect(await h.svc.listPurposes()).toHaveLength(0)
    await expect(h.svc.updatePurpose('nope', {})).rejects.toBeInstanceOf(PurposeNotFoundError)
  })
})

describe('mod-purposes S1 — targets CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('backfills measurement_kind/status/priority + NULL binding_mode & current_value override', async () => {
    const t = await h.svc.createTarget({ title: 'Read 24 books' })
    expect(t.measurement_kind).toBe('quantitative') // backfill
    expect(t.status).toBe('not_started')
    expect(t.priority).toBe('medium')
    expect(t.binding_mode).toBeNull() // NULL ⇒ derive
    expect(t.current_value).toBeNull() // override slot
    expect(t.purpose_id).toBeNull() // standalone target allowed (PG-9)
    expect(t.review_frequency).toBeNull() // DB DEFAULT 'weekly' never fires under create-echo → omit persists NULL (g2 NIT-2)
  })

  it('links a target to a purpose and scopes listTargets; a standalone target is unscoped', async () => {
    const p = await h.svc.createPurpose({ title: 'Learn' })
    const t1 = await h.svc.createTarget({ title: 'bound', purpose_id: p.id, measurement_kind: 'milestone' })
    const t2 = await h.svc.createTarget({ title: 'standalone' })
    expect(t1.measurement_kind).toBe('milestone')
    expect(await h.svc.listTargets(p.id)).toHaveLength(1)
    expect((await h.svc.listTargets(p.id))[0]!.id).toBe(t1.id)
    expect(await h.svc.listTargets()).toHaveLength(2) // both active
    expect(t2.purpose_id).toBeNull()
  })

  it('updates, soft-deletes, and rejects unknown ids', async () => {
    const t = await h.svc.createTarget({ title: 'x', target_value: 100 })
    const upd = await h.svc.updateTarget(t.id, { current_value: 50, status: 'in_progress' })
    expect(upd.current_value).toBe(50)
    expect(upd.status).toBe('in_progress')
    await h.svc.archiveTarget(t.id)
    expect(await h.svc.listTargets()).toHaveLength(0)
    await expect(h.svc.archiveTarget('nope')).rejects.toBeInstanceOf(TargetNotFoundError)
  })
})
