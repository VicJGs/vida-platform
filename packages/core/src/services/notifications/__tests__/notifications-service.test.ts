// ============================================================================
// mod-notifications #53 ① · S1 — inbox reads + lifecycle (LIF-132)
//
// Node / better-sqlite3 live-store harness (mirrors habits/finance/checkins): REAL data store,
// UNLOCKED vault, migrate() applies 032_notifications so the table exists. Covers the slice-map.md S1
// Verification Gate: list status/type filters + newest-first + paging · unreadCounts derivation ·
// markRead (+ idempotent) · markAllRead · archive (+ idempotent) · archiveExpired (NULL never matches) ·
// faithful mapping (boolInt→boolean, no _sync_* in the view) · co-transactional sync_queue enqueue ·
// NotificationNotFoundError on a missing id.
//
// `fire` is S3 — S1 seeds rows directly through the Repository (the service's write path arrives later).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { and, eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { notifications } from '../../../db/schema/notifications'
import { syncQueue } from '../../../db/schema'
import type { NotificationType } from '@vida/types'
import { createNotificationsService, NotificationNotFoundError, type NotificationsService } from '../index'

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
  svc: NotificationsService
  db: DrizzleDb
  bsql: Database.Database
  seed: (n: SeedInput) => Promise<string>
}

interface SeedInput {
  type?: NotificationType
  title?: string
  is_read?: boolean
  is_archived?: boolean
  expires_at?: number | null
  created_at?: number // override for deterministic ordering
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createNotificationsService({ db, deviceId: 'test-device' })
  const repo = createRepository(db, notifications, {
    deviceId: 'test-device',
    encryptedFields: [],
    softDelete: false,
  })

  // Seed through the REAL Repository write path (handles id/created_at/_sync_*); optionally pin
  // created_at afterward for a deterministic newest-first assertion.
  const seed = async (n: SeedInput): Promise<string> => {
    const row = await repo.create({
      type: n.type ?? 'info',
      title: n.title ?? 'Notice',
      is_read: n.is_read ?? false,
      is_archived: n.is_archived ?? false,
      expires_at: n.expires_at ?? null,
    } as never)
    const id = (row as { id: string }).id
    if (n.created_at !== undefined) {
      bsql.prepare('UPDATE notifications SET created_at = ? WHERE id = ?').run(n.created_at, id)
    }
    return id
  }

  return { svc, db, bsql, seed }
}

describe('mod-notifications S1 — inbox reads + lifecycle', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('list returns seeded rows newest-first (BR-NT-S1)', async () => {
    await h.seed({ title: 'old', created_at: 1000 })
    await h.seed({ title: 'new', created_at: 3000 })
    await h.seed({ title: 'mid', created_at: 2000 })
    const rows = await h.svc.list()
    expect(rows.map((r) => r.title)).toEqual(['new', 'mid', 'old'])
  })

  it('list filters by status (unread/read/archived)', async () => {
    await h.seed({ title: 'u' })
    await h.seed({ title: 'r', is_read: true })
    await h.seed({ title: 'a', is_archived: true })
    expect((await h.svc.list({ status: 'unread' })).map((r) => r.title)).toEqual(['u'])
    expect((await h.svc.list({ status: 'read' })).map((r) => r.title)).toEqual(['r'])
    expect((await h.svc.list({ status: 'archived' })).map((r) => r.title)).toEqual(['a'])
  })

  it('list filters by type', async () => {
    await h.seed({ type: 'error', title: 'e' })
    await h.seed({ type: 'reminder', title: 'rm' })
    expect((await h.svc.list({ type: 'error' })).map((r) => r.title)).toEqual(['e'])
  })

  it('list pages by INBOX_PAGE_SIZE', async () => {
    for (let i = 0; i < 55; i++) await h.seed({ title: `n${i}`, created_at: i })
    expect((await h.svc.list({ page: 0 })).length).toBe(50)
    expect((await h.svc.list({ page: 1 })).length).toBe(5)
  })

  it('unreadCounts derives total + attention types (excludes read/archived)', async () => {
    await h.seed({ type: 'error' })
    await h.seed({ type: 'warning' })
    await h.seed({ type: 'reminder' })
    await h.seed({ type: 'info' })
    await h.seed({ type: 'error', is_read: true }) // read → excluded
    await h.seed({ type: 'warning', is_archived: true }) // archived → excluded
    const c = await h.svc.unreadCounts()
    expect(c).toEqual({ unread: 4, error: 1, warning: 1, reminder: 1 })
  })

  it('markRead sets is_read + read_at and is idempotent (no re-stamp)', async () => {
    const id = await h.seed({ title: 'x' })
    const read = await h.svc.markRead(id)
    expect(read.is_read).toBe(true)
    expect(typeof read.read_at).toBe('number')
    const again = await h.svc.markRead(id)
    expect(again.read_at).toBe(read.read_at) // idempotent — unchanged
  })

  it('markRead throws NotificationNotFoundError on a missing id', async () => {
    await expect(h.svc.markRead('nope')).rejects.toBeInstanceOf(NotificationNotFoundError)
  })

  it('markAllRead marks every unread and returns the count (leaves archived/read)', async () => {
    await h.seed({ title: 'u1' })
    await h.seed({ title: 'u2' })
    await h.seed({ title: 'r', is_read: true })
    await h.seed({ title: 'a', is_archived: true })
    expect(await h.svc.markAllRead()).toBe(2)
    expect((await h.svc.list({ status: 'unread' })).length).toBe(0)
  })

  it('archive sets is_archived + archived_at and is idempotent', async () => {
    const id = await h.seed({ title: 'x' })
    const arc = await h.svc.archive(id)
    expect(arc.is_archived).toBe(true)
    expect(typeof arc.archived_at).toBe('number')
    const again = await h.svc.archive(id)
    expect(again.archived_at).toBe(arc.archived_at)
  })

  it('archiveExpired archives only rows with expires_at ≤ now (NULL never matches)', async () => {
    await h.seed({ title: 'past', expires_at: 100 })
    await h.seed({ title: 'future', expires_at: 10_000 })
    await h.seed({ title: 'never', expires_at: null })
    const count = await h.svc.archiveExpired(1000)
    expect(count).toBe(1)
    expect((await h.svc.list({ status: 'archived' })).map((r) => r.title)).toEqual(['past'])
  })

  it('maps a FAITHFUL view — boolInt→boolean, no _sync_* leaked', async () => {
    const id = await h.seed({ title: 'x' })
    const [row] = await h.svc.list()
    expect(row.is_read).toBe(false) // boolean, not 0
    expect(row.is_archived).toBe(false)
    expect(row.delivered_in_app).toBe(false)
    expect(row.id).toBe(id)
    expect(Object.keys(row).some((k) => k.startsWith('_sync'))).toBe(false)
    expect('updated_at' in row).toBe(false) // no phantom column
  })

  it('co-transactionally enqueues a sync_queue row on a mutation', async () => {
    const id = await h.seed({ title: 'x' })
    await h.svc.markRead(id)
    const q = await h.db.select().from(syncQueue).where(and(eq(syncQueue.table_name, 'notifications'), eq(syncQueue.row_id, id)))
    expect(q.length).toBeGreaterThan(0)
  })
})
