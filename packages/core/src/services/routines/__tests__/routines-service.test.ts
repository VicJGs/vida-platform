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
import type { SessionTypeDef } from '../../../foundation/sessions/types'
import { createEffectRegistry, createEffectRail, type EffectRegistry } from '../../../foundation/effects'
import { createTasksService, registerTasksTimer, type TasksService } from '../../tasks'
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
  OutsideAcceptanceWindowError,
  NotMissedOccurrenceError,
  InvalidRescheduleSlotError,
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
  sessionRegistry: ReturnType<typeof createSessionRegistry>
}

interface SetupOpts {
  withHabits?: boolean // default true; false ⇒ the optional `habits` dep is absent
  effectRegistry?: EffectRegistry // tasks fan-out spies (rule 1 / rule 17 test)
  sessionsEntityRegistry?: TaggableTypeRegistry // force an attach failure (focus edge case)
  prefs?: RoutinesPrefsPort // S4 — the user's policy port
  tasksTimer?: boolean // S5c — default true; false ⇒ registerTasksTimer not called (timer unwired)
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
  // S5c pin 9 — ONE session registry + ONE effect registry shared by Sessions, the Tasks timer and Routines.
  const sessionRegistry = createSessionRegistry(db, 'test-device')
  const sessions = createSessionsService({
    db,
    deviceId: 'test-device',
    registry: sessionRegistry,
    rail,
    entityRegistry: opts.sessionsEntityRegistry ?? registry,
  })
  const tasks = createTasksService({ db, deviceId: 'test-device', sessions, effects: { rail, registry: effectRegistry } })
  if (opts.tasksTimer !== false) await registerTasksTimer({ sessionRegistry, effectRegistry, db, deviceId: 'test-device' })
  const habits = createHabitsService({ db, deviceId: 'test-device' })
  const svc = createRoutinesService({
    db,
    deviceId: 'test-device',
    registry,
    tasks,
    sessions,
    sessionRegistry,
    ...(opts.withHabits === false ? {} : { habits }),
    ...(opts.prefs ? { prefs: opts.prefs } : {}),
  })
  return { svc, db, bsql, tasks, habits, sessions, sessionRegistry }
}

// Actionable steps return the ledger row; narrow the S3 completeStep union for the as-built tests.
// S5c — every step is driven (a check-off step IS a task); the stamped occurrence row is `.completion`.
async function completeActionable(
  svc: RoutinesService,
  ...args: Parameters<RoutinesService['completeStep']>
): Promise<RoutineCompletion> {
  const r = await svc.completeStep(...args)
  if (!r.completion) throw new Error(`expected a stamped occurrence, got status ${r.status}`)
  return r.completion
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
    expect(s.entity_type).toBe('task') // S5c — a check-off step IS a Task (Q1/RT-4)
    expect(s.entity_id).toBeTruthy()
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

  it('a check-off step with no driven entity IS a Task: created + linked (Q1/RT-4, S5c)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Water plants' })
    expect(s.entity_type).toBe('task')
    const task = await h.tasks.getTask(s.entity_id as string)
    expect(task).toMatchObject({ title: 'Water plants', kind: 'standard' })
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
    await expect(h.svc.addStep(routineId, { title: 'Alarm' })).resolves.toBeTruthy() // null entity_type = check-off (a Task is minted, S5c)
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

  // 1 — check-off
  it('check-off step, bare check: a completed work occurrence (no time log) + stamp; the Task stays open (S5c 3a)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch' })
    const run = await h.svc.completeStep(s.id, { date: DAY })
    expect(run).toMatchObject({ target: 'task', status: 'done', date: DAY })
    expect(run.completion?.skipped).toBe(false)
    expect((await h.sessions.getSession(run.session_id as string))?.session).toMatchObject({ sub_type: 'work', status: 'completed' })
    expect((await h.tasks.getTask(s.entity_id as string))?.status).not.toBe('completed')
    expect((h.bsql.prepare('SELECT count(*) AS n FROM task_time_logs').get() as { n: number }).n).toBe(0)
  })

  // 2 — task
  it('standard task step: runStep starts a work occurrence on task + step; completeStep stops it (time logged); the Task stays open (S5c 3a)', async () => {
    const t = await h.tasks.createTask({ title: 'Deep clean' })
    const s = await h.svc.addStep(routineId, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    const run = await h.svc.runStep(s.id, { date: DAY })
    expect(run).toMatchObject({ target: 'task', status: 'in_progress' })
    const targets = await h.sessions.resolveTargets(run.session_id as string)
    expect(targets.map((x) => x.entityType).sort()).toEqual(['routine_step', 'task'])
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done.status).toBe('done')
    expect((await h.tasks.getTask(t.id))?.status).not.toBe('completed')
    expect((h.bsql.prepare('SELECT count(*) AS n FROM task_time_logs WHERE task_id = ?').get(t.id) as { n: number }).n).toBe(1)
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
  it('re-completing an obligation step re-drives the task but its award_xp fires exactly once, keyed on the task', async () => {
    const fired: string[] = []
    const effectRegistry = createEffectRegistry()
    effectRegistry.register('award_xp', async (ev) => {
      fired.push(ev.subjectNaturalKey)
    })
    h = await setup({ effectRegistry })
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const t = await h.tasks.createTask({ title: 'Ship', kind: 'obligation', due_date: DAY }) // S5c: completeTask = obligations (3b)
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
    await h.svc.completeStep(s.id, { date: DAY })
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
  it('task TERMINAL convention: a cancelled/completed standard task is unavailable; an obligation is reflected without moving completed_at', async () => {
    const c = await h.tasks.createTask({ title: 'Dropped' })
    await h.tasks.updateTask(c.id, { status: 'cancelled' })
    const sc = await h.svc.addStep(routineId, { title: 'Dropped', entity_type: 'task', entity_id: c.id })
    await expect(h.svc.runStep(sc.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    const d = await h.tasks.createTask({ title: 'Closed' })
    await h.tasks.updateTask(d.id, { status: 'completed' })
    const sd = await h.svc.addStep(routineId, { title: 'Closed', entity_type: 'task', entity_id: d.id })
    await expect(h.svc.completeStep(sd.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    const t = await h.tasks.createTask({ title: 'Once', kind: 'obligation', due_date: '2026-10-20' })
    const st = await h.svc.addStep(routineId, { title: 'Once', entity_type: 'task', entity_id: t.id })
    await h.svc.completeStep(st.id, { date: '2026-10-20' })
    const completedAt = (await h.tasks.getTask(t.id))?.completed_at
    const next = await h.svc.completeStep(st.id, { date: '2026-10-21' })
    expect(next.status).toBe('done')
    expect((await h.tasks.getTask(t.id))?.completed_at).toBe(completedAt)
    await h.tasks.reopenTask(t.id) // reopened → re-driven (RT-3)
    await h.svc.completeStep(st.id, { date: '2026-10-22' })
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

  it('re-checking an already-done occurrence keeps its recorded duration and completed_at', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Report' })
    const first = await h.svc.completeStep(s.id, { date: DAY, actual_duration_minutes: 30 })
    const again = await h.svc.completeStep(s.id, { date: DAY })
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

  // A routine with N check-off steps created on D (so they belong to D's as-of step set).
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
    const tD = await h.tasks.createTask({ title: 'On D', kind: 'obligation', due_date: D }) // S5c: only obligations reflect (3b)
    const tLater = await h.tasks.createTask({ title: 'Later', kind: 'obligation', due_date: D })
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
    const tGone = await h.tasks.createTask({ title: 'Gone', kind: 'obligation', due_date: D })
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
    const t = await h.tasks.createTask({ title: 'Did it anyway', kind: 'obligation', due_date: D })
    const st = await h.svc.addStep(rid, { title: 'Did it anyway', entity_type: 'task', entity_id: t.id })
    await h.svc.skipStep(st.id, { date: D, reason: 'thought I would skip' })
    await h.tasks.completeTask(t.id) // done in Tasks on D
    const e = await h.svc.evaluateRoutine(rid, { date: D })
    expect(e.not_done.map((x) => x.step_id)).toEqual([sh.id])
    expect(e.done.map((x) => x.step_id)).toEqual([st.id])
  })
})

// ============================================================================
// S5 — progress + analytics (PLAN-S5-progress-analytics.md · Verification Gate 1–16)
// Clock pinned via Date.now (routines' clock = utcDay(Date.now())). Policies injected through a stub port.
// ============================================================================
describe('mod-routines S5 — progress + analytics', () => {
  let h: Harness
  let clock: ReturnType<typeof vi.spyOn>
  const setNow = (day: string) => clock.mockImplementation(() => Date.parse(`${day}T12:00:00Z`))
  const policy = (p: RoutinePolicy | null): RoutinesPrefsPort => ({ policyFor: async () => p })
  const AON = (window?: number): RoutinePolicy => ({
    completion: { kind: 'all_or_nothing' },
    ...(window === undefined ? {} : { miss: { acceptance_window_days: window } }),
  })
  afterEach(() => vi.restoreAllMocks())

  // A routine (and its steps) created on `created`, so DTSTART = created.
  async function routineOn(created: string, rule: string | null, opts: { steps?: number; prefs?: RoutinesPrefsPort } = {}) {
    h = await setup(opts.prefs ? { prefs: opts.prefs } : {})
    clock = vi.spyOn(Date, 'now')
    setNow(created)
    const rid = (await h.svc.createRoutine({ name: 'R', recurrence_rule: rule })).id
    const steps = []
    for (let i = 0; i < (opts.steps ?? 1); i++) steps.push(await h.svc.addStep(rid, { title: `S${i}` }))
    return { rid, steps }
  }
  const doneOn = async (stepId: string, days: string[]) => {
    for (const d of days) await h.svc.completeStep(stepId, { date: d })
  }

  // 1 — occurrences (ical.js expansion, probed behaviours)
  it('occurrences (minimal allowlist): DAILY, WEEKLY;BYDAY, WEEKLY inherits weekday, MONTHLY ordinal, YEARLY ordinal with BYMONTH, COUNT kept, BYMONTHDAY=-1, Feb-29 roll-over filtered', async () => {
    const scheduled = async (created: string, rule: string, today: string, from = created) => {
      const { rid } = await routineOn(created, rule)
      setNow(today)
      const a = await h.svc.getAnalytics(rid, { from, to: today })
      vi.restoreAllMocks()
      return a.completion.scheduled
    }
    expect(await scheduled('2026-10-20', 'FREQ=DAILY', '2026-10-24')).toBe(5)
    expect(await scheduled('2026-10-20', 'FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-28')).toBe(3)
    expect(await scheduled('2026-10-20', 'FREQ=WEEKLY', '2026-10-28')).toBe(2) // Tue20, Tue27
    expect(await scheduled('2026-10-20', 'FREQ=YEARLY;BYMONTH=5;BYDAY=-1MO', '2027-06-01')).toBe(1) // last Monday of May: accepted (2027-05-31)
    expect(await scheduled('2026-10-20', 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=3', '2026-11-30')).toBe(3)
    expect(await scheduled('2026-10-20', 'FREQ=MONTHLY;BYDAY=-1FR', '2026-12-31')).toBe(3) // last Friday: 10-30, 11-27, 12-25
    expect(await scheduled('2026-10-31', 'FREQ=MONTHLY;BYMONTHDAY=-1', '2026-11-30')).toBe(2) // keeps its real start 10-31
    expect(await scheduled('2026-10-20', 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29', '2027-03-05')).toBe(0) // no false 03-01
    expect(await scheduled('2026-10-20', 'FREQ=DAILY', '2026-10-24', '2026-10-22')).toBe(3) // range-bounded; future excluded
  })

  it('the day-grain RRULE allowlist (RT-11) rejects hang/throw/sub-daily shapes at write and on read of a pre-stored rule', async () => {
    const { rid } = await routineOn('2026-10-20', 'FREQ=DAILY')
    for (const bad of [
      'FREQ=DAILY;BYMONTHDAY=-1', // hangs ical.js
      'FREQ=DAILY;BYDAY=2MO', // hangs
      'FREQ=WEEKLY;BYWEEKNO=10', // hangs
      'FREQ=DAILY;BYMONTH=2;BYMONTHDAY=30', // impossible pair, hangs
      'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30', // impossible pair
      'FREQ=WEEKLY;BYMONTHDAY=-1', // ical.js throws at iterator construction
      'FREQ=DAILY;BYYEARDAY=100', // ical.js throws at iterator construction
      'FREQ=YEARLY;BYDAY=20MO', // mis-expands (ordinal YEARLY without BYMONTH)
      'FREQ=HOURLY;INTERVAL=8', // sub-daily: outside a day-grain cadence
      'FREQ=DAILY;INTERVAL=7;BYDAY=MO', // hangs from a Thursday DTSTART (weekday-dependent)
      'FREQ=DAILY;BYDAY=MO,WE', // DAILY takes no BY-parts (use WEEKLY;BYDAY)
      'FREQ=MONTHLY;INTERVAL=12;BYMONTH=2', // wrong dates
      'FREQ=MONTHLY;BYDAY=6FR', // throws at iterator construction
      'FREQ=YEARLY;BYYEARDAY=100', // outside the minimal forms
      'FREQ=MONTHLY;BYMONTHDAY=0', // RFC-forbidden 0
      'FREQ=YEARLY;BYMONTH=1;BYDAY=20MO', // ordinal out of the 1–5 in-month range
      'FREQ=MONTHLY;BYSETPOS=5;BYDAY=FR', // BYSETPOS outside the minimal forms
      'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-30', // impossible pair (negative)
    ]) {
      await expect(h.svc.createRoutine({ name: 'X', recurrence_rule: bad })).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
    }
    h.bsql.prepare('UPDATE routines SET recurrence_rule = ? WHERE id = ?').run('FREQ=DAILY;BYDAY=2MO', rid)
    await expect(h.svc.getStreak(rid)).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
  })

  // 2 — streak with a window
  it('streak with a window: done, done, missed, done, done (+ today pending) → current 2, longest 2, total 4', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(1)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-22', '2026-10-24', '2026-10-25'])
    setNow('2026-10-26')
    expect(await h.svc.getStreak(rid)).toMatchObject({ current: 2, longest: 2, total: 4, policy_source: 'user' })
  })

  // 3 — pending
  it('pending: today undone with no window; yesterday undone within a 3-day window — the streak carries over both', async () => {
    let r = await routineOn('2026-10-24', 'FREQ=DAILY', { prefs: policy(AON()) })
    await doneOn(r.steps[0].id, ['2026-10-24', '2026-10-25'])
    setNow('2026-10-26')
    expect(await h.svc.getStreak(r.rid)).toMatchObject({ current: 2, policy_source: 'user' })
    vi.restoreAllMocks()
    r = await routineOn('2026-10-23', 'FREQ=DAILY', { prefs: policy(AON(3)) })
    await doneOn(r.steps[0].id, ['2026-10-23', '2026-10-24'])
    setNow('2026-10-26')
    const a = await h.svc.getAnalytics(r.rid, { from: '2026-10-23', to: '2026-10-26' })
    expect(a.completion).toMatchObject({ done: 2, pending: 2, missed: 0 })
    expect((await h.svc.getStreak(r.rid)).current).toBe(2)
  })

  // 4 — neutral + lifecycle via the acceptance-window procedure (A3)
  it('neutral: planned skip skipped; paused → today/in-window undone neutral, but a real (beyond-window) miss stays missed', async () => {
    const { rid, steps } = await routineOn('2026-10-20', 'FREQ=DAILY', { prefs: policy(AON(2)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-25'])
    // 10-20 undone (beyond window by 10-26 → a REAL miss); 10-24 undone (24+2 = 26 ≥ today → in window); 10-26 today undone
    await h.svc.setLifecycle(rid, 'paused')
    setNow('2026-10-26')
    const a = await h.svc.getAnalytics(rid, { from: '2026-10-20', to: '2026-10-26' })
    expect(a.completion).toMatchObject({ done: 4, missed: 1, neutral: 2 })
    expect((await h.svc.getStreak(rid)).current).toBe(4) // 25, (24 neutral), 23, 22, 21 → then the real miss on 20 breaks
    // planned skip = neutral (applicable 0)
    await h.svc.setLifecycle(rid, 'active')
    await h.svc.planSkipDates(steps[0].id, ['2026-10-24'])
    expect((await h.svc.getAnalytics(rid, { from: '2026-10-24', to: '2026-10-24' })).completion.neutral).toBe(1)
  })

  // 5 — unjudged
  it('unjudged: no window and a past undone day stops the walk and flags; longest ends the run at it', async () => {
    const { rid, steps } = await routineOn('2026-10-22', 'FREQ=DAILY', { prefs: policy(AON()) })
    await doneOn(steps[0].id, ['2026-10-22', '2026-10-23', '2026-10-25'])
    setNow('2026-10-26')
    expect(await h.svc.getStreak(rid)).toMatchObject({ current: 1, longest: 2, total: 3, policy_source: 'undefined' })
  })

  // 6 — policy_source meaning
  it("policy_source: no policy + every day done → 'undefined'; a user policy with all days judged → 'user'", async () => {
    let r = await routineOn('2026-10-24', 'FREQ=DAILY')
    await doneOn(r.steps[0].id, ['2026-10-24', '2026-10-25'])
    setNow('2026-10-25')
    expect((await h.svc.getStreak(r.rid)).policy_source).toBe('undefined')
    vi.restoreAllMocks()
    r = await routineOn('2026-10-24', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    await doneOn(r.steps[0].id, ['2026-10-24', '2026-10-25'])
    setNow('2026-10-25')
    expect((await h.svc.getStreak(r.rid)).policy_source).toBe('user')
  })

  // 7 — unscheduled
  it('unscheduled: no recurrence_rule → {0,0,0}, unscheduled, rate null', async () => {
    const { rid } = await routineOn('2026-10-20', null, { prefs: policy(AON(1)) })
    setNow('2026-10-26')
    expect(await h.svc.getStreak(rid)).toMatchObject({ current: 0, longest: 0, total: 0, unscheduled: true })
    const a = await h.svc.getAnalytics(rid, { from: '2026-10-20', to: '2026-10-26' })
    expect(a).toMatchObject({ unscheduled: true })
    expect(a.completion.rate).toBeNull()
  })

  // 8 — rate
  it('rate = done / (done + missed): 3 done, 1 missed, 1 pending → 0.75; nothing judged → null', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(1)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-23', '2026-10-24'])
    setNow('2026-10-25')
    const c = (await h.svc.getAnalytics(rid, { from: '2026-10-21', to: '2026-10-25' })).completion
    expect(c).toMatchObject({ scheduled: 5, done: 3, missed: 1, pending: 1, rate: 0.75 })
    expect((await h.svc.getAnalytics(rid, { from: '2026-10-25', to: '2026-10-25' })).completion.rate).toBeNull()
  })

  // 9 — ranking over judged days
  it('ranking: steps by rate over judged days (A 4/4, C 2/3, B 2/4) → A, C, B', async () => {
    const { rid, steps } = await routineOn('2026-10-22', 'FREQ=DAILY', { steps: 3, prefs: policy(AON(0)) })
    const [A, B, C] = steps
    await doneOn(A.id, ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
    await doneOn(B.id, ['2026-10-22', '2026-10-23'])
    await h.svc.planSkipDates(C.id, ['2026-10-25'])
    await doneOn(C.id, ['2026-10-22', '2026-10-23'])
    setNow('2026-10-26') // today pending → excluded from judged days
    const r = (await h.svc.getAnalytics(rid, { from: '2026-10-22', to: '2026-10-26' })).ranking
    expect(r.map((x) => x.step_id)).toEqual([A.id, C.id, B.id])
    expect(r.map((x) => [x.done, x.applicable])).toEqual([[4, 4], [2, 3], [2, 4]])
  })

  // 10 — time-period comparison
  it('comparison: the preceding equal range; a previous range before DTSTART → null side, null delta', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-23', '2026-10-24'])
    setNow('2026-10-26')
    const a = await h.svc.getAnalytics(rid, { from: '2026-10-23', to: '2026-10-24' })
    expect(a.comparison.previous).toEqual({ from: '2026-10-21', to: '2026-10-22' })
    expect(a.comparison.completion.rate).toBe(0.5)
    expect(a.comparison.rate_delta).toBe(0.5) // 1.0 − 0.5
    const b = await h.svc.getAnalytics(rid, { from: '2026-10-21', to: '2026-10-22' })
    expect(b.comparison.completion.rate).toBeNull()
    expect(b.comparison.rate_delta).toBeNull()
  })

  // 11 — progress
  it('progress(): the stored 0–100 override wins (40 → 0.4); null → the all-time rate; unscheduled → null', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-22', '2026-10-23'])
    setNow('2026-10-25') // 21–23 done, 24 missed, 25 today pending → 0.75
    expect(await h.svc.progress(rid)).toBe(0.75)
    await h.svc.updateRoutine(rid, { progress: 40 })
    expect(await h.svc.progress(rid)).toBe(0.4)
    await h.svc.updateRoutine(rid, { progress: null, recurrence_rule: null })
    expect(await h.svc.progress(rid)).toBeNull()
  })

  // 12 — re-derive
  it('re-derive: deleting a past completion changes streak, rate and progress (no cache)', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    await doneOn(steps[0].id, ['2026-10-21', '2026-10-22', '2026-10-23'])
    setNow('2026-10-24')
    expect((await h.svc.getStreak(rid)).current).toBe(3)
    await h.svc.deleteCompletion(steps[0].id, '2026-10-22')
    expect((await h.svc.getStreak(rid)).current).toBe(1)
    expect(await h.svc.progress(rid)).toBeCloseTo(2 / 3)
  })

  // 13 — inherited S4 limit
  it('inherited limit (obligation steps only, S5c): a completed obligation counts done on later days until reopened', async () => {
    h = await setup({ prefs: policy(AON(0)) })
    clock = vi.spyOn(Date, 'now')
    setNow('2026-10-21')
    const rid = (await h.svc.createRoutine({ name: 'R', recurrence_rule: 'FREQ=DAILY' })).id
    const t = await h.tasks.createTask({ title: 'Once', kind: 'obligation', due_date: '2026-10-21' })
    await h.svc.addStep(rid, { title: 'Once', entity_type: 'task', entity_id: t.id })
    await h.tasks.completeTask(t.id)
    setNow('2026-10-24')
    expect((await h.svc.getStreak(rid)).current).toBe(4) // 21, 22, 23 and today 24 all reflect the completed task (documented limit)
  })

  // 14 — window validation; a window-only policy works
  it('a malformed acceptance window → InvalidRoutinePolicyError; a policy with only a window works', async () => {
    for (const bad of [Number.NaN, -1, 1.5]) {
      const { rid } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(bad)) })
      setNow('2026-10-25')
      await expect(h.svc.getStreak(rid)).rejects.toBeInstanceOf(InvalidRoutinePolicyError)
      vi.restoreAllMocks()
    }
    const { rid, steps } = await routineOn('2026-10-24', 'FREQ=DAILY', { prefs: policy(AON(1)) })
    await doneOn(steps[0].id, ['2026-10-24'])
    setNow('2026-10-25')
    expect((await h.svc.getStreak(rid)).current).toBe(1)
  })

  // 15 — bounded queries
  it('bounded: a 30-day and a 60-day streak issue the same number of db.select calls', async () => {
    const count = async (days: number) => {
      const created = '2026-08-01'
      const { rid, steps } = await routineOn(created, 'FREQ=DAILY', { steps: 3, prefs: policy(AON(0)) })
      await doneOn(steps[0].id, [created])
      const today = new Date(Date.parse(`${created}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
      setNow(today)
      const spy = vi.spyOn(h.db, 'select')
      await h.svc.getStreak(rid)
      const n = spy.mock.calls.length
      vi.restoreAllMocks()
      return n
    }
    expect(await count(30)).toBe(await count(60))
  })

  // 16 — errors / read-only
  it('errors + read-only: archived → RoutineNotFoundError; a bad range → ZodError; sync_queue unchanged', async () => {
    const { rid, steps } = await routineOn('2026-10-21', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    await doneOn(steps[0].id, ['2026-10-21'])
    setNow('2026-10-24')
    const before = (await h.db.select().from(syncQueue).all()).length
    await h.svc.getStreak(rid)
    await h.svc.getAnalytics(rid, { from: '2026-10-21', to: '2026-10-24' })
    await h.svc.progress(rid)
    expect((await h.db.select().from(syncQueue).all()).length).toBe(before)
    await expect(h.svc.getAnalytics(rid, { from: '2026-10-24', to: '2026-10-21' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.getAnalytics(rid, { from: '2026-1-1', to: '2026-10-21' })).rejects.toBeInstanceOf(ZodError)
    await h.svc.archiveRoutine(rid)
    await expect(h.svc.getStreak(rid)).rejects.toBeInstanceOf(RoutineNotFoundError)
  })

  it('day arithmetic keeps years 0–99 literal (comparison range of a year-0050 range)', async () => {
    const { rid } = await routineOn('2026-10-20', 'FREQ=DAILY', { prefs: policy(AON(0)) })
    setNow('2026-10-22')
    const a = await h.svc.getAnalytics(rid, { from: '0050-01-01', to: '0050-01-10' })
    expect(a.comparison.previous).toEqual({ from: '0049-12-22', to: '0049-12-31' })
  })

  it('a paused routine: a day S4 cannot judge (partial + undefined) inside the window is neutral, not unjudged', async () => {
    const pol: RoutinePolicy = { completion: { kind: 'required_node' }, miss: { acceptance_window_days: 7 } }
    const { rid, steps } = await routineOn('2026-10-20', 'FREQ=DAILY', { steps: 2, prefs: policy(pol) })
    await doneOn(steps[0].id, ['2026-10-25']) // no required steps ⇒ S4 'undefined'; 1 of 2 done ⇒ partial
    await h.svc.setLifecycle(rid, 'paused')
    setNow('2026-10-26')
    const a = await h.svc.getAnalytics(rid, { from: '2026-10-25', to: '2026-10-25' })
    expect(a.completion).toMatchObject({ neutral: 1, unjudged: 0 })
  })
})

// ============================================================================
// S5c — Q1/RT-4/D3 correction (PLAN-S5c-q1-d3-correction.md · Verification Gate)
// ============================================================================
describe('mod-routines S5c — every step drives an entity; occurrences are sessions', () => {
  const DAY = '2026-10-21'
  let h: Harness
  let routineId: string
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })
  afterEach(() => vi.restoreAllMocks())

  it("check-off add: step_type 'task' with no entity creates + links a Task; linking an existing task shares it across routines", async () => {
    const a = await h.svc.addStep(routineId, { title: 'Pay rent', step_type: 'task' })
    expect(a.entity_type).toBe('task')
    const shared = await h.tasks.createTask({ title: 'Shared chore' })
    const r2 = (await h.svc.createRoutine({ name: 'Evening' })).id
    const s1 = await h.svc.addStep(routineId, { title: 'Chore', entity_type: 'task', entity_id: shared.id })
    const s2 = await h.svc.addStep(r2, { title: 'Chore', entity_type: 'task', entity_id: shared.id })
    expect([s1.entity_id, s2.entity_id]).toEqual([shared.id, shared.id])
    const n = (h.bsql.prepare("SELECT count(*) AS n FROM tasks WHERE title = 'Chore'").get() as { n: number }).n
    expect(n).toBe(0) // no duplicate Task minted for a linked step
  })

  it('adopts a timer the user started in Tasks as the occurrence (no TimerAlreadyRunningError)', async () => {
    const t = await h.tasks.createTask({ title: 'Write' })
    const s = await h.svc.addStep(routineId, { title: 'Write', entity_type: 'task', entity_id: t.id })
    const userTimer = await h.tasks.startTimer(t.id)
    const run = await h.svc.runStep(s.id, { date: DAY })
    expect(run.session_id).toBe(userTimer.id)
    expect((await h.sessions.resolveTargets(userTimer.id)).map((x) => x.entityType)).toContain('routine_step')
  })

  it('two days → two occurrence sessions + two ledger rows; the Task is untouched', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch' })
    await h.svc.completeStep(s.id, { date: '2026-10-20' })
    await h.svc.completeStep(s.id, { date: '2026-10-21' })
    expect((await h.svc.listCompletions(s.id)).length).toBe(2)
    expect((h.bsql.prepare("SELECT count(*) AS n FROM sessions WHERE sub_type = 'work' AND status = 'completed'").get() as { n: number }).n).toBe(2)
    expect((await h.tasks.getTask(s.entity_id as string))?.status).not.toBe('completed')
  })

  it('tasks timer not wired → EntityUnavailableError (run and bare check)', async () => {
    h = await setup({ tasksTimer: false })
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const s = await h.svc.addStep(rid, { title: 'Stretch' })
    await expect(h.svc.runStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
  })

  const reviewDef = (transitions: SessionTypeDef['lifecycle']['transitions']): SessionTypeDef => ({
    sub_type: 'review',
    owner_module: 'flashcards',
    attachment_defaults: {},
    effects: [],
    lifecycle: { transitions, hooks: {} },
    permissions: { allowed_effects: [] },
    default_purpose: 'review',
  })

  it("a registered session sub-type ('review') completes under BOTH registration orders (lifecycle-aware)", async () => {
    for (const transitions of [
      [{ from: 'scheduled', to: 'completed', event: 'complete' }], // the purposes def
      [
        { from: 'scheduled', to: 'in_progress', event: 'start' },
        { from: 'in_progress', to: 'completed', event: 'complete' },
      ], // the flashcards def
    ] satisfies SessionTypeDef['lifecycle']['transitions'][]) {
      h = await setup()
      await h.sessionRegistry.register(reviewDef(transitions))
      const rid = (await h.svc.createRoutine({ name: 'R' })).id
      const s = await h.svc.addStep(rid, { title: 'Review', step_type: 'review' })
      const done = await h.svc.completeStep(s.id, { date: DAY })
      expect(done).toMatchObject({ target: 'session', status: 'done' })
      expect((await h.sessions.getSession(done.session_id as string))?.session.status).toBe('completed')
    }
  })

  it("a session step's about-entity is attached alongside the routine_step", async () => {
    await h.sessionRegistry.register(reviewDef([{ from: 'scheduled', to: 'completed', event: 'complete' }]))
    const t = await h.tasks.createTask({ title: 'Topic' })
    const s = await h.svc.addStep(routineId, { title: 'Review topic', step_type: 'review', entity_type: 'task', entity_id: t.id })
    const done = await h.svc.completeStep(s.id, { date: DAY })
    const types = (await h.sessions.resolveTargets(done.session_id as string)).map((x) => x.entityType).sort()
    expect(types).toEqual(['routine_step', 'task'])
  })

  const count = (sql: string): number => (h.bsql.prepare(sql).get() as { n: number }).n

  it('g2 B1 — one occurrence per day: re-completing / re-running a done day creates no second session', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch' })
    await h.svc.completeStep(s.id, { date: DAY })
    const again = await h.svc.completeStep(s.id, { date: DAY })
    const rerun = await h.svc.runStep(s.id, { date: DAY })
    expect(again.status).toBe('done')
    expect(rerun).toMatchObject({ status: 'done', target: 'task' })
    expect(count("SELECT count(*) AS n FROM sessions WHERE sub_type = 'work'")).toBe(1)
    await h.sessionRegistry.register(reviewDef([{ from: 'scheduled', to: 'completed', event: 'complete' }]))
    const r = await h.svc.addStep(routineId, { title: 'Review', step_type: 'review' })
    await h.svc.completeStep(r.id, { date: DAY })
    await h.svc.completeStep(r.id, { date: DAY })
    await h.svc.runStep(r.id, { date: DAY })
    expect(count("SELECT count(*) AS n FROM sessions WHERE sub_type = 'review'")).toBe(1)
  })

  it('runStep on a session step: running-capable → in_progress, then completeStep completes THAT session; not running-capable → run = complete', async () => {
    await h.sessionRegistry.register(
      reviewDef([
        { from: 'scheduled', to: 'in_progress', event: 'start' },
        { from: 'in_progress', to: 'completed', event: 'complete' },
      ]),
    )
    const s = await h.svc.addStep(routineId, { title: 'Review', step_type: 'review' })
    const run = await h.svc.runStep(s.id, { date: DAY })
    expect(run).toMatchObject({ target: 'session', status: 'in_progress' })
    expect((await h.svc.runStep(s.id, { date: DAY })).session_id).toBe(run.session_id) // re-entry returns the same occurrence
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done).toMatchObject({ status: 'done', session_id: run.session_id })
    expect((await h.sessions.getSession(run.session_id as string))?.session.status).toBe('completed')

    h = await setup()
    await h.sessionRegistry.register(reviewDef([{ from: 'scheduled', to: 'completed', event: 'complete' }]))
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const s2 = await h.svc.addStep(rid, { title: 'Review', step_type: 'review' })
    const run2 = await h.svc.runStep(s2.id, { date: DAY })
    expect(run2.status).toBe('done')
    expect((await h.svc.listCompletions(s2.id)).length).toBe(1)
  })

  it('completeStep stops a timer the user started in Tasks: attached to the step before the stop, time logged (pin 10)', async () => {
    const t = await h.tasks.createTask({ title: 'Write' })
    const s = await h.svc.addStep(routineId, { title: 'Write', entity_type: 'task', entity_id: t.id })
    const userTimer = await h.tasks.startTimer(t.id)
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done.session_id).toBe(userTimer.id)
    expect((await h.sessions.getSession(userTimer.id))?.session.status).toBe('completed')
    expect((await h.sessions.resolveTargets(userTimer.id)).map((x) => x.entityType)).toContain('routine_step')
    expect(count(`SELECT count(*) AS n FROM task_time_logs WHERE task_id = '${t.id}'`)).toBe(1)
  })

  it('an obligation step with a rule completes the task and TK-7 regenerates the next occurrence', async () => {
    const t = await h.tasks.createTask({ title: 'Rent', kind: 'obligation', due_date: DAY, recurrence_rule: 'FREQ=MONTHLY' })
    const s = await h.svc.addStep(routineId, { title: 'Rent', entity_type: 'task', entity_id: t.id })
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done.flag).toBeUndefined()
    expect((await h.tasks.getTask(t.id))?.status).toBe('completed')
    expect(count("SELECT count(*) AS n FROM tasks WHERE title = 'Rent' AND deleted_at IS NULL")).toBe(2)
  })

  it('a half ref (entity_type without entity_id) is not a check-off: no Task minted, drive → EntityUnavailableError', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Half', entity_type: 'task' })
    expect(s.entity_id).toBeNull()
    await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(count("SELECT count(*) AS n FROM tasks WHERE title = 'Half'")).toBe(0)
  })

  it('a failed link after the routine created the occurrence drops that session (no open/orphan work session)', async () => {
    const base = createTaggableTypeRegistry()
    const denyStep: TaggableTypeRegistry = { ...base, isRegistered: (t) => t !== 'routine_step' && base.isRegistered(t) }
    h = await setup({ sessionsEntityRegistry: denyStep })
    const rid = (await h.svc.createRoutine({ name: 'R' })).id
    const s = await h.svc.addStep(rid, { title: 'Stretch' })
    await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(UnknownEntityType)
    expect(count('SELECT count(*) AS n FROM sessions WHERE deleted_at IS NULL')).toBe(0)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    await expect(h.tasks.startTimer(s.entity_id as string)).resolves.toBeTruthy() // nothing left blocking the user's timer
  })

  it("an unregistered sub-type ('workout', 'exercise') → EntityUnavailableError; routines registers nothing and creates no session", async () => {
    for (const st of ['workout', 'exercise', 'not_a_type']) {
      const s = await h.svc.addStep(routineId, { title: st, step_type: st })
      await expect(h.svc.completeStep(s.id, { date: DAY })).rejects.toBeInstanceOf(EntityUnavailableError)
    }
    await expect(h.sessionRegistry.get('workout')).rejects.toBeTruthy()
    expect((h.bsql.prepare('SELECT count(*) AS n FROM sessions').get() as { n: number }).n).toBe(0)
  })

  it("'exercise' maps to the registered 'workout' sub-type (intake §D:94-98)", async () => {
    await h.sessionRegistry.register({ ...reviewDef([{ from: 'scheduled', to: 'completed', event: 'complete' }]), sub_type: 'workout', default_purpose: undefined })
    const s = await h.svc.addStep(routineId, { title: 'Run', step_type: 'exercise' })
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done.target).toBe('session')
    expect((await h.sessions.getSession(done.session_id as string))?.session.sub_type).toBe('workout')
  })

  it('an unregistered step_type with a task ref falls through to the task (approved row 2)', async () => {
    const t = await h.tasks.createTask({ title: 'Lift' })
    const s = await h.svc.addStep(routineId, { title: 'Lift', step_type: 'workout', entity_type: 'task', entity_id: t.id })
    expect((await h.svc.completeStep(s.id, { date: DAY })).target).toBe('task')
  })

  it('a legacy null-entity step row gets its Task created + linked on first drive', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Legacy' })
    h.bsql.prepare('UPDATE routine_step SET entity_type = NULL, entity_id = NULL WHERE id = ?').run(s.id)
    const done = await h.svc.completeStep(s.id, { date: DAY })
    expect(done.target).toBe('task')
    const row = (await h.svc.listSteps(routineId)).find((x) => x.id === s.id)
    expect(row?.entity_type).toBe('task')
    expect(await h.tasks.getTask(row?.entity_id as string)).toBeTruthy()
  })
})

// ============================================================================
// S6 — reschedule as an SS-8 intent block + the acceptance-window write guard (PLAN-S6 v3 · Verification Gate)
// ============================================================================
describe('mod-routines S6 — reschedule (SS-8 block) + acceptance-window guard', () => {
  let h: Harness
  let clock: ReturnType<typeof vi.spyOn>
  const at = (day: string, hhmm = '12:00') => Date.parse(`${day}T${hhmm}:00Z`)
  const setNow = (day: string, hhmm = '12:00') => clock.mockImplementation(() => at(day, hhmm))
  const prefsOf = (p: RoutinePolicy | null): RoutinesPrefsPort => ({ policyFor: async () => p })
  const win = (w: number): RoutinesPrefsPort => prefsOf({ completion: { kind: 'all_or_nothing' }, miss: { acceptance_window_days: w } })
  const TODAY = '2026-10-26' // a Monday
  afterEach(() => vi.restoreAllMocks())

  // A routine created on 10-20 (steps added then); the caller moves the clock to `today` after adding steps.
  async function world(opts: { prefs?: RoutinesPrefsPort; rule?: string; withHabits?: boolean; tasksTimer?: boolean } = {}) {
    h = await setup({
      ...(opts.prefs ? { prefs: opts.prefs } : {}),
      ...(opts.withHabits === false ? { withHabits: false } : {}),
      ...(opts.tasksTimer === false ? { tasksTimer: false } : {}),
    })
    clock = vi.spyOn(Date, 'now')
    setNow('2026-10-20')
    return (await h.svc.createRoutine({ name: 'R', recurrence_rule: opts.rule ?? 'FREQ=DAILY' })).id
  }
  const count = (sql: string): number => (h.bsql.prepare(sql).get() as { n: number }).n
  const blocksOf = (stepId: string) => h.sessions.listPlannedBlocksForTarget('routine_step', stepId)
  const slot = (day = TODAY, from = '15:00', to = '15:30') => ({ start: at(day, from), end: at(day, to) })
  const dueAll = () => h.sessions.dueIn({ start: 0, end: at('2030-01-01') })
  const reviewDef = (transitions: SessionTypeDef['lifecycle']['transitions']): SessionTypeDef => ({
    sub_type: 'review',
    owner_module: 'flashcards',
    attachment_defaults: {},
    effects: [],
    lifecycle: { transitions, hooks: {} },
    permissions: { allowed_effects: [] },
    default_purpose: 'review',
  })

  // 1 — the guard on make-good writes
  it('guard: a make-good beyond the window is rejected with no row, no session, no timer; the boundary day and today pass', async () => {
    const rid = await world({ prefs: win(2) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    setNow(TODAY)
    await expect(h.svc.completeStep(s.id, { date: '2026-10-23' })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    await expect(h.svc.runStep(s.id, { date: '2026-10-23' })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    expect(count("SELECT count(*) AS n FROM sessions WHERE sub_type = 'work'")).toBe(0)
    expect((await h.svc.completeStep(s.id, { date: '2026-10-24' })).status).toBe('done') // boundary: addDays(24, 2) = 26
    expect((await h.svc.completeStep(s.id, { date: TODAY })).status).toBe('done')
  })

  // 2 — the guard on skip writes; delete + non-skip edits are free (RT-14/G7)
  it('guard: logged skip, planSkipDates (whole), editCompletion{skipped} rejected beyond; other edits and delete pass', async () => {
    const rid = await world({ prefs: win(2) })
    const s = await h.svc.addStep(rid, { title: 'Stretch' })
    setNow('2026-10-22')
    await h.svc.completeStep(s.id, { date: '2026-10-21' }) // written while still in-window
    setNow(TODAY)
    await expect(h.svc.skipStep(s.id, { date: '2026-10-22' })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    await expect(h.svc.planSkipDates(s.id, ['2026-10-20', '2026-10-30'])).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    expect((await h.svc.listSteps(rid))[0]?.skip_dates ?? null).toBeNull()
    await expect(h.svc.editCompletion(s.id, '2026-10-21', { skipped: true })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    expect((await h.svc.editCompletion(s.id, '2026-10-21', { actual_duration_minutes: 5 })).actual_duration_minutes).toBe(5)
    await expect(h.svc.deleteCompletion(s.id, '2026-10-21')).resolves.toBeUndefined()
  })

  // 3 — no window ⇒ no guard; a malformed window only blocks past writes
  it('no window ⇒ no guard; a malformed window → InvalidRoutinePolicyError on a past write, a today write succeeds', async () => {
    let rid = await world({ prefs: prefsOf({ completion: { kind: 'all_or_nothing' } }) })
    let s = await h.svc.addStep(rid, { title: 'A' })
    setNow(TODAY)
    expect((await h.svc.completeStep(s.id, { date: '2026-10-21' })).status).toBe('done')
    rid = await world({ prefs: prefsOf({ completion: { kind: 'all_or_nothing' }, miss: { acceptance_window_days: -1 } }) })
    s = await h.svc.addStep(rid, { title: 'B' })
    setNow(TODAY)
    await expect(h.svc.completeStep(s.id, { date: '2026-10-25' })).rejects.toBeInstanceOf(InvalidRoutinePolicyError)
    expect((await h.svc.completeStep(s.id, { date: TODAY })).status).toBe('done')
  })

  // 4 — reschedule writes only the SS-8 intent block
  it('reschedule a task step: one planned block (routine_step, routines:D, work) in the slot; no session, no row; due in the slot', async () => {
    const rid = await world({ prefs: win(2) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    setNow(TODAY)
    const r = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    expect(r).toMatchObject({ step_id: s.id, date: '2026-10-25', target: 'task', status: 'scheduled', completion: null })
    const [b, ...rest] = await blocksOf(s.id)
    expect(rest).toEqual([])
    expect(b).toMatchObject({
      id: r.planned_block_id,
      scheduled_start: slot().start,
      scheduled_end: slot().end,
      sub_type: 'work',
      target_type: 'routine_step',
      target_id: s.id,
      source: 'routines:2026-10-25',
      status: 'planned',
    })
    expect(count('SELECT count(*) AS n FROM sessions')).toBe(0)
    expect(await h.svc.listCompletions(s.id)).toEqual([])
    expect((await dueAll()).map((d) => d.ref_id)).toEqual([b?.id])
  })

  // 5 — the make-good creates the session carrying planned_block_id and fulfils the block
  it('make-good: completeStep(D) → one completed work session linked to the block, block fulfilled, D done, not due; runStep links only', async () => {
    const rid = await world({ prefs: win(2) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    setNow(TODAY)
    const r = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    const done = await h.svc.completeStep(s.id, { date: '2026-10-25' })
    expect(done).toMatchObject({ status: 'done', date: '2026-10-25' })
    const sess = await h.sessions.getSession(done.session_id as string)
    expect(sess?.session).toMatchObject({ sub_type: 'work', status: 'completed', planned_block_id: r.planned_block_id, scheduling_mode: 'planned' })
    expect(count("SELECT count(*) AS n FROM sessions WHERE sub_type = 'work'")).toBe(1)
    expect((await blocksOf(s.id))[0]?.status).toBe('fulfilled')
    expect((await h.svc.evaluateRoutine(rid, { date: '2026-10-25' })).status).toBe('done')
    expect(await dueAll()).toEqual([])

    const r2 = await h.svc.rescheduleStep(s.id, { date: '2026-10-24', slot: slot() })
    const run = await h.svc.runStep(s.id, { date: '2026-10-24' })
    expect(run.status).toBe('in_progress')
    expect((await h.sessions.getSession(run.session_id as string))?.session.planned_block_id).toBe(r2.planned_block_id)
    expect((await blocksOf(s.id)).find((b) => b.id === r2.planned_block_id)?.status).toBe('planned')
  })

  // 6 — one pending block per (step, D)
  it('re-reschedule moves the slot of the same block; a concurrent double-tap writes one block', async () => {
    const rid = await world({ prefs: win(2) })
    const s = await h.svc.addStep(rid, { title: 'Stretch' })
    setNow(TODAY)
    const a = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    const b = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot(TODAY, '18:00', '18:30') })
    expect(b.planned_block_id).toBe(a.planned_block_id)
    expect((await blocksOf(s.id)).map((x) => x.scheduled_start)).toEqual([at(TODAY, '18:00')])
    await Promise.all([
      h.svc.rescheduleStep(s.id, { date: '2026-10-24', slot: slot() }),
      h.svc.rescheduleStep(s.id, { date: '2026-10-24', slot: slot() }),
    ])
    expect((await blocksOf(s.id)).filter((x) => x.source === 'routines:2026-10-24').length).toBe(1)
  })

  // 6b — R5b: a session linked to D's block belongs to D
  it('R5b: runStep(D) then completeStep(today) completes D (block fulfilled), today untouched; two pending Ds stay separate', async () => {
    const rid = await world({ prefs: win(2) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    setNow(TODAY)
    const b25 = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    const b24 = await h.svc.rescheduleStep(s.id, { date: '2026-10-24', slot: slot(TODAY, '17:00', '17:30') })
    await h.svc.runStep(s.id, { date: '2026-10-25' })
    const done = await h.svc.completeStep(s.id, { date: TODAY })
    expect(done.date).toBe('2026-10-25')
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual(['2026-10-25'])
    const status = async (id: string | undefined) => (await blocksOf(s.id)).find((x) => x.id === id)?.status
    expect(await status(b25.planned_block_id)).toBe('fulfilled')
    expect(await status(b24.planned_block_id)).toBe('planned')
    await h.svc.completeStep(s.id, { date: '2026-10-24' })
    expect(await status(b24.planned_block_id)).toBe('fulfilled')
  })

  it('R5b: a running-capable review make-good run, then completed under today, stamps D', async () => {
    const rid = await world({ prefs: win(2) })
    await h.sessionRegistry.register(
      reviewDef([
        { from: 'scheduled', to: 'in_progress', event: 'start' },
        { from: 'in_progress', to: 'completed', event: 'complete' },
      ]),
    )
    const s = await h.svc.addStep(rid, { title: 'Review', step_type: 'review' })
    setNow(TODAY)
    const r = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    expect((await blocksOf(s.id))[0]?.sub_type).toBe('review')
    await h.svc.runStep(s.id, { date: '2026-10-25' })
    const done = await h.svc.completeStep(s.id, { date: TODAY })
    expect(done.date).toBe('2026-10-25')
    expect((await blocksOf(s.id)).find((x) => x.id === r.planned_block_id)?.status).toBe('fulfilled')
  })

  it('R5b: a focus make-good started on the slot day S > D stamps D and fulfils the block', async () => {
    const rid = await world({ prefs: win(2) })
    const s = await h.svc.addStep(rid, { title: 'Deep work', step_type: 'focus' })
    setNow(TODAY)
    const r = await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    expect((await blocksOf(s.id))[0]?.sub_type).toBe('focus')
    setNow(TODAY, '15:00')
    const run = await h.svc.runStep(s.id, { date: '2026-10-25' })
    expect(run.status).toBe('in_progress')
    expect((await h.sessions.getSession(run.session_id as string))?.session.planned_block_id).toBe(r.planned_block_id)
    setNow(TODAY, '15:30')
    const done = await h.svc.completeStep(s.id, { date: '2026-10-25' })
    expect(done.date).toBe('2026-10-25')
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual(['2026-10-25'])
    expect((await blocksOf(s.id))[0]?.status).toBe('fulfilled')
  })

  it('g2 B1/N1: a linked focus finished in the widget, then completed under today (already done) → D stamped, block fulfilled', async () => {
    const rid = await world({ prefs: win(2) })
    const s = await h.svc.addStep(rid, { title: 'Deep work', step_type: 'focus' })
    const b = await h.svc.addStep(rid, { title: 'Second', step_type: 'focus' })
    setNow(TODAY)
    await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    setNow(TODAY, '15:00')
    const run = await h.svc.runStep(s.id, { date: '2026-10-25' })
    await h.sessions.completeFocus(run.focus_id as string) // finished outside the routine (the focus widget)
    const done = await h.svc.completeStep(s.id) // date defaults to today
    expect(done.date).toBe('2026-10-25')
    expect((await h.svc.listCompletions(s.id)).map((c) => c.completed_date)).toEqual(['2026-10-25'])
    expect((await blocksOf(s.id))[0]?.status).toBe('fulfilled')

    setNow(TODAY, '16:00')
    await h.svc.rescheduleStep(b.id, { date: '2026-10-25', slot: slot(TODAY, '17:00', '17:30') })
    const runToday = await h.svc.runStep(b.id) // today's own occurrence first
    await h.svc.completeStep(b.id)
    expect(runToday.date).toBe(TODAY)
    await h.svc.runStep(b.id, { date: '2026-10-25' })
    const again = await h.svc.completeStep(b.id) // today is done, but D's linked focus is running → D (N1)
    expect(again.date).toBe('2026-10-25')
    expect((await h.svc.listCompletions(b.id)).map((c) => c.completed_date).sort()).toEqual(['2026-10-25', TODAY])
  })

  it("g2 N2: an unlinked running occurrence re-entered under D reports its own day and is never linked to D's block", async () => {
    const rid = await world({ prefs: win(2) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    setNow(TODAY)
    const today = await h.svc.runStep(s.id) // today's ad-hoc occurrence, unlinked
    await h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })
    const re = await h.svc.runStep(s.id, { date: '2026-10-25' })
    expect(re).toMatchObject({ session_id: today.session_id, date: TODAY })
    expect((await h.sessions.getSession(today.session_id as string))?.session.planned_block_id).toBeNull()
    expect((await blocksOf(s.id))[0]?.status).toBe('planned')
  })

  it('a make-good begun in-window (guarded runStep) completes after the window closes: stamps D (BR-RT-S6-5)', async () => {
    const rid = await world({ prefs: win(0) })
    const t = await h.tasks.createTask({ title: 'Clean' })
    const s = await h.svc.addStep(rid, { title: 'Clean', entity_type: 'task', entity_id: t.id })
    const s2 = await h.svc.addStep(rid, { title: 'Other', entity_type: 'task', entity_id: (await h.tasks.createTask({ title: 'Mop' })).id })
    const s3 = await h.svc.addStep(rid, { title: 'Third' })
    setNow(TODAY)
    await h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot(TODAY, '23:00', '23:50') })
    setNow(TODAY, '23:00')
    await h.svc.runStep(s.id, { date: TODAY })
    setNow('2026-10-27', '00:20') // the window (0 days) closed at midnight; the run began inside it
    const done = await h.svc.completeStep(s.id)
    expect(done.date).toBe(TODAY)

    // The same with the date the caller got back from runStep (D itself), plus a NEW make-good past the window, which is rejected.
    setNow(TODAY, '23:00')
    await h.svc.rescheduleStep(s2.id, { date: TODAY, slot: slot(TODAY, '23:30', '23:50') })
    const run2 = await h.svc.runStep(s2.id, { date: TODAY })
    setNow('2026-10-27', '00:20')
    const done2 = await h.svc.completeStep(s2.id, { date: run2.date })
    expect(done2.date).toBe(TODAY)
    expect((await blocksOf(s2.id))[0]?.status).toBe('fulfilled')
    await expect(h.svc.completeStep(s3.id, { date: TODAY })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError) // not begun ⇒ a new make-good
  })

  // 7 — rejections, all with no write
  it('rejections: beyond window · not a pending occurrence · bad slot · non-drivable — no block written', async () => {
    const rid = await world({ prefs: win(2) })
    const s = await h.svc.addStep(rid, { title: 'Stretch' })
    setNow(TODAY)
    await expect(h.svc.rescheduleStep(s.id, { date: '2026-10-23', slot: slot() })).rejects.toBeInstanceOf(OutsideAcceptanceWindowError)
    await h.svc.completeStep(s.id, { date: '2026-10-25' })
    await expect(h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })).rejects.toBeInstanceOf(NotMissedOccurrenceError) // done
    await h.svc.planSkipDates(s.id, ['2026-10-24'])
    await expect(h.svc.rescheduleStep(s.id, { date: '2026-10-24', slot: slot() })).rejects.toBeInstanceOf(NotMissedOccurrenceError) // planned skip
    await expect(h.svc.rescheduleStep(s.id, { date: '2026-10-27', slot: slot('2026-10-27') })).rejects.toBeInstanceOf(
      NotMissedOccurrenceError,
    ) // future
    await expect(h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot(TODAY, '09:00', '09:30') })).rejects.toBeInstanceOf(
      InvalidRescheduleSlotError,
    ) // before now
    await expect(h.svc.rescheduleStep(s.id, { date: TODAY, slot: { start: at(TODAY, '15:00'), end: at(TODAY, '15:00') } })).rejects.toBeInstanceOf(
      ZodError,
    ) // end ≤ start — a malformed input (the module's ZodError convention)
    const s2 = await h.svc.addStep(rid, { title: 'Two' }) // added today → in today's step set
    await expect(h.svc.rescheduleStep(s2.id, { date: TODAY, slot: slot('2026-10-29') })).rejects.toBeInstanceOf(
      InvalidRescheduleSlotError,
    ) // past the last make-good day (26 + 2 = 28)
    await expect(h.svc.rescheduleStep(s2.id, { date: '2026-10-25', slot: slot() })).rejects.toBeInstanceOf(NotMissedOccurrenceError) // not in D's step set
    await h.svc.setLifecycle(rid, 'paused')
    await expect(h.svc.rescheduleStep(s2.id, { date: TODAY, slot: slot() })).rejects.toBeInstanceOf(NotMissedOccurrenceError) // paused
    await h.svc.setLifecycle(rid, 'active')
    const work = await h.svc.addStep(rid, { title: 'W', step_type: 'work' })
    const half = await h.svc.addStep(rid, { title: 'H', entity_type: 'task' })
    const gym = await h.svc.addStep(rid, { title: 'G', step_type: 'workout' })
    for (const x of [work, half, gym]) {
      await expect(h.svc.rescheduleStep(x.id, { date: TODAY, slot: slot() })).rejects.toBeInstanceOf(EntityUnavailableError)
    }
    expect(count('SELECT count(*) AS n FROM planned_blocks')).toBe(0)
  })

  it('rejections: not an occurrence of the rule; no habits dep; unwired timer; an obligation gets a session-less block', async () => {
    let rid = await world({ prefs: win(2), rule: 'FREQ=WEEKLY;BYDAY=MO' })
    let s = await h.svc.addStep(rid, { title: 'Weekly' })
    setNow(TODAY)
    await expect(h.svc.rescheduleStep(s.id, { date: '2026-10-25', slot: slot() })).rejects.toBeInstanceOf(NotMissedOccurrenceError)
    rid = await world({ prefs: win(2), withHabits: false })
    s = await h.svc.addStep(rid, { title: 'Habit', entity_type: 'habit', entity_id: 'h1' })
    setNow(TODAY)
    await expect(h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot() })).rejects.toBeInstanceOf(EntityUnavailableError)
    rid = await world({ prefs: win(2), tasksTimer: false })
    s = await h.svc.addStep(rid, { title: 'Check' })
    setNow(TODAY)
    await expect(h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot() })).rejects.toBeInstanceOf(EntityUnavailableError)
    expect(count('SELECT count(*) AS n FROM planned_blocks')).toBe(0)
    rid = await world({ prefs: win(2) })
    const ob = await h.tasks.createTask({ title: 'Rent', kind: 'obligation', due_date: TODAY })
    s = await h.svc.addStep(rid, { title: 'Rent', entity_type: 'task', entity_id: ob.id })
    setNow(TODAY)
    await h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot() })
    expect((await blocksOf(s.id))[0]?.sub_type).toBeNull()
  })

  // 8 — admissibility is step-level
  it('step level: on a threshold-done day an undone step is reschedulable; with no window a past undone day is reschedulable', async () => {
    let rid = await world({ prefs: prefsOf({ completion: { kind: 'threshold', percent: 50 }, miss: { acceptance_window_days: 2 } }) })
    const a = await h.svc.addStep(rid, { title: 'A' })
    const b = await h.svc.addStep(rid, { title: 'B' })
    setNow(TODAY)
    await h.svc.completeStep(a.id, { date: '2026-10-25' })
    expect((await h.svc.evaluateRoutine(rid, { date: '2026-10-25' })).status).toBe('done')
    expect((await h.svc.rescheduleStep(b.id, { date: '2026-10-25', slot: slot() })).status).toBe('scheduled')
    rid = await world({ prefs: prefsOf({ completion: { kind: 'all_or_nothing' } }) })
    const c = await h.svc.addStep(rid, { title: 'C' })
    setNow(TODAY)
    expect((await h.svc.rescheduleStep(c.id, { date: '2026-10-21', slot: slot('2026-11-30') })).status).toBe('scheduled')
  })

  // 9 — targets
  it('targets: habit → a session-less block, advanced does not fulfil, done does', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }) // habits reads `new Date()`, which a Date.now spy doesn't pin
    try {
      vi.setSystemTime(at('2026-10-20'))
      h = await setup({ prefs: win(2) })
      const rid = (await h.svc.createRoutine({ name: 'R', recurrence_rule: 'FREQ=DAILY' })).id
      const hab = await h.habits.createHabit({ name: 'Pushups', frequency: 'daily', target_count: 2 })
      const s = await h.svc.addStep(rid, { title: 'Pushups', entity_type: 'habit', entity_id: hab.id })
      vi.setSystemTime(at(TODAY))
      await h.svc.rescheduleStep(s.id, { date: TODAY, slot: slot() })
      expect((await blocksOf(s.id))[0]?.sub_type).toBeNull()
      expect((await h.svc.completeStep(s.id, { date: TODAY })).status).toBe('advanced')
      expect((await blocksOf(s.id))[0]?.status).toBe('planned')
      await h.habits.logCompletion(hab.id, { date: TODAY, count: 2 }) // the habit reaches its target natively (the target-3 test)
      expect((await h.svc.completeStep(s.id, { date: TODAY })).status).toBe('done')
      expect((await blocksOf(s.id))[0]?.status).toBe('fulfilled')
    } finally {
      vi.useRealTimers()
    }
  })

  it('targets: a legacy check-off is linked first; a registered review make-good completes and fulfils', async () => {
    const rid = await world({ prefs: win(2) })
    const legacy = await h.svc.addStep(rid, { title: 'Legacy' })
    h.bsql.prepare('UPDATE routine_step SET entity_type = NULL, entity_id = NULL WHERE id = ?').run(legacy.id)
    await h.sessionRegistry.register(reviewDef([{ from: 'scheduled', to: 'completed', event: 'complete' }]))
    const rev = await h.svc.addStep(rid, { title: 'Review', step_type: 'review' })
    setNow(TODAY)
    const lr = await h.svc.rescheduleStep(legacy.id, { date: TODAY, slot: slot() })
    expect(lr.target).toBe('task')
    expect((await h.svc.listSteps(rid)).find((x) => x.id === legacy.id)?.entity_type).toBe('task')
    expect((await blocksOf(legacy.id))[0]?.sub_type).toBe('work')

    await h.svc.rescheduleStep(rev.id, { date: '2026-10-25', slot: slot() })
    const d = await h.svc.completeStep(rev.id, { date: '2026-10-25' })
    expect((await h.sessions.getSession(d.session_id as string))?.session.status).toBe('completed')
    expect((await blocksOf(rev.id))[0]?.status).toBe('fulfilled')
  })

  // 10 — a skip cancels the pending block
  it('skip cancels: logged skip, editCompletion{skipped:true}, planSkipDates([D]) → block skipped and not due', async () => {
    const rid = await world({ prefs: win(2) })
    const a = await h.svc.addStep(rid, { title: 'A' })
    const b = await h.svc.addStep(rid, { title: 'B' })
    const c = await h.svc.addStep(rid, { title: 'C' })
    setNow(TODAY)
    await h.svc.rescheduleStep(a.id, { date: '2026-10-25', slot: slot() })
    await h.svc.skipStep(a.id, { date: '2026-10-25', reason: 'sick' })
    expect((await blocksOf(a.id))[0]?.status).toBe('skipped')

    await h.svc.skipStep(b.id, { date: '2026-10-25' }) // a logged skip is still reschedulable (a make-good flips it, BR-RT-S3-2)
    await h.svc.rescheduleStep(b.id, { date: '2026-10-25', slot: slot() })
    await h.svc.editCompletion(b.id, '2026-10-25', { skipped: true, skip_reason: 'still sick' })
    expect((await blocksOf(b.id))[0]?.status).toBe('skipped')

    await h.svc.rescheduleStep(c.id, { date: TODAY, slot: slot() })
    await h.svc.planSkipDates(c.id, [TODAY])
    expect((await blocksOf(c.id))[0]?.status).toBe('skipped')
    expect(await dueAll()).toEqual([])
  })
})
