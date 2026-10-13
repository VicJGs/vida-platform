// ============================================================================
// mod-routines #64 ① · S1 — routine definition CRUD + @vida/types reconcile (LIF-138)
//
// Node / better-sqlite3 live-store harness (mirrors habits/finance/checkins): REAL data store,
// UNLOCKED vault (the sync-hash path runs even with empty [E]), migrate() applies 018_routines so
// the reframe tables exist. Covers the slice-map.md S1 Verification Gate: CRUD happy + faithful
// create echo (defaults backfilled, nullables null) + partial update (no blanking) + soft-delete
// hides (ledger untouched) + listRoutines lifecycle filter + 2 failure paths (invalid-enum reject,
// missing-name reject) + co-transactional sync_queue enqueue (persistence probe).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createRoutinesService, type RoutinesService } from '../index'

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
  svc: RoutinesService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createRoutinesService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-routines S1 — routine definition CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createRoutine echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (RT-2/RT-19, IR-8)', async () => {
    const r = await h.svc.createRoutine({ name: 'Morning sequence' })
    expect(r.id).toBeTruthy()
    expect(r.name).toBe('Morning sequence')
    expect(r.lifecycle).toBe('active') // NN default backfilled
    expect(r.measurement_kind).toBe('rate') // NN default backfilled (RT-19 natural)
    expect(r.sort_order).toBe(0) // NN default backfilled
    expect(r.description).toBeNull() // nullable coalesced (not undefined)
    expect(r.recurrence_rule).toBeNull()
    expect(r.binding_mode).toBeNull() // nullable enum — not dropped (null ⇒ derive)
    expect(r.progress).toBeNull() // nullable override slot (RT-14 — no cached streak)
    expect(r.deleted_at).toBeNull()
    expect(r._sync_status).toBe('pending')
  })

  it('createRoutine honours explicit lifecycle/measurability/schedule/progress (RT-6/RT-11/RT-19)', async () => {
    const r = await h.svc.createRoutine({
      name: 'Evening wind-down',
      description: 'before bed',
      recurrence_rule: 'FREQ=DAILY',
      lifecycle: 'paused',
      measurement_kind: 'milestone',
      binding_mode: 'derived-pull',
      progress: 40,
      sort_order: 3,
    })
    expect(r.description).toBe('before bed')
    expect(r.recurrence_rule).toBe('FREQ=DAILY')
    expect(r.lifecycle).toBe('paused')
    expect(r.measurement_kind).toBe('milestone')
    expect(r.binding_mode).toBe('derived-pull')
    expect(r.progress).toBe(40)
    expect(r.sort_order).toBe(3)
  })

  it('getRoutine returns the row, and null for a missing id', async () => {
    const r = await h.svc.createRoutine({ name: 'Focus block' })
    expect(await h.svc.getRoutine(r.id)).toMatchObject({ id: r.id, name: 'Focus block' })
    expect(await h.svc.getRoutine('does-not-exist')).toBeNull()
  })

  it('updateRoutine patches only the passed keys — never blanks an unpassed field', async () => {
    const r = await h.svc.createRoutine({ name: 'Study loop', description: 'keep' })
    const up = await h.svc.updateRoutine(r.id, { lifecycle: 'off' })
    expect(up.lifecycle).toBe('off')
    expect(up.description).toBe('keep') // untouched — partial update didn't null it
    expect(up.name).toBe('Study loop')
  })

  it('archiveRoutine soft-deletes — getRoutine → null, listRoutines excludes it (RT-17)', async () => {
    const r = await h.svc.createRoutine({ name: 'Weekly review' })
    await h.svc.archiveRoutine(r.id)
    expect(await h.svc.getRoutine(r.id)).toBeNull()
    const all = await h.svc.listRoutines()
    expect(all.find((x) => x.id === r.id)).toBeUndefined()
  })

  it('listRoutines filters by lifecycle (IR-10 — explicit soft-delete filter)', async () => {
    await h.svc.createRoutine({ name: 'A', lifecycle: 'active' })
    await h.svc.createRoutine({ name: 'B', lifecycle: 'paused' })
    await h.svc.createRoutine({ name: 'C', lifecycle: 'active' })
    expect((await h.svc.listRoutines()).length).toBe(3)
    const paused = await h.svc.listRoutines({ lifecycle: 'paused' })
    expect(paused.map((r) => r.name)).toEqual(['B'])
  })

  // ── failure paths ──────────────────────────────────────────────────
  it('createRoutine rejects an invalid lifecycle enum (Zod, before any write)', async () => {
    await expect(
      // @ts-expect-error — exercising the runtime validator with an off-tuple value
      h.svc.createRoutine({ name: 'Bad', lifecycle: 'archived' }),
    ).rejects.toThrow()
    expect((await h.svc.listRoutines()).length).toBe(0) // no row written
  })

  it('createRoutine rejects a missing name (Zod)', async () => {
    // @ts-expect-error — name is required
    await expect(h.svc.createRoutine({})).rejects.toThrow()
  })

  // ── persistence probe ──────────────────────────────────────────────
  it('createRoutine enqueues a co-transactional sync_queue row (local-first, RT-18)', async () => {
    const r = await h.svc.createRoutine({ name: 'Sync me' })
    const rows = await h.db.select().from(syncQueue).all()
    expect(rows.filter((x) => x.row_id === r.id).length).toBeGreaterThanOrEqual(1)
  })
})
