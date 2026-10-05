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
import type { NotificationType, MergedPreferences } from '@vida/types'
import { createNotificationDeliveryEngine, type WakePayload } from '../../../foundation/notifications'
import { USER_PREFERENCES_DEFAULTS } from '../../preferences/service'
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
  pushCalls: WakePayload[]
  emailCalls: string[]
}

interface SeedInput {
  type?: NotificationType
  title?: string
  entity_type?: string | null
  effect_event_id?: string | null
  is_read?: boolean
  is_archived?: boolean
  expires_at?: number | null
  created_at?: number // override for deterministic ordering
}

// The engine's off-device ports are deny-safe by default; the test injects RECORDING ports that return
// delivered:true so a gated channel's attempt (or its absence) is observable in the audit + call log.
async function setup(opts?: { prefs?: Partial<MergedPreferences> }): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)

  const pushCalls: WakePayload[] = []
  const emailCalls: string[] = []
  const engine = createNotificationDeliveryEngine({
    wakeRelay: {
      async push(p) {
        pushCalls.push(p)
        return { delivered: true }
      },
    },
    email: {
      async sendNudge(userId) {
        emailCalls.push(userId)
        return { delivered: userId.length > 0 } // realistic: no routing target ⇒ can't deliver
      },
    },
  })
  const preferences = opts?.prefs
    ? { getMergedPreferences: async (): Promise<MergedPreferences> => ({ ...USER_PREFERENCES_DEFAULTS, ...opts.prefs }) }
    : undefined

  const svc = createNotificationsService({ db, deviceId: 'test-device', engine, preferences })
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
      entity_type: n.entity_type ?? null,
      effect_event_id: n.effect_event_id ?? null,
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

  return { svc, db, bsql, seed, pushCalls, emailCalls }
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

describe('mod-notifications S2 — Preferences gating + deliver + delivery-audit', () => {
  // read the persisted delivery-audit flags straight off the row (pick only the 3 — the row has many cols)
  const audit = async (h: Harness, id: string) => {
    const [row] = await h.db
      .select({
        delivered_in_app: notifications.delivered_in_app,
        delivered_push: notifications.delivered_push,
        delivered_email: notifications.delivered_email,
      })
      .from(notifications)
      .where(eq(notifications.id, id))
    return row
  }

  const R = { userId: 'u1' } // a caller-supplied routing target (present at M2; absent at M1)

  it('permissive + event row + routing → in-app always, push + email delivered + audited', async () => {
    const h = await setup() // no prefs ⇒ PERMISSIVE
    const id = await h.seed({ type: 'achievement', effect_event_id: 'a|unlocked|surface_notification' })
    const result = await h.svc.deliver(id, { routing: R })
    expect(result.inApp).toBe(true)
    expect(result.delivered).toEqual(expect.arrayContaining(['push', 'email']))
    expect(h.pushCalls.length).toBe(1)
    expect(h.emailCalls.length).toBe(1)
    expect(await audit(h, id)).toEqual({ delivered_in_app: true, delivered_push: true, delivered_email: true })
  })

  it('M1 honest (no routing) → external folds to in-app; delivered_push/email stay false', async () => {
    const h = await setup()
    const id = await h.seed({ effect_event_id: 'e|t|surface_notification' })
    const result = await h.svc.deliver(id) // no routing ⇒ wake payload unaddressable, email no target
    expect(result.inApp).toBe(true)
    expect(result.delivered).toEqual([])
    expect(result.fallbacks).toEqual(expect.arrayContaining(['push', 'email']))
    expect(h.pushCalls.length).toBe(0) // buildWakePayload rejects the empty target before the port
    expect(await audit(h, id)).toEqual({ delivered_in_app: true, delivered_push: false, delivered_email: false })
  })

  it('NF-6 — the wake payload carries ONLY routing, zero content/type/entity', async () => {
    const h = await setup()
    const id = await h.seed({ type: 'reminder', effect_event_id: 'r|due|surface_notification', title: 'secret', entity_type: 'habit' })
    await h.svc.deliver(id, { routing: R })
    expect(h.pushCalls[0]).toEqual({ kind: 'wake', userId: 'u1' }) // no title/type/entity ever
  })

  it('global notification_push off → push NOT attempted; in-app + email still deliver (NF-5/NF-7)', async () => {
    const h = await setup({ prefs: { notification_push: false } })
    const id = await h.seed({ effect_event_id: 'e|t|surface_notification' })
    const result = await h.svc.deliver(id, { routing: R })
    expect(h.pushCalls.length).toBe(0)
    expect(result.delivered).not.toContain('push')
    expect(result.delivered).toContain('email')
    expect(result.inApp).toBe(true)
  })

  it('per-module push toggle off (push_habits=false, entity_type=habit) → push suppressed, email still sent', async () => {
    const h = await setup({ prefs: { push_habits: false } })
    const id = await h.seed({ effect_event_id: 'h|t|surface_notification', entity_type: 'habit' })
    await h.svc.deliver(id, { routing: R })
    expect(h.pushCalls.length).toBe(0)
    expect(h.emailCalls.length).toBe(1) // email is NOT per-module gated
  })

  it('per-module mapping uses REAL entity_types (push_study=false, entity_type=subject) → push suppressed', async () => {
    const h = await setup({ prefs: { push_study: false } })
    const id = await h.seed({ effect_event_id: 's|t|surface_notification', entity_type: 'subject' })
    await h.svc.deliver(id, { routing: R })
    expect(h.pushCalls.length).toBe(0) // 'subject' → push_study (not the stale 'course')
    expect(h.emailCalls.length).toBe(1)
  })

  it('quiet hours (spanning midnight) suppress ALL external; in-app records (NF-5)', async () => {
    const h = await setup({ prefs: { quiet_hours_enabled: true, quiet_hours_start: '22:00', quiet_hours_end: '07:00' } })
    const id = await h.seed({ effect_event_id: 'e|t|surface_notification' })
    const result = await h.svc.deliver(id, { routing: R, nowMinuteOfDay: 23 * 60 }) // 23:00 — inside the window
    expect(h.pushCalls.length).toBe(0)
    expect(h.emailCalls.length).toBe(0)
    expect(result.inApp).toBe(true)
    expect(await audit(h, id)).toEqual({ delivered_in_app: true, delivered_push: false, delivered_email: false })
  })

  it('time-based row on a NATIVE platform → local_scheduled tier → in-app only (no off-device)', async () => {
    const h = await setup() // permissive
    const id = await h.seed({ type: 'reminder' }) // effect_event_id null ⇒ time_based
    const result = await h.svc.deliver(id, { platform: 'ios', routing: R })
    expect(h.pushCalls.length).toBe(0)
    expect(h.emailCalls.length).toBe(0)
    expect(result.inApp).toBe(true)
  })

  it('deliver throws NotificationNotFoundError on a missing id', async () => {
    const h = await setup()
    await expect(h.svc.deliver('nope')).rejects.toBeInstanceOf(NotificationNotFoundError)
  })
})
