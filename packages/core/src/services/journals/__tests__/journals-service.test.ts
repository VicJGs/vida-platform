// ============================================================================
// mod-journals #39 · LIF-127 · Slice 3 — journals service (LIVE STORE)
//
// Node / better-sqlite3 live-store harness (mirrors preferences-service.test.ts):
// REAL data store, UNLOCKED vault (IR-a — the sync-hash path runs even with empty [E]).
// Covers the PLAN §4 acceptance for captureSnapshot / getJournal over journal_snapshots.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { journalSnapshots } from '../../../db/schema/journals'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { createJournalRegistry, type JournalRegistry } from '../registry'
import { createJournalsService, type JournalsService } from '../service'
import { InsufficientHistory, type JournalContribution, type SectionData } from '../types'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        return { rows: stmt.all(...(params ?? [])) as Record<string, unknown>[], changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid as number }
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

function section(module: string, sectionKey: SectionData['sectionKey'], ids: string[]): SectionData {
  return { sectionKey, module, dataPoints: ids.map((id) => ({ id, label: id })), state: 'success' }
}
function habitsContribution(): JournalContribution {
  return {
    module: 'habits',
    sectionKey: 'summary',
    dataPoints: [],
    summary: () => section('habits', 'summary', ['done', 'streak']),
    dueIn: () => section('habits', 'agenda', ['due1']),
  }
}

interface Harness {
  svc: JournalsService
  db: DrizzleDb
  registry: JournalRegistry
}

async function setup(): Promise<Harness> {
  await initVault() // IR-a — required even with empty [E]
  const bsql = new Database(':memory:')
  await migrate(createBetterSqlite3Driver(bsql))
  const db = createDrizzleProxy(createBetterSqlite3Driver(bsql))
  const registry = createJournalRegistry()
  registry.register(habitsContribution())
  return { svc: createJournalsService({ db, deviceId: 'test-device', registry }), db, registry }
}

describe('mod-journals Slice 3 — journals service (live store)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('captureSnapshot writes exactly one journal_snapshots row + enqueues a sync_queue row (BR-S3-3)', async () => {
    await h.svc.captureSnapshot('2026-09-18')
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    expect(await repo.findAll()).toHaveLength(1)
    const queued = await h.db.select().from(syncQueue).all()
    expect(queued.length).toBeGreaterThan(0) // co-transactional enqueue
  })

  it('getJournal(pastDate) after a capture returns source:snapshot with the round-tripped summary + capturedAt (BR-S3-4)', async () => {
    const snap = await h.svc.captureSnapshot('2026-09-18')
    const view = await h.svc.getJournal('2026-09-18')
    expect(view.source).toBe('snapshot')
    expect(view.capturedAt).toBe(snap.capturedAt)
    expect(view.summary.map((s) => s.module)).toEqual(['habits'])
    expect(view.summary[0]?.dataPoints.map((p) => p.id)).toEqual(['done', 'streak'])
  })

  it('a snapshot view freezes SUMMARY only — no agenda (BR-S3-2)', async () => {
    await h.svc.captureSnapshot('2026-09-18')
    const view = await h.svc.getJournal('2026-09-18')
    expect(view.agenda).toBeUndefined()
  })

  it('getJournal(date with no snapshot) returns source:live with summary + agenda (BR-S3-4)', async () => {
    const view = await h.svc.getJournal('2026-09-19')
    expect(view.source).toBe('live')
    expect(view.summary.map((s) => s.module)).toEqual(['habits'])
    expect(view.agenda?.map((s) => s.module)).toEqual(['habits'])
  })

  it('two snapshots for one date → getJournal returns the LATEST captured_at (BR-S3-4 / IR-f)', async () => {
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    await repo.create({
      snapshot_date: '2026-09-17',
      sections_data: JSON.stringify([section('a', 'summary', ['old'])]),
      captured_at: 100,
    })
    await repo.create({
      snapshot_date: '2026-09-17',
      sections_data: JSON.stringify([section('b', 'summary', ['new'])]),
      captured_at: 200,
    })
    const view = await h.svc.getJournal('2026-09-17')
    expect(view.source).toBe('snapshot')
    expect(view.capturedAt).toBe(200)
    expect(view.summary[0]?.module).toBe('b')
  })

  it('a malformed sections_data row degrades to source:live, never throws (BR-S3-5)', async () => {
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    await repo.create({ snapshot_date: '2026-09-16', sections_data: '{not json', captured_at: 50 })
    const view = await h.svc.getJournal('2026-09-16')
    expect(view.source).toBe('live')
  })

  it('getJournal(date, {withLiveComparative:true}) with a snapshot attaches liveComparative (BR-S3-6)', async () => {
    await h.svc.captureSnapshot('2026-09-18')
    const view = await h.svc.getJournal('2026-09-18', { withLiveComparative: true })
    expect(view.source).toBe('snapshot')
    expect(view.liveComparative).toBeDefined()
    expect(view.liveComparative?.agenda.map((s) => s.module)).toEqual(['habits'])
  })

  it('captureSnapshot freezes the UNFILTERED summary (selection is a read-time filter, BR-S3-1)', async () => {
    // capture takes no selection; the full advertised dataPoints are frozen
    const snap = await h.svc.captureSnapshot('2026-09-18')
    expect(snap.summary[0]?.dataPoints.map((p) => p.id)).toEqual(['done', 'streak'])
  })

  it('service.buildDashboard equals the standalone engine over the same registry (composition)', async () => {
    const view = await h.svc.buildDashboard('2026-09-19')
    expect(view.summary.map((s) => s.module)).toEqual(['habits'])
    expect(view.agenda.map((s) => s.module)).toEqual(['habits'])
  })
})

describe('mod-journals Slice 4 — buildReview (live store)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  function seed(date: string, capturedAt: number, sections: SectionData[]) {
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    return repo.create({ snapshot_date: date, sections_data: JSON.stringify(sections), captured_at: capturedAt })
  }

  it('composes in-range snapshots, ordered by date (BR-S4-1)', async () => {
    await seed('2026-09-03', 30, [section('a', 'summary', ['x'])])
    await seed('2026-09-01', 10, [section('a', 'summary', ['y'])])
    const review = await h.svc.buildReview({ from: '2026-09-01', to: '2026-09-07', kind: 'week' })
    expect(review.snapshots.map((s) => s.snapshotDate)).toEqual(['2026-09-01', '2026-09-03'])
    expect(review.period.kind).toBe('week')
  })

  it('returns the latest captured_at per date (BR-S4-1 / IR-f)', async () => {
    await seed('2026-09-01', 10, [section('a', 'summary', ['old'])])
    await seed('2026-09-01', 20, [section('b', 'summary', ['new'])])
    const review = await h.svc.buildReview({ from: '2026-09-01', to: '2026-09-07' })
    expect(review.snapshots).toHaveLength(1)
    expect(review.snapshots[0]?.summary[0]?.module).toBe('b')
    expect(review.snapshots[0]?.capturedAt).toBe(20)
  })

  it('excludes snapshots outside the range (BR-S4-1)', async () => {
    await seed('2026-09-01', 10, [section('a', 'summary', [])])
    await seed('2026-09-20', 10, [section('a', 'summary', [])]) // out of range
    const review = await h.svc.buildReview({ from: '2026-09-01', to: '2026-09-07' })
    expect(review.snapshots.map((s) => s.snapshotDate)).toEqual(['2026-09-01'])
  })

  it('throws InsufficientHistory when the period has no snapshots (BR-S4-2)', async () => {
    await expect(h.svc.buildReview({ from: '2026-01-01', to: '2026-01-07', kind: 'week' })).rejects.toBeInstanceOf(
      InsufficientHistory,
    )
  })

  it('skips a malformed snapshot in-range, still composes the valid ones (BR-S4-6)', async () => {
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    await repo.create({ snapshot_date: '2026-09-01', sections_data: '{bad', captured_at: 10 })
    await seed('2026-09-02', 10, [section('a', 'summary', ['ok'])])
    const review = await h.svc.buildReview({ from: '2026-09-01', to: '2026-09-07' })
    expect(review.snapshots.map((s) => s.snapshotDate)).toEqual(['2026-09-02'])
  })

  it('throws InsufficientHistory when every in-range snapshot is malformed (BR-S4-2/6)', async () => {
    const repo = createRepository(h.db, journalSnapshots, { deviceId: 'test-device', encryptedFields: [] })
    await repo.create({ snapshot_date: '2026-09-01', sections_data: 'not json', captured_at: 10 })
    await expect(h.svc.buildReview({ from: '2026-09-01', to: '2026-09-07' })).rejects.toBeInstanceOf(
      InsufficientHistory,
    )
  })
})
