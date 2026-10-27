// ============================================================================
// foundation/review — engine ① live-store gate (mod-knowledge #50 ① · S3)
//
// Node / better-sqlite3 REAL store, UNLOCKED vault (the sync-hash path runs even with
// empty [E]); migrate() applies 005_capability + 008_knowledge_review so the tables exist.
// Covers the S3 Verification Gate:
//  methods — register empty-envelope study_method · listMethods filters the partition (excludes shipped
//    habit_logger) · duplicate-id rejects · config_schema round-trips
//  curves  — defineCurve persists + params json round-trip (stringify/parse) + null params · is_preset=false
//    + faithful echo · listCurves excludes soft-deleted · removeCurve guard
//  bindings — bindMethod persists no-FK refs (unregistered method allowed, BR-S3-6) · listBindings by target ·
//    unbindMethod guard
//  resolve — 2-tier pure resolver (default_method_id else null; NO realm synthesis)
//  sync    — co-transactional sync_queue enqueue on a curve create
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createCapabilityRegistry, DuplicateCapabilityId } from '../../capability'
import { createReviewEngine, ReviewCurveNotFoundError, MethodBindingNotFoundError, type ReviewEngine } from '../index'

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
  engine: ReviewEngine
  db: DrizzleDb
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const capability = createCapabilityRegistry(db, 'test-device')
  const engine = createReviewEngine(db, 'test-device', { capability })
  return { engine, db }
}

describe('foundation/review — engine ① (methods + curves + bindings)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // --- methods (KNO-15/16) --------------------------------------------------
  it('registerMethod persists an empty-envelope study_method; listMethods returns it (KNO-15/16, BR-S3-2)', async () => {
    const def = await h.engine.registerMethod({ id: 'feynman' })
    expect(def.id).toBe('feynman')
    expect(def.kind).toBe('study_method')
    // empty privilege envelope
    expect(def.render_targets).toEqual([])
    expect(def.effects).toEqual([])
    expect(def.bindings).toEqual([])
    expect(def.is_user_type).toBe(true) // register() forces it

    const ids = (await h.engine.listMethods()).map((m) => m.id)
    expect(ids).toContain('feynman')
  })

  it('listMethods returns ONLY the study_method partition — never the shipped habit_logger (KNO-15)', async () => {
    await h.engine.registerMethod({ id: 'self-test' })
    const methods = await h.engine.listMethods()
    expect(methods.every((m) => m.kind === 'study_method')).toBe(true)
    expect(methods.map((m) => m.id)).not.toContain('habit_logger') // shipped, kind='logger'
  })

  it('registerMethod rejects a duplicate id (capability BR-6)', async () => {
    await h.engine.registerMethod({ id: 'dup' })
    await expect(h.engine.registerMethod({ id: 'dup' })).rejects.toBeInstanceOf(DuplicateCapabilityId)
  })

  it('registerMethod round-trips config_schema (roles/config ride here — S7)', async () => {
    await h.engine.registerMethod({ id: 'flashcards', config_schema: { roles: ['retention', 'gathering'] } })
    const def = (await h.engine.listMethods()).find((m) => m.id === 'flashcards')!
    expect(def.config_schema).toEqual({ roles: ['retention', 'gathering'] })
  })

  // --- curves (KNO-17/18) ---------------------------------------------------
  it('defineCurve persists + round-trips params json + faithful echo (KNO-18, BR-S3-8)', async () => {
    const curve = await h.engine.defineCurve({
      name: 'Custom SM',
      curve_kind: 'review',
      params: { ef: 2.5, interval: 1, nested: { a: [1, 2] } },
    })
    expect(curve.name).toBe('Custom SM')
    expect(curve.curve_kind).toBe('review')
    expect(curve.is_preset).toBe(false) // user curves are never presets (seed defers to S4)
    expect(curve.deleted_at).toBeNull() // faithful echo (not undefined)
    // params survived stringify-on-write → parse-on-read as a real object, not a JSON string
    expect(curve.params).toEqual({ ef: 2.5, interval: 1, nested: { a: [1, 2] } })

    // and it re-reads the same way through listCurves (not just the create echo)
    const listed = (await h.engine.listCurves()).find((c) => c.id === curve.id)!
    expect(listed.params).toEqual({ ef: 2.5, interval: 1, nested: { a: [1, 2] } })
  })

  it('defineCurve accepts null/absent params (round-trips null)', async () => {
    const a = await h.engine.defineCurve({ name: 'A', curve_kind: 'decay', params: null })
    const b = await h.engine.defineCurve({ name: 'B', curve_kind: 'test' })
    expect(a.params).toBeNull()
    expect(b.params).toBeNull()
  })

  it('listCurves excludes soft-deleted; removeCurve soft-deletes + guards (KNO-18 companion)', async () => {
    const curve = await h.engine.defineCurve({ name: 'Temp', curve_kind: 'review' })
    expect((await h.engine.listCurves()).map((c) => c.id)).toContain(curve.id)
    await h.engine.removeCurve(curve.id)
    expect((await h.engine.listCurves()).map((c) => c.id)).not.toContain(curve.id)
    await expect(h.engine.removeCurve('ghost')).rejects.toBeInstanceOf(ReviewCurveNotFoundError)
  })

  // --- bindings (KNO-19) ----------------------------------------------------
  it('bindMethod persists no-FK refs — an UNREGISTERED method id is allowed (BR-S3-6)', async () => {
    // deliberately NOT registered + a curveId that does not exist: the schema is no-FK, bindMethod must not guard.
    const binding = await h.engine.bindMethod({
      targetType: 'subject',
      targetId: 'subj-1',
      methodId: 'not-registered-yet', // S7/future service id
      curveId: 'no-such-curve',
      dailyCap: 20,
    })
    expect(binding.method_id).toBe('not-registered-yet')
    expect(binding.curve_id).toBe('no-such-curve')
    expect(binding.daily_cap).toBe(20)
    expect(binding.deleted_at).toBeNull()
  })

  it('listBindings reads by target level; unbindMethod soft-deletes + guards (KNO-19 companion)', async () => {
    const b1 = await h.engine.bindMethod({ targetType: 'topic', targetId: 't-1', methodId: 'm-a' })
    await h.engine.bindMethod({ targetType: 'topic', targetId: 't-2', methodId: 'm-b' }) // different target
    const atT1 = await h.engine.listBindings('topic', 't-1')
    expect(atT1.map((b) => b.id)).toEqual([b1.id]) // only the t-1 binding

    await h.engine.unbindMethod(b1.id)
    expect((await h.engine.listBindings('topic', 't-1')).length).toBe(0)
    await expect(h.engine.unbindMethod('ghost')).rejects.toBeInstanceOf(MethodBindingNotFoundError)
  })

  // --- resolveDefaultMethod (KNO-20, 2-tier) --------------------------------
  it('resolveDefaultMethod: default_method_id else null; NEVER synthesizes from realm (BR-S3-5)', () => {
    expect(h.engine.resolveDefaultMethod({ default_method_id: 'flashcards', learning_realm: 'memorize' })).toBe(
      'flashcards',
    )
    // realm set but no explicit method → null (the realm→id tier is S7, not S3)
    expect(h.engine.resolveDefaultMethod({ default_method_id: null, learning_realm: 'memorize' })).toBeNull()
    expect(h.engine.resolveDefaultMethod({ default_method_id: null, learning_realm: null })).toBeNull()
  })

  // --- sync (co-transactional enqueue) --------------------------------------
  it('a curve create enqueues a sync_queue row co-transactionally', async () => {
    await h.engine.defineCurve({ name: 'Synced', curve_kind: 'review' })
    const queued = await h.db.select().from(syncQueue).all()
    expect(queued.some((q) => q.table_name === 'review_curves')).toBe(true)
  })
})

// ============================================================================
// S4 — review engine ②: record + due + derive (live-store).
// ============================================================================
describe('foundation/review — engine ② (record + due + derive)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  const DAY = 86_400_000

  // --- recordReview (KNO-22) ------------------------------------------------
  it('recordReview appends an immutable event (reviewed_at set, quality stored); no mastery write; enqueues sync', async () => {
    const ev = await h.engine.recordReview({ objectId: 'obj-1', methodId: 'flashcards', quality: 4 })
    expect(ev.object_id).toBe('obj-1')
    expect(ev.method_id).toBe('flashcards')
    expect(ev.quality).toBe(4)
    expect(ev.reviewed_at).toBeGreaterThan(0)
    // co-transactional enqueue on review_events (append-only source of truth)
    const queued = await h.db.select().from(syncQueue).all()
    expect(queued.some((q) => q.table_name === 'review_events')).toBe(true)
  })

  it('recordReview accepts a null/absent quality (non-graded signal)', async () => {
    const ev = await h.engine.recordReview({ objectId: 'obj-1', methodId: 'm' })
    expect(ev.quality).toBeNull()
  })

  // --- deriveMastery (KNO-23) — the null-vs-0 boundary ----------------------
  it('deriveMastery: null with NO events (unmeasured, not 0); 0–100 from the latest non-null quality', async () => {
    expect(await h.engine.deriveMastery('fresh')).toBeNull() // unmeasured — never coerced to 0

    await h.engine.recordReview({ objectId: 'q0', methodId: 'm', quality: 0 })
    expect(await h.engine.deriveMastery('q0')).toBe(0) // a real 0 (distinct from null)

    await h.engine.recordReview({ objectId: 'q3', methodId: 'm', quality: 3 })
    expect(await h.engine.deriveMastery('q3')).toBe(60) // 3/5 → 0.6 → 60

    await h.engine.recordReview({ objectId: 'q5', methodId: 'm', quality: 5 })
    expect(await h.engine.deriveMastery('q5')).toBe(100)
  })

  it('deriveMastery uses the LATEST non-null quality (input, not stored-as-mastery)', async () => {
    await h.engine.recordReview({ objectId: 'o', methodId: 'm', quality: 2 })
    await h.engine.recordReview({ objectId: 'o', methodId: 'm', quality: 5 }) // later → wins
    await h.engine.recordReview({ objectId: 'o', methodId: 'm' }) // null quality → skipped
    expect(await h.engine.deriveMastery('o')).toBe(100)
  })

  // --- getDue / dueIn (KNO-21) ----------------------------------------------
  it('getDue: a just-reviewed bound target is due after its interval, not before; filters by level', async () => {
    const curve = await h.engine.defineCurve({ name: 'C', curve_kind: 'review', params: { interval_days: 1 } })
    await h.engine.bindMethod({ targetType: 'topic', targetId: 'T', methodId: 'm', curveId: curve.id })
    await h.engine.recordReview({ objectId: 'T', methodId: 'm', quality: 4 })
    const now = Date.now()
    // due ~now+1day → inside a 2-day window, outside a 1-hour window
    expect((await h.engine.getDue({ from: now, to: now + 2 * DAY })).map((d) => d.targetId)).toContain('T')
    expect((await h.engine.getDue({ from: now, to: now + 3_600_000 })).map((d) => d.targetId)).not.toContain('T')
    // level filter
    expect((await h.engine.getDue({ from: now, to: now + 2 * DAY }, { level: 'subject' })).length).toBe(0)
  })

  it('getDue: a bound but NEVER-reviewed target is due now (no crash on empty events, NIT-3)', async () => {
    await h.engine.bindMethod({ targetType: 'topic', targetId: 'never', methodId: 'm' })
    const now = Date.now()
    const due = await h.engine.getDue({ from: now - 1000, to: now + 1000 })
    const item = due.find((d) => d.targetId === 'never')
    expect(item).toBeDefined()
    expect(item!.dueAt).toBeNull() // never reviewed → due now, dueAt null
  })

  it('dueIn: never-reviewed ⇒ due; reviewed-recently ⇒ not due until past the interval', async () => {
    const curve = await h.engine.defineCurve({ name: 'C', curve_kind: 'review', params: { interval_days: 1 } })
    await h.engine.bindMethod({ targetType: 'topic', targetId: 'x', methodId: 'm', curveId: curve.id })
    expect(await h.engine.dueIn('x')).toBe(true) // never reviewed
    await h.engine.recordReview({ objectId: 'x', methodId: 'm', quality: 4 })
    expect(await h.engine.dueIn('x')).toBe(false) // just reviewed → due ~+1day
    expect(await h.engine.dueIn('x', Date.now() + 2 * DAY)).toBe(true) // past the interval
  })
})
