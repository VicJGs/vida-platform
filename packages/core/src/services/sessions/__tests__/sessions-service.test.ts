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
import { plannedBlocks } from '../../../db/schema/foundation/scheduling'
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
import { createRepository } from '../../../db/repository'
import { userPreferences } from '../../../db/schema/preferences'
import { createSessionsService, type SessionsService } from '../service'
import {
  InvalidSessionInput,
  InvalidFocusTransition,
  SessionMissing,
  InvalidBatchTransition,
} from '../types'
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

describe('S3 — Pomodoro focus runtime', () => {
  it('AC1 — startFocus({}) creates a running focus session + timer row', async () => {
    const { svc, driver } = await setup()
    const timer = await svc.startFocus({})
    expect(timer.type).toBe('focus')
    expect(timer.status).toBe('running')
    expect(timer.completed_count).toBe(0)
    const got = await svc.getSession(timer.session_id)
    expect(got?.session.sub_type).toBe('focus')
    expect(got?.session.status).toBe('in_progress')
    expect(got?.session.started_at).not.toBeNull()
    await driver.close()
  })

  it('AC2 — pause accumulates total_pause_seconds; resume on a non-paused → InvalidFocusTransition', async () => {
    const { svc, driver } = await setup()
    const t = await svc.startFocus({})
    const paused = await svc.pauseFocus(t.id)
    expect(paused.status).toBe('paused')
    expect(paused.paused_at).not.toBeNull()
    const resumed = await svc.resumeFocus(t.id)
    expect(resumed.status).toBe('running')
    expect(resumed.total_pause_seconds).toBeGreaterThanOrEqual(0)
    await expect(svc.resumeFocus(t.id)).rejects.toBeInstanceOf(InvalidFocusTransition) // now running
    await driver.close()
  })

  it('AC3 — cadence honors user_preferences (sessions_before_long=2 → long_break on the 2nd focus)', async () => {
    const { svc, db, driver } = await setup()
    const prefsRepo = createRepository(db, userPreferences, { deviceId: 'test-device', encryptedFields: [] })
    await prefsRepo.create({ pomodoro_sessions_before_long: 2 })
    const t = await svc.startFocus({})
    const i1 = await svc.nextInterval(t.id) // finished focus #1 → 1%2≠0 → short_break
    expect(i1.type).toBe('short_break')
    expect(i1.completed_count).toBe(1)
    const i2 = await svc.nextInterval(t.id) // break → focus
    expect(i2.type).toBe('focus')
    const i3 = await svc.nextInterval(t.id) // finished focus #2 → 2%2==0 → long_break
    expect(i3.type).toBe('long_break')
    expect(i3.completed_count).toBe(2)
    await driver.close()
  })

  it('AC4 — completeFocus finalizes the run (completed_count++), session stays in_progress; re-complete → InvalidFocusTransition', async () => {
    const { svc, driver } = await setup()
    const t = await svc.startFocus({})
    const done = await svc.completeFocus(t.id)
    expect(done.status).toBe('completed')
    expect(done.completed_count).toBe(1) // was on a focus interval (B2)
    expect(done.duration_seconds).toBeGreaterThanOrEqual(0)
    const got = await svc.getSession(t.session_id)
    expect(got?.session.status).toBe('in_progress') // §0 — no auto-complete/fire in M1.1
    await expect(svc.completeFocus(t.id)).rejects.toBeInstanceOf(InvalidFocusTransition)
    await driver.close()
  })

  it('AC5 — cancelFocus captures the interruption', async () => {
    const { svc, driver } = await setup()
    const t = await svc.startFocus({})
    const cancelled = await svc.cancelFocus(t.id, { interruptionReason: 'phone rang' })
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.was_interrupted).toBe(true)
    expect(cancelled.interruption_reason).toBe('phone rang')
    await driver.close()
  })

  it('AC6 — config fallback: no user_preferences row → PD-3 defaults (sessions_before_long=4)', async () => {
    const { svc, driver } = await setup()
    const t = await svc.startFocus({})
    const i1 = await svc.nextInterval(t.id) // 1%4≠0 → short_break (default cadence)
    expect(i1.type).toBe('short_break')
    await driver.close()
  })

  it('AC7 — resume path: paused row resumes; terminal → InvalidFocusTransition; missing → SessionMissing', async () => {
    const { svc, driver } = await setup()
    const t = await svc.startFocus({})
    await svc.pauseFocus(t.id)
    const resumed = await svc.startFocus({ sessionId: t.session_id })
    expect(resumed.status).toBe('running')

    await svc.completeFocus(t.id)
    await expect(svc.startFocus({ sessionId: t.session_id })).rejects.toBeInstanceOf(InvalidFocusTransition)

    await expect(svc.startFocus({ sessionId: 'no-such-session' })).rejects.toBeInstanceOf(SessionMissing)
    await driver.close()
  })
})

describe('S4 — Availability (SS-9)', () => {
  it('AC1/AC2 — set/list/update/remove a window; sync enqueued', async () => {
    const { svc, db, driver } = await setup()
    const w = await svc.setAvailability({ day_of_week: 1, start_time: '09:00', end_time: '11:00', preference_score: 4 })
    expect(w.day_of_week).toBe(1)
    expect((await svc.listAvailability())).toHaveLength(1)

    const upd = await svc.updateAvailability(w.id, { preference_score: 2 })
    expect(upd.preference_score).toBe(2)

    await svc.removeAvailability(w.id)
    expect(await svc.listAvailability()).toHaveLength(0)
    const q = await db.select().from(syncQueue).all()
    expect(q.some((r) => r.operation === 'delete')).toBe(true)
    await driver.close()
  })

  it('AC3 — typed validation, no write', async () => {
    const { svc, driver } = await setup()
    await expect(svc.setAvailability({ day_of_week: 7, start_time: '09:00', end_time: '11:00' })).rejects.toMatchObject({ field: 'day_of_week' })
    await expect(svc.setAvailability({ day_of_week: 1, start_time: '09:00', end_time: '11:00', preference_score: 6 })).rejects.toMatchObject({ field: 'preference_score' })
    await expect(svc.setAvailability({ day_of_week: 1, start_time: '25:00', end_time: '11:00' })).rejects.toMatchObject({ field: 'start_time' })
    await expect(svc.setAvailability({ day_of_week: 1, start_time: '09:00', end_time: '08:00' })).rejects.toMatchObject({ field: 'end_time' })
    expect(await svc.listAvailability()).toHaveLength(0)
    await driver.close()
  })

  it('AC4/AC5 — exceptions: add/list/remove + date validation', async () => {
    const { svc, driver } = await setup()
    const e = await svc.addAvailabilityException({ exception_date: '2026-10-01', is_available: false, reason: 'holiday' })
    expect(e.exception_date).toBe('2026-10-01')
    expect(await svc.listAvailabilityExceptions()).toHaveLength(1)
    await expect(svc.addAvailabilityException({ exception_date: '10/01/2026', is_available: false })).rejects.toMatchObject({ field: 'exception_date' })
    await svc.removeAvailabilityException(e.id)
    expect(await svc.listAvailabilityExceptions()).toHaveLength(0)
    await driver.close()
  })

  it('AC6 — a blackout window (is_available:false + times) is accepted, not rejected (doc-resolved)', async () => {
    const { svc, driver } = await setup()
    const w = await svc.setAvailability({ day_of_week: 2, start_time: '13:00', end_time: '14:00', is_available: false })
    expect(w.is_available).toBe(false)
    await driver.close()
  })

  it('AC7 — overlapping windows both persist (no uniqueness/overlap reject — SS-9/G5 input)', async () => {
    const { svc, driver } = await setup()
    await svc.setAvailability({ day_of_week: 3, start_time: '09:00', end_time: '12:00' })
    await svc.setAvailability({ day_of_week: 3, start_time: '10:00', end_time: '11:00' })
    expect(await svc.listAvailability()).toHaveLength(2)
    await driver.close()
  })
})

describe('S6 — session_templates CRUD (PD-3)', () => {
  it('AC1/AC2 — create/list/update/delete; sync enqueued', async () => {
    const { svc, db, driver } = await setup()
    const t = await svc.createTemplate({ name: 'Deep Work', work_minutes: 50 })
    expect(t.name).toBe('Deep Work')
    expect(t.work_minutes).toBe(50)
    expect(t.short_break_minutes).toBe(5) // DDL default
    expect(await svc.listTemplates()).toHaveLength(1)

    const upd = await svc.updateTemplate(t.id, { work_minutes: 45 })
    expect(upd.work_minutes).toBe(45)

    await svc.deleteTemplate(t.id)
    expect(await svc.listTemplates()).toHaveLength(0)
    const q = await db.select().from(syncQueue).all()
    expect(q.some((r) => r.operation === 'delete')).toBe(true)
    await driver.close()
  })

  it('AC3 — typed validation, no write', async () => {
    const { svc, driver } = await setup()
    await expect(svc.createTemplate({ name: '' })).rejects.toMatchObject({ field: 'name' })
    await expect(svc.createTemplate({ name: 'X', work_minutes: 0 })).rejects.toMatchObject({ field: 'work_minutes' })
    expect(await svc.listTemplates()).toHaveLength(0)
    await driver.close()
  })

  it('AC4 — is_default single-winner (create + setDefaultTemplate)', async () => {
    const { svc, driver } = await setup()
    const a = await svc.createTemplate({ name: 'A', is_default: true })
    const b = await svc.createTemplate({ name: 'B', is_default: true })
    let defaults = (await svc.listTemplates()).filter((t) => t.is_default)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(b.id) // B is the latest default

    await svc.setDefaultTemplate(a.id)
    defaults = (await svc.listTemplates()).filter((t) => t.is_default)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(a.id)
    await driver.close()
  })

  it('AC5 — a preset round-trips all fields the ② UI applies (backend does not bind template→timer)', async () => {
    const { svc, driver } = await setup()
    const t = await svc.createTemplate({
      name: 'Long',
      work_minutes: 50,
      short_break_minutes: 8,
      long_break_minutes: 20,
      intervals_before_long_break: 2,
      focus_technique: 'flowtime',
    })
    // The persisted preset carries the values fe-sessions reads to apply (PD-3 — templates are UI-applied
    // presets; the M1.1 backend runtime resolves cadence from user_preferences/defaults, not the template).
    expect(t.work_minutes).toBe(50)
    expect(t.short_break_minutes).toBe(8)
    expect(t.long_break_minutes).toBe(20)
    expect(t.intervals_before_long_break).toBe(2)
    expect(t.focus_technique).toBe('flowtime')
    await driver.close()
  })
})

describe('S5 — Plan-batch endpoints (state machine; G5 algorithm deferred)', () => {
  it('AC1 — generatePlan creates a pending_approval shell (total_sessions:0); sync enqueued', async () => {
    const { svc, db, driver } = await setup()
    const b = await svc.generatePlan({ scope_type: 'course', scope_id: 'c1', name: 'Wk1' })
    expect(b.status).toBe('pending_approval')
    expect(b.total_sessions).toBe(0)
    expect(b.generated_at).not.toBeNull()
    const q = await db.select().from(syncQueue).all()
    expect(q.length).toBeGreaterThanOrEqual(1)
    await driver.close()
  })

  it('AC2 — approve → active → recalc happy path', async () => {
    const { svc, driver } = await setup()
    const b = await svc.generatePlan({ scope_type: 'course', scope_id: 'c1' })
    const appr = await svc.approvePlan(b.id)
    expect(appr.status).toBe('approved')
    expect(appr.approved_at).not.toBeNull()
    const act = await svc.activatePlan(b.id)
    expect(act.status).toBe('active')
    const rec = await svc.recalcPlan(b.id)
    expect(rec.status).toBe('active') // recalc self-loops (shell)
    await driver.close()
  })

  it('AC3 — illegal transitions → InvalidBatchTransition, no write', async () => {
    const { svc, driver } = await setup()
    const b = await svc.generatePlan({}) // pending_approval
    await expect(svc.activatePlan(b.id)).rejects.toBeInstanceOf(InvalidBatchTransition) // needs approved
    await expect(svc.recalcPlan(b.id)).rejects.toBeInstanceOf(InvalidBatchTransition) // needs active
    await svc.approvePlan(b.id) // → approved
    await expect(svc.approvePlan(b.id)).rejects.toBeInstanceOf(InvalidBatchTransition) // no longer pending
    await driver.close()
  })

  it('AC4 — activatePlan writes NO planned_blocks (SS-8 bridge deferred with the algorithm)', async () => {
    const { svc, db, driver } = await setup()
    const b = await svc.generatePlan({})
    await svc.approvePlan(b.id)
    await svc.activatePlan(b.id)
    expect(await db.select().from(plannedBlocks).all()).toHaveLength(0)
    await driver.close()
  })
})

describe('S7 — dueIn aggregator + analytics (finale)', () => {
  it('AC1 — empty world: dueIn returns []', async () => {
    const { svc, driver } = await setup()
    expect(await svc.dueIn({ start: 0, end: 9_999_999_999_999 })).toEqual([])
    await driver.close()
  })

  it('AC2 — own planned_blocks: in-range mapped to DueItem; out-of-range + soft-deleted excluded', async () => {
    const { svc, db, driver } = await setup()
    const blockRepo = createRepository(db, plannedBlocks, { deviceId: 'test-device', encryptedFields: [], softDelete: true })
    await blockRepo.create({ scheduled_start: 5000, scheduled_end: 8000, sub_type: 'focus', status: 'planned' })
    await blockRepo.create({ scheduled_start: 99_000, status: 'planned' }) // out of range
    const deleted = await blockRepo.create({ scheduled_start: 6000, status: 'planned' })
    await blockRepo.delete(deleted.id) // soft-delete

    const items = await svc.dueIn({ start: 0, end: 10_000 })
    expect(items).toHaveLength(1)
    expect(items[0]?.source_module).toBe('sessions')
    expect(items[0]?.label).toBe('focus')
    expect(items[0]?.est_minutes).toBe(Math.round((8000 - 5000) / 60000))
    expect(items[0]?.hard_deadline).toBe(8000)
    await driver.close()
  })

  it('AC3 — providers union; a throwing lane degrades (skipped), dueIn does not throw', async () => {
    const { svc, driver } = await setup()
    svc.registerDueProvider({
      module: 'books',
      fetch: async () => [{ source_module: 'books', ref_id: 'b1', label: 'Read ch.3', est_minutes: 30, urgency: 2 }],
    })
    svc.registerDueProvider({
      module: 'flaky',
      fetch: async () => {
        throw new Error('provider down')
      },
    })
    const items = await svc.dueIn({ start: 0, end: 10_000 })
    expect(items).toHaveLength(1) // the books lane; the flaky lane degraded, no throw
    expect(items[0]?.source_module).toBe('books')
    await driver.close()
  })

  it('AC4 — analytics derived-on-read (deleted excluded), no stored aggregate', async () => {
    const { svc, driver } = await setup()
    await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'completed', started_at: 1000, focus_rating: 4 })
    await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'completed', started_at: 2000, focus_rating: 2 })
    await svc.createSession({ sub_type: 'focus', scheduling_mode: 'ad_hoc', status: 'in_progress', started_at: 3000 })
    const a = await svc.getSessionAnalytics({ start: 0, end: 10_000 })
    expect(a.total).toBe(3)
    expect(a.completed).toBe(2)
    expect(a.completionRate).toBeCloseTo(2 / 3)
    expect(a.avgFocusRating).toBe(3) // (4 + 2) / 2
    const empty = await svc.getSessionAnalytics({ start: 100_000, end: 200_000 })
    expect(empty.total).toBe(0)
    expect(empty.completionRate).toBe(0)
    await driver.close()
  })
})

describe('findOpenSessionForEntity — reverse attachment lookup (the Tasks timer-guard seam)', () => {
  it('returns the in_progress session attached to the entity; null on completed / wrong type / wrong entity', async () => {
    const { svc, registry, driver } = await setup()
    await registry.register(NOTE_TYPE) // effects:[] → completes cleanly, no handler needed
    const s = await svc.createSession({
      sub_type: 'note_session',
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      started_at: Date.now(),
    })
    await svc.attach(s.session.id, 'task', 'task-1', 'instance')

    // open + attached → found
    expect((await svc.findOpenSessionForEntity('note_session', 'task', 'task-1'))?.id).toBe(s.session.id)
    // wrong sub_type / wrong entity → null
    expect(await svc.findOpenSessionForEntity('focus', 'task', 'task-1')).toBeNull()
    expect(await svc.findOpenSessionForEntity('note_session', 'task', 'task-2')).toBeNull()

    // once completed (no longer in_progress) → null
    await svc.completeSession(s.session.id)
    expect(await svc.findOpenSessionForEntity('note_session', 'task', 'task-1')).toBeNull()
    await driver.close()
  })
})
