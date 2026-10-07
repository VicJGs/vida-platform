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
import { createSessionRegistry, type SessionRegistry } from '../../../foundation/sessions'
import { createEffectRegistry, createEffectRail, type EffectRegistry, type EffectEvent } from '../../../foundation/effects'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService, UnknownEntityType, type SpacesService } from '../../../foundation/spaces'
import { createAssociationResolver } from '../../../foundation/spaces/association-resolver'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService, type NotesService } from '../../notes'
import { createSessionsService, type SessionsService } from '../../sessions'
import { createJournalRegistry } from '../../journals'
import { registerPurposesJournal, registerPurposesDueProvider } from '../journal'
import {
  type PurposesService,
  type PurposeTagLinkType,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
  DreamNotFoundError,
  MetricNotFoundError,
  ContributionNotFoundError,
  InvalidContributor,
  CyclicBinding,
  BindingRefManaged,
  PlanStepNotFoundError,
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
  sessionRegistry: SessionRegistry
  sessions: SessionsService
  spaces: SpacesService
  notes: NotesService
  associations: ReturnType<typeof createAssociationResolver>
}

async function setup(
  opts: { measurementSources?: MeasurementSourceRegistry; effectsRegistry?: EffectRegistry } = {},
): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  // S7 — compose the REAL sessions substrate (the learning-education/books harness precedent): reviews fire as
  // `review` SESSIONS, so the service needs a live SessionsService + registry over migration 002.
  const entityRegistry = createTaggableTypeRegistry()
  const sessionRegistry = createSessionRegistry(db, 'test-device')
  const rail = createEffectRail(db, createEffectRegistry())
  const sessions = createSessionsService({ db, deviceId: 'test-device', registry: sessionRegistry, rail, entityRegistry })
  // S8 — the REAL spaces + notes substrates (the projects/learning-education harness precedent): tags/links WRITE
  // via SpacesService, pages via NotesService, over the shared taggable-type registry (value/purpose/target/dream/
  // purpose_metric_value pre-seeded from ENTITY_TYPES). The association resolver reads back entity_tags/links.
  const spaces = createSpacesService(db, 'test-device', entityRegistry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const notes = createNotesService({ db, deviceId: 'test-device', spaces, backlinks, registry: entityRegistry })
  const associations = createAssociationResolver(db, 'test-device', entityRegistry)
  const svc = createPurposesService({
    db,
    deviceId: 'test-device',
    measurementSources: opts.measurementSources,
    sessions: { registry: sessionRegistry, service: sessions },
    spaces,
    notes,
    // S9 — deny-safe effect rail (emit-only). Wired only when a test supplies a registry (handlers pre-registered).
    effects: opts.effectsRegistry
      ? { rail: createEffectRail(db, opts.effectsRegistry), registry: opts.effectsRegistry }
      : undefined,
  })
  return { svc, db, bsql, sessionRegistry, sessions, spaces, notes, associations }
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

describe('mod-purposes S6 — bindings + DAG guard + derived-pull', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('bind(derived-pull) persists binding_mode + the source ref in measurement_method', async () => {
    const t = await h.svc.createTarget({ title: 'net worth' })
    const out = await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'finance_target', id: 'f1' } })
    expect(out.binding_mode).toBe('derived-pull')
    expect(out.measurement_method).toBe('finance_target:f1') // the ${type}:${id} source key (S5 convention)
    // re-read confirms it persisted (not just the returned row)
    const re = await h.svc.getTarget(t.id)
    expect(re?.measurement_method).toBe('finance_target:f1')
  })

  it('bind(event-trigger) persists the ref too (the write path is dormant at M1)', async () => {
    const t = await h.svc.createTarget({ title: 'auto-complete on paid' })
    const out = await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'event-trigger', ref: { type: 'task', id: 'tk1' } })
    expect(out.binding_mode).toBe('event-trigger')
    expect(out.measurement_method).toBe('task:tk1')
  })

  it('bind(manual) clears the binding (mode + measurement_method)', async () => {
    const t = await h.svc.createTarget({ title: 'x' })
    await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'habit', id: 'h1' } })
    const out = await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'manual' })
    expect(out.binding_mode).toBe('manual')
    expect(out.measurement_method).toBeNull()
  })

  it('a non-manual bind without a ref is rejected (ZodError)', async () => {
    const t = await h.svc.createTarget({ title: 'x' })
    await expect(h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull' })).rejects.toThrow()
  })

  it('bind on a missing target throws TargetNotFoundError', async () => {
    await expect(
      h.svc.bind({ type: 'target', id: 'nope' }, { binding_mode: 'derived-pull', ref: { type: 'habit', id: 'h1' } }),
    ).rejects.toBeInstanceOf(TargetNotFoundError)
  })

  it('a derived-pull target leaf resolves NULL at M1 (empty source registry) — honest unmeasured, never 0', async () => {
    const t = await h.svc.createTarget({ title: 'net worth', target_value: 100, current_value: 50 }) // would be 50% if manual
    await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'finance_target', id: 'f1' } })
    const v = await h.svc.progress({ type: 'target', id: t.id })
    expect(v.value).toBeNull() // derived-pull overrides the stored current_value → reads the (empty) source → null
    expect(v.unmeasured).toBe(true)
  })

  it('a derived-pull target leaf resolves through an injected measurement-source registry (the M2 seam)', async () => {
    const sources = createMeasurementSourceRegistry()
    sources.advertise('finance_target:f1', () => 0.75) // Finance advertises a normalized measure, [0,1]
    const hh = await setup({ measurementSources: sources })
    const t = await hh.svc.createTarget({ title: 'net worth' })
    await hh.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'finance_target', id: 'f1' } })
    expect((await hh.svc.progress({ type: 'target', id: t.id })).value).toBe(75) // 0.75 → 75%
  })

  it('a derived-pull target also feeds a purpose rollup via the source seam (null at M1, live at M2)', async () => {
    const sources = createMeasurementSourceRegistry()
    sources.advertise('habit:h1', () => 0.6)
    const hh = await setup({ measurementSources: sources })
    const p = await hh.svc.createPurpose({ title: 'fitness' })
    const t = await hh.svc.createTarget({ title: 'streak-bound', purpose_id: p.id })
    await hh.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'habit', id: 'h1' } })
    expect((await hh.svc.computeProgress({ type: 'purpose', id: p.id })).value).toBe(60) // the derived leaf rolls up
  })

  it('rejects a target↔target binding cycle with CyclicBinding (both edges counted, §3.7)', async () => {
    const a = await h.svc.createTarget({ title: 'A' })
    const b = await h.svc.createTarget({ title: 'B' })
    // A derives from B (edge B→A) — fine, the only edge.
    await h.svc.bind({ type: 'target', id: a.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: b.id } })
    // B derives from A (edge A→B) — now B→A→B is a cycle → rejected at author time, no save.
    await expect(
      h.svc.bind({ type: 'target', id: b.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: a.id } }),
    ).rejects.toBeInstanceOf(CyclicBinding)
    // the rejected bind did not persist: B is still unbound.
    expect((await h.svc.getTarget(b.id))?.binding_mode).not.toBe('derived-pull')
  })

  it('rejects a 3-node binding chain cycle (T1←T2←T3←T1), accumulated across bind calls', async () => {
    // The DAG guard reconstructs existing binding edges from each bound target's stored measurement_method, so a
    // cycle that only closes on the THIRD bind is still caught (no contributions involved — binding edges only).
    const t1 = await h.svc.createTarget({ title: 'T1' })
    const t2 = await h.svc.createTarget({ title: 'T2' })
    const t3 = await h.svc.createTarget({ title: 'T3' })
    await h.svc.bind({ type: 'target', id: t1.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: t2.id } }) // T2→T1
    await h.svc.bind({ type: 'target', id: t2.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: t3.id } }) // T3→T2
    // T3 derives from T1 → T1→T3, closing T1←T2←T3←T1 → cycle.
    await expect(
      h.svc.bind({ type: 'target', id: t3.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: t1.id } }),
    ).rejects.toBeInstanceOf(CyclicBinding)
  })

  it('measurement_method is bind-managed: a direct create/update write while a binding is live is rejected', async () => {
    // A human "how it is measured" description is fine on a manual target …
    const t = await h.svc.createTarget({ title: 'manual', measurement_method: 'weekly self-survey' })
    expect(t.measurement_method).toBe('weekly self-survey')
    // … but once a binding is live, measurement_method IS the source ref → not directly writable (would corrupt it).
    await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'derived-pull', ref: { type: 'habit', id: 'h1' } })
    await expect(h.svc.updateTarget(t.id, { measurement_method: 'oops' })).rejects.toBeInstanceOf(BindingRefManaged)
    // smuggling a ref past the DAG guard via create is likewise rejected.
    await expect(
      h.svc.createTarget({ title: 'smuggle', binding_mode: 'derived-pull', measurement_method: 'target:x' }),
    ).rejects.toBeInstanceOf(BindingRefManaged)
    // clearing the binding (→ manual) frees the column again.
    await h.svc.bind({ type: 'target', id: t.id }, { binding_mode: 'manual' })
    const re = await h.svc.updateTarget(t.id, { measurement_method: 'back to a description' })
    expect(re.measurement_method).toBe('back to a description')
  })

  it('re-binding the same target replaces its own edge (not a self-reported cycle)', async () => {
    const a = await h.svc.createTarget({ title: 'A' })
    const b = await h.svc.createTarget({ title: 'B' })
    const c = await h.svc.createTarget({ title: 'C' })
    await h.svc.bind({ type: 'target', id: a.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: b.id } })
    // re-bind A to derive from C instead — A's old B→A edge is replaced, no phantom cycle.
    const out = await h.svc.bind({ type: 'target', id: a.id }, { binding_mode: 'derived-pull', ref: { type: 'target', id: c.id } })
    expect(out.measurement_method).toBe(`target:${c.id}`)
  })
})

describe('mod-purposes S7 — reviews + plan_steps', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  const reviewSessions = (): Record<string, unknown>[] =>
    h.bsql.prepare("select * from sessions where sub_type = 'review'").all() as Record<string, unknown>[]

  it('openTargetReview records the ledger, computes next_review_date, registers review, fires a scheduled session', async () => {
    const t = await h.svc.createTarget({ title: 'ship v1', review_frequency: 'weekly' })
    const r = await h.svc.openTargetReview(t.id, { progress_rating: 7, reflection: 'on track', reviewed_at: Date.UTC(2026, 0, 1) })
    expect(r.target_id).toBe(t.id)
    expect(r.progress_rating).toBe(7)
    // the `review` sub-type is now registered + a scheduled review session exists (PG-13).
    expect((await h.sessionRegistry.get('review')).owner_module).toBe('purposes')
    const sess = reviewSessions()
    expect(sess.length).toBe(1)
    expect(sess[0]!.status).toBe('scheduled')
    expect(sess[0]!.scheduling_mode).toBe('planned')
    // next_review_date = reviewed_at (2026-01-01 UTC) + 1 week.
    expect((await h.svc.getTarget(t.id))?.next_review_date).toBe('2026-01-08')
  })

  it('next_review_date honours the frequency (monthly clamps the day; null frequency leaves it unset)', async () => {
    const m = await h.svc.createTarget({ title: 'monthly', review_frequency: 'monthly' })
    await h.svc.openTargetReview(m.id, { reviewed_at: Date.UTC(2026, 0, 31) }) // Jan 31 + 1mo → Feb 28 (clamp)
    expect((await h.svc.getTarget(m.id))?.next_review_date).toBe('2026-02-28')
    const n = await h.svc.createTarget({ title: 'no-freq', review_frequency: null })
    await h.svc.openTargetReview(n.id, {})
    expect((await h.svc.getTarget(n.id))?.next_review_date).toBeNull() // no frequency → no next date
  })

  it('openPurposeReview records the alignment ledger + fires a scheduled review session', async () => {
    const p = await h.svc.createPurpose({ title: 'live well' })
    const r = await h.svc.openPurposeReview(p.id, { still_aligned: true, fulfillment_rating: 8, clarity_rating: 7 })
    expect(r.purpose_id).toBe(p.id)
    expect(r.still_aligned).toBe(true) // boolInt round-trips to boolean
    expect(r.fulfillment_rating).toBe(8)
    expect(reviewSessions().length).toBe(1)
  })

  it('registering review is idempotent across many reviews (DuplicateSubType swallowed)', async () => {
    const t = await h.svc.createTarget({ title: 't' })
    const p = await h.svc.createPurpose({ title: 'p' })
    await h.svc.openTargetReview(t.id, {})
    await h.svc.openPurposeReview(p.id, { still_aligned: false })
    await h.svc.openTargetReview(t.id, {}) // 2nd register → DuplicateSubType caught → no throw
    expect(reviewSessions().length).toBe(3)
    expect((await h.svc.listTargetReviews(t.id)).length).toBe(2)
    expect((await h.svc.listPurposeReviews(p.id)).length).toBe(1)
  })

  it('open*Review on a missing entity throws the typed *NotFoundError (no ledger, no session)', async () => {
    await expect(h.svc.openTargetReview('nope', {})).rejects.toBeInstanceOf(TargetNotFoundError)
    await expect(h.svc.openPurposeReview('nope', { still_aligned: true })).rejects.toBeInstanceOf(PurposeNotFoundError)
    expect(reviewSessions().length).toBe(0) // the throw was BEFORE any session write
  })

  it('plan steps: add → list (active) → toggle completion on/off', async () => {
    const t = await h.svc.createTarget({ title: 'goal' })
    const s1 = await h.svc.addPlanStep({ type: 'target', id: t.id }, { title: 'step 1' })
    await h.svc.addPlanStep({ type: 'target', id: t.id }, { title: 'step 2', sort_order: 1 })
    await h.svc.addPlanStep({ type: 'task', id: 'tk1' }, { title: 'other owner' }) // different owner → excluded
    const steps = await h.svc.listPlanSteps({ type: 'target', id: t.id })
    expect(steps.length).toBe(2)
    expect(s1.is_completed).toBe(false)
    const toggled = await h.svc.togglePlanStep(s1.id)
    expect(toggled.is_completed).toBe(true)
    expect(toggled.completed_at).not.toBeNull()
    const untoggled = await h.svc.togglePlanStep(s1.id)
    expect(untoggled.is_completed).toBe(false)
    expect(untoggled.completed_at).toBeNull() // cleared on un-complete
  })

  it('togglePlanStep on a missing id throws PlanStepNotFoundError', async () => {
    await expect(h.svc.togglePlanStep('nope')).rejects.toBeInstanceOf(PlanStepNotFoundError)
  })
})

// ============================================================================
// S8 — tags · links · pages (compose SpacesService WRITE + NotesService). Live-store: real entity_tags/entity_links/
// pages writes through the built substrates, read back via the association resolver + NotesService. Maps 1:1 to
// slice-map S8 + seam-contract composition-seam-5 (PG-18).
// ============================================================================
describe('mod-purposes S8 — tags · links · pages', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('tagEntity attaches a tag to a purpose (live) and untagEntity removes it', async () => {
    const p = await h.svc.createPurpose({ title: 'Health' })
    const tag = await h.spaces.createTag({ name: 'core' })
    await h.svc.tagEntity('purpose', p.id, tag.id)
    const after = await h.associations.resolveAssociations({ entityType: 'purpose', entityId: p.id }, 'separate')
    if (after.mode === 'separate') expect(after.tags.map((t) => t.tagId)).toContain(tag.id)
    await h.svc.untagEntity('purpose', p.id, tag.id)
    const removed = await h.associations.resolveAssociations({ entityType: 'purpose', entityId: p.id }, 'separate')
    if (removed.mode === 'separate') expect(removed.tags.map((t) => t.tagId)).not.toContain(tag.id)
  })

  it('linkEntity writes an outbound entity_link from a page to a target; unlinkEntity removes it', async () => {
    const p = await h.svc.createPurpose({ title: 'Career' })
    const t = await h.svc.createTarget({ title: 'Ship v1', purpose_id: p.id })
    const page = await h.svc.ensureEntityNote('purpose', p.id) // a real page to anchor the outbound link
    await h.svc.linkEntity(page.id, { type: 'target', id: t.id }, 'see target')
    const after = await h.associations.resolveAssociations({ entityType: 'page', entityId: page.id }, 'separate')
    if (after.mode === 'separate') {
      expect(after.links.some((l) => l.target.entityType === 'target' && l.target.entityId === t.id)).toBe(true)
    }
    await h.svc.unlinkEntity(page.id, { type: 'target', id: t.id })
    const removed = await h.associations.resolveAssociations({ entityType: 'page', entityId: page.id }, 'separate')
    if (removed.mode === 'separate') expect(removed.links.some((l) => l.target.entityId === t.id)).toBe(false)
  })

  it('ensureEntityNote find-or-creates the standalone note seeded with the entity title + is idempotent', async () => {
    const p = await h.svc.createPurpose({ title: 'Family first' })
    const page1 = await h.svc.ensureEntityNote('purpose', p.id)
    expect(page1.entity_type).toBe('purpose')
    expect(page1.entity_id).toBe(p.id)
    expect(page1.type).toBe('note') // no new PAGE_TYPE
    expect(page1.title).toBe('Family first') // seeded from the owned entity's title
    const page2 = await h.svc.ensureEntityNote('purpose', p.id)
    expect(page2.id).toBe(page1.id) // idempotent — same page, not a duplicate
    expect((await h.notes.getPagesForEntity('purpose', p.id)).length).toBe(1)
  })

  it('ensureEntityNote seeds a value note from its name column', async () => {
    const v = await h.svc.createValue({ name: 'Integrity' })
    const page = await h.svc.ensureEntityNote('value', v.id)
    expect(page.entity_type).toBe('value')
    expect(page.title).toBe('Integrity')
  })

  it('ensureEntityNote throws the owner *NotFoundError when the entity is missing', async () => {
    await expect(h.svc.ensureEntityNote('purpose', 'missing-id')).rejects.toBeInstanceOf(PurposeNotFoundError)
    await expect(h.svc.ensureEntityNote('dream', 'missing-id')).rejects.toBeInstanceOf(DreamNotFoundError)
  })

  it('tag/link delegate registry validation — an unregistered entity_type is rejected by spaces (BR-2)', async () => {
    const tag = await h.spaces.createTag({ name: 'x' })
    // bypass the typed union to prove the write-through preserves spaces' registry guard
    await expect(h.svc.tagEntity('not_a_real_type' as PurposeTagLinkType, 'id', tag.id)).rejects.toBeInstanceOf(
      UnknownEntityType,
    )
  })

  it('purpose_metric_value is a valid tag target (PG-18) — a ledger row carries no note but is taggable', async () => {
    const m = await h.svc.createMetric({ name: 'Weight', unit: 'kg' })
    const mv = await h.svc.recordMetricValue(m.id, 80, { source: 'manual' })
    const tag = await h.spaces.createTag({ name: 'body' })
    await h.svc.tagEntity('purpose_metric_value', mv.id, tag.id)
    const after = await h.associations.resolveAssociations(
      { entityType: 'purpose_metric_value', entityId: mv.id },
      'separate',
    )
    if (after.mode === 'separate') expect(after.tags.map((t) => t.tagId)).toContain(tag.id)
  })
})

// ============================================================================
// S9 — provider (Journal summary + DueProvider lane) + emit-only fan-out + PG-19 deletion. Live-store: real journal/
// sessions/effects substrates; cascades verified via raw reads. Maps 1:1 to slice-map S9 + seam-contract seam-6.
// ============================================================================
describe('mod-purposes S9 — Journal provider + getDayPurposesDigest', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('getDayPurposesDigest counts active (non-terminal) purposes + targets with a review due that day', async () => {
    const p = await h.svc.createPurpose({ title: 'Health' }) // status default in_progress (active)
    const done = await h.svc.createPurpose({ title: 'Old' })
    await h.svc.updatePurpose(done.id, { status: 'completed' }) // terminal → excluded
    const rm = await h.svc.createTarget({ title: 'Review me', purpose_id: p.id })
    await h.svc.updateTarget(rm.id, { next_review_date: '2026-10-10' }) // next_review_date is set via update (not a create field)
    const lt = await h.svc.createTarget({ title: 'Later', purpose_id: p.id })
    await h.svc.updateTarget(lt.id, { next_review_date: '2026-11-01' })
    const digest = await h.svc.getDayPurposesDigest('2026-10-10')
    expect(digest.activePurposes).toBe(1) // 'Health' only; 'Old' is completed
    expect(digest.reviewsDue).toBe(1) // the '2026-10-10' target only
  })

  it('registerPurposesJournal registers a summary contribution; success when active, empty when idle', async () => {
    const registry = createJournalRegistry()
    registerPurposesJournal(registry, h.svc)
    const contrib = registry.get('purposes')
    expect(contrib?.module).toBe('purposes')
    expect(contrib?.sectionKey).toBe('summary')
    const empty = await contrib!.summary('2026-10-10')
    expect(empty.state).toBe('empty') // nothing created yet
    await h.svc.createPurpose({ title: 'Active' })
    const active = await contrib!.summary('2026-10-10')
    expect(active.state).toBe('success')
    expect(active.module).toBe('purposes')
  })
})

describe('mod-purposes S9 — DueProvider lane (SS-7)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('dueIn returns targets whose next_review_date falls in the UTC-ms window, as canonical DueItems', async () => {
    const t = await h.svc.createTarget({ title: 'Quarterly review' })
    await h.svc.updateTarget(t.id, { next_review_date: '2026-10-15' })
    const oor = await h.svc.createTarget({ title: 'Out of range' })
    await h.svc.updateTarget(oor.id, { next_review_date: '2026-12-01' })
    await h.svc.createTarget({ title: 'No review date' }) // excluded (null next_review_date)
    const range = { start: Date.parse('2026-10-01T00:00:00Z'), end: Date.parse('2026-10-31T00:00:00Z') }
    const items = await h.svc.dueIn(range)
    expect(items.length).toBe(1)
    const it = items[0]!
    expect(it.source_module).toBe('purposes')
    expect(it.ref_id).toBe(t.id)
    expect(it.label).toBe('Quarterly review')
    expect(it.est_minutes).toBe(15)
    expect(it.urgency).toBe(0) // ranking deferred to M1.2
    expect(it.hard_deadline).toBe(Date.parse('2026-10-15T00:00:00Z'))
  })

  it('registerPurposesDueProvider wires the lane into the sessions aggregator (sessions.dueIn surfaces it)', async () => {
    const dt = await h.svc.createTarget({ title: 'Due target' })
    await h.svc.updateTarget(dt.id, { next_review_date: '2026-10-20' })
    registerPurposesDueProvider(h.sessions, h.svc)
    const agg = await h.sessions.dueIn({
      start: Date.parse('2026-10-01T00:00:00Z'),
      end: Date.parse('2026-10-31T00:00:00Z'),
    })
    expect(agg.some((d) => d.source_module === 'purposes' && d.label === 'Due target')).toBe(true)
  })
})

describe('mod-purposes S9 — emit-only completion fan-out', () => {
  it('is a dormant no-op when no effect rail is wired (M1 default)', async () => {
    const h = await setup() // no effectsRegistry
    const t = await h.svc.createTarget({ title: 'Goal' })
    await expect(h.svc.updateTarget(t.id, { status: 'completed' })).resolves.toBeTruthy() // no throw
  })

  it('emits emit_measurement_signal on a status→completed TRANSITION of a target (with a wired handler)', async () => {
    const registry = createEffectRegistry()
    const fired: EffectEvent[] = []
    registry.register('emit_measurement_signal', async (event) => {
      fired.push(event)
    })
    const h = await setup({ effectsRegistry: registry })
    const t = await h.svc.createTarget({ title: 'Goal' }) // not_started
    await h.svc.updateTarget(t.id, { status: 'in_progress' }) // not a completion → no emit
    expect(fired.length).toBe(0)
    await h.svc.updateTarget(t.id, { status: 'completed' }) // transition → emit
    expect(fired.length).toBe(1)
    expect(fired[0]!.effectType).toBe('emit_measurement_signal')
    expect(fired[0]!.transition).toBe('target.completed')
    expect(fired[0]!.subjectNaturalKey).toBe(t.id)
    // re-saving an already-completed target does NOT re-fire (no transition)
    await h.svc.updateTarget(t.id, { status: 'completed' })
    expect(fired.length).toBe(1)
  })

  it('emits on a purpose completion transition too (transition = purpose.completed)', async () => {
    const registry = createEffectRegistry()
    const fired: EffectEvent[] = []
    registry.register('emit_measurement_signal', async (event) => {
      fired.push(event)
    })
    const h = await setup({ effectsRegistry: registry })
    const p = await h.svc.createPurpose({ title: 'Big goal' })
    await h.svc.updatePurpose(p.id, { status: 'completed' })
    expect(fired.length).toBe(1)
    expect(fired[0]!.transition).toBe('purpose.completed')
  })
})

describe('mod-purposes S9 — PG-19 deletion propagation', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('archivePurpose SET-NULLs child targets (survive), cascades contributions/reviews, two-hop metrics', async () => {
    const p = await h.svc.createPurpose({ title: 'Parent' })
    const t = await h.svc.createTarget({ title: 'Child', purpose_id: p.id })
    const contribDream = await h.svc.createDream({ title: 'Contributor' }) // dream ∈ CONTRIBUTION_CONTRIBUTOR_TYPE
    await h.svc.linkContribution({ type: 'purpose', id: p.id }, { type: 'dream', id: contribDream.id }, { weight: 50 })
    await h.svc.openPurposeReview(p.id, { still_aligned: true, overall_progress: 5 })
    const m = await h.svc.createMetric({ purpose_id: p.id, name: 'M', unit: 'x' })
    await h.svc.recordMetricValue(m.id, 1, { source: 'manual' })

    await h.svc.archivePurpose(p.id)

    expect(await h.svc.getPurpose(p.id)).toBeNull() // soft-deleted
    const survived = await h.svc.getTarget(t.id)
    expect(survived).not.toBeNull() // target SURVIVES
    expect(survived!.purpose_id).toBeNull() // …standalone (SET NULL)
    expect((await h.svc.listContributions({ type: 'purpose', id: p.id })).length).toBe(0) // contributions cascaded
    expect((await h.svc.listPurposeReviews(p.id)).length).toBe(0) // reviews cascaded
    expect(await h.svc.getMetric(m.id)).toBeNull() // metric hard-cascaded (two-hop)
  })

  it('archiveTarget cascades its goal-side contributions + hard-cascades target_reviews', async () => {
    // (target is a GOAL type, never a contributor — contributor-side cleanup is covered by archiveDream below.)
    const t = await h.svc.createTarget({ title: 'Target' })
    const feeder = await h.svc.createDream({ title: 'Feeder' }) // dream contributes to the target
    await h.svc.linkContribution({ type: 'target', id: t.id }, { type: 'dream', id: feeder.id }, { weight: 40 })
    await h.svc.openTargetReview(t.id, { progress_rating: 7 })

    await h.svc.archiveTarget(t.id)

    expect(await h.svc.getTarget(t.id)).toBeNull()
    expect((await h.svc.listContributions({ type: 'target', id: t.id })).length).toBe(0) // goal-leg cascaded
    expect((await h.svc.listTargetReviews(t.id)).length).toBe(0) // ledger hard-cascaded
  })

  it('archiveValue SET-NULLs purposes.value_id on child purposes (they survive)', async () => {
    const v = await h.svc.createValue({ name: 'Integrity' })
    const p = await h.svc.createPurpose({ title: 'Lives by it', value_id: v.id })
    await h.svc.archiveValue(v.id)
    expect(await h.svc.getValue(v.id)).toBeNull()
    const survived = await h.svc.getPurpose(p.id)
    expect(survived).not.toBeNull()
    expect(survived!.value_id).toBeNull()
  })

  it('archiveDream cascades its contributor-side contributions only (a dream is never a goal)', async () => {
    const purpose = await h.svc.createPurpose({ title: 'Goal' })
    const d = await h.svc.createDream({ title: 'Someday' })
    await h.svc.linkContribution({ type: 'purpose', id: purpose.id }, { type: 'dream', id: d.id }, { weight: 20 })
    await h.svc.archiveDream(d.id)
    expect(await h.svc.getDream(d.id)).toBeNull()
    expect((await h.svc.listContributions({ type: 'purpose', id: purpose.id })).length).toBe(0)
  })
})
