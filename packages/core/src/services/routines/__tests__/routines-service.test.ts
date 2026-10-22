// ============================================================================
// mod-routines #64 ① · S1 + S2 (built) + S2c floor conformance (LIF-138)
//
// Node / better-sqlite3 live-store harness (mirrors habits/finance/checkins): REAL data store,
// UNLOCKED vault (the sync-hash path runs even with empty [E]), migrate() applies 018_routines so
// the reframe tables exist. Covers the slice-map.md S1 Verification Gate: CRUD happy + faithful
// create echo (defaults backfilled, nullables null) + partial update (no blanking) + soft-delete
// hides (ledger untouched) + listRoutines lifecycle filter + 2 failure paths (invalid-enum reject,
// missing-name reject) + co-transactional sync_queue enqueue (persistence probe).
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ZodError } from 'zod'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { UnknownEntityType, type TaggableTypeRegistry } from '../../../foundation/spaces/types'
import { createSessionRegistry } from '../../../foundation/sessions/registry'
import { createEffectRegistry, createEffectRail, type EffectRegistry } from '../../../foundation/effects'
import { createTasksService, type TasksService } from '../../tasks'
import { createHabitsService, BackfillWindowError, type HabitsService } from '../../habits'
import { createSessionsService, type SessionsService } from '../../sessions'
import {
  createRoutinesService,
  RoutineNotFoundError,
  StepNotFoundError,
  CompletionNotFoundError,
  InvalidRecurrenceRuleError,
  EntityUnavailableError,
  InvalidRoutinePolicyError,
  type RoutinePolicy,
  type RoutinesPrefsPort,
  isStepRunState,
  type RoutinesService,
  type StepRunState,
} from '../index'
import type { RoutineCompletion } from '@vida/types'

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
  svc: RoutinesService
  db: DrizzleDb
  bsql: Database.Database
  tasks: TasksService
  habits: HabitsService
  sessions: SessionsService
}

interface SetupOpts {
  withHabits?: boolean // default true; false ⇒ the optional `habits` dep is absent
  effectRegistry?: EffectRegistry // tasks fan-out spies (rule 1 / rule 17 test)
  sessionsEntityRegistry?: TaggableTypeRegistry // force an attach failure (focus edge case)
  prefs?: RoutinesPrefsPort // S4 — the user's policy port
}

// S3 — REAL substrates (the tasks `setupWithTimer` pattern): Sessions (registry + rail + entity registry), Tasks, Habits.
async function setup(opts: SetupOpts = {}): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const effectRegistry = opts.effectRegistry ?? createEffectRegistry()
  const rail = createEffectRail(db, effectRegistry)
  const sessions = createSessionsService({
    db,
    deviceId: 'test-device',
    registry: createSessionRegistry(db, 'test-device'),
    rail,
    entityRegistry: opts.sessionsEntityRegistry ?? registry,
  })
  const tasks = createTasksService({ db, deviceId: 'test-device', effects: { rail, registry: effectRegistry } })
  const habits = createHabitsService({ db, deviceId: 'test-device' })
  const svc = createRoutinesService({
    db,
    deviceId: 'test-device',
    registry,
    tasks,
    sessions,
    ...(opts.withHabits === false ? {} : { habits }),
    ...(opts.prefs ? { prefs: opts.prefs } : {}),
  })
  return { svc, db, bsql, tasks, habits, sessions }
}

// Actionable steps return the ledger row; narrow the S3 completeStep union for the as-built tests.
async function completeActionable(
  svc: RoutinesService,
  ...args: Parameters<RoutinesService['completeStep']>
): Promise<RoutineCompletion> {
  const r = await svc.completeStep(...args)
  if (isStepRunState(r)) throw new Error('expected an actionable step (RoutineCompletion)')
  return r
}

describe('mod-routines S1 — routine definition CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createRoutine echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (RT-2/RT-19, interp §4.8)', async () => {
    const r = await h.svc.createRoutine({ name: 'Morning sequence' })
    expect(r.id).toBeTruthy()
    expect(r.name).toBe('Morning sequence')
    expect(r.lifecycle).toBe('active') // NN default backfilled
    expect(r.measurement_kind).toBe('rate') // NN default backfilled (RT-19 natural)
    expect(r.sort_order).toBe(0) // NN default backfilled
    expect(r.description).toBeNull() // nullable coalesced (not undefined)
    expect(r.recurrence_rule).toBeNull()
    expect(r.binding_mode).toBeNull() // nullable enum — not dropped (null ⇒ derive)
    expect(r.progress).toBeNull() // nullable override slot (RT-14 — no cached streak)
    expect(r.deleted_at).toBeNull()
    expect(r._sync_status).toBe('pending')
  })

  it('createRoutine honours explicit lifecycle/measurability/schedule/progress (RT-6/RT-11/RT-19)', async () => {
    const r = await h.svc.createRoutine({
      name: 'Evening wind-down',
      description: 'before bed',
      recurrence_rule: 'FREQ=DAILY',
      lifecycle: 'paused',
      measurement_kind: 'milestone',
      binding_mode: 'derived-pull',
      progress: 40,
      sort_order: 3,
    })
    expect(r.description).toBe('before bed')
    expect(r.recurrence_rule).toBe('FREQ=DAILY')
    expect(r.lifecycle).toBe('paused')
    expect(r.measurement_kind).toBe('milestone')
    expect(r.binding_mode).toBe('derived-pull')
    expect(r.progress).toBe(40)
    expect(r.sort_order).toBe(3)
  })

  it('getRoutine returns the row, and null for a missing id', async () => {
    const r = await h.svc.createRoutine({ name: 'Focus block' })
    expect(await h.svc.getRoutine(r.id)).toMatchObject({ id: r.id, name: 'Focus block' })
    expect(await h.svc.getRoutine('does-not-exist')).toBeNull()
  })

  it('updateRoutine patches only the passed keys — never blanks an unpassed field', async () => {
    const r = await h.svc.createRoutine({ name: 'Study loop', description: 'keep' })
    const up = await h.svc.updateRoutine(r.id, { lifecycle: 'off' })
    expect(up.lifecycle).toBe('off')
    expect(up.description).toBe('keep') // untouched — partial update didn't null it
    expect(up.name).toBe('Study loop')
  })

  it('archiveRoutine soft-deletes — getRoutine → null, listRoutines excludes it (RT-17)', async () => {
    const r = await h.svc.createRoutine({ name: 'Weekly review' })
    await h.svc.archiveRoutine(r.id)
    expect(await h.svc.getRoutine(r.id)).toBeNull()
    const all = await h.svc.listRoutines()
    expect(all.find((x) => x.id === r.id)).toBeUndefined()
  })

  it('listRoutines filters by lifecycle (interp §4.7 — explicit soft-delete filter)', async () => {
    await h.svc.createRoutine({ name: 'A', lifecycle: 'active' })
    await h.svc.createRoutine({ name: 'B', lifecycle: 'paused' })
    await h.svc.createRoutine({ name: 'C', lifecycle: 'active' })
    expect((await h.svc.listRoutines()).length).toBe(3)
    const paused = await h.svc.listRoutines({ lifecycle: 'paused' })
    expect(paused.map((r) => r.name)).toEqual(['B'])
  })

  // ── failure paths ──────────────────────────────────────────────────
  it('createRoutine rejects an invalid lifecycle enum (Zod, before any write)', async () => {
    await expect(
      // @ts-expect-error — exercising the runtime validator with an off-tuple value
      h.svc.createRoutine({ name: 'Bad', lifecycle: 'archived' }),
    ).rejects.toThrow()
    expect((await h.svc.listRoutines()).length).toBe(0) // no row written
  })

  it('createRoutine rejects a missing name (Zod)', async () => {
    // @ts-expect-error — name is required
    await expect(h.svc.createRoutine({})).rejects.toThrow()
  })

  // ── persistence probe ──────────────────────────────────────────────
  it('createRoutine enqueues a co-transactional sync_queue row (local-first, RT-18)', async () => {
    const r = await h.svc.createRoutine({ name: 'Sync me' })
    const rows = await h.db.select().from(syncQueue).all()
    expect(rows.filter((x) => x.row_id === r.id).length).toBeGreaterThanOrEqual(1)
  })
})

describe('mod-routines S2 — step CRUD + ordering + cascade', () => {
  let h: Harness
  let routineId: string
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })

  it('addStep echoes a FAITHFUL step — defaults backfilled, nullables → null, skip_dates round-trips (RT-3/RT-8, interp §4.8)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch', skip_dates: ['2026-10-20', '2026-10-21'] })
    expect(s.id).toBeTruthy()
    expect(s.routine_id).toBe(routineId)
    expect(s.title).toBe('Stretch')
    expect(s.step_order).toBe(0) // default backfilled
    expect(s.is_required).toBe(false) // default backfilled
    expect(s.step_type).toBeNull() // nullable coalesced
    expect(s.entity_type).toBeNull()
    expect(s.entity_id).toBeNull()
    expect(s.description).toBeNull()
    expect(s.time_of_day).toBeNull()
    expect(s.skip_dates).toEqual(['2026-10-20', '2026-10-21']) // JSON round-trip (interp §4.9)
    expect(s.deleted_at).toBeNull()
    expect(s._sync_status).toBe('pending')
  })

  it('addStep honours an explicit polymorphic driven step (RT-3)', async () => {
    const s = await h.svc.addStep(routineId, {
      title: 'Workout',
      step_type: 'workout', // OPEN vocab — no enum validation
      entity_type: 'session',
      entity_id: 'sess-123',
      is_required: true,
      time_of_day: 'morning',
      step_order: 2,
    })
    expect(s.step_type).toBe('workout')
    expect(s.entity_type).toBe('session')
    expect(s.entity_id).toBe('sess-123')
    expect(s.is_required).toBe(true)
    expect(s.time_of_day).toBe('morning')
    expect(s.step_order).toBe(2)
  })

  it('addStep allows an alarm-like actionable step with NO driven entity (RT-4)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Drink water', step_type: 'task' })
    expect(s.entity_type).toBeNull()
    expect(s.entity_id).toBeNull()
  })

  it('addStep on a missing/archived routine throws RoutineNotFoundError — no orphan step (RT-3, interp §4.6)', async () => {
    await expect(h.svc.addStep('no-such-routine', { title: 'X' })).rejects.toBeInstanceOf(RoutineNotFoundError)
    await h.svc.archiveRoutine(routineId)
    await expect(h.svc.addStep(routineId, { title: 'Y' })).rejects.toBeInstanceOf(RoutineNotFoundError)
  })

  it('updateStep patches only passed keys; skip_dates can be set then cleared (no blanking)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'keep', step_type: 'habit' })
    const up = await h.svc.updateStep(s.id, { is_required: true })
    expect(up.is_required).toBe(true)
    expect(up.step_type).toBe('habit') // untouched
    expect(up.title).toBe('keep')
    const withSkips = await h.svc.updateStep(s.id, { skip_dates: ['2026-11-01'] })
    expect(withSkips.skip_dates).toEqual(['2026-11-01'])
    const cleared = await h.svc.updateStep(s.id, { skip_dates: null })
    expect(cleared.skip_dates).toBeNull()
  })

  it('removeStep soft-deletes — listSteps excludes it', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    await h.svc.removeStep(a.id)
    const steps = await h.svc.listSteps(routineId)
    expect(steps.map((s) => s.id)).toEqual([b.id])
  })

  it('listSteps returns the steps sorted by step_order', async () => {
    await h.svc.addStep(routineId, { title: 'third', step_order: 3 })
    await h.svc.addStep(routineId, { title: 'first', step_order: 1 })
    await h.svc.addStep(routineId, { title: 'second', step_order: 2 })
    expect((await h.svc.listSteps(routineId)).map((s) => s.title)).toEqual(['first', 'second', 'third'])
  })

  it('reorderSteps sets step_order by position; foreign/unknown ids are ignored (BR-RT-S2-6)', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A', step_order: 0 })
    const b = await h.svc.addStep(routineId, { title: 'B', step_order: 1 })
    const c = await h.svc.addStep(routineId, { title: 'C', step_order: 2 })
    await h.svc.reorderSteps(routineId, [c.id, 'foreign-id', a.id, b.id]) // foreign-id skipped
    const steps = await h.svc.listSteps(routineId)
    expect(steps.map((s) => s.title)).toEqual(['C', 'A', 'B']) // C→0, A→1, B→2
  })

  it('archiveRoutine cascade-soft-deletes its steps (RT-17, interp §4.6)', async () => {
    await h.svc.addStep(routineId, { title: 'A' })
    await h.svc.addStep(routineId, { title: 'B' })
    expect((await h.svc.listSteps(routineId)).length).toBe(2)
    await h.svc.archiveRoutine(routineId)
    expect((await h.svc.listSteps(routineId)).length).toBe(0) // steps cascaded
  })
})

describe('mod-routines S3 — completion ledger + skip', () => {
  let h: Harness
  let stepId: string
  beforeEach(async () => {
    h = await setup()
    const routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
    stepId = (await h.svc.addStep(routineId, { title: 'Stretch' })).id
  })

  it('completeStep records a DONE occurrence (skipped=false, completed_at stamped) (RT-5)', async () => {
    const c = await completeActionable(h.svc, stepId, { date: '2026-10-13', actual_duration_minutes: 12 })
    expect(c.routine_step_id).toBe(stepId)
    expect(c.completed_date).toBe('2026-10-13')
    expect(c.skipped).toBe(false)
    expect(c.skip_reason).toBeNull()
    expect(c.actual_duration_minutes).toBe(12)
    expect(c.completed_at).toBeGreaterThan(0)
    expect(c._sync_status).toBe('pending')
  })

  it('completeStep UPSERTs per (step,date) — no duplicate row (RT-18 UNIQUE)', async () => {
    await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    await completeActionable(h.svc, stepId, { date: '2026-10-13', actual_duration_minutes: 30 })
    const ledger = await h.svc.listCompletions(stepId)
    expect(ledger.length).toBe(1) // upsert, not insert
    expect(ledger[0]!.actual_duration_minutes).toBe(30)
  })

  it('skipStep logs a skip on the day (skipped=true + reason) distinct from a done (RT-8)', async () => {
    const c = await h.svc.skipStep(stepId, { date: '2026-10-13', reason: 'sick' })
    expect(c.skipped).toBe(true)
    expect(c.skip_reason).toBe('sick')
  })

  it('complete→skip and skip→complete flip the SAME (step,date) row (upsert)', async () => {
    await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    const skipped = await h.svc.skipStep(stepId, { date: '2026-10-13', reason: 'changed mind' })
    expect(skipped.skipped).toBe(true)
    const redone = await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    expect(redone.skipped).toBe(false)
    expect(redone.skip_reason).toBeNull() // done clears the skip reason
    expect((await h.svc.listCompletions(stepId)).length).toBe(1)
  })

  it('planSkipDates writes step.skip_dates (deduped+sorted), NOT a completion row (RT-8 pre-planned)', async () => {
    const step = await h.svc.planSkipDates(stepId, ['2026-12-25', '2026-10-20', '2026-12-25'])
    expect(step.skip_dates).toEqual(['2026-10-20', '2026-12-25']) // deduped + sorted
    expect((await h.svc.listCompletions(stepId)).length).toBe(0) // no ledger row written
    // merges with a subsequent call
    const again = await h.svc.planSkipDates(stepId, ['2026-10-19'])
    expect(again.skip_dates).toEqual(['2026-10-19', '2026-10-20', '2026-12-25'])
  })

  it('editCompletion patches an existing (step,date); CompletionNotFoundError if absent (RT-5)', async () => {
    await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    const edited = await h.svc.editCompletion(stepId, '2026-10-13', { actual_duration_minutes: 45, skipped: true, skip_reason: 'late' })
    expect(edited.actual_duration_minutes).toBe(45)
    expect(edited.skipped).toBe(true)
    expect(edited.skip_reason).toBe('late')
    await expect(h.svc.editCompletion(stepId, '2099-01-01', {})).rejects.toBeInstanceOf(CompletionNotFoundError)
  })

  it('deleteCompletion HARD-deletes; CompletionNotFoundError if absent (RT-14 ledger)', async () => {
    await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    await h.svc.deleteCompletion(stepId, '2026-10-13')
    expect((await h.svc.listCompletions(stepId)).length).toBe(0)
    await expect(h.svc.deleteCompletion(stepId, '2026-10-13')).rejects.toBeInstanceOf(CompletionNotFoundError)
  })

  it('listCompletions returns the ledger sorted by date', async () => {
    await completeActionable(h.svc, stepId, { date: '2026-10-15' })
    await completeActionable(h.svc, stepId, { date: '2026-10-13' })
    await h.svc.skipStep(stepId, { date: '2026-10-14', reason: 'x' })
    expect((await h.svc.listCompletions(stepId)).map((c) => c.completed_date)).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
    ])
  })

  // ── failure paths ──────────────────────────────────────────────────
  it('completeStep/skipStep on a missing or archived step throw StepNotFoundError — no orphan completion (RT-3)', async () => {
    await expect(h.svc.completeStep('no-such-step', { date: '2026-10-13' })).rejects.toBeInstanceOf(StepNotFoundError)
    await h.svc.removeStep(stepId) // soft-delete the step
    await expect(h.svc.skipStep(stepId, { date: '2026-10-13' })).rejects.toBeInstanceOf(StepNotFoundError)
  })

  it('planSkipDates on a missing step throws StepNotFoundError', async () => {
    await expect(h.svc.planSkipDates('no-such-step', ['2026-10-20'])).rejects.toBeInstanceOf(StepNotFoundError)
  })
})

// ============================================================================
// S2c — floor conformance (PLAN-S2c-floor-conformance.md · Verification Gate 1–13)
// ============================================================================
describe('mod-routines S2c — floor conformance', () => {
  let h: Harness
  let routineId: string
  const queueCount = async (): Promise<number> => (await h.db.select().from(syncQueue).all()).length
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })

  // 1 — setLifecycle happy path (ROU-17, A6)
  it('setLifecycle moves paused → off → active, each returning the faithful row', async () => {
    for (const lc of ['paused', 'off', 'active'] as const) {
      const r = await h.svc.setLifecycle(routineId, lc)
      expect(r.lifecycle).toBe(lc)
      expect((await h.svc.getRoutine(routineId))?.lifecycle).toBe(lc)
    }
  })

  // 2 — setLifecycle on an archived / missing routine → typed, no write
  it('setLifecycle on an archived or missing routine throws RoutineNotFoundError with no write', async () => {
    await h.svc.archiveRoutine(routineId)
    const rowBefore = (await h.bsql.prepare('SELECT _sync_version, updated_at, lifecycle FROM routines WHERE id = ?').get(routineId)) as Record<string, unknown>
    const before = await queueCount()
    await expect(h.svc.setLifecycle(routineId, 'paused')).rejects.toBeInstanceOf(RoutineNotFoundError)
    await expect(h.svc.setLifecycle('no-such-routine', 'paused')).rejects.toBeInstanceOf(RoutineNotFoundError)
    expect(await queueCount()).toBe(before)
    expect(h.bsql.prepare('SELECT _sync_version, updated_at, lifecycle FROM routines WHERE id = ?').get(routineId)).toEqual(rowBefore)
  })

  // 3 — setLifecycle off-tuple → ZodError, no write
  it('setLifecycle rejects an off-tuple lifecycle before any write', async () => {
    const before = await queueCount()
    await expect(h.svc.setLifecycle(routineId, 'sleeping' as never)).rejects.toBeInstanceOf(ZodError)
    expect((await h.svc.getRoutine(routineId))?.lifecycle).toBe('active')
    expect(await queueCount()).toBe(before)
  })

  // 4 — addStep entity_type validated against the registry (A10, R2)
  it('addStep validates entity_type against the registry; unregistered → UnknownEntityType, no row', async () => {
    await expect(h.svc.addStep(routineId, { title: 'Read', entity_type: 'habit', entity_id: 'h1' })).resolves.toBeTruthy()
    await expect(h.svc.addStep(routineId, { title: 'Alarm' })).resolves.toBeTruthy() // null entity_type = actionable
    const before = await queueCount()
    await expect(
      h.svc.addStep(routineId, { title: 'Bad', entity_type: 'not_a_type', entity_id: 'x' }),
    ).rejects.toBeInstanceOf(UnknownEntityType)
    expect((await h.svc.listSteps(routineId)).length).toBe(2)
    expect(await queueCount()).toBe(before)
  })

  // 5 — updateStep entity_type validated too
  it('updateStep setting an unregistered entity_type throws UnknownEntityType and leaves the step unchanged', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Read', entity_type: 'habit', entity_id: 'h1' })
    const before = await queueCount()
    await expect(h.svc.updateStep(s.id, { entity_type: 'not_a_type' })).rejects.toBeInstanceOf(UnknownEntityType)
    expect((await h.svc.listSteps(routineId))[0].entity_type).toBe('habit')
    expect(await queueCount()).toBe(before)
  })

  // 6 — calendar-date shape on every date entry point (B1, rule 16)
  it('rejects a non YYYY-MM-DD date at every date entry point, with no write', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Read' })
    await completeActionable(h.svc, s.id, { date: '2026-10-20' })
    const before = await queueCount()
    await expect(h.svc.completeStep(s.id, { date: '2026-1-5' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.skipStep(s.id, { date: 'yesterday' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.planSkipDates(s.id, ['2026/10/01'])).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.addStep(routineId, { title: 'X', skip_dates: ['bad'] })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.updateStep(s.id, { skip_dates: ['bad'] })).rejects.toBeInstanceOf(ZodError)
    // ZodError, not CompletionNotFoundError — the declared B1 error-type change (pre-S2c code threw the latter).
    await expect(h.svc.editCompletion(s.id, 'bad', { skipped: true })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.deleteCompletion(s.id, 'bad')).rejects.toBeInstanceOf(ZodError)
    expect(await queueCount()).toBe(before)
    await expect(h.svc.planSkipDates(s.id, ['2026-12-24'])).resolves.toBeTruthy()
  })

  // 7 — progress override 0..100 int (B2)
  it('progress accepts 0, 100, null and rejects 101, -1, 1.5', async () => {
    for (const ok of [0, 100, null]) await expect(h.svc.updateRoutine(routineId, { progress: ok })).resolves.toBeTruthy()
    await h.svc.updateRoutine(routineId, { progress: 40 })
    for (const bad of [101, -1, 1.5]) await expect(h.svc.updateRoutine(routineId, { progress: bad })).rejects.toBeInstanceOf(ZodError)
    expect((await h.svc.getRoutine(routineId))?.progress).toBe(40) // rejected updates leave the stored value
  })

  // 8 — recurrence_rule parse-validated at write (B3; verified ical.js 2.2.1 behaviour)
  it('validates recurrence_rule: FREQ required, parser throws rejected, null allowed', async () => {
    for (const ok of ['FREQ=DAILY', 'FREQ=WEEKLY;BYDAY=MO,WE', 'FREQ=DAILY;INTERVAL=0']) {
      await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: ok })).resolves.toBeTruthy()
    }
    await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: null })).resolves.toBeTruthy()
    const routinesBefore = (await h.svc.listRoutines()).length
    const queueBefore = await queueCount()
    for (const bad of ['NOT A RULE', 'BYDAY=MO', '', 'RRULE:FREQ=DAILY', 'FREQ=BOGUS', 'FREQ=DAILY;COUNT=abc', 'FREQ=DAILY;BYDAY=XX']) {
      await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: bad })).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
    }
    expect((await h.svc.listRoutines()).length).toBe(routinesBefore)
    expect(await queueCount()).toBe(queueBefore)
    await h.svc.updateRoutine(routineId, { recurrence_rule: 'FREQ=DAILY' })
    await expect(h.svc.updateRoutine(routineId, { recurrence_rule: 'BYDAY=MO' })).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
    expect((await h.svc.getRoutine(routineId))?.recurrence_rule).toBe('FREQ=DAILY')
  })

  // 9 — non-empty name/title (B16)
  it('rejects an empty name or title on create and update', async () => {
    await expect(h.svc.createRoutine({ name: '' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.updateRoutine(routineId, { name: '' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.addStep(routineId, { title: '' })).rejects.toBeInstanceOf(ZodError)
    const s = await h.svc.addStep(routineId, { title: 'Ok' })
    await expect(h.svc.updateStep(s.id, { title: '' })).rejects.toBeInstanceOf(ZodError)
  })

  // 10 — listRoutines ordering: sort_order, created_at, id codepoint (A8)
  it('listRoutines orders by sort_order, then created_at, then id', async () => {
    await h.svc.archiveRoutine(routineId)
    let t = 1_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => (t += 10))
    const c = await h.svc.createRoutine({ name: 'C', sort_order: 1 })
    const a = await h.svc.createRoutine({ name: 'A', sort_order: 0 })
    const b = await h.svc.createRoutine({ name: 'B', sort_order: 0 })
    spy.mockImplementation(() => 5_000) // forced same created_at → id codepoint decides
    const x = await h.svc.createRoutine({ name: 'X', sort_order: 2 })
    const y = await h.svc.createRoutine({ name: 'Y', sort_order: 2 })
    spy.mockRestore()
    const ids = (await h.svc.listRoutines()).map((r) => r.id)
    const [first, second] = [x.id, y.id].sort()
    expect(ids).toEqual([a.id, b.id, c.id, first, second])
  })

  // 11 — addStep appends (max+1); reorder then add lands last (A11)
  it('addStep appends at max+1 over live steps; explicit step_order wins; reorder-then-add lands last', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    const c = await h.svc.addStep(routineId, { title: 'C' })
    expect([a.step_order, b.step_order, c.step_order]).toEqual([0, 1, 2])
    const pinned = await h.svc.addStep(routineId, { title: 'P', step_order: 0 })
    expect(pinned.step_order).toBe(0)
    await h.svc.removeStep(pinned.id)
    await h.svc.reorderSteps(routineId, [c.id, a.id, b.id])
    const d = await h.svc.addStep(routineId, { title: 'D' })
    expect((await h.svc.listSteps(routineId)).map((s) => s.id)).toEqual([c.id, a.id, b.id, d.id])
  })

  // 12 — reorderSteps returns the live steps (A12)
  it('reorderSteps returns the live steps in the new order, deep-equal to a fresh listSteps', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    const returned = await h.svc.reorderSteps(routineId, [b.id, a.id])
    expect(returned.map((s) => s.id)).toEqual([b.id, a.id])
    expect(returned).toEqual(await h.svc.listSteps(routineId))
  })

  // 13 — persistence probe (RT-18)
  it('setLifecycle enqueues a co-transactional sync_queue row', async () => {
    const before = (await h.db.select().from(syncQueue).all()).filter((x) => x.row_id === routineId).length
    await h.svc.setLifecycle(routineId, 'paused')
    const after = (await h.db.select().from(syncQueue).all()).filter((x) => x.row_id === routineId).length
    expect(after).toBeGreaterThan(before)
  })
})

// ============================================================================
// S3 — run/drive: the RT-3 composition core (PLAN-S3-run-drive.md · Verification Gate 1–15)
// ============================================================================
describe('mod-routines S3 — run/drive', () => {
  const DAY = '2026-10-21'
  let h: Harness
  let routineId: string
  const queueFor = async (rowId: string): Promise<number> =>
    (await h.db.select().from(syncQueue).all()).filter((x) => x.row_id === rowId).length
  const focusStatus = (focusId: string): string =>
    (h.bsql.prepare('SELECT status FROM focus_sessions WHERE id = ?').get(focusId) as { status: string }).status
  const asRun = (r: RoutineCompletion | StepRunState): StepRunState => {
    if (!isStepRunState(r)) throw new Error('expected a StepRunState')
    return r
  }
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })
  afterEach(() => vi.restoreAllMocks())

  // 1 — actionable
  it('actionable step: runStep and completeStep stamp the ledger; completeStep returns a RoutineCompletion', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch' })
    const run = await h.svc.runStep(s.id, { date: DAY })
    expect(run).toMatchObject({ target: 'actionable', status: 'done', date: DAY })
    expect(run.completion?.skipped).toBe(false)
    const c = await h.svc.completeStep(s.id, { date: DAY })
    expect(isStepRunState(c)).toBe(false)
  })

  // 2 — task
  it('task step: runStep completes the real task and stamps the ledger', async () => {
    const t = await h.tasks.createTask({ title: 'Pay bill' })
    const s = await h.svc.addStep(routineId, { title: 'Bill', entity_type: 'task', entity_id: t.id })
    const run = await h.svc.runStep(s.id, { date: DAY })
    expect(run).toMatchObject({ target: 'task', status: 'done' })
    expect((await h.tasks.getTask(t.id))?.status).toBe('completed')
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual([DAY])
  })

  // 3 — task missing / soft-deleted; soft-deleted step
  it('missing or soft-deleted task → EntityUnavailableError with no routine write; a soft-deleted step → StepNotFoundError first', async () => {
    const ghost = await h.svc.addStep(routineId, { title: 'Ghost', entity_type: 'task', entity_id: 'no-such-task' })
    const ledgerQueueBefore = (await h.db.select().from(syncQueue).all()).filter((x) => x.table_name === 'routine_completions').length
    await expect(h.svc.runStep(ghost.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(ghost.id)).toEqual([])
    expect((await h.db.select().from(syncQueue).all()).filter((x) => x.table_name === 'routine_completions').length).toBe(ledgerQueueBefore)
    const t = await h.tasks.createTask({ title: 'Gone' })
    await h.tasks.softDeleteTask(t.id)
    const s = await h.svc.addStep(routineId, { title: 'Gone', entity_type: 'task', entity_id: t.id })
    await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    const live = await h.tasks.createTask({ title: 'Live' })
    const st = await h.svc.addStep(routineId, { title: 'Live', entity_type: 'task', entity_id: live.id })
    await h.svc.removeStep(st.id)
    await expect(h.svc.runStep(st.id, { date: DAY })).rejects.toBeInstanceOf(StepNotFoundError)
    expect((await h.tasks.getTask(live.id))?.status).not.toBe('completed')
  })

  // 4 — obligation regen failure (TAS-23 complete-but-flag)
  it('obligation whose regeneration fails: the task is completed, the ledger stamped, the flag passed through', async () => {
    const t = await h.tasks.createTask({ title: 'Tax', kind: 'obligation', due_date: DAY })
    await h.tasks.setRecurrence(t.id, 'FREQ=BOGUS') // tasks doesn't validate the rule (tasks test precedent)
    const s = await h.svc.addStep(routineId, { title: 'Tax', entity_type: 'task', entity_id: t.id })
    const run = asRun(await h.svc.completeStep(s.id, { date: DAY }))
    expect(run).toMatchObject({ status: 'done', flag: 'recurrence_regen_failed' })
    expect((await h.tasks.getTask(t.id))?.status).toBe('completed')
    expect(await h.svc.listCompletions(s.id)).toHaveLength(1)
  })

  // 5 — habit target 1
  it('habit step (target 1): one native tick completes the habit and stamps the ledger', async () => {
    const hab = await h.habits.createHabit({ name: 'Water', frequency: 'daily' })
    const s = await h.svc.addStep(routineId, { title: 'Water', entity_type: 'habit', entity_id: hab.id })
    const today = new Date().toISOString().slice(0, 10)
    const run = await h.svc.runStep(s.id, { date: today })
    expect(run).toMatchObject({ target: 'habit', status: 'done' })
    expect(await h.svc.listCompletions(s.id)).toHaveLength(1)
  })

  // 6 — habit target 3: advanced, repeat stays advanced, done once the habit reaches target
  it('habit step (target 3): advanced without a stamp; a repeat stays advanced; done once the habit is done', async () => {
    const hab = await h.habits.createHabit({ name: 'Pushups', frequency: 'daily', target_count: 3 })
    const s = await h.svc.addStep(routineId, { title: 'Pushups', entity_type: 'habit', entity_id: hab.id })
    const today = new Date().toISOString().slice(0, 10)
    expect((await h.svc.runStep(s.id, { date: today })).status).toBe('advanced')
    expect((await h.svc.runStep(s.id, { date: today })).status).toBe('advanced')
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    await h.habits.logCompletion(hab.id, { date: today, count: 3 })
    expect((await h.svc.runStep(s.id, { date: today })).status).toBe('done')
    expect(await h.svc.listCompletions(s.id)).toHaveLength(1)
  })

  // 7 — habit dep absent / missing / soft-deleted
  it('habit step with no habits dep, a missing habit, or a soft-deleted habit → EntityUnavailableError', async () => {
    const hab = await h.habits.createHabit({ name: 'Read', frequency: 'daily' })
    const s = await h.svc.addStep(routineId, { title: 'Read', entity_type: 'habit', entity_id: hab.id })
    const noHabits = await setup({ withHabits: false })
    const r2 = (await noHabits.svc.createRoutine({ name: 'R' })).id
    const s2 = await noHabits.svc.addStep(r2, { title: 'H', entity_type: 'habit', entity_id: 'x' })
    await expect(noHabits.svc.runStep(s2.id)).rejects.toBeInstanceOf(EntityUnavailableError)
    const ghost = await h.svc.addStep(routineId, { title: 'G', entity_type: 'habit', entity_id: 'no-such-habit' })
    await expect(h.svc.runStep(ghost.id)).rejects.toBeInstanceOf(EntityUnavailableError)
    await h.habits.softDeleteHabit(hab.id)
    await expect(h.svc.runStep(s.id)).rejects.toBeInstanceOf(EntityUnavailableError)
  })

  // 8 — habit date pass-through; future date rejected by habits
  it('habit step passes the occurrence date to the habit; a future date → BackfillWindowError, no stamp', async () => {
    const hab = await h.habits.createHabit({ name: 'Walk', frequency: 'daily' })
    const s = await h.svc.addStep(routineId, { title: 'Walk', entity_type: 'habit', entity_id: hab.id })
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    await h.svc.runStep(s.id, { date: yesterday })
    const cal = await h.habits.getCalendar(hab.id, yesterday.slice(0, 7))
    expect(cal.some((d) => d.date === yesterday && d.done)).toBe(true)
    await expect(h.svc.runStep(s.id, { date: '2999-01-01' })).rejects.toBeInstanceOf(BackfillWindowError)
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual([yesterday])
  })

  // 9 — focus start + re-entry
  it('focus step: runStep starts an attached session; a second runStep re-enters the same one', async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => Date.parse(`${DAY}T09:00:00Z`)) // the session starts on DAY
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const a = await h.svc.runStep(s.id, { date: DAY })
    expect(a).toMatchObject({ target: 'focus', status: 'in_progress' })
    expect(a.session_id).toBeTruthy()
    expect(a.focus_id).toBeTruthy()
    expect((await h.sessions.findOpenSessionForEntity('focus', 'routine_step', s.id))?.id).toBe(a.session_id)
    const b = await h.svc.runStep(s.id, { date: DAY })
    expect([b.session_id, b.focus_id]).toEqual([a.session_id, a.focus_id])
  })

  // 10 — focus cycle ×2 (re-entry survives completion: detach workaround)
  it('focus step survives two full cycles: run → complete → run → run → complete, one ledger row per day', async () => {
    let now = Date.parse('2026-10-21T08:00:00Z')
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const first = await h.svc.runStep(s.id, { date: '2026-10-21' })
    now += 25 * 60_000
    const done1 = asRun(await h.svc.completeStep(s.id, { date: '2026-10-21' }))
    expect(done1.status).toBe('done')
    expect(done1.completion?.actual_duration_minutes).toBe(25)
    expect(focusStatus(first.focus_id!)).toBe('completed')
    now = Date.parse('2026-10-22T08:00:00Z')
    const second = await h.svc.runStep(s.id, { date: '2026-10-22' })
    expect(second.session_id).not.toBe(first.session_id)
    const again = await h.svc.runStep(s.id, { date: '2026-10-22' })
    expect(again.session_id).toBe(second.session_id)
    now += 50 * 60_000
    const done2 = asRun(await h.svc.completeStep(s.id, { date: '2026-10-22' }))
    expect(done2.completion?.actual_duration_minutes).toBe(50)
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual(['2026-10-21', '2026-10-22'])
  })

  // 11 — focus stamp retry: focus completed (e.g. a stamp failed after completeFocus) → completeStep stamps from it
  it('focus stamp retry: an attached focus completed the same day with no ledger row is stamped from, then detached', async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => Date.parse('2026-10-21T09:00:00Z')) // no midnight straddle
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const today = '2026-10-21'
    const run = await h.svc.runStep(s.id, { date: today })
    // The exact state a stamp failure after completeFocus leaves behind (focus completed, no ledger row, still attached).
    await h.sessions.completeFocus(run.focus_id!)
    const done = asRun(await h.svc.completeStep(s.id, { date: today }))
    expect(done.status).toBe('done')
    expect(await h.svc.listCompletions(s.id)).toHaveLength(1)
    expect(await h.sessions.findOpenSessionForEntity('focus', 'routine_step', s.id)).toBeNull() // detached
  })

  // 12 — focus edge cases
  it('focus edges: cancelled → never done, restarts; previous-day completion not stamped today; no running focus; attach failure cancels', async () => {
    let now = Date.parse('2026-10-21T09:00:00Z')
    const clockSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const today = '2026-10-21'
    const run = await h.svc.runStep(s.id, { date: today })
    await h.sessions.cancelFocus(run.focus_id!)
    await expect(h.svc.completeStep(s.id, { date: today })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    const restarted = await h.svc.runStep(s.id, { date: today })
    expect(restarted.session_id).not.toBe(run.session_id)
    // a focus completed on a previous day is not stamped for today
    const s2 = await h.svc.addStep(routineId, { title: 'Old', step_type: 'focus' })
    now = Date.parse('2026-01-01T10:00:00Z')
    const old = await h.svc.runStep(s2.id, { date: '2026-01-01' })
    await h.sessions.completeFocus(old.focus_id!)
    now = Date.parse('2026-10-21T09:30:00Z')
    await expect(h.svc.completeStep(s2.id, { date: today })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(s2.id)).toEqual([])
    // no running focus at all
    const s3 = await h.svc.addStep(routineId, { title: 'Never ran', step_type: 'focus' })
    await expect(h.svc.completeStep(s3.id, { date: today })).rejects.toBeInstanceOf(EntityUnavailableError)
    // attach failure → the just-started focus is cancelled and the error rethrown
    const base = createTaggableTypeRegistry()
    const denyStep: TaggableTypeRegistry = { ...base, isRegistered: (t) => t !== 'routine_step' && base.isRegistered(t) }
    const h2 = await setup({ sessionsEntityRegistry: denyStep })
    const r2 = (await h2.svc.createRoutine({ name: 'R' })).id
    const s4 = await h2.svc.addStep(r2, { title: 'F', step_type: 'focus' })
    await expect(h2.svc.runStep(s4.id)).rejects.toBeInstanceOf(UnknownEntityType)
    const statuses = (h2.bsql.prepare('SELECT status FROM focus_sessions').all() as { status: string }[]).map((r) => r.status)
    expect(statuses).toEqual(['cancelled'])
    clockSpy.mockRestore()
  })

  // 13 — rule 1 + rule 17: the task's own award_xp fires exactly once across a re-complete; nothing keyed on the routine
  it('re-completing a task step re-drives the task but its award_xp fires exactly once, keyed on the task', async () => {
    const fired: string[] = []
    const effectRegistry = createEffectRegistry()
    effectRegistry.register('award_xp', async (ev) => {
      fired.push(ev.subjectNaturalKey)
    })
    h = await setup({ effectRegistry })
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const t = await h.tasks.createTask({ title: 'Ship' })
    const s = await h.svc.addStep(rid, { title: 'Ship', entity_type: 'task', entity_id: t.id })
    await h.svc.completeStep(s.id, { date: DAY })
    await h.svc.completeStep(s.id, { date: DAY })
    expect(fired).toEqual([t.id])
  })

  // 14 — skip overwrite + unsupported targets
  it('a logged skip flips to done on a successful drive; unsupported targets → EntityUnavailableError with no session', async () => {
    const t = await h.tasks.createTask({ title: 'Mail' })
    const s = await h.svc.addStep(routineId, { title: 'Mail', entity_type: 'task', entity_id: t.id })
    await h.svc.skipStep(s.id, { date: DAY, reason: 'busy' })
    await h.svc.runStep(s.id, { date: DAY })
    const rows = await h.svc.listCompletions(s.id)
    expect(rows).toHaveLength(1)
    expect([rows[0].skipped, rows[0].skip_reason]).toEqual([false, null])
    const cases = [
      { title: 'Workout', step_type: 'workout' },
      { title: 'Habit w/o ref', step_type: 'habit' },
      { title: 'Session ref', entity_type: 'session', entity_id: 'x' },
    ]
    for (const c of cases) {
      const st = await h.svc.addStep(routineId, c)
      await expect(h.svc.runStep(st.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    }
    expect((h.bsql.prepare('SELECT count(*) AS n FROM focus_sessions').get() as { n: number }).n).toBe(0)
  })

  // 15 — persistence probe
  it('a driven completeStep enqueues the ledger row in sync_queue', async () => {
    const t = await h.tasks.createTask({ title: 'Sync' })
    const s = await h.svc.addStep(routineId, { title: 'Sync', entity_type: 'task', entity_id: t.id })
    const run = asRun(await h.svc.completeStep(s.id, { date: DAY }))
    expect(await queueFor(run.completion!.id)).toBeGreaterThanOrEqual(1)
  })

  // g2 fixes (post-implementation, PLAN-S3 addendum)
  it('task TERMINAL convention: a cancelled task is unavailable; a completed task is reflected without moving completed_at', async () => {
    const c = await h.tasks.createTask({ title: 'Dropped' })
    await h.tasks.updateTask(c.id, { status: 'cancelled' })
    const sc = await h.svc.addStep(routineId, { title: 'Dropped', entity_type: 'task', entity_id: c.id })
    await expect(h.svc.runStep(sc.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect((await h.tasks.getTask(c.id))?.status).toBe('cancelled')
    const t = await h.tasks.createTask({ title: 'Once' })
    const st = await h.svc.addStep(routineId, { title: 'Once', entity_type: 'task', entity_id: t.id })
    await h.svc.runStep(st.id, { date: '2026-10-20' })
    const completedAt = (await h.tasks.getTask(t.id))?.completed_at
    const next = await h.svc.runStep(st.id, { date: '2026-10-21' })
    expect(next.status).toBe('done')
    expect((await h.tasks.getTask(t.id))?.completed_at).toBe(completedAt)
    await h.tasks.reopenTask(t.id) // reopened → re-driven (RT-3)
    await h.svc.runStep(st.id, { date: '2026-10-22' })
    expect((await h.tasks.getTask(t.id))?.status).toBe('completed')
  })

  it('a focus left running from another day is cancelled + detached, never stamped onto today', async () => {
    let now = Date.parse('2026-10-20T08:00:00Z')
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const stale = await h.svc.runStep(s.id, { date: '2026-10-20' })
    now = Date.parse('2026-10-22T08:00:00Z')
    await expect(h.svc.completeStep(s.id, { date: '2026-10-22' })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(focusStatus(stale.focus_id!)).toBe('cancelled')
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    const fresh = await h.svc.runStep(s.id, { date: '2026-10-22' })
    expect(fresh.session_id).not.toBe(stale.session_id)
  })

  it('overlapping runStep calls on a focus step (double-tap) start exactly one attached session', async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => Date.parse(`${DAY}T09:00:00Z`))
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const [a, b] = await Promise.all([h.svc.runStep(s.id, { date: DAY }), h.svc.runStep(s.id, { date: DAY })])
    expect(a.session_id).toBe(b.session_id)
    expect((h.bsql.prepare('SELECT count(*) AS n FROM focus_sessions').get() as { n: number }).n).toBe(1)
  })

  it('a habit step reflects a habit that is no longer done: the stale done stamp is removed', async () => {
    const hab = await h.habits.createHabit({ name: 'Floss', frequency: 'daily' })
    const s = await h.svc.addStep(routineId, { title: 'Floss', entity_type: 'habit', entity_id: hab.id })
    const today = new Date().toISOString().slice(0, 10)
    await h.svc.runStep(s.id, { date: today })
    expect(await h.svc.listCompletions(s.id)).toHaveLength(1)
    await h.habits.updateHabit(hab.id, { target_count: 3 })
    expect((await h.svc.runStep(s.id, { date: today })).status).toBe('advanced')
    expect(await h.svc.listCompletions(s.id)).toEqual([])
  })

  // final-critique fixes
  it('a focus crossing UTC midnight keeps its work: completed and stamped on the day it started', async () => {
    let now = Date.parse('2026-10-21T23:50:00Z') // 20:50 in Brasília
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const s = await h.svc.addStep(routineId, { title: 'Evening focus', step_type: 'focus' })
    await h.svc.runStep(s.id) // default date = UTC 2026-10-21
    now = Date.parse('2026-10-22T00:20:00Z') // 21:20 in Brasília, a new UTC day
    const done = asRun(await h.svc.completeStep(s.id)) // default date = UTC 2026-10-22
    expect(done).toMatchObject({ status: 'done', date: '2026-10-21' })
    expect(done.completion?.actual_duration_minutes).toBe(30)
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual(['2026-10-21'])
  })

  it('a caller-supplied past date never cancels a focus that is running now', async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => Date.parse('2026-10-22T10:00:00Z'))
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    const a = await h.svc.runStep(s.id, { date: '2026-10-22' })
    const b = await h.svc.runStep(s.id, { date: '2026-10-01' })
    expect(b.session_id).toBe(a.session_id)
    expect(focusStatus(a.focus_id!)).toBe('running')
  })

  it('a focus started outside routines (not attached to the step) is invisible: completeStep → EntityUnavailableError', async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => Date.parse(`${DAY}T09:00:00Z`))
    const s = await h.svc.addStep(routineId, { title: 'Deep work', step_type: 'focus' })
    await h.sessions.startFocus({})
    await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
  })

  it('re-running an already-done step keeps its recorded duration and completed_at', async () => {
    const t = await h.tasks.createTask({ title: 'Report' })
    const s = await h.svc.addStep(routineId, { title: 'Report', entity_type: 'task', entity_id: t.id })
    const first = asRun(await h.svc.completeStep(s.id, { date: DAY, actual_duration_minutes: 30 }))
    const again = await h.svc.runStep(s.id, { date: DAY })
    expect(again.completion?.actual_duration_minutes).toBe(30)
    expect(again.completion?.completed_at).toBe(first.completion?.completed_at)
  })
})

// ============================================================================
// S4 — policy evaluation (PLAN-S4-policy-evaluation.md · Verification Gate 1–14)
// The policy is the USER's: tests inject it through a stub RoutinesPrefsPort; no routines-side default exists.
// ============================================================================
describe('mod-routines S4 — policy evaluation', () => {
  const D = '2026-10-20'
  const at = (iso: string) => vi.spyOn(Date, 'now').mockImplementation(() => Date.parse(iso))
  const port = (policy: RoutinePolicy | null): RoutinesPrefsPort => ({ policyFor: async () => policy })
  let h: Harness
  afterEach(() => vi.restoreAllMocks())

  // A routine with N actionable steps created on D (so they belong to D's as-of step set).
  async function routineWith(n: number, opts: SetupOpts = {}, required: number[] = []) {
    h = await setup(opts)
    at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const steps = []
    for (let i = 0; i < n; i++) {
      steps.push(await h.svc.addStep(rid, { title: `S${i}`, is_required: required.includes(i) }))
    }
    return { rid, steps }
  }
  const doneOn = async (stepIds: string[]) => {
    for (const id of stepIds) await h.svc.completeStep(id, { date: D })
  }

  // 1 — no policy: policy-independent judgments + flag
  it('no policy: 0 done → not_started; some → partial flagged undefined; all → done', async () => {
    const { rid, steps } = await routineWith(3)
    expect(await h.svc.evaluateRoutine(rid, { date: D })).toMatchObject({ status: 'not_started', policy_source: 'undefined', applicable: 3 })
    await doneOn([steps[0].id])
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e).toMatchObject({ status: 'partial', policy_source: 'undefined', percent: 33 })
    expect(e.done.map((x) => x.step_id)).toEqual([steps[0].id])
    expect(e.not_done.map((x) => x.step_id)).toEqual([steps[1].id, steps[2].id])
    await doneOn([steps[1].id, steps[2].id])
    expect((await h.svc.evaluateRoutine(rid, { date: D })).status).toBe('done')
  })

  // 2 — all_or_nothing
  it('all_or_nothing: 2/3 → partial; 3/3 → done; policy_source user', async () => {
    const { rid, steps } = await routineWith(3, { prefs: port({ completion: { kind: 'all_or_nothing' } }) })
    await doneOn([steps[0].id, steps[1].id])
    expect(await h.svc.evaluateRoutine(rid, { date: D })).toMatchObject({ status: 'partial', policy_source: 'user' })
    await doneOn([steps[2].id])
    expect((await h.svc.evaluateRoutine(rid, { date: D })).status).toBe('done')
  })

  // 3 — threshold: exact ratio, 100, 0
  it('threshold: 60 with 2/3 → done; 67 with 2/3 → partial (exact ratio); 100 = all-or-nothing; 0 with 0 done → done', async () => {
    for (const [pct, doneCount, want] of [[60, 2, 'done'], [67, 2, 'partial'], [100, 2, 'partial'], [100, 3, 'done'], [0, 0, 'done']] as const) {
      const { rid, steps } = await routineWith(3, { prefs: port({ completion: { kind: 'threshold', percent: pct } }) })
      await doneOn(steps.slice(0, doneCount).map((x) => x.id))
      expect((await h.svc.evaluateRoutine(rid, { date: D })).status, `threshold ${pct} with ${doneCount}/3`).toBe(want)
      vi.restoreAllMocks()
    }
  })

  // 4 — required_node
  it('required_node: required done → done; required not done → partial; no required / required all neutral → undefined + note', async () => {
    let r = await routineWith(3, { prefs: port({ completion: { kind: 'required_node' } }) }, [0])
    await doneOn([r.steps[0].id])
    expect((await h.svc.evaluateRoutine(r.rid, { date: D })).status).toBe('done')
    vi.restoreAllMocks()
    r = await routineWith(3, { prefs: port({ completion: { kind: 'required_node' } }) }, [0])
    await doneOn([r.steps[1].id])
    expect((await h.svc.evaluateRoutine(r.rid, { date: D })).status).toBe('partial')
    vi.restoreAllMocks()
    r = await routineWith(2, { prefs: port({ completion: { kind: 'required_node' } }) })
    await doneOn([r.steps[0].id])
    expect(await h.svc.evaluateRoutine(r.rid, { date: D })).toMatchObject({ policy_source: 'undefined', policy_note: 'no_required_steps', status: 'partial' })
    vi.restoreAllMocks()
    r = await routineWith(2, { prefs: port({ completion: { kind: 'required_node' } }) }, [0])
    await h.svc.planSkipDates(r.steps[0].id, [D])
    await doneOn([r.steps[1].id])
    expect(await h.svc.evaluateRoutine(r.rid, { date: D })).toMatchObject({ policy_source: 'undefined', policy_note: 'required_steps_all_neutral', status: 'done' })
  })

  // 5 — planned skip neutral
  it('a planned skip is neutral: excluded from applicable and listed in neutral', async () => {
    const { rid, steps } = await routineWith(3, { prefs: port({ completion: { kind: 'all_or_nothing' } }) })
    await h.svc.planSkipDates(steps[1].id, [D])
    await doneOn([steps[0].id, steps[2].id])
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e).toMatchObject({ status: 'done', applicable: 2 })
    expect(e.neutral.map((x) => x.step_id)).toEqual([steps[1].id])
  })

  // 6 — logged skip per the user's miss policy
  it("a logged skip follows the user's miss policy: neutral → excluded; not_done → undone; undefined policy → undone", async () => {
    const cases: [RoutinePolicy | null, string][] = [
      [{ completion: { kind: 'all_or_nothing' }, miss: { logged_skip: 'neutral' } }, 'done'],
      [{ completion: { kind: 'all_or_nothing' }, miss: { logged_skip: 'not_done' } }, 'partial'],
      [null, 'partial'],
    ]
    for (const [policy, want] of cases) {
      const { rid, steps } = await routineWith(2, { prefs: port(policy) })
      await doneOn([steps[0].id])
      await h.svc.skipStep(steps[1].id, { date: D, reason: 'sick' })
      expect((await h.svc.evaluateRoutine(rid, { date: D })).status).toBe(want)
      vi.restoreAllMocks()
    }
  })

  // 7 — reflection (done = the routine row OR the entity as-of D)
  it('reflection: entity done in its own module counts; as-of D; history (the routine row) is never rewritten by later entity changes', async () => {
    h = await setup({ prefs: port({ completion: { kind: 'all_or_nothing' } }) })
    const clock = at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const hab = await h.habits.createHabit({ name: 'Water', frequency: 'daily' })
    const tD = await h.tasks.createTask({ title: 'On D' })
    const tLater = await h.tasks.createTask({ title: 'Later' })
    const sh = await h.svc.addStep(rid, { title: 'Water', entity_type: 'habit', entity_id: hab.id })
    const st = await h.svc.addStep(rid, { title: 'On D', entity_type: 'task', entity_id: tD.id })
    const sl = await h.svc.addStep(rid, { title: 'Later', entity_type: 'task', entity_id: tLater.id })
    await h.habits.logCompletion(hab.id, { date: D }) // reached target in Habits, not via the routine
    await h.tasks.completeTask(tD.id) // completed in Tasks on D
    clock.mockImplementation(() => Date.parse('2026-10-21T08:00:00Z'))
    await h.tasks.completeTask(tLater.id) // completed on D+1
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e.done.map((x) => x.step_id).sort()).toEqual([sh.id, st.id].sort())
    expect(e.not_done.map((x) => x.step_id)).toEqual([sl.id]) // D+1 completion does not leak into D
    expect((await h.svc.evaluateRoutine(rid, { date: '2026-10-21' })).done.map((x) => x.step_id)).toContain(st.id) // S3 reflection on D+1
    await h.tasks.reopenTask(tD.id)
    expect((await h.svc.evaluateRoutine(rid, { date: '2026-10-21' })).not_done.map((x) => x.step_id)).toContain(st.id)
    // habit decremented in Habits AFTER the routine stamped D → D stays done (the routine row is that occurrence's record, RT-5/U1)
    await h.svc.completeStep(sh.id, { date: D })
    await h.habits.editCompletion(hab.id, D, { count: 0 })
    expect((await h.svc.evaluateRoutine(rid, { date: D })).done.map((x) => x.step_id)).toContain(sh.id)
    // a task deleted after a routine stamp → the ledger fallback keeps D's done
    const tGone = await h.tasks.createTask({ title: 'Gone' })
    clock.mockImplementation(() => Date.parse(`${D}T09:00:00Z`))
    const sg = await h.svc.addStep(rid, { title: 'Gone', entity_type: 'task', entity_id: tGone.id })
    await h.svc.completeStep(sg.id, { date: D })
    await h.tasks.softDeleteTask(tGone.id)
    expect((await h.svc.evaluateRoutine(rid, { date: D })).done.map((x) => x.step_id)).toContain(sg.id)
  })

  it('reflection: a getCalendar failure other than "Habit not found" is rethrown', async () => {
    h = await setup()
    at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const hab = await h.habits.createHabit({ name: 'Water', frequency: 'daily' })
    await h.svc.addStep(rid, { title: 'Water', entity_type: 'habit', entity_id: hab.id })
    vi.spyOn(h.habits, 'getCalendar').mockRejectedValue(new Error('disk I/O error'))
    await expect(h.svc.evaluateRoutine(rid, { date: D })).rejects.toThrow('disk I/O error')
  })

  // 8 — as-of step set
  it('as-of step set: a step done on D then deleted still counts for D; a step added after D is absent', async () => {
    const { rid, steps } = await routineWith(2)
    await doneOn([steps[0].id])
    at('2026-10-21T08:00:00Z')
    await h.svc.removeStep(steps[0].id)
    const late = await h.svc.addStep(rid, { title: 'Late' })
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e.done.map((x) => x.step_id)).toEqual([steps[0].id])
    expect([...e.done, ...e.not_done, ...e.neutral].map((x) => x.step_id)).not.toContain(late.id)
  })

  // 9 + 14 — no applicable steps / empty routine
  it('no applicable steps (all planned-skipped, or none) → not_started, percent 0, applicable 0', async () => {
    let r = await routineWith(1)
    await h.svc.planSkipDates(r.steps[0].id, [D])
    expect(await h.svc.evaluateRoutine(r.rid, { date: D })).toMatchObject({ status: 'not_started', percent: 0, applicable: 0 })
    vi.restoreAllMocks()
    r = await routineWith(0)
    expect(await h.svc.evaluateRoutine(r.rid, { date: D })).toMatchObject({ status: 'not_started', percent: 0, applicable: 0 })
  })

  // 10 — errors
  it('errors: archived/missing routine → RoutineNotFoundError; bad date → ZodError; a port throw propagates', async () => {
    const { rid } = await routineWith(1, { prefs: { policyFor: async () => { throw new Error('prefs offline') } } })
    await expect(h.svc.evaluateRoutine(rid, { date: '2026-1-5' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.evaluateRoutine(rid, { date: D })).rejects.toThrow('prefs offline')
    await h.svc.archiveRoutine(rid)
    await expect(h.svc.evaluateRoutine(rid, { date: D })).rejects.toBeInstanceOf(RoutineNotFoundError)
    await expect(h.svc.evaluateRoutine('no-such', { date: D })).rejects.toBeInstanceOf(RoutineNotFoundError)
  })

  // 11 — read-only
  it('evaluateRoutine writes nothing (sync_queue unchanged)', async () => {
    const { rid, steps } = await routineWith(2)
    await doneOn([steps[0].id])
    const before = (await h.db.select().from(syncQueue).all()).length
    await h.svc.evaluateRoutine(rid, { date: D })
    expect((await h.db.select().from(syncQueue).all()).length).toBe(before)
  })

  // 12 — partial always returned (RT-5)
  it('a partial evaluation always lists every done step, under every policy kind', async () => {
    const policies: (RoutinePolicy | null)[] = [
      null,
      { completion: { kind: 'all_or_nothing' } },
      { completion: { kind: 'threshold', percent: 90 } },
      { completion: { kind: 'required_node' } },
    ]
    for (const p of policies) {
      const { rid, steps } = await routineWith(3, { prefs: port(p) }, [2])
      await doneOn([steps[0].id, steps[1].id])
      const e = await h.svc.evaluateRoutine(rid, { date: D })
      expect(e.status).toBe('partial')
      expect(e.done.map((x) => x.step_id)).toEqual([steps[0].id, steps[1].id])
      vi.restoreAllMocks()
    }
  })

  // 13 — unknown policy kind fails loud
  it('an unknown completion kind from the port → InvalidRoutinePolicyError', async () => {
    const { rid } = await routineWith(1, { prefs: port({ completion: { kind: 'vibes' } } as unknown as RoutinePolicy) })
    await expect(h.svc.evaluateRoutine(rid, { date: D })).rejects.toBeInstanceOf(InvalidRoutinePolicyError)
  })

  // g2 fixes (PLAN-S4 addendum)
  it('a backfilled task-step stamp counts for its date even though the task completed later', async () => {
    h = await setup()
    const clock = at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const t = await h.tasks.createTask({ title: 'Backfill' })
    const st = await h.svc.addStep(rid, { title: 'Backfill', entity_type: 'task', entity_id: t.id })
    clock.mockImplementation(() => Date.parse('2026-10-21T08:00:00Z'))
    await h.svc.completeStep(st.id, { date: D }) // completed_at = 10-21, stamped for D
    expect((await h.svc.evaluateRoutine(rid, { date: D })).status).toBe('done')
  })

  it('a step actually done on a planned-skip day counts as done, not neutral', async () => {
    const { rid, steps } = await routineWith(2, { prefs: port({ completion: { kind: 'all_or_nothing' } }) })
    await h.svc.planSkipDates(steps[1].id, [D])
    await doneOn([steps[0].id, steps[1].id])
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e.done.map((x) => x.step_id)).toEqual([steps[0].id, steps[1].id])
    expect(e.neutral).toEqual([])
  })

  it('a habit deleted after a routine stamp: D stays done via the routine row (no throw)', async () => {
    h = await setup()
    at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const hab = await h.habits.createHabit({ name: 'Read', frequency: 'daily' })
    const sh = await h.svc.addStep(rid, { title: 'Read', entity_type: 'habit', entity_id: hab.id })
    await h.svc.completeStep(sh.id, { date: D })
    await h.habits.softDeleteHabit(hab.id)
    expect((await h.svc.evaluateRoutine(rid, { date: D })).done.map((x) => x.step_id)).toEqual([sh.id])
  })

  it('a threshold with a missing/NaN percent fails loud; required_node with no applicable steps → user not_started', async () => {
    let r = await routineWith(1, { prefs: port({ completion: { kind: 'threshold', percent: Number.NaN } }) })
    await expect(h.svc.evaluateRoutine(r.rid, { date: D })).rejects.toBeInstanceOf(InvalidRoutinePolicyError)
    vi.restoreAllMocks()
    r = await routineWith(0, { prefs: port({ completion: { kind: 'required_node' } }) })
    expect(await h.svc.evaluateRoutine(r.rid, { date: D })).toMatchObject({ status: 'not_started', policy_source: 'user' })
  })

  it('a soft-deleted habit with no routine row reflects not_done (no throw); a logged skip whose task was completed on D is done', async () => {
    h = await setup()
    at(`${D}T08:00:00Z`)
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const hab = await h.habits.createHabit({ name: 'Gone', frequency: 'daily' })
    const sh = await h.svc.addStep(rid, { title: 'Gone', entity_type: 'habit', entity_id: hab.id })
    await h.habits.softDeleteHabit(hab.id)
    const t = await h.tasks.createTask({ title: 'Did it anyway' })
    const st = await h.svc.addStep(rid, { title: 'Did it anyway', entity_type: 'task', entity_id: t.id })
    await h.svc.skipStep(st.id, { date: D, reason: 'thought I would skip' })
    await h.tasks.completeTask(t.id) // done in Tasks on D
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e.not_done.map((x) => x.step_id)).toEqual([sh.id])
    expect(e.done.map((x) => x.step_id)).toEqual([st.id])
  })
})
