// ============================================================================
// XS-effect-rail #32 · S3 — lifecycle engine + fire step (XCU-09)
// Live-store Verification Gate: better-sqlite3 + real migrations + rail + stub handlers.
//   A1 start → in_progress commits status, fires nothing
//   A2 complete → fires declared effects (stub handlers), status+ended_at set
//   A3 illegal (status,event) → InvalidTransition, unchanged, 0 effects
//   A4 replay (fireCompletionEffects twice) → dedupe, no double-count
//   A5 attachments → effects scoped to targets; none → session-subject fallback
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import type { SessionStatus } from '@vida/types'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { createRepository } from '../../../db/repository'
import { sessions, sessionAttachments, type SessionRow } from '../../../db/schema/foundation/sessions'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import { createEffectRegistry, createEffectRail, type EffectRail } from '../../effects'
import { initVault } from '../../../encryption/vault'
import { createSessionRegistry, type SessionRegistry } from '../registry'
import { transition, fireCompletionEffects, InvalidTransition, type TransitionDeps } from '../lifecycle'

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

// The shipped `focus` type declares effects [attach_pomodoro, log_time] (both non-projection),
// so completion needs handlers registered — register no-op stubs so applyEffect can fire.
async function setup(): Promise<{ deps: TransitionDeps; db: DrizzleDb; driver: SqliteDriver; registry: SessionRegistry; rail: EffectRail }> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)

  const registry = createSessionRegistry(db, 'test-device')
  const effectRegistry = createEffectRegistry()
  effectRegistry.register('attach_pomodoro', async () => {})
  effectRegistry.register('log_time', async () => {})
  const rail = createEffectRail(db, effectRegistry)

  const deps: TransitionDeps = { db, registry, rail, deviceId: 'test-device' }
  return { deps, db, driver, registry, rail }
}

function sessionsRepo(db: DrizzleDb) {
  // encryptedFields: [] — M1.0 pass-through seam (matches the engine + the vault-locked runtime).
  return createRepository(db, sessions, { deviceId: 'test-device', encryptedFields: [] })
}
function attachmentsRepo(db: DrizzleDb) {
  return createRepository(db, sessionAttachments, { deviceId: 'test-device', encryptedFields: [] })
}
async function seedSession(db: DrizzleDb, status: SessionStatus, startedAt: number | null): Promise<SessionRow> {
  return sessionsRepo(db).create({
    sub_type: 'focus',
    scheduling_mode: 'ad_hoc',
    status,
    started_at: startedAt,
  })
}

describe('XS-effect-rail #32 · S3 — lifecycle engine (XCU-09)', () => {
  it('A1 — start: scheduled → in_progress, stamps started_at, fires nothing', async () => {
    const { deps, db, driver } = await setup()
    const s = await seedSession(db, 'scheduled', null)

    const r = await transition(deps, s.id, 'start')

    expect(r.status).toBe('in_progress')
    expect(r.fired).toBe(0)
    const [row] = await db.select().from(sessions).where(eq(sessions.id, s.id)).all()
    expect(row.status).toBe('in_progress')
    expect(row.started_at).not.toBeNull()
    expect((await db.select().from(appliedEffects).all())).toHaveLength(0)
    await driver.close()
  })

  it('A2 — complete: fires the 2 declared effects, sets status + ended_at', async () => {
    const { deps, db, driver } = await setup()
    const s = await seedSession(db, 'in_progress', Date.now())

    const r = await transition(deps, s.id, 'complete')

    expect(r.status).toBe('completed')
    expect(r.fired).toBe(2) // attach_pomodoro + log_time, session-subject fallback (no attachments)
    const [row] = await db.select().from(sessions).where(eq(sessions.id, s.id)).all()
    expect(row.status).toBe('completed')
    expect(row.ended_at).not.toBeNull()
    expect((await db.select().from(appliedEffects).all())).toHaveLength(2)
    await driver.close()
  })

  it('A3 — illegal (status, event) → InvalidTransition, unchanged, 0 effects', async () => {
    const { deps, db, driver } = await setup()
    const s = await seedSession(db, 'scheduled', null)

    await expect(transition(deps, s.id, 'complete')).rejects.toBeInstanceOf(InvalidTransition)

    const [row] = await db.select().from(sessions).where(eq(sessions.id, s.id)).all()
    expect(row.status).toBe('scheduled') // unchanged
    expect((await db.select().from(appliedEffects).all())).toHaveLength(0)
    await driver.close()
  })

  it('A4 — replay: fireCompletionEffects twice → dedupe, no double-count', async () => {
    const { deps, db, driver, registry } = await setup()
    const s = await seedSession(db, 'in_progress', Date.now())
    const def = await registry.get('focus')

    const first = await fireCompletionEffects(deps, s, def)
    const second = await fireCompletionEffects(deps, s, def)

    expect(first.fired).toBe(2)
    expect(second.fired).toBe(0) // ledger dedupes the identical events
    expect((await db.select().from(appliedEffects).all())).toHaveLength(2)
    await driver.close()
  })

  it('A5 — effects scoped to attachments when present', async () => {
    const { deps, db, driver } = await setup()
    const s = await seedSession(db, 'in_progress', Date.now())
    await attachmentsRepo(db).create({ session_id: s.id, entity_type: 'habit', entity_id: 'hab-1', level: 'type' })

    const r = await transition(deps, s.id, 'complete')

    // 2 effects × 1 target = 2 fires, each keyed to the attachment entity (hab-1).
    expect(r.fired).toBe(2)
    const ledger = await db.select().from(appliedEffects).all()
    expect(ledger).toHaveLength(2)
    expect(ledger.every((e) => e.target_ref === 'hab-1')).toBe(true)
    await driver.close()
  })
})
