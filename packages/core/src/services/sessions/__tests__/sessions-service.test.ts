// ============================================================================
// MOD-sessions ① · S1 — Session CRUD + attach (LIF-139)
//
// Node / better-sqlite3 live-store harness (mirrors the AR-6 spaces test). Proves
// the S1 charter on a REAL data store with an UNLOCKED vault (N1 — the write path
// exercises the encrypt/persist/content-hash seam a mock hides):
//   AC1 createSession(focus) writes spine + focus_sessions sharing session_id; getSession round-trips
//   AC2 atomicity — a forced extension-write failure leaves ZERO sessions rows (tx rollback)
//   AC3 attach idempotency + hard detach + re-attach
//   AC4 resolveTargets returns both levels
//   AC5 typed-error assertions (ended_at, enum, level, unmapped extension), no write
//   AC6 soft-delete hides (spine-only, B2') · restore brings back · sync_queue enqueued · spine-only sub_type
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { sessions } from '../../../db/schema/foundation/sessions'
import { focusSessions } from '../../../db/schema/foundation/session-extensions'
import { initVault } from '../../../encryption/vault'
import { createSessionRegistry } from '../../../foundation/sessions/registry'
import { createSessionsService, type SessionsService } from '../service'
import { InvalidSessionInput } from '../types'
import type { PomodoroType } from '@vida/types'

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

async function setup(): Promise<{ svc: SessionsService; db: DrizzleDb; driver: SqliteDriver }> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createSessionRegistry(db, 'test-device')
  return { svc: createSessionsService({ db, deviceId: 'test-device', registry }), db, driver }
}

describe('S1 — createSession + extension (AC1)', () => {
  it('writes a sessions spine row + a focus_sessions row sharing session_id; getSession round-trips both', async () => {
    const { svc, db, driver } = await setup()
    const created = await svc.createSession({
      sub_type: 'focus',
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      started_at: 1000,
      extension: { kind: 'focus', type: 'focus', duration_seconds: 1500 },
    })
    expect(created.session.sub_type).toBe('focus')
    expect(created.extension).not.toBeNull()
    expect(created.extension?.session_id).toBe(created.session.id)

    const spineRows = await db.select().from(sessions).all()
    const focusRows = await db.select().from(focusSessions).all()
    expect(spineRows).toHaveLength(1)
    expect(focusRows).toHaveLength(1)
    expect(focusRows[0]?.session_id).toBe(spineRows[0]?.id)

    const got = await svc.getSession(created.session.id)
    expect(got?.session.id).toBe(created.session.id)
    expect(got?.extension?.session_id).toBe(created.session.id)
    await driver.close()
  })

  it('spine-only sub_type (class) round-trips with no extension (AC6 tail)', async () => {
    const { svc, driver } = await setup()
    const created = await svc.createSession({
      sub_type: 'class',
      scheduling_mode: 'attended',
      status: 'scheduled',
    })
    expect(created.extension).toBeNull()
    const got = await svc.getSession(created.session.id)
    expect(got?.extension).toBeNull()
    await driver.close()
  })
})

describe('S1 — extension atomicity (AC2)', () => {
  it('a forced extension-write failure leaves ZERO sessions rows (tx rollback)', async () => {
    const { svc, db, driver } = await setup()
    await expect(
      svc.createSession({
        sub_type: 'focus',
        scheduling_mode: 'ad_hoc',
        status: 'in_progress',
        // invalid focus type — the DDL CHECK on focus_sessions.type rejects at insert,
        // which must roll back the whole transaction (spine included).
        extension: { kind: 'focus', type: 'not_a_real_type' as PomodoroType },
      }),
    ).rejects.toThrow()
    const spineRows = await db.select().from(sessions).all()
    expect(spineRows).toHaveLength(0)
    await driver.close()
  })
})

describe('S1 — attach / detach (AC3, AC4)', () => {
  it('attach is idempotent, detach hard-removes, re-attach re-creates', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    const a1 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    const a2 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    expect(a2.id).toBe(a1.id) // idempotent no-op

    await svc.detach(a1.id)
    const afterDetach = await svc.resolveTargets(s.session.id)
    expect(afterDetach).toHaveLength(0)

    const a3 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    expect(a3.id).not.toBe(a1.id) // hard-deleted → re-created fresh
    await driver.close()
  })

  it('resolveTargets returns both type and instance attachments (AC4)', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    await svc.attach(s.session.id, 'habit', 'habit-1', 'type')
    await svc.attach(s.session.id, 'task', 'task-9', 'instance')
    const targets = await svc.resolveTargets(s.session.id)
    expect(targets).toHaveLength(2)
    expect(targets.map((t) => t.level).sort()).toEqual(['instance', 'type'])
    await driver.close()
  })
})

describe('S1 — typed errors, no write (AC5)', () => {
  it('ended_at < started_at → InvalidSessionInput("ended_at")', async () => {
    const { svc, db, driver } = await setup()
    await expect(
      svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'completed', started_at: 500, ended_at: 100 }),
    ).rejects.toBeInstanceOf(InvalidSessionInput)
    expect(await db.select().from(sessions).all()).toHaveLength(0)
    await driver.close()
  })

  it('bad scheduling_mode → InvalidSessionInput (enum path)', async () => {
    const { svc, driver } = await setup()
    await expect(
      // @ts-expect-error — deliberately invalid enum value
      svc.createSession({ sub_type: 'focus', scheduling_mode: 'whenever', status: 'in_progress' }),
    ).rejects.toBeInstanceOf(InvalidSessionInput)
    await driver.close()
  })

  it('extension on an unmapped sub_type → InvalidSessionInput("extension")', async () => {
    const { svc, driver } = await setup()
    await expect(
      svc.createSession({
        sub_type: 'class',
        scheduling_mode: 'attended',
        status: 'scheduled',
        extension: { kind: 'focus', type: 'focus' },
      }),
    ).rejects.toMatchObject({ field: 'extension' })
    await driver.close()
  })

  it('bad attach level → InvalidSessionInput("level")', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    // @ts-expect-error — deliberately invalid level
    await expect(svc.attach(s.session.id, 'task', 't1', 'sideways')).rejects.toMatchObject({ field: 'level' })
    await driver.close()
  })
})

describe('S1 — soft-delete / restore + sync (AC6)', () => {
  it('softDelete hides the session (spine-only), restore brings it back, mutations enqueue sync_queue', async () => {
    const { svc, db, driver } = await setup()
    const s = await svc.createSession({
      sub_type: 'focus',
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      extension: { kind: 'focus', type: 'focus' },
    })
    await svc.softDeleteSession(s.session.id)
    expect(await svc.getSession(s.session.id)).toBeNull() // unreachable while spine soft-deleted

    const restored = await svc.restoreSession(s.session.id)
    expect(restored.session.id).toBe(s.session.id)
    expect(restored.extension?.session_id).toBe(s.session.id) // extension intact (was never removed)

    // every mutation enqueued a sync_queue row (create + soft-delete + restore, on the sessions table)
    const q = await db.select().from(syncQueue).all()
    expect(q.length).toBeGreaterThanOrEqual(3)
    await driver.close()
  })
})
