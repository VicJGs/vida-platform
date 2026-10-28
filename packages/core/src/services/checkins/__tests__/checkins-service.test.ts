// ============================================================================
// mod-check-ins #41 ① · S2 — entry CRUD service (LIF-119)
//
// Node / better-sqlite3 live-store harness (mirrors preferences/sessions): REAL data store, UNLOCKED
// vault (IR-a — the sync-hash path runs even with empty [E]), migrate() applies 026_check_ins so the
// tables exist. Covers the S2 PLAN §4 acceptance (CHE-01/02/03/04/20/21/31).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { checkInTemplateQuestions } from '../../../db/schema/check-ins'
import { createEffectRail, createEffectRegistry, type EffectRegistry } from '../../../foundation/effects'
import {
  createCheckInsService,
  computeStreak,
  DuplicateCheckInError,
  DuplicateFieldKeyError,
  RequiredQuestionUnansweredError,
  StandardFieldInCustomDataError,
  type CheckInsService,
  type JournalLinkPort,
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
  svc: CheckInsService
  db: DrizzleDb
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createCheckInsService({ db, deviceId: 'test-device' })
  return { svc, db }
}

describe('mod-check-ins S2 — entry CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // CHE-01 — create + slot uniqueness
  it('creates a check-in and returns the parsed entry', async () => {
    const entry = await h.svc.createCheckIn({
      check_in_date: '2026-09-19',
      check_in_type: 'morning',
      mood_score: 8,
      gratitude: ['coffee', 'sun'],
    })
    expect(entry.id).toBeTruthy()
    expect(entry.check_in_date).toBe('2026-09-19')
    expect(entry.mood_score).toBe(8)
    expect(entry.gratitude).toEqual(['coffee', 'sun']) // parsed back from JSON TEXT
    expect(entry.top_intentions).toEqual([]) // omitted → [] fallback
    expect(entry.custom_data).toBeNull()
  })

  it('rejects a second check-in on the same (date, type) slot (CHE-01)', async () => {
    await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    await expect(h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })).rejects.toBeInstanceOf(
      DuplicateCheckInError,
    )
  })

  it('allows different types on the same day (CK-2 composite slot)', async () => {
    await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    const evening = await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'evening' })
    expect(evening.check_in_type).toBe('evening')
  })

  // CHE-03 / CHE-04 — reads
  it('reads a check-in back by slot and by range', async () => {
    await h.svc.createCheckIn({ check_in_date: '2026-09-10', check_in_type: 'morning', reflection: 'hi' })
    const got = await h.svc.getCheckIn('2026-09-10', 'morning')
    expect(got?.reflection).toBe('hi')
    expect(await h.svc.getCheckIn('2026-09-11', 'morning')).toBeNull()

    await h.svc.createCheckIn({ check_in_date: '2026-09-20', check_in_type: 'morning' })
    const list = await h.svc.listCheckIns({ from: '2026-09-01', to: '2026-09-15' })
    expect(list).toHaveLength(1)
    expect(list[0]?.check_in_date).toBe('2026-09-10')
  })

  // CHE-02 — content update; slot key immutable
  it('updates content and leaves the slot key immutable (CK-2)', async () => {
    const e = await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    const updated = await h.svc.updateCheckIn(e.id, { reflection: 'evening thoughts', mood_score: 6 })
    expect(updated.reflection).toBe('evening thoughts')
    expect(updated.mood_score).toBe(6)
    // A patch attempting to move the slot is stripped by the schema (not re-keyed).
    await h.svc.updateCheckIn(e.id, { check_in_date: '2026-01-01' } as never)
    expect((await h.svc.getCheckIn('2026-09-19', 'morning'))?.id).toBe(e.id)
    expect(await h.svc.getCheckIn('2026-01-01', 'morning')).toBeNull()
  })

  // CHE-21 — custom_data single-source discipline
  it('rejects a custom_data key that duplicates a standard field (CHE-21)', async () => {
    await expect(
      h.svc.createCheckIn({
        check_in_date: '2026-09-19',
        check_in_type: 'morning',
        custom_data: { mood_score: 5 },
      }),
    ).rejects.toBeInstanceOf(StandardFieldInCustomDataError)
  })

  it('accepts custom_data with only extra keys', async () => {
    const e = await h.svc.createCheckIn({
      check_in_date: '2026-09-19',
      check_in_type: 'morning',
      custom_data: { sleep_hours: 7 },
    })
    expect(e.custom_data).toEqual({ sleep_hours: 7 })
  })

  // CHE-20 — required-question gate
  it('blocks completion when a required template question is unanswered (CHE-20)', async () => {
    const qRepo = createRepository(h.db, checkInTemplateQuestions, {
      deviceId: 'test-device',
      encryptedFields: [],
      softDelete: false,
    })
    const tplId = 'tpl-1'
    await qRepo.create({
      template_id: tplId,
      field_key: 'sleep_quality',
      label: 'Sleep quality',
      field_type: 'rating',
      is_required: true,
      sort_order: 0,
    })
    // Missing the required answer → rejected.
    await expect(
      h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning', template_id: tplId }),
    ).rejects.toBeInstanceOf(RequiredQuestionUnansweredError)
    // Answered in custom_data → passes.
    const ok = await h.svc.createCheckIn({
      check_in_date: '2026-09-19',
      check_in_type: 'morning',
      template_id: tplId,
      custom_data: { sleep_quality: 4 },
    })
    expect(ok.template_id).toBe(tplId)
  })

  it('applies no required-question gate when no template is referenced', async () => {
    const e = await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    expect(e.template_id).toBeNull()
  })
})

describe('mod-check-ins S3 — templates & questions', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // CHE-06/07 — template CRUD + schedule_days JSON round-trip + default backfill
  it('creates a template with backfilled defaults and round-trips schedule_days', async () => {
    const t = await h.svc.createTemplate({ name: 'Morning' })
    expect(t.icon).toBe('clipboard-check') // backfilled
    expect(t.is_active).toBe(true)
    expect(t.is_default).toBe(false)
    expect(t.schedule_days).toBeNull()
    const withDays = await h.svc.createTemplate({ name: 'Weekly', schedule_days: [1, 3, 5] })
    expect(withDays.schedule_days).toEqual([1, 3, 5]) // parsed back from JSON TEXT
    const patched = await h.svc.updateTemplate(t.id, { name: 'Morning v2', schedule_days: [0] })
    expect(patched.name).toBe('Morning v2')
    expect(patched.schedule_days).toEqual([0])
  })

  // CHE-05 — default-first resolution via is_default
  it('getActiveTemplate returns null when no default, then the default once set', async () => {
    expect(await h.svc.getActiveTemplate('morning')).toBeNull() // built-in fallback
    const def = await h.svc.createTemplate({ name: 'Default', is_default: true })
    const active = await h.svc.getActiveTemplate('morning')
    expect(active?.id).toBe(def.id)
  })

  // CHE-12 — idempotent single-default seed
  it('seedDefaultTemplates seeds one default and is idempotent', async () => {
    const first = await h.svc.seedDefaultTemplates()
    expect(first).toHaveLength(1)
    expect(first[0]?.is_default).toBe(true)
    const second = await h.svc.seedDefaultTemplates()
    expect(second).toHaveLength(1)
    expect(second[0]?.id).toBe(first[0]?.id) // no duplicate
    expect((await h.svc.getActiveTemplate('evening'))?.id).toBe(first[0]?.id)
  })

  // CHE-08 — questions + UNIQUE(field_key); reduced-column row has no phantom base cols
  it('adds questions, rejects a duplicate field_key, and returns a clean row', async () => {
    const t = await h.svc.createTemplate({ name: 'Custom' })
    const q = await h.svc.addQuestion(t.id, { field_key: 'sleep', label: 'Sleep', field_type: 'rating' })
    expect(q.field_key).toBe('sleep')
    expect(q).not.toHaveProperty('created_at') // reduced-column: no phantom baseColumns
    expect(q).not.toHaveProperty('updated_at')
    await expect(
      h.svc.addQuestion(t.id, { field_key: 'sleep', label: 'dup', field_type: 'text_area' }),
    ).rejects.toBeInstanceOf(DuplicateFieldKeyError)
  })

  // CHE-09/10 — reorder + remove
  it('reorders and removes questions', async () => {
    const t = await h.svc.createTemplate({ name: 'Custom' })
    await h.svc.addQuestion(t.id, { field_key: 'a', label: 'A', field_type: 'boolean' })
    await h.svc.addQuestion(t.id, { field_key: 'b', label: 'B', field_type: 'boolean' })
    await h.svc.reorderQuestions(t.id, ['b', 'a'])
    const qs = await h.svc.getQuestions(t.id)
    expect(qs.find((q) => q.field_key === 'b')?.sort_order).toBe(0)
    expect(qs.find((q) => q.field_key === 'a')?.sort_order).toBe(1)
    await h.svc.removeQuestion(t.id, 'a')
    expect((await h.svc.getQuestions(t.id)).map((q) => q.field_key)).toEqual(['b'])
  })

  // CHE-11 — schedule config
  it('sets the template schedule config', async () => {
    const t = await h.svc.createTemplate({ name: 'Sched' })
    const updated = await h.svc.setSchedule(t.id, {
      schedule_type: 'weekly',
      schedule_days: [1, 4],
      preferred_time: 'morning',
    })
    expect(updated.schedule_type).toBe('weekly')
    expect(updated.schedule_days).toEqual([1, 4])
    expect(updated.preferred_time).toBe('morning')
  })

  // CHE-22 — no-FK app-cascade on template delete
  it('deleteTemplate nulls referencing entries and deletes questions (app-cascade)', async () => {
    const t = await h.svc.createTemplate({ name: 'ToDelete' })
    await h.svc.addQuestion(t.id, { field_key: 'x', label: 'X', field_type: 'boolean' })
    const entry = await h.svc.createCheckIn({
      check_in_date: '2026-09-19',
      check_in_type: 'morning',
      template_id: t.id,
    })
    await h.svc.deleteTemplate(t.id)
    // entry survives, its template_id nulled
    const survivor = await h.svc.getCheckIn('2026-09-19', 'morning')
    expect(survivor?.id).toBe(entry.id)
    expect(survivor?.template_id).toBeNull()
    // questions gone
    expect(await h.svc.getQuestions(t.id)).toHaveLength(0)
  })
})

describe('mod-check-ins S4 — derivations', () => {
  // CHE-14 — pure streak helper (the core logic; deterministic via injected asOf)
  describe('computeStreak (pure)', () => {
    it('empty → all zero / null', () => {
      expect(computeStreak([], '2026-09-19')).toEqual({
        current_streak: 0,
        longest_streak: 0,
        last_check_in_date: null,
      })
    })
    it('counts distinct dates (two types same day = 1 day)', () => {
      const r = computeStreak(['2026-09-18', '2026-09-18', '2026-09-19'], '2026-09-19')
      expect(r.current_streak).toBe(2)
      expect(r.longest_streak).toBe(2)
      expect(r.last_check_in_date).toBe('2026-09-19')
    })
    it('longest run spans a gap; current is the run ending at the latest date', () => {
      // run of 3 (01,02,03), gap, run of 2 (08,09); asOf 09 → current 2, longest 3
      const r = computeStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-08', '2026-09-09'], '2026-09-09')
      expect(r.longest_streak).toBe(3)
      expect(r.current_streak).toBe(2)
    })
    it('current counts today (asOf) and yesterday (asOf-1) as live', () => {
      expect(computeStreak(['2026-09-18', '2026-09-19'], '2026-09-19').current_streak).toBe(2) // ends today
      expect(computeStreak(['2026-09-17', '2026-09-18'], '2026-09-19').current_streak).toBe(2) // ends yesterday
    })
    it('a broken streak (latest older than yesterday) is current 0, longest preserved', () => {
      const r = computeStreak(['2026-09-10', '2026-09-11', '2026-09-12'], '2026-09-19')
      expect(r.current_streak).toBe(0) // broken
      expect(r.longest_streak).toBe(3)
      expect(r.last_check_in_date).toBe('2026-09-12')
    })
  })

  // Live-store smoke — trend + streak over real seeded entries; no user_profile write
  describe('service (live store)', () => {
    let h: Harness
    beforeEach(async () => {
      h = await setup()
    })
    it('getMoodEnergyTrend returns range-filtered plaintext points sorted by date', async () => {
      await h.svc.createCheckIn({
        check_in_date: '2026-09-10',
        check_in_type: 'morning',
        mood_score: 5,
        energy_level: 6,
      })
      await h.svc.createCheckIn({
        check_in_date: '2026-09-12',
        check_in_type: 'evening',
        mood_score: 8,
        energy_level: 4,
      })
      await h.svc.createCheckIn({
        check_in_date: '2026-09-20',
        check_in_type: 'morning',
        mood_score: 3,
        energy_level: 3,
      })
      const trend = await h.svc.getMoodEnergyTrend({ from: '2026-09-01', to: '2026-09-15' })
      expect(trend.points.map((p) => p.date)).toEqual(['2026-09-10', '2026-09-12'])
      expect(trend.points[0]?.mood_score).toBe(5)
      expect(await h.svc.getMoodEnergyTrend({ from: '2026-01-01', to: '2026-01-31' })).toEqual({ points: [] })
    })
    it('computeCheckInStreak derives from live entries (asOf injected)', async () => {
      await h.svc.createCheckIn({ check_in_date: '2026-09-18', check_in_type: 'morning' })
      await h.svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
      const streak = await h.svc.computeCheckInStreak('2026-09-19')
      expect(streak).toEqual({ current_streak: 2, longest_streak: 2, last_check_in_date: '2026-09-19' })
    })
  })
})

describe('mod-check-ins S5 — cross-module seams', () => {
  // CHE-15/28 — placeholder review (any construction)
  it('getReviewData returns a degraded placeholder, never a false-complete review', async () => {
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    await initVault()
    const svc = createCheckInsService({ db: createDrizzleProxy(driver), deviceId: 'd' })
    const review = await svc.getReviewData('weekly_review')
    expect(review).toEqual(expect.objectContaining({ type: 'weekly_review', sections: [], degraded: true }))
  })

  // Optional-dep dormant seam — no journal/effects deps → no crash, no link, no emit (S1-S4 construction)
  it('createCheckIn works with no cross-module deps (dormant seam)', async () => {
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    await initVault()
    const svc = createCheckInsService({ db: createDrizzleProxy(driver), deviceId: 'd' })
    const e = await svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    expect(e.id).toBeTruthy() // no crash without journal/effects
  })

  // CHE-16 — Journal day-page re-feed (link-don't-copy), best-effort
  it('createCheckIn links to the journal day page when one exists; no page → no link', async () => {
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    await initVault()
    const links: Array<{ pageId: string; entityType: string; entityId: string }> = []
    const pagesByDate = new Map<string, { id: string }>([['2026-09-19', { id: 'page-919' }]])
    const journal: JournalLinkPort = {
      getPageByJournalDate: async (d) => pagesByDate.get(d) ?? null,
      createEntityLink: async (pageId, entityType, entityId) => {
        links.push({ pageId, entityType, entityId })
      },
    }
    const svc = createCheckInsService({ db: createDrizzleProxy(driver), deviceId: 'd', journal })
    const withPage = await svc.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' })
    expect(links).toEqual([{ pageId: 'page-919', entityType: 'daily_check_in', entityId: withPage.id }])
    // A date with no journal page → best-effort no-op (no link).
    await svc.createCheckIn({ check_in_date: '2026-09-20', check_in_type: 'morning' })
    expect(links).toHaveLength(1)
  })

  // CHE-17 — grant_currency emit, guarded by a registered handler; NEVER writes XP itself
  it('emits grant_currency on create only when a handler is registered', async () => {
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    await initVault()
    const db = createDrizzleProxy(driver)

    // No handler registered → guarded no-op (no throw).
    const registryEmpty: EffectRegistry = createEffectRegistry()
    const svcNoHandler = createCheckInsService({
      db,
      deviceId: 'd',
      effects: { rail: createEffectRail(db, registryEmpty), registry: registryEmpty },
    })
    await expect(
      svcNoHandler.createCheckIn({ check_in_date: '2026-09-19', check_in_type: 'morning' }),
    ).resolves.toBeTruthy() // no NoEffectHandler crash

    // Handler registered (M1.2 Gamification stand-in) → fires exactly once.
    const registry = createEffectRegistry()
    let fired = 0
    registry.register('grant_currency', async () => {
      fired++
    })
    const svc = createCheckInsService({
      db,
      deviceId: 'd',
      effects: { rail: createEffectRail(db, registry), registry },
    })
    await svc.createCheckIn({ check_in_date: '2026-09-20', check_in_type: 'morning' })
    expect(fired).toBe(1)
    // updateCheckIn is a content edit → NO re-emit.
    const e = await svc.getCheckIn('2026-09-20', 'morning')
    await svc.updateCheckIn(e!.id, { reflection: 'edited' })
    expect(fired).toBe(1)
  })
})
