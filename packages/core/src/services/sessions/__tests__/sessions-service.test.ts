// ============================================================================
// MOD-sessions ① · S1 + S2 — Session CRUD + attach + registry validation + completion (LIF-139)
//
// Node / better-sqlite3 live-store harness (mirrors the AR-6 spaces test). REAL data store, UNLOCKED
// vault (N1). S1: CRUD + attach structural. S2: createSession sub_type gate + attach entity_type gate +
// completeSession/transitionSession over the #32 transition engine (fail-loud rail).
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { sessions } from '../../../db/schema/foundation/sessions'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import { focusSessions } from '../../../db/schema/foundation/session-extensions'
import { initVault } from '../../../encryption/vault'
import {
  createSessionRegistry,
  type SessionRegistry,
} from '../../../foundation/sessions/registry'
import { SessionTypeNotFound, type SessionTypeDef } from '../../../foundation/sessions/types'
import {
  createEffectRegistry,
  createEffectRail,
  type EffectRegistry,
  NoEffectHandler,
} from '../../../foundation/effects'
import { createTaggableTypeRegistry, UnknownEntityType } from '../../../foundation/spaces'
import { createSessionsService, type SessionsService } from '../service'
import { InvalidSessionInput } from '../types'
import type { PomodoroType } from '@vida/types'

// A user-registered, no-extension session type (SS-5) — the spine-only path S1 tested via 'class'
// (now unregistered under the S2 gate). effects:[] → completes cleanly; lifecycle has start + complete.
const NOTE_TYPE: SessionTypeDef = {
  sub_type: 'note_session',
  owner_module: 'test',
  attachment_defaults: {},
  effects: [],
  lifecycle: {
    transitions: [
      { from: 'scheduled', to: 'in_progress', event: 'start' },
      { from: 'in_progress', to: 'completed', event: 'complete' },
    ],
    hooks: {},
  },
  permissions: { allowed_effects: [] },
}

// A user type declaring log_time (∈ shipped envelope via focus) — for the fire+dedupe path (AC4b).
const TIMED_TYPE: SessionTypeDef = {
  ...NOTE_TYPE,
  sub_type: 'timed_session',
  effects: ['log_time'],
  permissions: { allowed_effects: ['log_time'] },
}

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
  svc: SessionsService
  db: DrizzleDb
  driver: SqliteDriver
  registry: SessionRegistry
  effectRegistry: EffectRegistry
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createSessionRegistry(db, 'test-device')
  const effectRegistry = createEffectRegistry()
  const rail = createEffectRail(db, effectRegistry)
  const entityRegistry = createTaggableTypeRegistry()
  const svc = createSessionsService({ db, deviceId: 'test-device', registry, rail, entityRegistry })
  return { svc, db, driver, registry, effectRegistry }
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
    expect(created.extension?.session_id).toBe(created.session.id)

    const spineRows = await db.select().from(sessions).all()
    const focusRows = await db.select().from(focusSessions).all()
    expect(spineRows).toHaveLength(1)
    expect(focusRows).toHaveLength(1)
    expect(focusRows[0]?.session_id).toBe(spineRows[0]?.id)

    const got = await svc.getSession(created.session.id)
    expect(got?.extension?.session_id).toBe(created.session.id)
    await driver.close()
  })

  it('spine-only path round-trips with no extension (user no-extension type)', async () => {
    const { svc, registry, driver } = await setup()
    await registry.register(NOTE_TYPE)
    const created = await svc.createSession({
      sub_type: 'note_session',
      scheduling_mode: 'ad_hoc',
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
        extension: { kind: 'focus', type: 'not_a_real_type' as PomodoroType },
      }),
    ).rejects.toThrow()
    expect(await db.select().from(sessions).all()).toHaveLength(0)
    await driver.close()
  })
})

describe('S2 — createSession sub_type registry gate (AC1)', () => {
  it('an unregistered sub_type (class, AR-5 not shipped) → SessionTypeNotFound, no write', async () => {
    const { svc, db, driver } = await setup()
    await expect(
      svc.createSession({ sub_type: 'class', scheduling_mode: 'attended', status: 'scheduled' }),
    ).rejects.toBeInstanceOf(SessionTypeNotFound)
    expect(await db.select().from(sessions).all()).toHaveLength(0)
    await driver.close()
  })
})

describe('S1+S2 — attach / detach (AC3, AC4)', () => {
  it('attach is idempotent, detach hard-removes, re-attach re-creates', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    const a1 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    const a2 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    expect(a2.id).toBe(a1.id)

    await svc.detach(a1.id)
    expect(await svc.resolveTargets(s.session.id)).toHaveLength(0)

    const a3 = await svc.attach(s.session.id, 'task', 'task-1', 'instance')
    expect(a3.id).not.toBe(a1.id)
    await driver.close()
  })

  it('resolveTargets returns both type and instance attachments', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    await svc.attach(s.session.id, 'habit', 'habit-1', 'type')
    await svc.attach(s.session.id, 'task', 'task-9', 'instance')
    const targets = await svc.resolveTargets(s.session.id)
    expect(targets.map((t) => t.level).sort()).toEqual(['instance', 'type'])
    await driver.close()
  })

  it('S2 — attach with an unregistered entity_type → UnknownEntityType, no row', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    await expect(svc.attach(s.session.id, 'not_a_real_entity', 'x', 'instance')).rejects.toBeInstanceOf(
      UnknownEntityType,
    )
    expect(await svc.resolveTargets(s.session.id)).toHaveLength(0)
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

  it('bad scheduling_mode → InvalidSessionInput (enum path, before the registry gate)', async () => {
    const { svc, driver } = await setup()
    await expect(
      // @ts-expect-error — deliberately invalid enum value
      svc.createSession({ sub_type: 'focus', scheduling_mode: 'whenever', status: 'in_progress' }),
    ).rejects.toBeInstanceOf(InvalidSessionInput)
    await driver.close()
  })

  it('extension on a registered-but-unmapped sub_type → InvalidSessionInput("extension")', async () => {
    const { svc, registry, driver } = await setup()
    await registry.register(NOTE_TYPE)
    await expect(
      svc.createSession({
        sub_type: 'note_session',
        scheduling_mode: 'ad_hoc',
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

describe('S2 — completion wiring over the #32 engine (AC4)', () => {
  it('4a — a no-effect type completes cleanly (fired:0); re-complete → InvalidTransition', async () => {
    const { svc, registry, driver } = await setup()
    await registry.register(NOTE_TYPE)
    const s = await svc.createSession({ sub_type: 'note_session', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    const res = await svc.completeSession(s.session.id)
    expect(res.status).toBe('completed')
    expect(res.fired).toBe(0)
    const got = await svc.getSession(s.session.id)
    expect(got?.session.ended_at).not.toBeNull()
    await expect(svc.completeSession(s.session.id)).rejects.toThrow() // InvalidTransition (BR-8)
    await driver.close()
  })

  it('4b — a declared effect with a registered stub handler fires once + lands in applied_effects', async () => {
    const { svc, db, registry, effectRegistry, driver } = await setup()
    await registry.register(TIMED_TYPE)
    let calls = 0
    effectRegistry.register('log_time', async () => {
      calls++
    })
    const s = await svc.createSession({ sub_type: 'timed_session', scheduling_mode: 'ad_hoc', status: 'in_progress' })
    const res = await svc.completeSession(s.session.id)
    expect(res.fired).toBe(1)
    expect(calls).toBe(1)
    expect(await db.select().from(appliedEffects).all()).toHaveLength(1)
    await driver.close()
  })

  it('4c — completing a focus session with NO handler → NoEffectHandler (fail-loud, deferred #46)', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({
      sub_type: 'focus',
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      extension: { kind: 'focus', type: 'focus' },
    })
    await expect(svc.completeSession(s.session.id)).rejects.toBeInstanceOf(NoEffectHandler)
    await driver.close()
  })

  it('AC5 — transitionSession(start) on a scheduled session → in_progress, started_at stamped', async () => {
    const { svc, driver } = await setup()
    const s = await svc.createSession({ sub_type: 'focus', scheduling_mode: 'planned', status: 'scheduled' })
    const res = await svc.transitionSession(s.session.id, 'start')
    expect(res.status).toBe('in_progress')
    const got = await svc.getSession(s.session.id)
    expect(got?.session.started_at).not.toBeNull()
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
    expect(await svc.getSession(s.session.id)).toBeNull()

    const restored = await svc.restoreSession(s.session.id)
    expect(restored.session.id).toBe(s.session.id)
    expect(restored.extension?.session_id).toBe(s.session.id)

    const q = await db.select().from(syncQueue).all()
    expect(q.length).toBeGreaterThanOrEqual(3)
    await driver.close()
  })
})
