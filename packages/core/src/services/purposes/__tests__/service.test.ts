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
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { purposeMetricValues } from '../../../db/schema/purposes'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createPurposesService } from '../service'
import {
  type PurposesService,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
  DreamNotFoundError,
  MetricNotFoundError,
} from '../types'

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

describe('mod-purposes S2 — dreams CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('backfills status/priority + leaves category NULL and progress_percentage as an override slot', async () => {
    const d = await h.svc.createDream({ title: 'See the aurora' })
    expect(d.status).toBe('dream') // NN default backfill
    expect(d.priority).toBe('medium')
    expect(d.category).toBeNull() // nullable; DB default 'other' never fires under create-echo
    expect(d.progress_percentage).toBeNull() // override slot (PG-4), never 0
    expect(d.steps).toBeNull()
    expect(d.purpose_id).toBeNull()
  })

  it('serializes steps to a JSON string in the TEXT column (never json<T>()) and round-trips', async () => {
    const steps = [
      { id: 's1', text: 'save', completed: false },
      { id: 's2', text: 'book flights', completed: true },
    ]
    const d = await h.svc.createDream({ title: 'Japan', category: 'travel', estimated_cost: 500000, steps })
    expect(d.category).toBe('travel')
    expect(d.estimated_cost).toBe(500000) // cents
    expect(typeof d.steps).toBe('string')
    const read = await h.svc.getDream(d.id)
    expect(JSON.parse(read!.steps!)).toEqual(steps) // stored as JSON text, parses back
  })

  it('reserializes steps on update, scopes listDreams, soft-deletes, rejects unknown ids', async () => {
    const p = await h.svc.createPurpose({ title: 'Adventure' })
    const d1 = await h.svc.createDream({ title: 'bound', purpose_id: p.id })
    await h.svc.createDream({ title: 'standalone' })
    const upd = await h.svc.updateDream(d1.id, { steps: [{ id: 'x', text: 'go', completed: true }], progress_percentage: 30 })
    expect(JSON.parse(upd.steps!)).toHaveLength(1)
    expect(upd.progress_percentage).toBe(30)
    expect(await h.svc.listDreams(p.id)).toHaveLength(1)
    expect(await h.svc.listDreams()).toHaveLength(2)
    await h.svc.archiveDream(d1.id)
    expect(await h.svc.listDreams()).toHaveLength(1)
    await expect(h.svc.updateDream('nope', {})).rejects.toBeInstanceOf(DreamNotFoundError)
  })
})

describe('mod-purposes S3 — metrics + value ledger', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('backfills calculation_method=latest + leaves current_value as a NULL override; empty ledger is unmeasured', async () => {
    const m = await h.svc.createMetric({ name: 'Weight', unit: 'kg' })
    expect(m.calculation_method).toBe('latest')
    expect(m.current_value).toBeNull()
    expect(m.is_higher_better).toBeNull()
    const cur = await h.svc.getMetricCurrent(m.id)
    expect(cur).toEqual({ value: null, source: 'manual', override: false }) // no points ⇒ unmeasured, never 0
  })

  it("derives current via 'latest' (value + the latest point's source)", async () => {
    const m = await h.svc.createMetric({ name: 'Weight' }) // default latest
    await h.svc.recordMetricValue(m.id, 80, { recorded_at: 1000, source: 'manual' })
    await h.svc.recordMetricValue(m.id, 78, { recorded_at: 3000, source: 'auto' })
    await h.svc.recordMetricValue(m.id, 79, { recorded_at: 2000, source: 'manual' })
    const cur = await h.svc.getMetricCurrent(m.id)
    expect(cur.value).toBe(78) // the recorded_at=3000 point
    expect(cur.source).toBe('auto') // that point's provenance
    expect(cur.override).toBe(false)
  })

  it('derives sum/average/max/min/count; provenance is manual iff every contributing point is manual', async () => {
    const mk = async (method: 'sum' | 'average' | 'max' | 'min' | 'count') =>
      h.svc.createMetric({ name: method, calculation_method: method })
    const seed = async (id: string, auto = false) => {
      await h.svc.recordMetricValue(id, 10, { source: 'manual' })
      await h.svc.recordMetricValue(id, 20, { source: auto ? 'auto' : 'manual' })
      await h.svc.recordMetricValue(id, 30, { source: 'manual' })
    }
    const sum = await mk('sum'); await seed(sum.id)
    expect((await h.svc.getMetricCurrent(sum.id)).value).toBe(60)
    expect((await h.svc.getMetricCurrent(sum.id)).source).toBe('manual') // all manual
    const avg = await mk('average'); await seed(avg.id, true)
    expect((await h.svc.getMetricCurrent(avg.id)).value).toBe(20)
    expect((await h.svc.getMetricCurrent(avg.id)).source).toBe('auto') // one auto point ⇒ auto
    const max = await mk('max'); await seed(max.id)
    expect((await h.svc.getMetricCurrent(max.id)).value).toBe(30)
    const min = await mk('min'); await seed(min.id)
    expect((await h.svc.getMetricCurrent(min.id)).value).toBe(10)
    const count = await mk('count'); await seed(count.id)
    expect((await h.svc.getMetricCurrent(count.id)).value).toBe(3)
  })

  it('honours the current_value override slot over the ledger (PG-4)', async () => {
    const m = await h.svc.createMetric({ name: 'Mood', current_value: 7, calculation_method: 'average' })
    await h.svc.recordMetricValue(m.id, 1)
    const cur = await h.svc.getMetricCurrent(m.id)
    expect(cur).toEqual({ value: 7, source: 'manual', override: true }) // override wins, ledger ignored
  })

  it('deleteMetric hard-cascades its value ledger (two-hop, no-FK); rejects unknown ids', async () => {
    const m = await h.svc.createMetric({ name: 'Steps' })
    await h.svc.recordMetricValue(m.id, 5000)
    await h.svc.recordMetricValue(m.id, 6000)
    // the ledger has the 2 points pre-delete
    expect(await h.db.select().from(purposeMetricValues).where(eq(purposeMetricValues.metric_id, m.id))).toHaveLength(2)
    await h.svc.deleteMetric(m.id)
    expect(await h.svc.getMetric(m.id)).toBeNull()
    // two-hop cascade proof: the metric's ledger rows are hard-deleted (no orphans)
    expect(await h.db.select().from(purposeMetricValues).where(eq(purposeMetricValues.metric_id, m.id))).toHaveLength(0)
    await expect(h.svc.deleteMetric('nope')).rejects.toBeInstanceOf(MetricNotFoundError)
    await expect(h.svc.recordMetricValue('nope', 1)).rejects.toBeInstanceOf(MetricNotFoundError)
  })
})
