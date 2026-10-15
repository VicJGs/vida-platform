// ============================================================================
// mod-tasks #65 ① · S1 — Tasks CRUD + ≤1-parent guard + app-layer cascade (TAS-01..04,33,34)
//
// Node / better-sqlite3 live-store harness (mirrors projects/learning-education): REAL store, UNLOCKED vault
// (the sync-hash path runs even with empty [E]), migrate() applies 015_tasks so `tasks`/`task_time_logs` exist.
// Exercises the encrypt/persist + create-echoes-input backfill + soft-delete + app-layer cascade seams a mock bypasses.
// Maps 1:1 to slice-map S1 + seam-contract (tasks CRUD + queries).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { taskTimeLogs } from '../../../db/schema/tasks'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import {
  createEffectRegistry,
  createEffectRail,
  type EffectRegistry,
  type EffectHandler,
  NoEffectHandler,
} from '../../../foundation/effects'
import { createSessionRegistry } from '../../../foundation/sessions/registry'
import { createTaggableTypeRegistry } from '../../../foundation/spaces'
import { createSessionsService, type SessionsService } from '../../sessions'
import { createTasksService, registerTasksTimer, WORK_SESSION_TYPE } from '../service'
import {
  type TasksService,
  TaskNotFoundError,
  MultipleParentError,
  SubtaskNestingError,
  TimerAlreadyRunningError,
  TimerNotFoundError,
  TimerNotWiredError,
  RecurrenceNotAllowedError,
  RecurrenceRegenError,
} from '../types'

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
  svc: TasksService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createTasksService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

/** Seed a time_log directly (the timer surface is S4) to exercise the ledger cascade. */
async function seedTimeLog(db: DrizzleDb, taskId: string): Promise<string> {
  const repo = createRepository(db, taskTimeLogs, {
    deviceId: 'test-device',
    softDelete: false,
    encryptedFields: [],
  })
  const row = await repo.create({
    task_id: taskId,
    start_time: Date.now(),
    end_time: null,
    duration_minutes: null,
  })
  return row.id
}

async function countTimeLogs(db: DrizzleDb, taskId: string): Promise<number> {
  const rows = await db.select().from(taskTimeLogs).where(eq(taskTimeLogs.task_id, taskId)).all()
  return rows.length
}

// --- S3 harness: compose the REAL effect rail + registry (empty seam) so completion fan-out is live-testable ----
// The rail is wrapped with an `applyEffect` call-counter so a test can prove the TASK-SIDE guards (wasCompleted /
// resolve) independently of the rail's own dedup — counting handler runs alone can't tell the guard from the backstop.
interface RailHarness {
  svc: TasksService
  db: DrizzleDb
  registry: EffectRegistry
  /** how many times the service invoked `rail.applyEffect` (the fan-out's actual reach into the rail) */
  applyCount: () => number
}
async function setupWithRail(): Promise<RailHarness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createEffectRegistry()
  const baseRail = createEffectRail(db, registry)
  let applyCalls = 0
  const rail = {
    applyEffect: (event: Parameters<typeof baseRail.applyEffect>[0]) => {
      applyCalls += 1
      return baseRail.applyEffect(event)
    },
  }
  const svc = createTasksService({ db, deviceId: 'test-device', effects: { rail, registry } })
  return { svc, db, registry, applyCount: () => applyCalls }
}
async function countAppliedEffects(db: DrizzleDb): Promise<number> {
  const rows = await db.select().from(appliedEffects).all()
  return rows.length
}

describe('mod-tasks S1 — tasks CRUD + queries', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates a task with NN-default backfill + reads it back (live persist probe)', async () => {
    const t = await h.svc.createTask({ title: 'Buy groceries' })
    expect(t.id).toBeTruthy()
    expect(t.title).toBe('Buy groceries')
    // create() echoes the input row, not SQL defaults → the service backfills NN cols:
    expect(t.status).toBe('not_started')
    expect(t.priority).toBe('medium')
    expect(t.difficulty).toBe('medium')
    expect(t.kind).toBe('standard')
    expect(t.measurement_kind).toBe('milestone')
    expect(t.binding_mode).toBeNull()
    expect(t.sort_order).toBe(0)
    expect(t.actual_minutes).toBeNull()
    expect(t.completed_at).toBeNull()
    expect(t.deleted_at).toBeNull()
    // live persistence probe — read back from the real store via a fresh query
    const read = await h.svc.getTask(t.id)
    expect(read?.title).toBe('Buy groceries')
    expect(read?.status).toBe('not_started')
  })

  it('honours explicit enum / date / parent values', async () => {
    const t = await h.svc.createTask({
      title: 'Ship',
      status: 'in_progress',
      priority: 'high',
      difficulty: 'hard',
      kind: 'obligation',
      recurrence_rule: 'FREQ=WEEKLY',
      due_date: '2026-12-01',
      scheduled_date: '2026-11-30',
      estimated_minutes: 90,
      project_id: 'proj-1',
    })
    expect(t.status).toBe('in_progress')
    expect(t.priority).toBe('high')
    expect(t.difficulty).toBe('hard')
    expect(t.kind).toBe('obligation')
    expect(t.recurrence_rule).toBe('FREQ=WEEKLY')
    expect(t.due_date).toBe('2026-12-01')
    expect(t.project_id).toBe('proj-1')
  })

  describe('≤1-parent guard (TK-2 / TAS-34)', () => {
    it('rejects two parent-module FKs', async () => {
      await expect(
        h.svc.createTask({ title: 'x', project_id: 'p', course_id: 'c' }),
      ).rejects.toBeInstanceOf(MultipleParentError)
    })
    it('allows exactly one parent, a standalone task, and a sub-task that also has a module FK', async () => {
      await expect(h.svc.createTask({ title: 'one', milestone_id: 'm' })).resolves.toBeTruthy()
      await expect(h.svc.createTask({ title: 'standalone' })).resolves.toBeTruthy()
      // parent_task_id is a DIFFERENT axis — a sub-task may still carry a module FK
      await expect(
        h.svc.createTask({ title: 'sub', parent_task_id: 'par', project_id: 'p' }),
      ).resolves.toBeTruthy()
    })
  })

  describe('updateTask', () => {
    it('patches fields and persists', async () => {
      const t = await h.svc.createTask({ title: 'A' })
      const u = await h.svc.updateTask(t.id, { status: 'in_progress', priority: 'low' })
      expect(u.status).toBe('in_progress')
      expect(u.priority).toBe('low')
      expect(u._sync_version).toBe(2) // bumped once
    })
    it('no-op patch returns the existing row without bumping the version', async () => {
      const t = await h.svc.createTask({ title: 'A' })
      const u = await h.svc.updateTask(t.id, {})
      expect(u._sync_version).toBe(t._sync_version) // unchanged
    })
    it('throws TaskNotFoundError for a missing id', async () => {
      await expect(h.svc.updateTask('nope', { title: 'x' })).rejects.toBeInstanceOf(TaskNotFoundError)
    })
    it('re-enforces ≤1-parent on the merged set', async () => {
      const t = await h.svc.createTask({ title: 'A', project_id: 'p' })
      // adding a second parent module via patch → reject
      await expect(h.svc.updateTask(t.id, { course_id: 'c' })).rejects.toBeInstanceOf(MultipleParentError)
      // nulling the first then setting another is fine
      await expect(
        h.svc.updateTask(t.id, { project_id: null, course_id: 'c' }),
      ).resolves.toBeTruthy()
    })
  })

  describe('softDeleteTask — app-layer cascade (TK-4)', () => {
    it('cascades sub-tasks (soft) + time_logs (hard) and hides the task', async () => {
      const parent = await h.svc.createTask({ title: 'Parent' })
      const child = await h.svc.createTask({ title: 'Child', parent_task_id: parent.id })
      await seedTimeLog(h.db, parent.id)
      await seedTimeLog(h.db, child.id)
      expect(await countTimeLogs(h.db, parent.id)).toBe(1)
      expect(await countTimeLogs(h.db, child.id)).toBe(1)

      await h.svc.softDeleteTask(parent.id)

      expect(await h.svc.getTask(parent.id)).toBeNull() // soft-deleted, hidden
      expect(await h.svc.getTask(child.id)).toBeNull() // sub-task soft-deleted too
      expect(await countTimeLogs(h.db, parent.id)).toBe(0) // ledger hard-deleted
      expect(await countTimeLogs(h.db, child.id)).toBe(0)
    })
    it('throws TaskNotFoundError for a missing id', async () => {
      await expect(h.svc.softDeleteTask('nope')).rejects.toBeInstanceOf(TaskNotFoundError)
    })
  })

  describe('listTasks', () => {
    it('filters by status, parent, completion, due_before and excludes soft-deleted', async () => {
      const a = await h.svc.createTask({ title: 'A', status: 'completed', due_date: '2026-01-10' })
      const b = await h.svc.createTask({ title: 'B', status: 'not_started', due_date: '2026-03-01' })
      const sub = await h.svc.createTask({ title: 'Sub', parent_task_id: a.id })

      expect((await h.svc.listTasks()).length).toBe(3)
      expect((await h.svc.listTasks({ status: 'completed' })).map((t) => t.id)).toEqual([a.id])
      expect((await h.svc.listTasks({ completed: true })).map((t) => t.id)).toEqual([a.id])
      expect((await h.svc.listTasks({ completed: false })).map((t) => t.id).sort()).toEqual(
        [b.id, sub.id].sort(),
      )
      expect((await h.svc.listTasks({ parent_task_id: a.id })).map((t) => t.id)).toEqual([sub.id])
      expect((await h.svc.listTasks({ parent_task_id: null })).map((t) => t.id).sort()).toEqual(
        [a.id, b.id].sort(),
      )
      expect((await h.svc.listTasks({ due_before: '2026-02-01' })).map((t) => t.id)).toEqual([a.id])

      await h.svc.softDeleteTask(b.id)
      expect((await h.svc.listTasks()).map((t) => t.id).sort()).toEqual([a.id, sub.id].sort())
    })
  })
})

describe('mod-tasks S2 — sub-tasks + M4 rollup', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  describe('addSubtask', () => {
    it('adds a child under a top-level parent', async () => {
      const p = await h.svc.createTask({ title: 'Parent' })
      const c = await h.svc.addSubtask(p.id, { title: 'Child' })
      expect(c.parent_task_id).toBe(p.id)
      expect((await h.svc.getSubtasks(p.id)).map((t) => t.id)).toEqual([c.id])
    })
    it('rejects nesting under a sub-task (single-level, TK-3)', async () => {
      const p = await h.svc.createTask({ title: 'Parent' })
      const c = await h.svc.addSubtask(p.id, { title: 'Child' })
      await expect(h.svc.addSubtask(c.id, { title: 'Grandchild' })).rejects.toBeInstanceOf(
        SubtaskNestingError,
      )
    })
    it('rejects a missing parent', async () => {
      await expect(h.svc.addSubtask('nope', { title: 'x' })).rejects.toBeInstanceOf(TaskNotFoundError)
    })
    it('a sub-task may carry one module FK (different axis); two → MultipleParentError', async () => {
      const p = await h.svc.createTask({ title: 'Parent' })
      await expect(h.svc.addSubtask(p.id, { title: 'ok', project_id: 'pr' })).resolves.toBeTruthy()
      await expect(
        h.svc.addSubtask(p.id, { title: 'bad', project_id: 'pr', course_id: 'co' }),
      ).rejects.toBeInstanceOf(MultipleParentError)
    })
  })

  describe('getRollup', () => {
    it('no children → {0, 0, null} (unmeasured, never 0)', async () => {
      const p = await h.svc.createTask({ title: 'P' })
      expect(await h.svc.getRollup(p.id)).toEqual({ done: 0, total: 0, progress: null })
    })
    it('equal-weight: 1 of 2 complete → 0.5', async () => {
      const p = await h.svc.createTask({ title: 'P' })
      const c1 = await h.svc.addSubtask(p.id, { title: 'c1' })
      await h.svc.addSubtask(p.id, { title: 'c2' })
      await h.svc.updateTask(c1.id, { status: 'completed' })
      expect(await h.svc.getRollup(p.id)).toEqual({ done: 1, total: 2, progress: 0.5 })
    })
    it('weighted: weight-3 (done) + weight-1 (not) → 0.75', async () => {
      const p = await h.svc.createTask({ title: 'P' })
      const big = await h.svc.addSubtask(p.id, { title: 'big', nesting_weight: 3 })
      await h.svc.addSubtask(p.id, { title: 'small', nesting_weight: 1 })
      await h.svc.updateTask(big.id, { status: 'completed' })
      const r = await h.svc.getRollup(p.id)
      expect(r.done).toBe(1)
      expect(r.total).toBe(2)
      expect(r.progress).toBeCloseTo(0.75, 5)
    })
    it('completing the parent does not complete children, and vice-versa', async () => {
      const p = await h.svc.createTask({ title: 'P' })
      const c = await h.svc.addSubtask(p.id, { title: 'c' })
      await h.svc.updateTask(p.id, { status: 'completed' })
      expect((await h.svc.getTask(c.id))?.status).toBe('not_started') // child untouched
      expect((await h.svc.getRollup(p.id)).done).toBe(0)
    })
    it('excludes soft-deleted children', async () => {
      const p = await h.svc.createTask({ title: 'P' })
      const c1 = await h.svc.addSubtask(p.id, { title: 'c1' })
      const c2 = await h.svc.addSubtask(p.id, { title: 'c2' })
      await h.svc.updateTask(c1.id, { status: 'completed' })
      await h.svc.softDeleteTask(c2.id)
      expect(await h.svc.getRollup(p.id)).toEqual({ done: 1, total: 1, progress: 1 })
      expect((await h.svc.getSubtasks(p.id)).map((t) => t.id)).toEqual([c1.id])
    })
  })
})

describe('mod-tasks S3 — completion + effect fan-out', () => {
  // Gate 1-3 + 8 + 10 use the default (no-rail) harness; the effect tests compose the real rail.
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('1 — completeTask sets status + completed_at; getTask reflects it', async () => {
    const t = await h.svc.createTask({ title: 'Do' })
    const before = Date.now()
    const done = await h.svc.completeTask(t.id)
    expect(done.status).toBe('completed')
    expect(done.completed_at).toBeGreaterThanOrEqual(before)
    const read = await h.svc.getTask(t.id)
    expect(read?.status).toBe('completed')
    expect(read?.completed_at).toBe(done.completed_at)
  })

  it('2 — reopenTask clears completed_at + resets status', async () => {
    const t = await h.svc.createTask({ title: 'Do', status: 'in_progress' })
    await h.svc.completeTask(t.id)
    const reopened = await h.svc.reopenTask(t.id)
    expect(reopened.status).toBe('not_started')
    expect(reopened.completed_at).toBeNull()
  })

  it('3 — dormant rail (no effects dep): completeTask succeeds, no throw', async () => {
    const t = await h.svc.createTask({ title: 'Do' })
    await expect(h.svc.completeTask(t.id)).resolves.toMatchObject({ status: 'completed' })
  })

  it('4 — effects present but no handler registered: the resolve() guard skips applyEffect entirely', async () => {
    const r = await setupWithRail()
    const t = await r.svc.createTask({ title: 'Do' })
    await r.svc.completeTask(t.id)
    // The task-side resolve() guard must skip BEFORE the rail — if it were gone, applyEffect would be called 3× and
    // each would throw NoEffectHandler (swallowed). Asserting applyCount===0 proves the guard, not just the no-throw.
    expect(r.applyCount()).toBe(0)
    expect(await countAppliedEffects(r.db)).toBe(0)
  })

  it('5 — wasCompleted guard: a plain re-complete does NOT reach the rail (fanOut skipped at source)', async () => {
    const r = await setupWithRail()
    let calls = 0
    r.registry.register('emit_measurement_signal', async () => {
      calls += 1
    })
    const t = await r.svc.createTask({ title: 'Do' })
    await r.svc.completeTask(t.id) // fires once → applyEffect called once
    await r.svc.completeTask(t.id) // status already 'completed' → wasCompleted guard → fanOut not called
    // applyCount===1 (not 2) is what discriminates the guard: without it the 2nd complete would call applyEffect
    // again (the rail would dedup → {applied:false}, masking the guard's absence if we only counted handler runs).
    expect(r.applyCount()).toBe(1)
    expect(calls).toBe(1)
    expect(await countAppliedEffects(r.db)).toBe(1)
  })

  it('6 — rail dedup backstop: reopen→re-complete calls fanOut but the ledger keeps it to once', async () => {
    const r = await setupWithRail()
    let calls = 0
    r.registry.register('emit_measurement_signal', async () => {
      calls += 1
    })
    const t = await r.svc.createTask({ title: 'Do' })
    await r.svc.completeTask(t.id)
    await r.svc.reopenTask(t.id)
    await r.svc.completeTask(t.id) // wasCompleted === false ⇒ fanOut IS called; same derived key ⇒ {applied:false}
    expect(r.applyCount()).toBe(2) // fanOut reached the rail BOTH times (vs test 5's 1) — here the dedup is the backstop
    expect(calls).toBe(1) // handler ran exactly once total (the ledger dedup, not the guard, is what held here)
    expect(await countAppliedEffects(r.db)).toBe(1)
  })

  it('7 — failure isolation: a throwing handler does not fail completeTask', async () => {
    const r = await setupWithRail()
    r.registry.register('emit_measurement_signal', async () => {
      throw new Error('handler boom')
    })
    const t = await r.svc.createTask({ title: 'Do' })
    const done = await r.svc.completeTask(t.id) // throw is swallowed post-commit
    expect(done.status).toBe('completed')
    expect((await r.svc.getTask(t.id))?.status).toBe('completed')
  })

  it('8 — completeTask / reopenTask on a missing id → TaskNotFoundError', async () => {
    await expect(h.svc.completeTask('missing')).rejects.toBeInstanceOf(TaskNotFoundError)
    await expect(h.svc.reopenTask('missing')).rejects.toBeInstanceOf(TaskNotFoundError)
  })

  it('9 — feeder legitimacy: completion fires award_xp (the economy effect a non-feeder must not emit)', async () => {
    const r = await setupWithRail()
    let xp = 0
    r.registry.register('award_xp', async () => {
      xp += 1
    })
    const t = await r.svc.createTask({ title: 'Do' })
    await r.svc.completeTask(t.id)
    expect(xp).toBe(1)
  })

  it('10 — reopen no-op guard: reopening a never-completed task does not write', async () => {
    const t = await h.svc.createTask({ title: 'Do' }) // status not_started, completed_at null
    const reopened = await h.svc.reopenTask(t.id)
    expect(reopened.updated_at).toBe(t.updated_at) // no write → updated_at unchanged
    expect(reopened._sync_version).toBe(t._sync_version)
  })
})

// --- S4 harness: compose SessionsService + TasksService + the tasks timer wiring (work type + log_time handler) ----
interface TimerHarness {
  svc: TasksService
  sessions: SessionsService
  db: DrizzleDb
  rail: ReturnType<typeof createEffectRail>
}
// opts.handler: omitted ⇒ the real handler via registerTasksTimer; null ⇒ 'work' type only, NO handler (test 8);
// a fn ⇒ 'work' type + that custom handler (test 10 flaky).
async function setupWithTimer(opts: { handler?: EffectHandler | null } = {}): Promise<TimerHarness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const sessionRegistry = createSessionRegistry(db, 'test-device')
  const effectRegistry = createEffectRegistry()
  const rail = createEffectRail(db, effectRegistry)
  const entityRegistry = createTaggableTypeRegistry()
  const sessions = createSessionsService({
    db,
    deviceId: 'test-device',
    registry: sessionRegistry,
    rail,
    entityRegistry,
  })
  if (!('handler' in opts)) {
    await registerTasksTimer({ sessionRegistry, effectRegistry, db, deviceId: 'test-device' })
  } else {
    await sessionRegistry.register(WORK_SESSION_TYPE) // type only (so createSession works)
    if (opts.handler) effectRegistry.register('log_time', opts.handler)
  }
  const svc = createTasksService({
    db,
    deviceId: 'test-device',
    sessions,
    effects: { rail, registry: effectRegistry },
  })
  return { svc, sessions, db, rail }
}

describe('mod-tasks S4 — timer + log_time + actual_minutes', () => {
  it('1 — startTimer opens a running work session; getActualMinutes still 0 (running does not count)', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    expect(s.sub_type).toBe('work')
    expect(s.status).toBe('in_progress')
    expect(await h.svc.getActualMinutes(t.id)).toBe(0)
  })

  it('2 — startTimer while one runs → TimerAlreadyRunningError', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    await h.svc.startTimer(t.id)
    await expect(h.svc.startTimer(t.id)).rejects.toBeInstanceOf(TimerAlreadyRunningError)
  })

  it('3 — stopTimer completes the session + writes ONE ledger row via the handler; getActualMinutes = duration', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    // backdate start by 5m so the duration is non-zero (a fast start/stop rounds to 0 — test 7).
    await h.sessions.updateSession(s.id, { started_at: Date.now() - 5 * 60000 })
    await h.svc.stopTimer(s.id)
    expect((await h.sessions.getSession(s.id))?.session.status).toBe('completed')
    expect(await countAppliedEffects(h.db)).toBe(1) // one log_time applied
    expect(await h.svc.getActualMinutes(t.id)).toBe(5)
  })

  it('4 — stopTimer on an already-completed session → idempotent no-op (no second ledger row)', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    await h.svc.stopTimer(s.id)
    await h.svc.stopTimer(s.id) // already completed → no-op
    expect(await countAppliedEffects(h.db)).toBe(1)
  })

  it('5 — stopTimer on a missing session → TimerNotFoundError; startTimer on a missing task → TaskNotFoundError', async () => {
    const h = await setupWithTimer()
    await expect(h.svc.stopTimer('nope')).rejects.toBeInstanceOf(TimerNotFoundError)
    await expect(h.svc.startTimer('nope')).rejects.toBeInstanceOf(TaskNotFoundError)
  })

  it('6 — two timers start→stop→start→stop → getActualMinutes = sum; a running third adds nothing', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s1 = await h.svc.startTimer(t.id)
    await h.sessions.updateSession(s1.id, { started_at: Date.now() - 3 * 60000 })
    await h.svc.stopTimer(s1.id)
    const s2 = await h.svc.startTimer(t.id)
    await h.sessions.updateSession(s2.id, { started_at: Date.now() - 2 * 60000 })
    await h.svc.stopTimer(s2.id)
    expect(await h.svc.getActualMinutes(t.id)).toBe(5)
    await h.svc.startTimer(t.id) // running, not stopped
    expect(await h.svc.getActualMinutes(t.id)).toBe(5) // unchanged until stopped
  })

  it('7 — duration rounding: a <60s run → a 0-minute closed row, counts 0', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    await h.svc.stopTimer(s.id) // ~0ms elapsed → rounds to 0
    expect(await h.svc.getActualMinutes(t.id)).toBe(0)
    expect(await countAppliedEffects(h.db)).toBe(1) // a 0-minute row IS written
  })

  it('8 — ledger write rides the rail (G-S4): no log_time handler → stopTimer throws NoEffectHandler', async () => {
    const h = await setupWithTimer({ handler: null }) // 'work' type registered, handler NOT
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    await expect(h.svc.stopTimer(s.id)).rejects.toBeInstanceOf(NoEffectHandler)
  })

  it('9 — the work sub-type auto-fires nothing: only the explicit emit writes the ledger (exactly 1 applied)', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    await h.svc.stopTimer(s.id)
    // if completeSession ALSO fired log_time (effects:[] guards it), there would be 2 applies / a dup — there is 1.
    expect(await countAppliedEffects(h.db)).toBe(1)
  })

  it('10 — fire-first/commit-last: a throwing handler leaves the session in_progress (recoverable, no partial)', async () => {
    const h = await setupWithTimer({
      handler: async () => {
        throw new Error('ledger boom')
      },
    })
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    await expect(h.svc.stopTimer(s.id)).rejects.toThrow('ledger boom')
    // fire-first: the fire threw BEFORE completeSession → the session is NOT completed → a retry is possible.
    expect((await h.sessions.getSession(s.id))?.session.status).toBe('in_progress')
    expect(await h.sessions.findOpenSessionForEntity('work', 'task', t.id)).not.toBeNull()
  })

  it('11 — the running guard uses the Sessions reverse read; cleared after stop', async () => {
    const h = await setupWithTimer()
    const t = await h.svc.createTask({ title: 'Write' })
    const s = await h.svc.startTimer(t.id)
    expect(await h.sessions.findOpenSessionForEntity('work', 'task', t.id)).not.toBeNull()
    await h.svc.stopTimer(s.id)
    expect(await h.sessions.findOpenSessionForEntity('work', 'task', t.id)).toBeNull()
    // a fresh timer is allowed again
    await expect(h.svc.startTimer(t.id)).resolves.toMatchObject({ sub_type: 'work' })
  })

  it('12 — timer deps not wired → TimerNotWiredError (S4 is fail-loud, not S3-dormant)', async () => {
    const h = await setup() // the S1 harness: no sessions, no effects
    const t = await h.svc.createTask({ title: 'Write' })
    await expect(h.svc.startTimer(t.id)).rejects.toBeInstanceOf(TimerNotWiredError)
  })

  it('13 — payload-less log_time (another producer) writes NO bogus ledger row (g2 F1 guard)', async () => {
    const h = await setupWithTimer() // real tasks log_time handler registered (claims the global slot)
    const t = await h.svc.createTask({ title: 'Write' })
    // Simulate a non-tasks producer firing log_time with NO payload (e.g. a future focus auto-fire, TAS-17).
    const { applied } = await h.rail.applyEffect({
      subjectNaturalKey: 'some-focus-session',
      transition: 'completed',
      effectType: 'log_time',
      targetRef: t.id,
    })
    expect(applied).toBe(true) // the rail ran the handler (ledger key written)…
    expect(await h.svc.getActualMinutes(t.id)).toBe(0) // …but the handler skipped — no bogus 0-minute row
  })
})

describe('mod-tasks S5 — obligations + recurrence', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // find the spawned next occurrence (a fresh not_started obligation that isn't the source).
  async function spawnedOccurrence(sourceId: string) {
    const all = await h.svc.listTasks()
    return all.find((t) => t.id !== sourceId && t.status === 'not_started' && t.kind === 'obligation') ?? null
  }

  it('1 — setRecurrence on an obligation stores the rule; on a standard task → RecurrenceNotAllowedError', async () => {
    const ob = await h.svc.createTask({ title: 'Taxes', kind: 'obligation' })
    const up = await h.svc.setRecurrence(ob.id, 'FREQ=YEARLY')
    expect(up.recurrence_rule).toBe('FREQ=YEARLY')
    const std = await h.svc.createTask({ title: 'Buy milk' }) // kind defaults 'standard'
    await expect(h.svc.setRecurrence(std.id, 'FREQ=DAILY')).rejects.toBeInstanceOf(RecurrenceNotAllowedError)
  })

  it('2 — setRecurrence(null) clears the rule; the obligation then completes without a spawn', async () => {
    const ob = await h.svc.createTask({ title: 'Taxes', kind: 'obligation', recurrence_rule: 'FREQ=YEARLY', due_date: '2024-04-15' })
    await h.svc.setRecurrence(ob.id, null)
    await h.svc.completeTask(ob.id)
    expect(await spawnedOccurrence(ob.id)).toBeNull()
  })

  it('3 — (outcome 1) completing a monthly obligation spawns the next occurrence; original stays completed', async () => {
    const ob = await h.svc.createTask({ title: 'Rent', kind: 'obligation', recurrence_rule: 'FREQ=MONTHLY', due_date: '2024-02-15' })
    const done = await h.svc.completeTask(ob.id)
    expect(done.status).toBe('completed')
    const next = await spawnedOccurrence(ob.id)
    expect(next?.due_date).toBe('2024-03-15')
    expect(next?.recurrence_rule).toBe('FREQ=MONTHLY')
    expect(next?.title).toBe('Rent')
  })

  it('4 — the spawned occurrence is a distinct row; completing IT spawns the next (chain self-sustains)', async () => {
    const ob = await h.svc.createTask({ title: 'Rent', kind: 'obligation', recurrence_rule: 'FREQ=MONTHLY', due_date: '2024-02-15' })
    await h.svc.completeTask(ob.id)
    const occ2 = await spawnedOccurrence(ob.id)
    expect(occ2!.id).not.toBe(ob.id)
    await h.svc.completeTask(occ2!.id)
    const all = await h.svc.listTasks({ completed: false })
    const occ3 = all.find((t) => t.kind === 'obligation' && t.due_date === '2024-04-15')
    expect(occ3).toBeTruthy()
  })

  it('5 — (outcome 3) an invalid rule → the task completes AND throws RecurrenceRegenError; no new row', async () => {
    const ob = await h.svc.createTask({ title: 'Weird', kind: 'obligation', recurrence_rule: 'not a valid rrule at all', due_date: '2024-02-15' })
    await expect(h.svc.completeTask(ob.id)).rejects.toBeInstanceOf(RecurrenceRegenError)
    expect((await h.svc.getTask(ob.id))?.status).toBe('completed') // completion is durable (complete-but-flag)
    expect(await spawnedOccurrence(ob.id)).toBeNull()
  })

  it('6 — (outcome 2) a valid but exhausted rule → completes, NO spawn, NO error (legitimate end)', async () => {
    const ob = await h.svc.createTask({ title: 'Once', kind: 'obligation', recurrence_rule: 'FREQ=DAILY;COUNT=1', due_date: '2024-02-15' })
    const done = await h.svc.completeTask(ob.id) // must NOT throw
    expect(done.status).toBe('completed')
    expect(await spawnedOccurrence(ob.id)).toBeNull()
  })

  it('7 — a standard task and a ruleless obligation complete with no spawn, no error (S3 parity)', async () => {
    const std = await h.svc.createTask({ title: 'Buy milk' })
    await h.svc.completeTask(std.id)
    const ob = await h.svc.createTask({ title: 'Someday', kind: 'obligation' }) // no rule
    await h.svc.completeTask(ob.id)
    expect(await spawnedOccurrence(ob.id)).toBeNull()
  })

  it('8 — YEARLY + biweekly rules compute the correct next due_date (ical.js)', async () => {
    const yearly = await h.svc.createTask({ title: 'Taxes', kind: 'obligation', recurrence_rule: 'FREQ=YEARLY', due_date: '2024-04-15' })
    await h.svc.completeTask(yearly.id)
    expect((await spawnedOccurrence(yearly.id))?.due_date).toBe('2025-04-15')

    const h2 = await setup()
    const biweekly = await h2.svc.createTask({ title: 'Report', kind: 'obligation', recurrence_rule: 'FREQ=WEEKLY;INTERVAL=2', due_date: '2024-02-01' })
    await h2.svc.completeTask(biweekly.id)
    const occ = (await h2.svc.listTasks()).find((t) => t.id !== biweekly.id && t.status === 'not_started')
    expect(occ?.due_date).toBe('2024-02-15') // +14 days
  })

  it('9 — the spawned occurrence carries obligation fields, resets completed_at/actual/scheduled, drops parent_task_id', async () => {
    const parent = await h.svc.createTask({ title: 'P' })
    const ob = await h.svc.createTask({
      title: 'Sub-obligation', kind: 'obligation', recurrence_rule: 'FREQ=MONTHLY', due_date: '2024-02-15',
      estimated_minutes: 30, scheduled_date: '2024-02-10', parent_task_id: parent.id, priority: 'high',
    })
    await h.svc.completeTask(ob.id)
    const next = await spawnedOccurrence(ob.id)
    expect(next?.kind).toBe('obligation')
    expect(next?.estimated_minutes).toBe(30)
    expect(next?.priority).toBe('high')
    expect(next?.completed_at).toBeNull()
    expect(next?.actual_minutes).toBeNull()
    expect(next?.scheduled_date).toBeNull() // only the deadline recurs
    expect(next?.parent_task_id).toBeNull() // recurrence is top-level
  })

  it('10 — (N1) recurrence_rule on a non-obligation at create/update → RecurrenceNotAllowedError', async () => {
    await expect(
      h.svc.createTask({ title: 'bad', kind: 'standard', recurrence_rule: 'FREQ=DAILY' }),
    ).rejects.toBeInstanceOf(RecurrenceNotAllowedError)
    const std = await h.svc.createTask({ title: 'ok' })
    await expect(
      h.svc.updateTask(std.id, { recurrence_rule: 'FREQ=DAILY' }),
    ).rejects.toBeInstanceOf(RecurrenceNotAllowedError)
  })

  it('11 — (g2 B1) next due_date is TIMEZONE-INDEPENDENT under a UTC-positive zone (Asia/Tokyo)', async () => {
    const orig = process.env.TZ
    process.env.TZ = 'Asia/Tokyo' // Node Date picks up TZ at runtime; the old toJSDate/UTC path drifted to -14 here
    try {
      const h2 = await setup()
      // date drift: MONTHLY must land on the 15th, NOT the 14th
      const ob = await h2.svc.createTask({ title: 'Rent', kind: 'obligation', recurrence_rule: 'FREQ=MONTHLY', due_date: '2024-02-15' })
      await h2.svc.completeTask(ob.id)
      const next = (await h2.svc.listTasks()).find((t) => t.id !== ob.id && t.status === 'not_started')
      expect(next?.due_date).toBe('2024-03-15')
      // outcome flip: a COUNT=2 rule must still SPAWN (not drop to outcome-2 "exhausted") under Tokyo
      const ob2 = await h2.svc.createTask({ title: 'Twice', kind: 'obligation', recurrence_rule: 'FREQ=DAILY;COUNT=2', due_date: '2024-02-15' })
      await h2.svc.completeTask(ob2.id) // must not throw
      const next2 = (await h2.svc.listTasks()).find((t) => t.id !== ob2.id && t.status === 'not_started' && t.due_date === '2024-02-16')
      expect(next2).toBeTruthy()
    } finally {
      if (orig === undefined) delete process.env.TZ
      else process.env.TZ = orig
    }
  })
})
