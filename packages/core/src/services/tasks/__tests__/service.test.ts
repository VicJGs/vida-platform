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
import { createTasksService } from '../service'
import {
  type TasksService,
  TaskNotFoundError,
  MultipleParentError,
  SubtaskNestingError,
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
