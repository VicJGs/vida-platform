// ============================================================================
// mod-tasks #65 ① · S1 — Tasks CRUD + ≤1-parent guard + app-layer cascade (TAS-01..04,33,34)
//
// Node / better-sqlite3 live-store harness (mirrors projects/learning-education): REAL store, UNLOCKED vault
// (the sync-hash path runs even with empty [E]), migrate() applies 015_tasks so `tasks`/`task_time_logs` exist.
// Exercises the encrypt/persist + create-echoes-input backfill + soft-delete + app-layer cascade seams a mock bypasses.
// Maps 1:1 to slice-map S1 + seam-contract (tasks CRUD + queries).
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZodError } from 'zod'
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
import { createTaggableTypeRegistry, createSpacesService, TagNotFound } from '../../../foundation/spaces'
import { createSessionsService, type SessionsService } from '../../sessions'
import { createNotesService } from '../../notes'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { views as viewsTable } from '../../../db/schema/foundation/spaces'
import { readFileSync } from 'node:fs'
import {
  createTasksService,
  registerTasksTimer,
  WORK_SESSION_TYPE,
  resolveBindingMode,
  deriveTaskLeaf,
  createTasksReadProvider,
  registerTasksReadProvider,
  TASK_VIEW_PRESETS,
} from '../service'
import { SaveTaskViewSchema } from '../../../validators/task'
import {
  createViewProviderRegistry,
  createViewsService,
  createViewEngine,
  type ReadProvider,
  type ViewProviderRegistry,
} from '../../../foundation/views'
import {
  type TasksService,
  type TasksServiceDeps,
  type AggregatedTasks,
  type AggregatedGroup,
  TaskNotFoundError,
  MultipleParentError,
  SubtaskNestingError,
  TimerAlreadyRunningError,
  TimerNotFoundError,
  TimerNotWiredError,
  RecurrenceNotAllowedError,
  RecurrenceRegenError,
  TasksDepNotWiredError,
  TaskViewNotFoundError,
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

// ============================================================================
// mod-tasks #65 ① · S6 — Measurability axes + contribution (TAS-25,26)
//
// getTaskProgress = the pursuable progress() contract (XCU-08/BR-8), derived-on-read honoring measurement_kind ×
// binding_mode. Faithful to the Projects resolver: no stored override column (C6) ⇒ always derive; parent ⇒ M4 rollup;
// childless derived-pull ⇒ null (source-fed, no binding in M1); else ⇒ milestone-from-completion leaf. C1 (no M5
// advertise) is by construction — TasksServiceDeps has no MeasurementSourceRegistry. C2 (no M7 tables) ⇒ pure read.
// Maps 1:1 to slice-map S6 + PLAN-S6 Verification Gate.
// ============================================================================
describe('mod-tasks S6 — measurability (getTaskProgress)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup() // plain deps {db, deviceId} — S6 needs no effects/sessions/measurementSources
  })

  it('(1) childless NULL-natural leaf: not completed ⇒ 0, completed ⇒ 1 (milestone via the engine)', async () => {
    const t = await h.svc.createTask({ title: 'Leaf' }) // binding_mode null (natural event-trigger), no children
    expect(await h.svc.getTaskProgress(t.id)).toBe(0)
    await h.svc.completeTask(t.id)
    expect(await h.svc.getTaskProgress(t.id)).toBe(1)
  })

  it('(2) parent (NULL-natural): equals the M4 getRollup().progress — 1 of 2 equal-weight ⇒ 0.5', async () => {
    const parent = await h.svc.createTask({ title: 'Parent' })
    const a = await h.svc.addSubtask(parent.id, { title: 'a' })
    await h.svc.addSubtask(parent.id, { title: 'b' })
    await h.svc.completeTask(a.id)
    const roll = await h.svc.getRollup(parent.id)
    expect(roll.total).toBe(2)
    expect(await h.svc.getTaskProgress(parent.id)).toBe(roll.progress)
    expect(await h.svc.getTaskProgress(parent.id)).toBe(0.5)
  })

  it('(2b) parent rollup honours nesting_weight (weighted rollup, not a naive ratio)', async () => {
    const parent = await h.svc.createTask({ title: 'Weighted' })
    const heavy = await h.svc.addSubtask(parent.id, { title: 'heavy', nesting_weight: 3 })
    await h.svc.addSubtask(parent.id, { title: 'light', nesting_weight: 1 })
    await h.svc.completeTask(heavy.id) // 3 of (3+1) ⇒ 0.75
    expect(await h.svc.getTaskProgress(parent.id)).toBe(0.75)
  })

  it('(3) childless derived-pull ⇒ null (source-fed, no binding in M1; does NOT fall to the completion leaf)', async () => {
    const t = await h.svc.createTask({ title: 'Pulled', binding_mode: 'derived-pull' })
    expect(await h.svc.getTaskProgress(t.id)).toBeNull()
    await h.svc.completeTask(t.id) // even completed, a derived-pull measure is NOT completion-fed
    expect(await h.svc.getTaskProgress(t.id)).toBeNull()
  })

  it('(4) childless manual ⇒ derives the milestone leaf (inert in M1 — no override column, XCU-16)', async () => {
    const t = await h.svc.createTask({ title: 'Manual', binding_mode: 'manual' })
    expect(await h.svc.getTaskProgress(t.id)).toBe(0)
    await h.svc.completeTask(t.id)
    expect(await h.svc.getTaskProgress(t.id)).toBe(1) // no manual⇒null special-case; derives like any other
  })

  it('(5) explicit event-trigger leaf == NULL-natural; a derived-pull PARENT still returns the rollup (container wins)', async () => {
    const et = await h.svc.createTask({ title: 'ET', binding_mode: 'event-trigger' })
    expect(await h.svc.getTaskProgress(et.id)).toBe(0)
    await h.svc.completeTask(et.id)
    expect(await h.svc.getTaskProgress(et.id)).toBe(1)

    const parent = await h.svc.createTask({ title: 'PulledParent', binding_mode: 'derived-pull' })
    const a = await h.svc.addSubtask(parent.id, { title: 'a' })
    await h.svc.addSubtask(parent.id, { title: 'b' })
    await h.svc.completeTask(a.id)
    expect(await h.svc.getTaskProgress(parent.id)).toBe(0.5) // total>0 ⇒ rollup, regardless of binding_mode
  })

  it('(6) childless non-completed statuses ⇒ 0 (milestone not done): in_progress + cancelled', async () => {
    const ip = await h.svc.createTask({ title: 'IP', status: 'in_progress' })
    const ca = await h.svc.createTask({ title: 'CA', status: 'cancelled' })
    expect(await h.svc.getTaskProgress(ip.id)).toBe(0)
    expect(await h.svc.getTaskProgress(ca.id)).toBe(0)
  })

  it('(7) C1 — tasks advertises NO measurement source: no deps handle (compile-time) + no advertise/source-registry use (source)', () => {
    // (a) compile-time: TasksServiceDeps cannot carry a MeasurementSourceRegistry. If this stops erroring, C1 broke.
    // @ts-expect-error — a MeasurementSourceRegistry is NOT a valid dep: tasks is not an M5 source (C1 guard).
    const bad: TasksServiceDeps = { db: h.db, deviceId: 'test-device', measurementSources: {} }
    void bad
    // (b) structural (this one BITES at runtime): the service never calls `.advertise(` and imports nothing from the
    //     measurement source-registry, so it cannot register an M5 source even via a hardcoded registry. Catches the
    //     real C1 regression a factory smoke-build would miss. Import-scoped so prose/comments can't false-match.
    const src = readFileSync(new URL('../service.ts', import.meta.url), 'utf8')
    const importLines = src.split('\n').filter((l) => l.trimStart().startsWith('import'))
    expect(src).not.toMatch(/\.advertise\s*\(/)
    expect(importLines.some((l) => /source-registry/.test(l))).toBe(false)
    expect(createTasksService({ db: h.db, deviceId: 'test-device' })).toBeDefined()
  })

  it('(8) C2 — no Purpose-apex write: getTaskProgress is a pure read + the service imports no apex schema; S3 stays additive', async () => {
    // Pure read: two getTaskProgress calls bump no row/version and write no ledger row.
    const t = await h.svc.createTask({ title: 'Pure' })
    const before = await h.svc.getTask(t.id)
    const logsBefore = await countTimeLogs(h.db, t.id)
    await h.svc.getTaskProgress(t.id)
    await h.svc.getTaskProgress(t.id)
    const after = await h.svc.getTask(t.id)
    expect(after?._sync_version).toBe(before?._sync_version) // no write → no version bump
    expect(after?.updated_at).toBe(before?.updated_at)
    expect(await countTimeLogs(h.db, t.id)).toBe(logsBefore)
    // Structural C2: tasks owns no Purpose-apex table — the service IMPORTS none of the Purpose-domain schema (§3.8).
    // Import-scoped so the getTaskProgress JSDoc (which names the apex tables as what tasks does NOT own) can't false-match.
    const importLines = readFileSync(new URL('../service.ts', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.trimStart().startsWith('import'))
    expect(importLines.some((l) => /contributions|purpose_reviews|plan_steps|purposes/.test(l))).toBe(false)
    // S3 stays additive: a getTaskProgress read does not disturb the completion path.
    expect((await h.svc.completeTask(t.id)).completed_at).not.toBeNull()
  })

  it('(9) not-found + soft-deleted ⇒ TaskNotFoundError (never null — null is the distinct unmeasured signal)', async () => {
    await expect(h.svc.getTaskProgress('does-not-exist')).rejects.toThrow(TaskNotFoundError)
    const t = await h.svc.createTask({ title: 'Doomed' })
    await h.svc.softDeleteTask(t.id)
    await expect(h.svc.getTaskProgress(t.id)).rejects.toThrow(TaskNotFoundError)
  })

  it('(10) unit — resolveBindingMode: NULL ⇒ event-trigger (natural), explicit values pass through', () => {
    expect(resolveBindingMode({ binding_mode: null })).toBe('event-trigger')
    expect(resolveBindingMode({ binding_mode: 'event-trigger' })).toBe('event-trigger')
    expect(resolveBindingMode({ binding_mode: 'manual' })).toBe('manual')
    expect(resolveBindingMode({ binding_mode: 'derived-pull' })).toBe('derived-pull')
  })

  it('(11) unit — deriveTaskLeaf: completed ⇒ 1, otherwise ⇒ 0 (milestone leaf via the engine)', () => {
    expect(deriveTaskLeaf({ status: 'completed' })).toBe(1)
    expect(deriveTaskLeaf({ status: 'not_started' })).toBe(0)
    expect(deriveTaskLeaf({ status: 'in_progress' })).toBe(0)
    expect(deriveTaskLeaf({ status: 'cancelled' })).toBe(0)
  })
})

// ============================================================================
// mod-tasks #65 ① · S7 — Aggregation (R7 fan-out over the SHARED ViewProviderRegistry) (TAS-05, TAS-32)
//
// getAggregatedTasks groups OWN TOP-LEVEL tasks (TK-9/C5; grain = BR-TK-S7-8) and resolves cross-module PARENTS
// through the real `foundation/views` seam (`providers.get(type).list({predicates:{id}})` + a defensive `row.id`
// match) — one lookup per distinct parent, in parallel; per-group degradation (BR-11/BR-12/TAS-32 — never rejects);
// the standalone/Inbox group is BR-10's ungrouped bucket (G2), always last; platform-independent codepoint order.
// Uses the REAL createViewProviderRegistry + test ReadProviders (not a mock of our own port). Maps to PLAN-S7 gate.
// ============================================================================
describe('mod-tasks S7 — aggregation (getAggregatedTasks over the shared R7 seam)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  /** A second service over the SAME live db, wired with a registry (the deny-safe `providers?` dep). */
  const withProviders = (providers: ViewProviderRegistry): TasksService =>
    createTasksService({ db: h.db, deviceId: 'test-device', providers })

  /** A test ReadProvider for one entity type. `rows` are the module's (opaque) rows; `honourId` applies the predicate. */
  const provider = (
    entityType: string,
    rows: { id: string; name: string }[],
    opts: { honourId?: boolean; calls?: { n: number }; throwOn?: string } = {},
  ): ReadProvider => ({
    entityType,
    async list(filter) {
      if (opts.calls) opts.calls.n += 1
      const id = (filter.predicates as { id?: unknown } | undefined)?.id
      if (opts.throwOn !== undefined && id === opts.throwOn) throw new Error(`${entityType} source down`)
      return opts.honourId === false ? rows : rows.filter((r) => r.id === id)
    },
  })

  /** All 4 parent types (g2 F4) + 2 standalone: 8 top-level tasks. */
  async function seed(): Promise<{ pA: string; pB: string; cC: string; mM: string; kK: string }> {
    const pA = 'proj-A', pB = 'proj-B', cC = 'contact-C', mM = 'ms-M', kK = 'course-K'
    await h.svc.createTask({ title: 'a1', project_id: pA })
    await h.svc.createTask({ title: 'a2', project_id: pA })
    await h.svc.createTask({ title: 'b1', project_id: pB })
    await h.svc.createTask({ title: 'c1', contact_id: cC })
    await h.svc.createTask({ title: 'm1', milestone_id: mM })
    await h.svc.createTask({ title: 'k1', course_id: kK })
    await h.svc.createTask({ title: 's1' })
    await h.svc.createTask({ title: 's2' })
    return { pA, pB, cC, mM, kK }
  }
  const byKey = (r: AggregatedTasks, key: string): AggregatedGroup | undefined => r.groups.find((g) => g.key === key)
  const titles = (g: AggregatedGroup | undefined): string[] => (g ? g.tasks.map((t) => t.title) : [])

  it('(1) by:parent with NO providers — every cross-module group degraded (fallback label), standalone ok + last, view intact', async () => {
    const { pA, pB, cC, mM, kK } = await seed()
    const r = await h.svc.getAggregatedTasks({ by: 'parent' })
    // codepoint order (not locale): contact < course < milestone < project; standalone LAST
    expect(r.groups.map((g) => g.key)).toEqual([
      `contact:${cC}`, `course:${kK}`, `milestone:${mM}`, `project:${pA}`, `project:${pB}`, 'standalone',
    ])
    for (const k of [`project:${pA}`, `project:${pB}`, `contact:${cC}`, `milestone:${mM}`, `course:${kK}`]) {
      const g = byKey(r, k)
      expect(g).toMatchObject({ state: 'degraded', parentRow: null, label: k }) // fallback, never a fabricated name
    }
    expect(byKey(r, `milestone:${mM}`)).toMatchObject({ parent: { type: 'milestone', id: mM } }) // g2 F4: both branches
    expect(byKey(r, `course:${kK}`)).toMatchObject({ parent: { type: 'course', id: kK } })
    expect(byKey(r, 'standalone')).toMatchObject({ state: 'ok', parent: null, label: 'standalone' })
    expect(r.groups.flatMap((g) => g.tasks).length).toBe(8) // TAS-32: nothing dropped, the view never blanks
    expect(titles(byKey(r, `project:${pA}`))).toEqual(['a1', 'a2'])
  })

  it('(2) REAL registry: a project provider resolves (parentRow = the row), the missing contact provider degrades ONLY its group', async () => {
    const { pA, pB, cC } = await seed()
    const reg = createViewProviderRegistry()
    reg.register(provider('project', [{ id: pA, name: 'Alpha' }, { id: pB, name: 'Beta' }]))
    const r = await withProviders(reg).getAggregatedTasks({ by: 'parent' })
    expect(byKey(r, `project:${pA}`)).toMatchObject({ state: 'ok', parentRow: { id: pA, name: 'Alpha' } })
    expect(byKey(r, `project:${pB}`)).toMatchObject({ state: 'ok', parentRow: { id: pB, name: 'Beta' } })
    expect(byKey(r, `contact:${cC}`)).toMatchObject({ state: 'degraded', parentRow: null }) // BR-11 per-source
    expect(byKey(r, `project:${pA}`)?.label).toBe(`project:${pA}`) // ① never fabricates a display name from the row
  })

  it('(3) a provider that IGNORES the id predicate still resolves via the defensive row.id match; no matching id ⇒ degraded', async () => {
    const { pA, pB } = await seed()
    const reg = createViewProviderRegistry()
    // returns its FULL list regardless of the predicate (ADR-007:67-68 — an unrecognized predicate is ignored)
    reg.register(provider('project', [{ id: pB, name: 'Beta' }, { id: pA, name: 'Alpha' }], { honourId: false }))
    const r = await withProviders(reg).getAggregatedTasks({ by: 'parent' })
    expect(byKey(r, `project:${pA}`)?.parentRow).toEqual({ id: pA, name: 'Alpha' }) // the CORRECT row, not rows[0]
    expect(byKey(r, `project:${pB}`)?.parentRow).toEqual({ id: pB, name: 'Beta' })
    const reg2 = createViewProviderRegistry()
    reg2.register(provider('project', [{ id: 'someone-else', name: 'X' }], { honourId: false }))
    const r2 = await withProviders(reg2).getAggregatedTasks({ by: 'parent' })
    expect(byKey(r2, `project:${pA}`)?.state).toBe('degraded') // rows present but none match ⇒ degraded, never wrong
  })

  it('(4) a provider that THROWS for one parent degrades that group only; a registry whose get() THROWS degrades all parented groups; never rejects', async () => {
    const { pA, pB, cC } = await seed()
    const reg = createViewProviderRegistry()
    reg.register(provider('project', [{ id: pA, name: 'Alpha' }, { id: pB, name: 'Beta' }], { throwOn: pB }))
    const r = await withProviders(reg).getAggregatedTasks({ by: 'parent' })
    expect(byKey(r, `project:${pA}`)?.state).toBe('ok')
    expect(byKey(r, `project:${pB}`)).toMatchObject({ state: 'degraded', parentRow: null }) // BR-12, isolated
    expect(titles(byKey(r, `project:${pB}`))).toEqual(['b1']) // tasks still present
    // g2 F6 — a registry whose `get` itself throws must degrade, not reject the whole view
    const throwingGet: ViewProviderRegistry = {
      register: () => undefined,
      list: () => [],
      get: () => {
        throw new Error('registry exploded')
      },
    }
    const r2 = await withProviders(throwingGet).getAggregatedTasks({ by: 'parent' }) // resolves
    expect(byKey(r2, `project:${pA}`)?.state).toBe('degraded')
    expect(byKey(r2, `contact:${cC}`)?.state).toBe('degraded')
    expect(byKey(r2, 'standalone')?.state).toBe('ok')
    expect(r2.groups.flatMap((g) => g.tasks).length).toBe(8)
  })

  it('(5) ONE lookup per DISTINCT parent, not per task', async () => {
    const { pA, pB } = await seed() // pA has 2 tasks, pB has 1
    const calls = { n: 0 }
    const reg = createViewProviderRegistry()
    reg.register(provider('project', [{ id: pA, name: 'Alpha' }, { id: pB, name: 'Beta' }], { calls }))
    await withProviders(reg).getAggregatedTasks({ by: 'parent' })
    expect(calls.n).toBe(2) // 2 distinct projects ⇒ 2 calls (3 tasks)
  })

  it('(6) standalone/Inbox group: present iff standalone tasks exist, always ok, key standalone, parent null', async () => {
    await h.svc.createTask({ title: 'only-parented', project_id: 'p' })
    expect(byKey(await h.svc.getAggregatedTasks({ by: 'parent' }), 'standalone')).toBeUndefined()
    await h.svc.createTask({ title: 'loose' })
    const g = byKey(await h.svc.getAggregatedTasks({ by: 'parent' }), 'standalone')
    expect(g).toMatchObject({ state: 'ok', parent: null, parentRow: null, label: 'standalone' })
    expect(titles(g)).toEqual(['loose'])
  })

  it('(6b) GRAIN = top-level (BR-TK-S7-8, g2 F1): a sub-task is NOT routed to the Inbox nor counted in its parent\'s module group; it stays reachable via getSubtasks', async () => {
    const a1 = await h.svc.createTask({ title: 'a1', project_id: 'proj-A' })
    const child = await h.svc.addSubtask(a1.id, { title: 'a1.1' }) // no module FK of its own
    const byParent = await h.svc.getAggregatedTasks({ by: 'parent' })
    expect(titles(byKey(byParent, 'project:proj-A'))).toEqual(['a1'])
    expect(byKey(byParent, 'standalone')).toBeUndefined() // the child must NOT masquerade as standalone
    expect(byParent.groups.flatMap((g) => g.tasks.map((t) => t.id))).not.toContain(child.id)
    const byStatus = await h.svc.getAggregatedTasks({ by: 'status' })
    expect(byStatus.groups.flatMap((g) => g.tasks.map((t) => t.id))).not.toContain(child.id) // one grain, all groupings
    expect((await h.svc.getSubtasks(a1.id)).map((t) => t.title)).toEqual(['a1.1']) // S2 owns sub-task display
  })

  it('(7) by:parent_type + by:status are own-table partitions — ZERO provider calls, all ok', async () => {
    await seed()
    const neverCalled: ViewProviderRegistry = {
      register: () => undefined,
      list: () => [],
      get: () => {
        throw new Error('provider seam must NOT be consulted for own-table groupings')
      },
    }
    const svc = withProviders(neverCalled)
    const byType = await svc.getAggregatedTasks({ by: 'parent_type' })
    expect(byType.groups.map((g) => g.key)).toEqual([
      'parent_type:contact', 'parent_type:course', 'parent_type:milestone', 'parent_type:project', 'standalone',
    ])
    expect(titles(byKey(byType, 'parent_type:project'))).toEqual(['a1', 'a2', 'b1'])
    expect(byType.groups.every((g) => g.state === 'ok' && g.parent === null)).toBe(true)
    const first = (await h.svc.listTasks())[0]
    expect(first).toBeDefined()
    await h.svc.completeTask(first?.id ?? '')
    const byStatus = await svc.getAggregatedTasks({ by: 'status' })
    expect(byStatus.groups.map((g) => g.key)).toEqual(['status:completed', 'status:not_started'])
    expect(byKey(byStatus, 'status:completed')?.tasks).toHaveLength(1)
    expect(byStatus.groups.every((g) => g.state === 'ok')).toBe(true)
  })

  it('(8) soft-deleted excluded; within-group order = sort_order then created_at (g2 F2); deterministic; malformed grouping ⇒ ZodError', async () => {
    const { pA } = await seed()
    const doomed = await h.svc.createTask({ title: 'doomed', project_id: pA })
    await h.svc.softDeleteTask(doomed.id)
    // explicit sort_order beats insertion/rowid order within a group (SortOrderSchema is min 0, so raise the siblings
    // and create the newcomer at the default 0 — created LAST, must sort FIRST)
    const sibs = await h.svc.listTasks({ project_id: pA })
    const a1 = sibs.find((t) => t.title === 'a1')
    const a2 = sibs.find((t) => t.title === 'a2')
    expect(a1 && a2).toBeTruthy()
    await h.svc.updateTask(a1?.id ?? '', { sort_order: 10 })
    await h.svc.updateTask(a2?.id ?? '', { sort_order: 20 })
    await h.svc.createTask({ title: 'a0-first', project_id: pA })
    const r1 = await h.svc.getAggregatedTasks({ by: 'parent' })
    const r2 = await h.svc.getAggregatedTasks({ by: 'parent' })
    expect(r1.groups.flatMap((g) => g.tasks.map((t) => t.title))).not.toContain('doomed')
    expect(titles(byKey(r1, `project:${pA}`))).toEqual(['a0-first', 'a1', 'a2'])
    expect(r1.groups.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual(r2.groups.map((g) => [g.key, g.tasks.map((t) => t.id)]))
    expect(r1.groups.at(-1)?.key).toBe('standalone')
    await expect(h.svc.getAggregatedTasks({ by: 'nope' } as unknown as { by: 'parent' })).rejects.toBeInstanceOf(ZodError) // g2 F9
  })

  it('(9) C5/TK-9 structural — the service imports ONLY its own + foundation schema (no db/schema barrel, no other module), parents flow only through `providers`', () => {
    const importLines = readFileSync(new URL('../service.ts', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.trimStart().startsWith('import'))
    // g2 F10: any `db/schema` import must be the tasks schema or a foundation substrate — the barrel (which re-exports
    // every module's tables) and any other module's schema are forbidden.
    const schemaImports = importLines.filter((l) => /db\/schema/.test(l))
    expect(schemaImports.length).toBeGreaterThan(0)
    expect(schemaImports.every((l) => /db\/schema\/(tasks|foundation\/)/.test(l))).toBe(true)
    expect(importLines.some((l) => /services\/(projects|relationships|learning|languages)/.test(l))).toBe(false)
  })
})

// ============================================================================
// S8 — Tags + Notes + Views + tasks-as-ReadProvider (TAS-27/28/30/31 · XCU-07/08) — maps 1:1 to PLAN-S8 gate 1–10.
// REAL substrates over the SAME live store: SpacesService (writes), NotesService (ensureEntityNote), ViewsService
// (views rows), the REAL ViewProviderRegistry + ViewEngine (the seam, both directions).
// ============================================================================
async function setupWithSubstrates() {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const deviceId = 'test-device'
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, deviceId, registry)
  const backlinks = createBacklinkResolver(db, deviceId)
  const notes = createNotesService({ db, deviceId, spaces, backlinks, registry })
  const views = createViewsService(db, deviceId)
  const providers = createViewProviderRegistry()
  const engine = createViewEngine(providers)
  const svc = createTasksService({ db, deviceId, spaces, notes, views, providers })
  registerTasksReadProvider(providers, { svc, db, deviceId })
  return { svc, db, bsql, spaces, notes, views, providers, engine, deviceId }
}
type SubstrateHarness = Awaited<ReturnType<typeof setupWithSubstrates>>

const parseJson = (s: string | null): unknown => (s == null ? null : JSON.parse(s))

describe('mod-tasks S8 — tags (TAS-27 over spaces.tagEntity)', () => {
  let h: SubstrateHarness
  beforeEach(async () => {
    h = await setupWithSubstrates()
  })

  it('(1) tag → row {tag_id, entity_type:task, entity_id}; re-tag idempotent; untag → []; re-tag revives SAME row; unknown id ⇒ []', async () => {
    const t = await h.svc.createTask({ title: 'Write' })
    const tag = await h.spaces.createTag({ name: 'deep' })
    const row = await h.svc.tagTask(t.id, tag.id)
    expect(row).toMatchObject({ tag_id: tag.id, entity_type: 'task', entity_id: t.id })
    expect((await h.svc.getTaskTags(t.id)).map((r) => r.id)).toEqual([row.id])
    expect((await h.svc.tagTask(t.id, tag.id)).id).toBe(row.id) // idempotent (BR-14)
    await h.svc.untagTask(t.id, tag.id)
    expect(await h.svc.getTaskTags(t.id)).toEqual([])
    expect((await h.svc.tagTask(t.id, tag.id)).id).toBe(row.id) // revived, not a 2nd row (BR-14/BR-15)
    expect((await h.svc.getTaskTags(t.id)).map((r) => r.id)).toEqual([row.id])
    expect(await h.svc.getTaskTags('no-such-task')).toEqual([])
  })

  it('(2) guards: unknown/soft-deleted tag ⇒ TagNotFound + no row; unknown/soft-deleted task ⇒ TaskNotFoundError; not-wired; untag no-op; soft-deleted tag stays cleanable', async () => {
    const t = await h.svc.createTask({ title: 'Write' })
    await expect(h.svc.tagTask(t.id, 'ghost-tag')).rejects.toBeInstanceOf(TagNotFound)
    expect(await h.svc.getTaskTags(t.id)).toEqual([]) // orphan guard — nothing inserted
    const dead = await h.spaces.createTag({ name: 'dead' })
    await h.spaces.deleteTag(dead.id)
    await expect(h.svc.tagTask(t.id, dead.id)).rejects.toBeInstanceOf(TagNotFound)
    const tag = await h.spaces.createTag({ name: 'live' })
    await expect(h.svc.tagTask('no-such-task', tag.id)).rejects.toBeInstanceOf(TaskNotFoundError)
    const gone = await h.svc.createTask({ title: 'gone' })
    await h.svc.softDeleteTask(gone.id)
    await expect(h.svc.tagTask(gone.id, tag.id)).rejects.toBeInstanceOf(TaskNotFoundError)
    const unwired = createTasksService({ db: h.db, deviceId: h.deviceId })
    await expect(unwired.tagTask(t.id, tag.id)).rejects.toBeInstanceOf(TasksDepNotWiredError)
    await expect(unwired.tagTask(t.id, tag.id)).rejects.toMatchObject({ dep: 'spaces' })
    await expect(h.svc.untagTask(t.id, tag.id)).resolves.toBeUndefined() // never tagged → no-op
    // cleanable: tag, then soft-delete the TAG, then untag still succeeds (no guard on remove)
    await h.svc.tagTask(t.id, tag.id)
    await h.spaces.deleteTag(tag.id)
    await expect(h.svc.untagTask(t.id, tag.id)).resolves.toBeUndefined()
    expect(await h.svc.getTaskTags(t.id)).toEqual([])
  })
})

describe('mod-tasks S8 — task note (TAS-31 over notes.ensureEntityNote)', () => {
  it('(3) task_note page, entity_type task, seeded H1 in content; idempotent; unknown task; not-wired', async () => {
    const h = await setupWithSubstrates()
    const t = await h.svc.createTask({ title: 'Write the brief' })
    const page = await h.svc.getTaskNote(t.id)
    expect(page).toMatchObject({ type: 'task_note', entity_type: 'task', entity_id: t.id })
    expect(page.content ?? '').toContain('Write the brief') // the seed title becomes the content H1 (title column stays NULL)
    expect((await h.svc.getTaskNote(t.id)).id).toBe(page.id) // find-or-create, same page
    await expect(h.svc.getTaskNote('no-such-task')).rejects.toBeInstanceOf(TaskNotFoundError)
    const unwired = createTasksService({ db: h.db, deviceId: h.deviceId })
    await expect(unwired.getTaskNote(t.id)).rejects.toMatchObject({ dep: 'notes' })
  })
})

describe('mod-tasks S8 — saved views (TAS-28 over the views primitive)', () => {
  let h: SubstrateHarness
  beforeEach(async () => {
    h = await setupWithSubstrates()
  })

  it('(4) create: filter stamped {entity_types:[task], …}, space_id null; caller entity_types/bad layout ⇒ ZodError; not-wired', async () => {
    const v = await h.svc.saveView({ name: 'Open', layout: 'list', predicates: { completed: false }, tags: ['t1'] })
    expect(v.space_id).toBeNull()
    expect(parseJson(v.filter)).toEqual({ entity_types: ['task'], tags: ['t1'], predicates: { completed: false } })
    await expect(
      h.svc.saveView({ name: 'x', layout: 'list', entity_types: ['page'] } as unknown as Parameters<typeof h.svc.saveView>[0]),
    ).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.saveView({ name: 'x', layout: 'kanban' as 'list' })).rejects.toBeInstanceOf(ZodError)
    const unwired = createTasksService({ db: h.db, deviceId: h.deviceId })
    await expect(unwired.saveView({ name: 'x', layout: 'list' })).rejects.toMatchObject({ dep: 'views' })
  })

  it('(5) update = REPLACE the config; space_id = ownership; non-task / MIXED / unknown ⇒ TaskViewNotFoundError, row untouched', async () => {
    const v = await h.svc.saveView({
      name: 'Open',
      layout: 'list',
      space_id: 'sp1',
      tags: ['a'],
      predicates: { status: 'not_started' },
      grouping: { field: 'status' },
      sort: { by: 'due_date' },
    })
    const r = await h.svc.saveView({ id: v.id, name: 'renamed', layout: 'board' })
    expect(r.id).toBe(v.id)
    expect(r.name).toBe('renamed')
    expect(r.layout).toBe('board')
    expect(parseJson(r.filter)).toEqual({ entity_types: ['task'] }) // tags/predicates CLEARED
    expect(r.grouping).toBeNull()
    expect(r.sort).toBeNull()
    expect(r.space_id).toBe('sp1') // omitted ⇒ ownership unchanged
    const rehomed = await h.svc.saveView({ id: v.id, name: 'renamed', layout: 'board', space_id: null })
    expect(rehomed.space_id).toBeNull()

    const foreign = await h.views.createView({ name: 'pages', layout: 'list', filter: { entity_types: ['page'] } })
    await expect(h.svc.saveView({ id: foreign.id, name: 'hijack', layout: 'list' })).rejects.toBeInstanceOf(TaskViewNotFoundError)
    const mixed = await h.views.createView({
      name: 'calendar',
      layout: 'calendar',
      filter: { entity_types: ['task', 'page'], predicates: { range: 'week' } },
    })
    // Compare DB-read to DB-read: create() echoes the INPUT row (no `deleted_at`), a read carries `deleted_at: null`
    // ([[repository-create-returns-input-row-not-db-defaults]]).
    const before = await h.views.getView(mixed.id)
    await expect(h.svc.saveView({ id: mixed.id, name: 'hijack', layout: 'list' })).rejects.toBeInstanceOf(TaskViewNotFoundError)
    expect(await h.views.getView(mixed.id)).toEqual(before) // byte-for-byte unchanged (g1 F1)
    await expect(h.svc.saveView({ id: 'no-such-view', name: 'x', layout: 'list' })).rejects.toBeInstanceOf(TaskViewNotFoundError)
  })

  it('(6) listViews: only EXACT task views (foreign/mixed/soft-deleted/malformed excluded); equal-ms rows ordered by id; stable', async () => {
    await h.views.createView({ name: 'pages', layout: 'list', filter: { entity_types: ['page'] } })
    await h.views.createView({ name: 'mixed', layout: 'calendar', filter: { entity_types: ['task', 'page'] } })
    const dead = await h.svc.saveView({ name: 'dead', layout: 'list' })
    await h.views.deleteView(dead.id)
    await createRepository(h.db, viewsTable, { deviceId: h.deviceId, softDelete: true, encryptedFields: [] }).create({
      space_id: null,
      name: 'malformed',
      layout: 'list',
      filter: '{not json',
      grouping: null,
      sort: null,
    })
    // pinned clock ⇒ equal created_at ⇒ the id tiebreak decides (findAll has no ORDER BY)
    vi.useFakeTimers({ toFake: ['Date'] })
    let a: { id: string }
    let b: { id: string }
    try {
      vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
      a = await h.svc.saveView({ name: 'a', layout: 'list' })
      b = await h.svc.saveView({ name: 'b', layout: 'board' })
    } finally {
      vi.useRealTimers()
    }
    const rows = await h.svc.listViews()
    expect(rows.map((r) => r.name)).toEqual(expect.not.arrayContaining(['pages', 'mixed', 'dead', 'malformed']))
    expect(rows.map((r) => r.id)).toEqual([a.id, b.id].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)))
    expect((await h.svc.listViews()).map((r) => r.id)).toEqual(rows.map((r) => r.id))
  })
})

describe('mod-tasks S8 — tasks as a ReadProvider (XCU-07/08) through the REAL ViewEngine', () => {
  let h: SubstrateHarness
  beforeEach(async () => {
    h = await setupWithSubstrates()
  })
  const list = (filter: Parameters<ReadProvider['list']>[0]) => h.providers.get('task')!.list(filter) as Promise<{ id: string }[]>
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort()

  it('(7) a saved task view resolves end-to-end: success, completed top-level only, degraded []; a mixed view degrades the missing type only', async () => {
    const done1 = await h.svc.createTask({ title: 'd1' })
    const done2 = await h.svc.createTask({ title: 'd2' })
    const open = await h.svc.createTask({ title: 'open' })
    const child = await h.svc.addSubtask(open.id, { title: 'child' })
    await h.svc.completeTask(done1.id)
    await h.svc.completeTask(done2.id)
    await h.svc.completeTask(child.id)
    const view = await h.svc.saveView({ name: 'Done', layout: 'list', predicates: { status: 'completed' } })
    const resolved = await h.engine.resolve(view)
    expect(resolved.state).toBe('success')
    expect(resolved.degraded).toEqual([])
    expect(ids(resolved.rows as { id: string }[])).toEqual([done1.id, done2.id].sort())

    const mixed = await h.views.createView({ name: 'cal', layout: 'calendar', filter: { entity_types: ['task', 'page'] } })
    const r2 = await h.engine.resolve(mixed)
    expect(r2.state).toBe('success') // a MISSING provider is degraded, not error (BR-11)
    expect(r2.degraded).toHaveLength(1)
    expect(r2.degraded[0]).toContain('page')
    expect(ids(r2.rows as { id: string }[])).toEqual([done1.id, done2.id, open.id].sort())
  })

  it('(8) predicates: by-id short-circuit (incl. a sub-task); unknown key ignored; invalid value dropped; grain; parent_task_id; kind; grouping', async () => {
    const top = await h.svc.createTask({ title: 'top', priority: 'high' })
    const child = await h.svc.addSubtask(top.id, { title: 'child' })
    const duty = await h.svc.createTask({ title: 'duty', kind: 'obligation' })
    const gone = await h.svc.createTask({ title: 'gone' })
    await h.svc.softDeleteTask(gone.id)

    expect(ids(await list({ predicates: { id: top.id } }))).toEqual([top.id])
    expect(ids(await list({ predicates: { id: child.id } }))).toEqual([child.id]) // by-id skips the grain
    expect(await list({ predicates: { id: 'nope' } })).toEqual([])
    expect(ids(await list({ predicates: { colour: 'red' } }))).toEqual([top.id, duty.id].sort()) // unknown key ignored
    expect(ids(await list({ predicates: { status: 'bogus' } }))).toEqual([top.id, duty.id].sort()) // invalid dropped, no throw
    expect(ids(await list({}))).toEqual([top.id, duty.id].sort()) // default grain: no sub-tasks, no soft-deleted
    expect(ids(await list({ predicates: { parent_task_id: top.id } }))).toEqual([child.id])
    expect(ids(await list({ predicates: { kind: 'obligation' } }))).toEqual([duty.id])
    expect(ids(await list({ predicates: { priority: 'high' } }))).toEqual([top.id])

    expect(await list({ predicates: { id: 5 } })).toEqual([]) // non-string id matches nothing (g2 F4)

    await h.svc.completeTask(top.id) // so the partition has TWO buckets (g2 F5)
    const grouped = await h.svc.saveView({ name: 'by status', layout: 'board', grouping: { field: 'status' } })
    const r = await h.engine.resolve(grouped)
    expect(r.groups.map((g) => g.key).sort()).toEqual(['completed', 'not_started']) // BR-10: rows carry the field
    expect(r.groups.find((g) => g.key === 'completed')?.rows.map((x) => (x as { id: string }).id)).toEqual([top.id])
  })

  it('(8b) tags: membership incl. NESTED (up, never down); union across the list; soft-deleted child/intermediate cut; unknown ⇒ []; malformed ignored', async () => {
    const a = await h.spaces.createTag({ name: 'a' })
    const ax = await h.spaces.createTag({ name: 'a/x', parent_tag_id: a.id })
    const axy = await h.spaces.createTag({ name: 'a/x/y', parent_tag_id: ax.id })
    const b = await h.spaces.createTag({ name: 'b' })
    const tA = await h.svc.createTask({ title: 'tA' })
    const tAX = await h.svc.createTask({ title: 'tAX' })
    const tAXY = await h.svc.createTask({ title: 'tAXY' })
    const tB = await h.svc.createTask({ title: 'tB' })
    const none = await h.svc.createTask({ title: 'none' })
    await h.svc.tagTask(tA.id, a.id)
    await h.svc.tagTask(tAX.id, ax.id)
    await h.svc.tagTask(tAXY.id, axy.id)
    await h.svc.tagTask(tB.id, b.id)

    expect(ids(await list({ tags: [a.id] }))).toEqual([tA.id, tAX.id, tAXY.id].sort()) // nested, up the hierarchy
    expect(ids(await list({ tags: [ax.id] }))).toEqual([tAX.id, tAXY.id].sort()) // tA NOT returned (never down)
    expect(ids(await list({ tags: [axy.id] }))).toEqual([tAXY.id])
    expect(ids(await list({ tags: [ax.id, b.id] }))).toEqual([tAX.id, tAXY.id, tB.id].sort()) // union
    expect(await list({ tags: ['ghost'] })).toEqual([])
    expect(ids(await list({ tags: 'abc' as unknown as string[] }))).toEqual([tA.id, tAX.id, tAXY.id, tB.id, none.id].sort()) // ignored
    // soft-deleted tasks excluded
    await h.svc.softDeleteTask(tB.id)
    expect(await list({ tags: [b.id] })).toEqual([])
    // intermediate soft-deleted tag cuts the subtree: a/x gone ⇒ tAXY no longer reachable from a
    await h.spaces.deleteTag(ax.id)
    expect(ids(await list({ tags: [a.id] }))).toEqual([tA.id])
    expect(ids(await list({ tags: [axy.id] }))).toEqual([tAXY.id]) // still reachable by its own live tag
    // a soft-deleted REQUESTED tag matches nothing — its stale junction rows do not resurrect membership (g2 F2)
    expect(await list({ tags: [ax.id] })).toEqual([])
  })

  it('(9) presets: valid against the schema and the live primitive; each resolves with degraded []', async () => {
    expect(TASK_VIEW_PRESETS.map((p) => p.key)).toEqual(['today', 'board', 'all_by_project'])
    for (const p of TASK_VIEW_PRESETS) {
      expect(SaveTaskViewSchema.safeParse(p.view).success).toBe(true)
      const row = await h.svc.saveView(p.view)
      expect(parseJson(row.filter)).toMatchObject({ entity_types: ['task'] })
      const r = await h.engine.resolve(row)
      expect(r.degraded).toEqual([])
    }
    // set equality — three real-clock saves may share a ms, where the id tiebreak is random (g2 F1)
    expect((await h.svc.listViews()).map((v) => v.name).sort()).toEqual(['All by project', 'Board', 'Today'])
  })

  it('(10) structural: service.ts imports the foundation spaces schema + the spaces/views/notes barrels type-safely, still no other module', () => {
    const importLines = readFileSync(new URL('../service.ts', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.trimStart().startsWith('import'))
    expect(importLines.some((l) => /db\/schema\/foundation\/spaces/.test(l))).toBe(true)
    expect(importLines.some((l) => /foundation\/spaces'/.test(l))).toBe(true)
    expect(importLines.some((l) => /foundation\/views'/.test(l))).toBe(true)
    expect(importLines.some((l) => /db\/schema\/notes/.test(l))).toBe(false) // PageRow lives in types.ts (preflight A1)
    expect(importLines.some((l) => /services\/(projects|relationships|learning|languages)/.test(l))).toBe(false)
    expect(importLines.some((l) => /db\/schema'/.test(l))).toBe(false)
    expect(createTasksReadProvider({ svc: h.svc, db: h.db, deviceId: h.deviceId }).entityType).toBe('task')
  })
})
