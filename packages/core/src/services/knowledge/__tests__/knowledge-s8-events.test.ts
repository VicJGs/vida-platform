// ============================================================================
// mod-knowledge #50 ① · S8 — Event fan-out + Journal contribution (KNO-38/39/40)
//
// Live-store (better-sqlite3, Node 24). Exercises the emit-only producer: the review.recorded/mastery.changed
// PUSH onto a REAL EffectRail (dormant-guarded, post-commit, failure-isolated, grain = review_event.id) and the
// PULL Journal digest (object.created/review.recorded reach the dashboard via registerKnowledgeJournal). Maps 1:1
// to PLAN-s8 §4 acceptance. Grounding: ADR-004 §3.2.5 (grain/pull) · contract.md:70 + BR-KN-S4-3 (mastery gate).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import type { EffectType } from '@vida/types'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { knowledgeObjects } from '../../../db/schema/knowledge'
import { reviewEvents } from '../../../db/schema/foundation/knowledge-review'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService } from '../../../foundation/spaces/service'
import { createCapabilityRegistry } from '../../../foundation/capability'
import { createReviewEngine } from '../../../foundation/review'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../../notes'
import { createEffectRegistry, createEffectRail, type EffectRegistry } from '../../../foundation/effects'
import { createKnowledgeService } from '../service'
import type { KnowledgeService, KnowledgeServiceDeps } from '../types'
import { createKnowledgeJournalContribution, registerKnowledgeJournal } from '../journal'

// Better-sqlite3 driver adapter (verbatim from service.test.ts — the full SqliteDriver surface).
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
  db: DrizzleDb
  bsql: Database.Database
  deps: KnowledgeServiceDeps
  svc: KnowledgeService // base: NO effects wired (dormant)
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const capability = createCapabilityRegistry(db, 'test-device')
  const review = createReviewEngine(db, 'test-device', { capability })
  const notes = createNotesService({ db, deviceId: 'test-device', spaces, backlinks, registry })
  const deps: KnowledgeServiceDeps = { db, deviceId: 'test-device', spaces, backlinks, review, notes }
  return { db, bsql, deps, svc: createKnowledgeService(deps) }
}

/** A fire record: which (transition, effectType) actually reached a registered handler. */
interface Fire {
  transition: string
  effectType: EffectType
}

/** Build a service wired to a REAL rail whose registered handlers record fires (idempotency is the rail's,
 *  tested for real). Only the listed effect-types get a handler → others stay dormant (guard skips them). */
function wired(
  deps: KnowledgeServiceDeps,
  register: readonly EffectType[],
  fires: Fire[],
  overrides?: Partial<KnowledgeServiceDeps>,
): { svc: KnowledgeService; registry: EffectRegistry } {
  const registry = createEffectRegistry()
  for (const t of register) {
    registry.register(t, async (event) => {
      fires.push({ transition: event.transition, effectType: t })
    })
  }
  const rail = createEffectRail(deps.db, registry)
  const svc = createKnowledgeService({ ...deps, effects: { rail, registry }, ...overrides })
  return { svc, registry }
}

async function seededTopicKindId(svc: KnowledgeService): Promise<string> {
  await svc.seedDefaultKinds()
  return (await svc.listKinds()).find((k) => k.name === 'topic')!.id
}

describe('mod-knowledge S8 — event fan-out + journal contribution', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // --- #1 dormant no-op (effects absent) -----------------------------------
  it('recordReview with NO effects dep persists the event + never throws (dormant, BR-KN-S8-2/7)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const obj = await h.svc.createObject({ kind_id: kindId, title: 'Bayes' })
    const ev = await h.svc.recordReview({ objectId: obj.id, methodId: 'm', quality: 4 })
    expect(ev.id).toBeTruthy()
    expect(ev.object_id).toBe(obj.id)
    expect(ev.quality).toBe(4)
  })

  // --- #2 push fires when handlers registered (quality non-null) ------------
  it('recordReview (quality non-null) drives review.recorded→[measurement,xp] + mastery.changed→[measurement] once each (BR-KN-S8-1/3/4, H4b)', async () => {
    const base = createKnowledgeService(h.deps)
    const kId = await seededTopicKindId(base)
    const obj = await base.createObject({ kind_id: kId, title: 'Entropy' })

    const fires: Fire[] = []
    const { svc } = wired(h.deps, ['emit_measurement_signal', 'award_xp'], fires)
    await svc.recordReview({ objectId: obj.id, methodId: 'm', quality: 3 })

    // review.recorded → both effects; mastery.changed → emit_measurement_signal (quality non-null)
    expect(fires).toContainEqual({ transition: 'review.recorded', effectType: 'emit_measurement_signal' })
    expect(fires).toContainEqual({ transition: 'review.recorded', effectType: 'award_xp' })
    expect(fires).toContainEqual({ transition: 'mastery.changed', effectType: 'emit_measurement_signal' })
    expect(fires.filter((f) => f.transition === 'review.recorded')).toHaveLength(2)
    expect(fires.filter((f) => f.transition === 'mastery.changed')).toHaveLength(1)
  })

  // --- #3 distinct reviews each fire (the B1 grain fix) ---------------------
  it('TWO distinct reviews of the same object each fire award_xp (grain = review_event.id, not a bare transition)', async () => {
    const base = createKnowledgeService(h.deps)
    const kindId = await seededTopicKindId(base)
    const obj = await base.createObject({ kind_id: kindId, title: 'Recurrence' })

    const fires: Fire[] = []
    const { svc } = wired(h.deps, ['award_xp'], fires)
    await svc.recordReview({ objectId: obj.id, methodId: 'm', quality: 4 })
    await svc.recordReview({ objectId: obj.id, methodId: 'm', quality: 5 })

    expect(fires.filter((f) => f.transition === 'review.recorded' && f.effectType === 'award_xp')).toHaveLength(2)
  })

  // --- #4 same-event replay dedups (exactly-once) ---------------------------
  it('re-applying the SAME (ev.id, transition, effectType, targetRef) is a rail no-op {applied:false}', async () => {
    const registry = createEffectRegistry()
    let fires = 0
    registry.register('award_xp', async () => {
      fires += 1
    })
    const rail = createEffectRail(h.db, registry)
    const event = {
      subjectNaturalKey: 'ev-123',
      transition: 'review.recorded',
      effectType: 'award_xp' as EffectType,
      targetRef: 'obj-1',
    }
    const first = await rail.applyEffect(event)
    const second = await rail.applyEffect(event)
    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)
    expect(fires).toBe(1) // handler ran once
  })

  // --- #5 post-commit failure isolation -------------------------------------
  it('a throwing handler does NOT roll back the persisted review event (failure isolated, BR-KN-S8-1)', async () => {
    const base = createKnowledgeService(h.deps)
    const kindId = await seededTopicKindId(base)
    const obj = await base.createObject({ kind_id: kindId, title: 'Isolation' })

    const registry = createEffectRegistry()
    registry.register('award_xp', async () => {
      throw new Error('handler boom')
    })
    registry.register('emit_measurement_signal', async () => {
      throw new Error('handler boom')
    })
    const rail = createEffectRail(h.db, registry)
    const svc = createKnowledgeService({ ...h.deps, effects: { rail, registry } })

    const ev = await svc.recordReview({ objectId: obj.id, methodId: 'm', quality: 2 })
    // the event persisted despite the throwing handlers
    const rows = await h.db.select().from(reviewEvents).where(eq(reviewEvents.id, ev.id)).all()
    expect(rows).toHaveLength(1)
  })

  // --- #6 object.created / lab.concluded push NOTHING (pull-only, H3) -------
  it('createObject + promoteToObject fire ZERO rail effects (journal-pull only, H3)', async () => {
    const fires: Fire[] = []
    const { svc } = wired(h.deps, ['award_xp', 'emit_measurement_signal', 'surface_journal'], fires)
    const kindId = await seededTopicKindId(svc)
    await svc.createObject({ kind_id: kindId, title: 'Catalogued' })

    const entry = await svc.createLabEntry({ hypothesis: 'H' })
    await svc.concludeLabEntry(entry.id, 'C')
    await svc.promoteToObject(entry.id, { kind_id: kindId })

    expect(fires).toHaveLength(0)
  })

  // --- #6b null-quality review: review.recorded yes, mastery.changed no (H4b) ---
  it('a null-quality review fires review.recorded but NOT mastery.changed (BR-KN-S4-3, H4b)', async () => {
    const base = createKnowledgeService(h.deps)
    const kindId = await seededTopicKindId(base)
    const obj = await base.createObject({ kind_id: kindId, title: 'Unscored' })

    const fires: Fire[] = []
    const { svc } = wired(h.deps, ['emit_measurement_signal', 'award_xp'], fires)
    await svc.recordReview({ objectId: obj.id, methodId: 'm' }) // quality omitted → null

    expect(fires.filter((f) => f.transition === 'review.recorded')).toHaveLength(2)
    expect(fires.filter((f) => f.transition === 'mastery.changed')).toHaveLength(0)
  })

  // --- #7 dated Journal digest (UTC-day window) -----------------------------
  it('getDayKnowledgeDigest counts only that UTC-day objects-created + reviews-recorded (BR-KN-S8-6)', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const day = '2026-06-15'
    const dayMs = Date.parse(`${day}T12:00:00Z`) // noon of the target day
    const prevMs = Date.parse(`${day}T12:00:00Z`) - 86_400_000 // noon of the previous day

    const a = await h.svc.createObject({ kind_id: kindId, title: 'Today A' })
    const b = await h.svc.createObject({ kind_id: kindId, title: 'Today B' })
    const old = await h.svc.createObject({ kind_id: kindId, title: 'Yesterday' })
    // pin created_at deterministically
    await h.db.update(knowledgeObjects).set({ created_at: dayMs }).where(eq(knowledgeObjects.id, a.id)).run()
    await h.db.update(knowledgeObjects).set({ created_at: dayMs }).where(eq(knowledgeObjects.id, b.id)).run()
    await h.db.update(knowledgeObjects).set({ created_at: prevMs }).where(eq(knowledgeObjects.id, old.id)).run()

    const ev = await h.svc.recordReview({ objectId: a.id, methodId: 'm', quality: 4 })
    await h.db.update(reviewEvents).set({ reviewed_at: dayMs }).where(eq(reviewEvents.id, ev.id)).run()

    const digest = await h.svc.getDayKnowledgeDigest(day)
    expect(digest).toEqual({ objectsCreated: 2, reviewsRecorded: 1 })
  })

  // --- #8 journal contribution shape + empty-safe + registry ----------------
  it('createKnowledgeJournalContribution: success with items on an active day, empty on an idle day', async () => {
    const kindId = await seededTopicKindId(h.svc)
    const day = '2026-06-20'
    const dayMs = Date.parse(`${day}T12:00:00Z`)
    const o = await h.svc.createObject({ kind_id: kindId, title: 'Active' })
    await h.db.update(knowledgeObjects).set({ created_at: dayMs }).where(eq(knowledgeObjects.id, o.id)).run()

    const contrib = createKnowledgeJournalContribution(h.svc)
    expect(contrib.module).toBe('knowledge')
    expect(contrib.sectionKey).toBe('summary')

    const active = await contrib.summary(day)
    expect(active.state).toBe('success')
    expect(active.module).toBe('knowledge')
    expect(active.items).toEqual([{ objectsCreated: 1, reviewsRecorded: 0 }])

    const idle = await contrib.summary('2000-01-01')
    expect(idle.state).toBe('empty')

    // registerKnowledgeJournal places it under module:'knowledge'
    const registered: unknown[] = []
    const fakeRegistry = { register: (c: unknown) => registered.push(c) }
    registerKnowledgeJournal(fakeRegistry as never, h.svc)
    expect((registered[0] as { module: string }).module).toBe('knowledge')
  })
})
