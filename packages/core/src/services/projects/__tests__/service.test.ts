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
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService, type SpacesService } from '../../../foundation/spaces'
import { createAssociationResolver } from '../../../foundation/spaces/association-resolver'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService, type NotesService } from '../../notes'
import { createMeasurementSourceRegistry, type MeasurementSourceRegistry } from '../../../foundation/measurement'
import {
  type ProjectsService,
  ProjectNotFoundError,
  MilestoneNotFoundError,
  MilestoneParentError,
  DeliverableNotFoundError,
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
  spaces: SpacesService
  notes: NotesService
  associations: ReturnType<typeof createAssociationResolver>
}

async function setup(opts: { measurementSources?: MeasurementSourceRegistry } = {}): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  // S6/S7 — the REAL spaces + notes substrates (the learning-education harness precedent): tags/links WRITE via
  // SpacesService, pages via NotesService, over the shared taggable-type registry (pre-seeds project/milestone/
  // deliverable from ENTITY_TYPES). The association resolver reads back entity_tags/links for verification.
  const entityRegistry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', entityRegistry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const notes = createNotesService({ db, deviceId: 'test-device', spaces, backlinks, registry: entityRegistry })
  const associations = createAssociationResolver(db, 'test-device', entityRegistry)
  const svc = createProjectsService({
    db,
    deviceId: 'test-device',
    spaces,
    notes,
    registry: entityRegistry,
    measurementSources: opts.measurementSources,
  })
  return { svc, db, bsql, spaces, notes, associations }
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

  // --- S3: deliverables -----------------------------------------------------
  describe('S3 — deliverables', () => {
    async function milestone() {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      return { p, m }
    }

    it('creates a deliverable with ADR-011 defaults (live persist)', async () => {
      const { m } = await milestone()
      const d = await h.svc.createDeliverable(m.id, { title: 'Ship v1' })
      expect(d.milestone_id).toBe(m.id)
      expect(d.measurement_kind).toBe('milestone') // M1 default
      expect(d.binding_mode).toBeNull() // M2 NULL ⇒ derive-natural
      expect(d.progress).toBeNull()
      expect(d.nesting_weight).toBeNull()
      expect(d.sort_order).toBe(0)
    })

    it('honours explicit measurement_kind + binding_mode', async () => {
      const { m } = await milestone()
      const d = await h.svc.createDeliverable(m.id, {
        title: '$ raised',
        measurement_kind: 'quantitative',
        binding_mode: 'derived-pull',
      })
      expect(d.measurement_kind).toBe('quantitative')
      expect(d.binding_mode).toBe('derived-pull')
    })

    it('createDeliverable on a missing milestone throws MilestoneNotFoundError (orphan guard)', async () => {
      await expect(h.svc.createDeliverable('nope', { title: 'D' })).rejects.toBeInstanceOf(MilestoneNotFoundError)
    })

    it('lists deliverables of a milestone ordered by sort_order', async () => {
      const { m } = await milestone()
      await h.svc.createDeliverable(m.id, { title: 'B', sort_order: 1 })
      await h.svc.createDeliverable(m.id, { title: 'A', sort_order: 0 })
      const list = await h.svc.listDeliverables(m.id)
      expect(list.map((d) => d.title)).toEqual(['A', 'B'])
    })

    it('updates a deliverable; missing id throws DeliverableNotFoundError', async () => {
      const { m } = await milestone()
      const d = await h.svc.createDeliverable(m.id, { title: 'D', measurement_kind: 'milestone' })
      const u = await h.svc.updateDeliverable(d.id, { measurement_kind: 'rate', binding_mode: 'manual' })
      expect(u.measurement_kind).toBe('rate')
      expect(u.binding_mode).toBe('manual')
      await expect(h.svc.updateDeliverable('nope', { title: 'x' })).rejects.toBeInstanceOf(DeliverableNotFoundError)
    })

    it('softDeleteDeliverable hides it; missing id throws', async () => {
      const { m } = await milestone()
      const d = await h.svc.createDeliverable(m.id, { title: 'D' })
      await h.svc.softDeleteDeliverable(d.id)
      expect(await h.svc.listDeliverables(m.id)).toHaveLength(0)
      await expect(h.svc.softDeleteDeliverable('nope')).rejects.toBeInstanceOf(DeliverableNotFoundError)
    })

    it('milestone delete cascades its deliverables; project delete cascades milestones+deliverables (PJ-9)', async () => {
      const { p, m } = await milestone()
      await h.svc.createDeliverable(m.id, { title: 'D1' })
      await h.svc.createDeliverable(m.id, { title: 'D2' })
      expect(await h.svc.listDeliverables(m.id)).toHaveLength(2)
      await h.svc.softDeleteMilestone(m.id)
      expect(await h.svc.listDeliverables(m.id)).toHaveLength(0) // cascaded with the milestone

      // project-level cascade reaches deliverables too
      const m2 = await h.svc.createMilestone(p.id, { title: 'M2' })
      await h.svc.createDeliverable(m2.id, { title: 'D3' })
      await h.svc.softDeleteProject(p.id)
      expect(await h.svc.listDeliverables(m2.id)).toHaveLength(0)
    })
  })

  // --- S4: derived progress -------------------------------------------------
  describe('S4 — derived progress', () => {
    it('a manual override wins (derived=false)', async () => {
      const p = await h.svc.createProject({ title: 'P', progress: 42 })
      expect(await h.svc.getProjectProgress(p.id)).toEqual({ value: 42, derived: false, partial: false })
    })

    it('a deliverable with no override and no leaf is unmeasured (null, derived)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      const d = await h.svc.createDeliverable(m.id, { title: 'D', binding_mode: 'derived-pull' })
      expect(await h.svc.getDeliverableProgress(d.id)).toEqual({ value: null, derived: true, partial: false })
      // an explicit override on a deliverable reads back as a non-derived value
      const d2 = await h.svc.createDeliverable(m.id, { title: 'D2', progress: 70 })
      expect(await h.svc.getDeliverableProgress(d2.id)).toEqual({ value: 70, derived: false, partial: false })
    })

    it('a milestone derives an equal-weight rollup of its deliverable overrides', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      await h.svc.createDeliverable(m.id, { title: 'A', progress: 100 })
      await h.svc.createDeliverable(m.id, { title: 'B', progress: 0 })
      expect(await h.svc.getMilestoneProgress(m.id)).toEqual({ value: 50, derived: true, partial: false })
    })

    it('nesting_weight weights the rollup', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      await h.svc.createDeliverable(m.id, { title: 'A', progress: 100, nesting_weight: 3 })
      await h.svc.createDeliverable(m.id, { title: 'B', progress: 0, nesting_weight: 1 })
      // (100*3 + 0*1) / 4 = 75
      expect((await h.svc.getMilestoneProgress(m.id)).value).toBe(75)
    })

    it('unmeasured children are excluded and flag partial (PJ-3)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      await h.svc.createDeliverable(m.id, { title: 'measured', progress: 50 })
      await h.svc.createDeliverable(m.id, { title: 'unmeasured' }) // no override, no leaf ⇒ null
      const pv = await h.svc.getMilestoneProgress(m.id)
      expect(pv.value).toBe(50) // only the measured one counts (not dragged to 25)
      expect(pv.partial).toBe(true)
    })

    it('a milestone with only unmeasured children is unmeasured (null), not partial', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      await h.svc.createDeliverable(m.id, { title: 'x' })
      expect(await h.svc.getMilestoneProgress(m.id)).toEqual({ value: null, derived: true, partial: false })
    })

    it('project rolls up nested milestones → deliverables bottom-up', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m1 = await h.svc.createMilestone(p.id, { title: 'M1' })
      await h.svc.createDeliverable(m1.id, { title: 'a', progress: 100 })
      const m2 = await h.svc.createMilestone(p.id, { title: 'M2' })
      const sub = await h.svc.createMilestone(p.id, { title: 'sub', parent_milestone_id: m2.id })
      await h.svc.createDeliverable(sub.id, { title: 'b', progress: 0 })
      // M1 = 100 ; M2 = (sub=0) = 0 ; project = (100 + 0)/2 = 50
      expect((await h.svc.getProjectProgress(p.id)).value).toBe(50)
    })

    it('progress getters throw on an unknown id', async () => {
      await expect(h.svc.getProjectProgress('nope')).rejects.toBeInstanceOf(ProjectNotFoundError)
      await expect(h.svc.getMilestoneProgress('nope')).rejects.toBeInstanceOf(MilestoneNotFoundError)
      await expect(h.svc.getDeliverableProgress('nope')).rejects.toBeInstanceOf(DeliverableNotFoundError)
    })
  })

  // --- S5: document vault ---------------------------------------------------
  describe('S5 — document vault', () => {
    const bytes = () => new Uint8Array([1, 2, 3, 4])

    it('adds a document with inline encrypted_blob + reads it back (live persist)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const doc = await h.svc.addDocument(p.id, { name: 'spec.pdf', file_type: 'application/pdf', bytes: bytes() })
      expect(doc.project_id).toBe(p.id)
      expect(doc.name).toBe('spec.pdf')
      expect(doc.file_size).toBe(4)
      expect(doc.encrypted_blob).not.toBeNull()
      const read = await h.svc.getDocument(doc.id)
      expect(read?.name).toBe('spec.pdf')
    })

    it('a metadata-only document (no bytes) has null blob + null size', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const doc = await h.svc.addDocument(p.id, { name: 'link-only' })
      expect(doc.encrypted_blob).toBeNull()
      expect(doc.file_size).toBeNull()
    })

    it('addDocument orphan + cross-project-milestone guards', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const other = await h.svc.createProject({ title: 'Other' })
      const mOther = await h.svc.createMilestone(other.id, { title: 'M' })
      await expect(h.svc.addDocument('nope', { name: 'x' })).rejects.toBeInstanceOf(ProjectNotFoundError)
      await expect(h.svc.addDocument(p.id, { name: 'x', milestoneId: 'nope' })).rejects.toBeInstanceOf(
        MilestoneNotFoundError,
      )
      await expect(h.svc.addDocument(p.id, { name: 'x', milestoneId: mOther.id })).rejects.toBeInstanceOf(
        MilestoneParentError,
      )
    })

    it('lists a project documents ordered by created_at', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      await h.svc.addDocument(p.id, { name: 'a' })
      await h.svc.addDocument(p.id, { name: 'b' })
      expect((await h.svc.listDocuments(p.id)).map((d) => d.name)).toEqual(['a', 'b'])
    })

    it('milestone delete SET-NULLs its document links (document survives under the project)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      const doc = await h.svc.addDocument(p.id, { name: 'scoped', milestoneId: m.id })
      await h.svc.softDeleteMilestone(m.id)
      const read = await h.svc.getDocument(doc.id)
      expect(read).not.toBeNull() // document survives
      expect(read?.milestone_id).toBeNull() // link SET NULL
    })

    it('project delete hard-deletes its documents (no deleted_at)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const doc = await h.svc.addDocument(p.id, { name: 'd', bytes: bytes() })
      await h.svc.softDeleteProject(p.id)
      expect(await h.svc.getDocument(doc.id)).toBeNull() // hard-deleted with the project
      expect(await h.svc.listDocuments(p.id)).toHaveLength(0)
    })
  })

  // --- S6: pages (vision/mission) + entity_tags -----------------------------
  describe('S6 — pages + tags', () => {
    it('getProjectPage find-or-creates vision + mission as distinct project pages (idempotent)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const vision = await h.svc.getProjectPage(p.id, 'vision')
      const mission = await h.svc.getProjectPage(p.id, 'mission')
      expect(vision.entity_type).toBe('project')
      expect(vision.entity_id).toBe(p.id)
      expect(vision.type).toBe('note')
      expect(vision.title).toBe('Vision')
      expect(mission.title).toBe('Mission')
      expect(vision.id).not.toBe(mission.id) // two distinct pages on the same project
      // idempotent: second call returns the same row, not a duplicate
      const visionAgain = await h.svc.getProjectPage(p.id, 'vision')
      expect(visionAgain.id).toBe(vision.id)
    })

    it('getProjectPage on a missing project throws ProjectNotFoundError', async () => {
      await expect(h.svc.getProjectPage('nope', 'vision')).rejects.toBeInstanceOf(ProjectNotFoundError)
    })

    it('tagEntity + untagEntity write/remove an entity_tag (delegates to Spaces)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const tag = await h.spaces.createTag({ name: 'important' })
      await h.svc.tagEntity('project', p.id, tag.id)
      let assoc = await h.associations.resolveAssociations({ entityType: 'project', entityId: p.id }, 'separate')
      expect(assoc.mode === 'separate' && assoc.tags.map((t) => t.tagId)).toContain(tag.id)
      await h.svc.untagEntity('project', p.id, tag.id)
      assoc = await h.associations.resolveAssociations({ entityType: 'project', entityId: p.id }, 'separate')
      expect(assoc.mode === 'separate' && assoc.tags).toHaveLength(0)
    })

    it('tagEntity rejects an unregistered entity_type (Spaces registry guard)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const tag = await h.spaces.createTag({ name: 't' })
      await expect(h.svc.tagEntity('bogus_type', p.id, tag.id)).rejects.toThrow()
    })

    it('tags a milestone and a deliverable (registered entity types)', async () => {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      const d = await h.svc.createDeliverable(m.id, { title: 'D' })
      const tag = await h.spaces.createTag({ name: 'x' })
      await h.svc.tagEntity('milestone', m.id, tag.id)
      await h.svc.tagEntity('deliverable', d.id, tag.id)
      const mAssoc = await h.associations.resolveAssociations({ entityType: 'milestone', entityId: m.id }, 'separate')
      const dAssoc = await h.associations.resolveAssociations({ entityType: 'deliverable', entityId: d.id }, 'separate')
      expect(mAssoc.mode === 'separate' && mAssoc.tags).toHaveLength(1)
      expect(dAssoc.mode === 'separate' && dAssoc.tags).toHaveLength(1)
    })
  })

  // --- S7: deliverable derived-pull measurement -----------------------------
  describe('S7 — deliverable source binding + derived-pull', () => {
    async function deliverable(bindingMode?: 'manual' | 'derived-pull' | 'event-trigger') {
      const p = await h.svc.createProject({ title: 'P' })
      const m = await h.svc.createMilestone(p.id, { title: 'M' })
      const d = await h.svc.createDeliverable(m.id, { title: 'D', binding_mode: bindingMode })
      return { p, m, d }
    }

    it('links + lists + unlinks a deliverable source (entity_links binding)', async () => {
      const { d } = await deliverable('derived-pull')
      await h.svc.linkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-1' })
      expect(await h.svc.getDeliverableSources(d.id)).toEqual([{ entityType: 'account', entityId: 'acc-1' }])
      await h.svc.unlinkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-1' })
      expect(await h.svc.getDeliverableSources(d.id)).toHaveLength(0)
    })

    it('linkDeliverableSource on a missing deliverable throws', async () => {
      await expect(
        h.svc.linkDeliverableSource('nope', { entityType: 'account', entityId: 'x' }),
      ).rejects.toBeInstanceOf(DeliverableNotFoundError)
    })

    it('a derived-pull deliverable resolves its progress from an ADVERTISED bound source', async () => {
      const sources = createMeasurementSourceRegistry()
      sources.advertise('account:acc-1', () => 0.5) // a [0,1] measure
      const hh = await setup({ measurementSources: sources })
      const p = await hh.svc.createProject({ title: 'P' })
      const m = await hh.svc.createMilestone(p.id, { title: 'M' })
      const d = await hh.svc.createDeliverable(m.id, { title: 'D', binding_mode: 'derived-pull' })
      await hh.svc.linkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-1' })
      expect(await hh.svc.getDeliverableProgress(d.id)).toEqual({ value: 50, derived: true, partial: false })
      // the milestone rolls up the resolved derived-pull leaf
      expect((await hh.svc.getMilestoneProgress(m.id)).value).toBe(50)
    })

    it('derived-pull is unmeasured (null) when the source registry is ABSENT at M1', async () => {
      const { m, d } = await deliverable('derived-pull')
      await h.svc.linkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-1' })
      // h was built with no measurementSources (M1 default) ⇒ unmeasured
      expect(await h.svc.getDeliverableProgress(d.id)).toEqual({ value: null, derived: true, partial: false })
      expect((await h.svc.getMilestoneProgress(m.id)).value).toBeNull()
    })

    it('an unadvertised bound source ⇒ unmeasured (never fabricated, BR-2)', async () => {
      const sources = createMeasurementSourceRegistry() // empty
      const hh = await setup({ measurementSources: sources })
      const p = await hh.svc.createProject({ title: 'P' })
      const m = await hh.svc.createMilestone(p.id, { title: 'M' })
      const d = await hh.svc.createDeliverable(m.id, { title: 'D', binding_mode: 'derived-pull' })
      await hh.svc.linkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-404' })
      expect((await hh.svc.getDeliverableProgress(d.id)).value).toBeNull()
    })

    it('a manual deliverable ignores sources (only its override counts)', async () => {
      const sources = createMeasurementSourceRegistry()
      sources.advertise('account:acc-1', () => 0.9)
      const hh = await setup({ measurementSources: sources })
      const p = await hh.svc.createProject({ title: 'P' })
      const m = await hh.svc.createMilestone(p.id, { title: 'M' })
      const d = await hh.svc.createDeliverable(m.id, { title: 'D', binding_mode: 'manual' })
      await hh.svc.linkDeliverableSource(d.id, { entityType: 'account', entityId: 'acc-1' })
      // manual + no override ⇒ unmeasured (the advertised source is NOT pulled for a manual binding)
      expect((await hh.svc.getDeliverableProgress(d.id)).value).toBeNull()
    })
  })
})
