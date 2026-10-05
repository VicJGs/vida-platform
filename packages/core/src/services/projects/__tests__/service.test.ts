// ============================================================================
// mod-projects #54 ① · S1 — Projects CRUD + queries (PJ-1/PJ-3/PJ-9/PJ-12)
//
// Node / better-sqlite3 live-store harness (mirrors learning-education/books/knowledge): REAL store, UNLOCKED
// vault (the sync-hash path runs even with empty [E]), migrate() applies 016_projects so `projects` exists.
// Exercises the encrypt/persist + create-echoes-input backfill + soft-delete seams a mocked test bypasses.
// Maps 1:1 to slice-map S1 + seam-contract §B (projects CRUD + queries).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createProjectsService } from '../service'
import {
  type ProjectsService,
  ProjectNotFoundError,
  MilestoneNotFoundError,
  MilestoneParentError,
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
  svc: ProjectsService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createProjectsService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-projects S1 — projects CRUD + queries', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates a project with NN-default backfill + reads it back (live persist probe)', async () => {
    const p = await h.svc.createProject({ title: 'Launch' })
    expect(p.id).toBeTruthy()
    expect(p.title).toBe('Launch')
    // create() echoes the input row, not SQL defaults → the service backfills NN cols:
    expect(p.scope).toBe('personal')
    expect(p.complexity).toBe('moderate')
    expect(p.status).toBe('not_started')
    expect(p.priority).toBe('medium')
    expect(p.deleted_at).toBeNull()
    // live persistence probe — read back from the real store
    const read = await h.svc.getProject(p.id)
    expect(read?.title).toBe('Launch')
    expect(read?.status).toBe('not_started')
  })

  it('omitted progress ⇒ NULL (PJ-3 nullable override, NULL ⇒ derive)', async () => {
    const p = await h.svc.createProject({ title: 'P' })
    expect(p.progress).toBeNull()
    const explicit = await h.svc.createProject({ title: 'Q', progress: 40 })
    expect(explicit.progress).toBe(40)
  })

  it('honours explicit enum + date + minutes values', async () => {
    const p = await h.svc.createProject({
      title: 'Thesis',
      scope: 'academic',
      complexity: 'complex',
      status: 'in_progress',
      priority: 'high',
      start_date: '2026-01-02',
      estimated_hours: 120,
    })
    const read = await h.svc.getProject(p.id)
    expect(read?.scope).toBe('academic')
    expect(read?.complexity).toBe('complex')
    expect(read?.status).toBe('in_progress')
    expect(read?.priority).toBe('high')
    expect(read?.start_date).toBe('2026-01-02')
    expect(read?.estimated_hours).toBe(120)
  })

  it('updates a project (partial patch; untouched fields preserved)', async () => {
    const p = await h.svc.createProject({ title: 'Old', priority: 'low' })
    const u = await h.svc.updateProject(p.id, { title: 'New', status: 'in_progress' })
    expect(u.title).toBe('New')
    expect(u.status).toBe('in_progress')
    expect(u.priority).toBe('low') // untouched
    expect((await h.svc.getProject(p.id))?.title).toBe('New')
  })

  it('updateProject on a missing id throws ProjectNotFoundError (failure path)', async () => {
    await expect(h.svc.updateProject('nope', { title: 'x' })).rejects.toBeInstanceOf(ProjectNotFoundError)
  })

  it('updateProject clears a field with explicit null + advances updated_at; no-op patch is a no-write', async () => {
    const p = await h.svc.createProject({ title: 'Has desc', description: 'before' })
    const u = await h.svc.updateProject(p.id, { description: null })
    expect(u.description).toBeNull()
    expect(u.updated_at).toBeGreaterThanOrEqual(p.updated_at)
    // no-op patch returns the existing row without bumping updated_at (g2-nit-1)
    const same = await h.svc.updateProject(p.id, {})
    expect(same.updated_at).toBe(u.updated_at)
  })

  it('softDeleteProject hides the row from getProject + listProjects', async () => {
    const p = await h.svc.createProject({ title: 'Doomed' })
    await h.svc.softDeleteProject(p.id)
    expect(await h.svc.getProject(p.id)).toBeNull()
    expect(await h.svc.listProjects()).toHaveLength(0)
  })

  it('softDeleteProject on a missing id throws ProjectNotFoundError (failure path)', async () => {
    await expect(h.svc.softDeleteProject('nope')).rejects.toBeInstanceOf(ProjectNotFoundError)
  })

  it('rejects an empty title (validation failure path)', async () => {
    await expect(h.svc.createProject({ title: '' })).rejects.toThrow()
  })

  it('listProjects filters by status and scope (archived = status filter, G9)', async () => {
    await h.svc.createProject({ title: 'A', status: 'in_progress', scope: 'personal' })
    await h.svc.createProject({ title: 'B', status: 'completed', scope: 'professional' })
    await h.svc.createProject({ title: 'C', status: 'completed', scope: 'personal' })
    expect(await h.svc.listProjects()).toHaveLength(3)
    expect(await h.svc.listProjects({ status: 'completed' })).toHaveLength(2) // archived view
    expect(await h.svc.listProjects({ scope: 'personal' })).toHaveLength(2)
    expect(await h.svc.listProjects({ status: 'completed', scope: 'personal' })).toHaveLength(1)
  })

  // --- S2: milestones -------------------------------------------------------
  describe('S2 — milestones', () => {
    it('creates a milestone under a project (live persist) + defaults', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M1' })
      expect(m.project_id).toBe(p.id)
      expect(m.status).toBe('not_started')
      expect(m.sort_order).toBe(0)
      expect(m.progress).toBeNull()
      expect(m.nesting_weight).toBeNull()
      expect(m.parent_milestone_id).toBeNull()
    })

    it('createMilestone on a missing project throws ProjectNotFoundError (orphan guard)', async () => {
      await expect(h.svc.createMilestone('nope', { title: 'M' })).rejects.toBeInstanceOf(ProjectNotFoundError)
    })

    it('nests a milestone; a cross-project parent is rejected', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const other = await h.svc.createProject({ title: 'Other' })
      const root = await h.svc.createMilestone(p.id, { title: 'Root' })
      const child = await h.svc.createMilestone(p.id, { title: 'Child', parent_milestone_id: root.id })
      expect(child.parent_milestone_id).toBe(root.id)
      await expect(
        h.svc.createMilestone(other.id, { title: 'Bad', parent_milestone_id: root.id }),
      ).rejects.toBeInstanceOf(MilestoneParentError)
    })

    it('builds the milestone tree nested + sorted by sort_order', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const a = await h.svc.createMilestone(p.id, { title: 'A', sort_order: 1 })
      const b = await h.svc.createMilestone(p.id, { title: 'B', sort_order: 0 })
      const a1 = await h.svc.createMilestone(p.id, { title: 'A1', parent_milestone_id: a.id })
      const tree = await h.svc.getMilestoneTree(p.id)
      expect(tree.map((n) => n.title)).toEqual(['B', 'A']) // sort_order 0 before 1
      const aNode = tree.find((n) => n.id === a.id)!
      expect(aNode.children.map((c) => c.id)).toEqual([a1.id])
      expect(tree.find((n) => n.id === b.id)!.children).toHaveLength(0)
    })

    it('rejects a reparent that would create a cycle', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const a = await h.svc.createMilestone(p.id, { title: 'A' })
      const b = await h.svc.createMilestone(p.id, { title: 'B', parent_milestone_id: a.id })
      // making A a child of its own descendant B ⇒ cycle
      await expect(h.svc.updateMilestone(a.id, { parent_milestone_id: b.id })).rejects.toBeInstanceOf(
        MilestoneParentError,
      )
      // self-parent is also rejected
      await expect(h.svc.updateMilestone(a.id, { parent_milestone_id: a.id })).rejects.toBeInstanceOf(
        MilestoneParentError,
      )
    })

    it('softDeleteMilestone SET-NULLs direct children + hides the row (PJ-9)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const root = await h.svc.createMilestone(p.id, { title: 'Root' })
      const child = await h.svc.createMilestone(p.id, { title: 'Child', parent_milestone_id: root.id })
      await h.svc.softDeleteMilestone(root.id)
      const tree = await h.svc.getMilestoneTree(p.id)
      // root is gone; child is reparented to top-level (parent SET NULL)
      expect(tree.map((n) => n.id)).toEqual([child.id])
      expect(tree[0]!.parent_milestone_id).toBeNull()
    })

    it('updateMilestone on a missing id throws MilestoneNotFoundError', async () => {
      await expect(h.svc.updateMilestone('nope', { title: 'x' })).rejects.toBeInstanceOf(MilestoneNotFoundError)
    })

    it('softDeleteProject cascades to its milestones (PJ-9)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      await h.svc.createMilestone(p.id, { title: 'M1' })
      await h.svc.createMilestone(p.id, { title: 'M2' })
      expect(await h.svc.getMilestoneTree(p.id)).toHaveLength(2)
      await h.svc.softDeleteProject(p.id)
      expect(await h.svc.getMilestoneTree(p.id)).toHaveLength(0) // milestones cascaded
    })
  })
})
