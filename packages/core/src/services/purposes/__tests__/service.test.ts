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
import { createMeasurementSourceRegistry, type MeasurementSourceRegistry } from '../../../foundation/measurement'
import {
  type PurposesService,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
  DreamNotFoundError,
  MetricNotFoundError,
  ContributionNotFoundError,
  InvalidContributor,
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

async function setup(opts: { measurementSources?: MeasurementSourceRegistry } = {}): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createPurposesService({ db, deviceId: 'test-device', measurementSources: opts.measurementSources })
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

describe('mod-purposes S4 — contributions edge', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('links a contributor into a goal holding only the weight (never a copied value, PG-10)', async () => {
    const p = await h.svc.createPurpose({ title: 'Fitness' })
    const c = await h.svc.linkContribution(
      { type: 'purpose', id: p.id },
      { type: 'habit', id: 'habit-123' },
      { weight: 40, notes: 'daily run' },
    )
    expect(c.goal_type).toBe('purpose')
    expect(c.goal_id).toBe(p.id)
    expect(c.contributor_type).toBe('habit')
    expect(c.contributor_id).toBe('habit-123')
    expect(c.contribution_percentage).toBe(40)
    expect(c.contribution_notes).toBe('daily run')
    // no progress value field exists on the row — the edge holds weight only
    expect('progress' in c).toBe(false)
  })

  it('throws InvalidContributor (two-sided) for an out-of-vocabulary goal OR contributor type', async () => {
    await expect(
      h.svc.linkContribution({ type: 'note', id: 'x' }, { type: 'habit', id: 'h' }, { weight: 10 }),
    ).rejects.toBeInstanceOf(InvalidContributor) // bad goal type
    await expect(
      h.svc.linkContribution({ type: 'target', id: 't' }, { type: 'contact', id: 'c' }, { weight: 10 }),
    ).rejects.toBeInstanceOf(InvalidContributor) // bad contributor type (contact ∉ CONTRIBUTION_CONTRIBUTOR_TYPE)
  })

  it("lists a goal's contributions, reweights, and soft-deletes (unlink hides it)", async () => {
    const p = await h.svc.createPurpose({ title: 'Wealth' })
    const t = await h.svc.createTarget({ title: 'Net worth' })
    const c1 = await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'finance_target', id: 'ft1' }, { weight: 60 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'project', id: 'pr1' }, { weight: 40 })
    await h.svc.linkContribution({ type: 'target', id: t.id }, { type: 'task', id: 'tk1' }, { weight: 100 })
    expect(await h.svc.listContributions({ type: 'purpose', id: p.id })).toHaveLength(2)
    expect(await h.svc.listContributions({ type: 'target', id: t.id })).toHaveLength(1)
    const re = await h.svc.reweightContribution(c1.id, 75)
    expect(re.contribution_percentage).toBe(75)
    await h.svc.unlinkContribution(c1.id)
    expect(await h.svc.listContributions({ type: 'purpose', id: p.id })).toHaveLength(1) // soft-deleted hidden
  })

  it('rejects unlink/reweight of an unknown contribution', async () => {
    await expect(h.svc.unlinkContribution('nope')).rejects.toBeInstanceOf(ContributionNotFoundError)
    await expect(h.svc.reweightContribution('nope', 10)).rejects.toBeInstanceOf(ContributionNotFoundError)
  })
})

describe('mod-purposes S5 — measurability core (leaf progress)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('quantitative target leaf = current/target (baseline 0, higher-better); unmeasured without current', async () => {
    const t = await h.svc.createTarget({ title: 'Read', measurement_kind: 'quantitative', target_value: 24, current_value: 6 })
    expect((await h.svc.progress({ type: 'target', id: t.id })).value).toBe(25) // 6/24 = 25%
    const t2 = await h.svc.createTarget({ title: 'noCurrent', measurement_kind: 'quantitative', target_value: 10 })
    const v2 = await h.svc.progress({ type: 'target', id: t2.id })
    expect(v2.value).toBeNull()
    expect(v2.unmeasured).toBe(true) // no current_value ⇒ unmeasured, never 0
  })

  it('milestone target leaf = status (completed→100 else 0); rate clamps; qualitative is unmeasured (never 0)', async () => {
    const done = await h.svc.createTarget({ title: 'ship', measurement_kind: 'milestone', status: 'completed' })
    expect((await h.svc.progress({ type: 'target', id: done.id })).value).toBe(100)
    const todo = await h.svc.createTarget({ title: 'todo', measurement_kind: 'milestone' })
    expect((await h.svc.progress({ type: 'target', id: todo.id })).value).toBe(0)
    const rate = await h.svc.createTarget({ title: 'rate', measurement_kind: 'rate', current_value: 0.8 })
    expect((await h.svc.progress({ type: 'target', id: rate.id })).value).toBe(80)
    const qual = await h.svc.createTarget({ title: 'feel', measurement_kind: 'qualitative' })
    const q = await h.svc.progress({ type: 'target', id: qual.id })
    expect(q.value).toBeNull() // PG-3: qualitative with no rating ⇒ unmeasured, never 0
    expect(q.unmeasured).toBe(true)
  })

  it('dream progress = its override slot (0–100) or null', async () => {
    const d = await h.svc.createDream({ title: 'trip', progress_percentage: 30 })
    const v = await h.svc.progress({ type: 'dream', id: d.id })
    expect(v).toEqual({ value: 30, derived: false, partial: false, unmeasured: false })
    const d2 = await h.svc.createDream({ title: 'someday' })
    expect((await h.svc.progress({ type: 'dream', id: d2.id })).unmeasured).toBe(true)
  })
})

describe('mod-purposes S5 — measurability core (rollup)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('purpose override slot wins over any rollup (PG-4)', async () => {
    const p = await h.svc.createPurpose({ title: 'x', progress: 42 })
    await h.svc.createTarget({ title: 't', purpose_id: p.id, measurement_kind: 'milestone', status: 'completed' })
    expect(await h.svc.computeProgress({ type: 'purpose', id: p.id })).toEqual({
      value: 42, derived: false, partial: false, unmeasured: false,
    })
  })

  it('purpose with no children/override is unmeasured (never 0)', async () => {
    const p = await h.svc.createPurpose({ title: 'empty' })
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBeNull()
    expect(v.unmeasured).toBe(true)
  })

  it('purpose rolls up its spine-targets (equal weight) — weighted average of target leaves', async () => {
    const p = await h.svc.createPurpose({ title: 'learn' })
    await h.svc.createTarget({ title: 'a', purpose_id: p.id, measurement_kind: 'quantitative', target_value: 10, current_value: 10 }) // 100%
    await h.svc.createTarget({ title: 'b', purpose_id: p.id, measurement_kind: 'milestone' }) // 0%
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBe(50) // (100 + 0) / 2, equal weight
    expect(v.derived).toBe(true)
  })

  it('a qualitative (unmeasured) spine-target is EXCLUDED from the rollup (never drags to 0), flags partial', async () => {
    const p = await h.svc.createPurpose({ title: 'mix' })
    await h.svc.createTarget({ title: 'done', purpose_id: p.id, measurement_kind: 'milestone', status: 'completed' }) // 100
    await h.svc.createTarget({ title: 'vibe', purpose_id: p.id, measurement_kind: 'qualitative' }) // unmeasured → excluded
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBe(100) // only the measured child counts
    expect(v.partial).toBe(true) // one child was unmeasured
  })

  it('contributions weight the rollup by contribution_percentage; cross-module is null at M1 (empty registry)', async () => {
    const p = await h.svc.createPurpose({ title: 'fit' })
    // a dream contributor resolves in-module; a habit contributor is cross-module (null at M1)
    const d = await h.svc.createDream({ title: 'marathon', progress_percentage: 60 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'dream', id: d.id }, { weight: 50 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'habit', id: 'h1' }, { weight: 50 })
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBe(60) // only the dream (60%) is measured; the habit is null (excluded) at M1
    expect(v.partial).toBe(true)
  })

  it('target leaf wins; an unmeasured-leaf target rolls up its own contributions', async () => {
    const t = await h.svc.createTarget({ title: 'net worth', measurement_kind: 'qualitative' }) // leaf unmeasured
    const d = await h.svc.createDream({ title: 'house', progress_percentage: 40 })
    await h.svc.linkContribution({ type: 'target', id: t.id }, { type: 'dream', id: d.id }, { weight: 100 })
    expect((await h.svc.computeProgress({ type: 'target', id: t.id })).value).toBe(40) // leaf null → rollup contributions
    // a measured leaf wins over contributions:
    const t2 = await h.svc.createTarget({ title: 'books', measurement_kind: 'quantitative', target_value: 4, current_value: 2 })
    await h.svc.linkContribution({ type: 'target', id: t2.id }, { type: 'dream', id: d.id }, { weight: 100 })
    expect((await h.svc.computeProgress({ type: 'target', id: t2.id })).value).toBe(50) // leaf (2/4) wins, not the dream's 40
  })

  it('resolves a cross-module contributor through an injected measurement-source registry (the M2 seam)', async () => {
    const sources = createMeasurementSourceRegistry()
    sources.advertise('habit:h1', () => 0.9) // a habit streak measure (the M2 shape), [0,1]
    const hh = await setup({ measurementSources: sources })
    const p = await hh.svc.createPurpose({ title: 'health' })
    await hh.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'habit', id: 'h1' }, { weight: 100 })
    expect((await hh.svc.computeProgress({ type: 'purpose', id: p.id })).value).toBe(90) // 0.9 → 90%
  })

  it('a purpose_metric feeds the purpose rollup via the direct channel (g2 #1), direction-aware', async () => {
    const p = await h.svc.createPurpose({ title: 'weight-goal' })
    // lose weight: 90 (baseline) → 70 (target), currently 80 → halfway, higher-better=false
    const m = await h.svc.createMetric({
      name: 'bodyweight', purpose_id: p.id, calculation_method: 'latest',
      target_value: 70, baseline_value: 90, is_higher_better: false,
    })
    await h.svc.recordMetricValue(m.id, 80)
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBe(50) // (90-80)/(90-70) = 0.5, direction-aware
    expect(v.unmeasured).toBe(false)
  })

  it('mixes a spine-target and a contribution on ONE scale (two-channel equal-combine, g2 #2)', async () => {
    const p = await h.svc.createPurpose({ title: 'balanced' })
    await h.svc.createTarget({ title: 'done', purpose_id: p.id, measurement_kind: 'milestone', status: 'completed' }) // channel A = 100
    const d = await h.svc.createDream({ title: 'half', progress_percentage: 50 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'dream', id: d.id }, { weight: 40 }) // channel B = 50
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBe(75) // (channelA 100 + channelB 50) / 2 — NOT drowned by the weight-40 contribution
    expect(v.partial).toBe(false)
  })

  it('a weight-0 contribution is treated as equal-weight (engine), not dropped', async () => {
    const p = await h.svc.createPurpose({ title: 'zeros' })
    const d1 = await h.svc.createDream({ title: 'a', progress_percentage: 100 })
    const d2 = await h.svc.createDream({ title: 'b', progress_percentage: 0 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'dream', id: d1.id }, { weight: 0 })
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'dream', id: d2.id }, { weight: 0 })
    expect((await h.svc.computeProgress({ type: 'purpose', id: p.id })).value).toBe(50) // both weight-0 → equal → (100+0)/2
  })

  it('an all-unmeasured purpose is unmeasured with partial:false (0 measured, not a partial subset)', async () => {
    const p = await h.svc.createPurpose({ title: 'foggy' })
    await h.svc.createTarget({ title: 'q1', purpose_id: p.id, measurement_kind: 'qualitative' }) // null
    await h.svc.createTarget({ title: 'q2', purpose_id: p.id, measurement_kind: 'qualitative' }) // null
    const v = await h.svc.computeProgress({ type: 'purpose', id: p.id })
    expect(v.value).toBeNull()
    expect(v.unmeasured).toBe(true)
    expect(v.partial).toBe(false) // 0 measured ⇒ not "partial", fully unmeasured
  })

  it("rolls up two levels: a purpose → an unmeasured-leaf spine-target → that target's own contribution", async () => {
    const p = await h.svc.createPurpose({ title: 'deep' })
    const t = await h.svc.createTarget({ title: 'via-contrib', purpose_id: p.id, measurement_kind: 'qualitative' }) // leaf null
    const d = await h.svc.createDream({ title: 'feeds-target', progress_percentage: 80 })
    await h.svc.linkContribution({ type: 'target', id: t.id }, { type: 'dream', id: d.id }, { weight: 100 })
    // target leaf null → rolls up its contribution (80); purpose rolls up that target (80)
    expect((await h.svc.computeProgress({ type: 'purpose', id: p.id })).value).toBe(80)
  })
})
