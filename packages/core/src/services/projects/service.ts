// services/projects — service (mod-projects #54 · LIF-135 ①)
//
// createProjectsService over the 4 DB-4 tables (projects · milestones · deliverables · project_documents).
// Built PER SLICE (Entity Delivery Flow); S1 = projects CRUD + queries.
//
// Patterns (precedent: services/learning-education):
// - factory → object literal; intra-service calls hoist to closures, NOT `this.` [[factory-service-no-this]].
// - validating methods are async (reject, not sync throw).
// - Repository.create() RETURNS THE INPUT ROW (not DB defaults) → backfill NN-default cols in the create input
//   (status/priority/scope/complexity) [[repository-create-returns-input-row]].
// - findWhere skips the soft-delete filter → list via findAll (which applies isNull(deleted_at)) + JS filter.
// - M1.0 encryptedFields:[] (the [E] title/description/vision pass through; real field encryption = M3).

import { and, eq, isNull } from 'drizzle-orm'
import { createRepository, type CreateInput } from '../../db/repository'
import { projects, milestones, deliverables } from '../../db/schema/projects'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectsFilterSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  CreateDeliverableSchema,
  UpdateDeliverableSchema,
} from '../../validators/project'
import {
  type ProjectsService,
  type ProjectsServiceDeps,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ListProjectsFilter,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
  type MilestoneNode,
  type CreateDeliverableInput,
  type UpdateDeliverableInput,
  ProjectNotFoundError,
  MilestoneNotFoundError,
  MilestoneParentError,
  DeliverableNotFoundError,
} from './types'
import type { ProjectRow, MilestoneRow, DeliverableRow } from '../../db/schema/projects'

export function createProjectsService(deps: ProjectsServiceDeps): ProjectsService {
  const { db, deviceId } = deps

  // `projects` + `milestones` + `deliverables` all have deleted_at → softDelete:true.
  const projectsRepo = createRepository(db, projects, { deviceId, softDelete: true, encryptedFields: [] })
  const milestonesRepo = createRepository(db, milestones, { deviceId, softDelete: true, encryptedFields: [] })
  const deliverablesRepo = createRepository(db, deliverables, { deviceId, softDelete: true, encryptedFields: [] })

  // ---- S1: projects CRUD + queries -----------------------------------------
  async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
    const v = CreateProjectSchema.parse(input)
    // Backfill NN-default cols (create() echoes the input row, not SQL defaults).
    return projectsRepo.create({
      title: v.title,
      description: v.description ?? null,
      vision: v.vision ?? null,
      scope: v.scope ?? 'personal',
      complexity: v.complexity ?? 'moderate',
      status: v.status ?? 'not_started',
      priority: v.priority ?? 'medium',
      progress: v.progress ?? null, // NULL ⇒ derive (PJ-3)
      start_date: v.start_date ?? null,
      target_end_date: v.target_end_date ?? null,
      actual_end_date: v.actual_end_date ?? null,
      estimated_hours: v.estimated_hours ?? null,
      actual_hours: v.actual_hours ?? null,
      color: v.color ?? null,
      icon: v.icon ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof projects>)
  }

  async function updateProject(id: string, patch: UpdateProjectInput): Promise<ProjectRow> {
    const v = UpdateProjectSchema.parse(patch)
    const existing = await projectsRepo.findById(id)
    if (!existing) throw new ProjectNotFoundError(id)
    const data = {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.vision !== undefined ? { vision: v.vision ?? null } : {}),
      ...(v.scope !== undefined ? { scope: v.scope } : {}),
      ...(v.complexity !== undefined ? { complexity: v.complexity } : {}),
      ...(v.status !== undefined ? { status: v.status } : {}),
      ...(v.priority !== undefined ? { priority: v.priority } : {}),
      ...(v.progress !== undefined ? { progress: v.progress } : {}),
      ...(v.start_date !== undefined ? { start_date: v.start_date ?? null } : {}),
      ...(v.target_end_date !== undefined ? { target_end_date: v.target_end_date ?? null } : {}),
      ...(v.actual_end_date !== undefined ? { actual_end_date: v.actual_end_date ?? null } : {}),
      ...(v.estimated_hours !== undefined ? { estimated_hours: v.estimated_hours ?? null } : {}),
      ...(v.actual_hours !== undefined ? { actual_hours: v.actual_hours ?? null } : {}),
      ...(v.color !== undefined ? { color: v.color ?? null } : {}),
      ...(v.icon !== undefined ? { icon: v.icon ?? null } : {}),
    }
    // No-op patch (all fields undefined) ⇒ skip the write — avoids a wasted updated_at bump + sync_queue row (g2-nit-1).
    if (Object.keys(data).length === 0) return existing
    return projectsRepo.update(id, data)
  }

  async function softDeleteProject(id: string): Promise<void> {
    if (!(await projectsRepo.findById(id))) throw new ProjectNotFoundError(id)
    // PJ-9 cascade: deleting a project cascades its milestones AND their deliverables (S3). Document cascade is
    // layered in at S5. [cascade retrofit tracker]
    const childMilestones = await milestonesRepo.findWhere(
      and(eq(milestones.project_id, id), isNull(milestones.deleted_at))!,
    )
    for (const m of childMilestones) {
      await cascadeDeliverables(m.id)
      await milestonesRepo.delete(m.id)
    }
    await projectsRepo.delete(id)
  }

  async function getProject(id: string): Promise<ProjectRow | null> {
    return projectsRepo.findById(id)
  }

  async function listProjects(filter?: ListProjectsFilter): Promise<ProjectRow[]> {
    const f = ListProjectsFilterSchema.parse(filter)
    const rows = await projectsRepo.findAll() // applies isNull(deleted_at)
    if (!f) return rows
    return rows.filter(
      (r) => (f.status ? r.status === f.status : true) && (f.scope ? r.scope === f.scope : true),
    )
  }

  // ---- S2: milestones (nestable tree) --------------------------------------
  /** Walk up from `newParentId`; a cycle exists iff we reach `id` (the milestone being reparented). */
  async function wouldCycle(id: string, newParentId: string): Promise<boolean> {
    let cursor: string | null = newParentId
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === id) return true
      if (seen.has(cursor)) break // defensive backstop (pre-existing cycle)
      seen.add(cursor)
      const m: MilestoneRow | null = await milestonesRepo.findById(cursor)
      cursor = m?.parent_milestone_id ?? null
    }
    return false
  }

  async function createMilestone(projectId: string, input: CreateMilestoneInput): Promise<MilestoneRow> {
    const v = CreateMilestoneSchema.parse(input)
    if (!(await projectsRepo.findById(projectId))) throw new ProjectNotFoundError(projectId) // fail-loud: no orphan (no-FK, PJ-9)
    if (v.parent_milestone_id != null) {
      const parent = await milestonesRepo.findById(v.parent_milestone_id)
      if (!parent) throw new MilestoneNotFoundError(v.parent_milestone_id)
      if (parent.project_id !== projectId)
        throw new MilestoneParentError(`parent milestone ${v.parent_milestone_id} belongs to a different project`)
    }
    return milestonesRepo.create({
      project_id: projectId,
      parent_milestone_id: v.parent_milestone_id ?? null,
      title: v.title,
      description: v.description ?? null,
      status: v.status ?? 'not_started',
      progress: v.progress ?? null, // NULL ⇒ derive (PJ-3, S4)
      nesting_weight: v.nesting_weight ?? null, // NULL ⇒ equal-weight (ADR-011 M4)
      due_date: v.due_date ?? null,
      sort_order: v.sort_order ?? 0,
      deleted_at: null,
    } satisfies CreateInput<typeof milestones>)
  }

  async function updateMilestone(id: string, patch: UpdateMilestoneInput): Promise<MilestoneRow> {
    const v = UpdateMilestoneSchema.parse(patch)
    const existing = await milestonesRepo.findById(id)
    if (!existing) throw new MilestoneNotFoundError(id)
    if (v.parent_milestone_id !== undefined && v.parent_milestone_id !== null) {
      if (v.parent_milestone_id === id) throw new MilestoneParentError('a milestone cannot be its own parent')
      const parent = await milestonesRepo.findById(v.parent_milestone_id)
      if (!parent) throw new MilestoneNotFoundError(v.parent_milestone_id)
      if (parent.project_id !== existing.project_id)
        throw new MilestoneParentError('parent milestone belongs to a different project')
      if (await wouldCycle(id, v.parent_milestone_id))
        throw new MilestoneParentError('reparenting would create a cycle')
    }
    const data = {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.status !== undefined ? { status: v.status } : {}),
      ...(v.progress !== undefined ? { progress: v.progress } : {}),
      ...(v.nesting_weight !== undefined ? { nesting_weight: v.nesting_weight } : {}),
      ...(v.due_date !== undefined ? { due_date: v.due_date ?? null } : {}),
      ...(v.sort_order !== undefined ? { sort_order: v.sort_order } : {}),
      ...(v.parent_milestone_id !== undefined ? { parent_milestone_id: v.parent_milestone_id } : {}),
    }
    if (Object.keys(data).length === 0) return existing
    return milestonesRepo.update(id, data)
  }

  async function getMilestoneTree(projectId: string): Promise<MilestoneNode[]> {
    // findWhere skips the soft-delete filter → add isNull(deleted_at) explicitly.
    const rows = await milestonesRepo.findWhere(
      and(eq(milestones.project_id, projectId), isNull(milestones.deleted_at))!,
    )
    const byParent = new Map<string | null, MilestoneRow[]>()
    for (const r of rows) {
      const key = r.parent_milestone_id ?? null
      const bucket = byParent.get(key)
      if (bucket) bucket.push(r)
      else byParent.set(key, [r])
    }
    const idSet = new Set(rows.map((r) => r.id))
    const bySort = (a: MilestoneRow, b: MilestoneRow) => a.sort_order - b.sort_order
    const build = (parentId: string): MilestoneNode[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort(bySort)
        .map((r) => ({ ...r, children: build(r.id) }))
    // roots = parent NULL, or a parent that's no longer in the live set (defensive — softDelete SET-NULLs children).
    return rows
      .filter((r) => r.parent_milestone_id == null || !idSet.has(r.parent_milestone_id))
      .slice()
      .sort(bySort)
      .map((r) => ({ ...r, children: build(r.id) }))
  }

  /** PJ-9 — cascade-soft-delete a milestone's deliverables (a deliverable belongs to exactly one milestone; it
   *  has no project-level existence, so it cascades rather than reparenting like a sub-milestone). */
  async function cascadeDeliverables(milestoneId: string): Promise<void> {
    const ds = await deliverablesRepo.findWhere(
      and(eq(deliverables.milestone_id, milestoneId), isNull(deliverables.deleted_at))!,
    )
    for (const d of ds) await deliverablesRepo.delete(d.id)
  }

  async function softDeleteMilestone(id: string): Promise<void> {
    const existing = await milestonesRepo.findById(id)
    if (!existing) throw new MilestoneNotFoundError(id)
    // PJ-9: SET NULL direct sub-milestone links (children become top-level under the project); cascade this
    // milestone's deliverables (S3). Document links are layered in at S5. [cascade retrofit tracker]
    const children = await milestonesRepo.findWhere(
      and(eq(milestones.parent_milestone_id, id), isNull(milestones.deleted_at))!,
    )
    for (const c of children) await milestonesRepo.update(c.id, { parent_milestone_id: null })
    await cascadeDeliverables(id)
    await milestonesRepo.delete(id)
  }

  // ---- S3: deliverables (ADR-011 pursuable) --------------------------------
  async function createDeliverable(milestoneId: string, input: CreateDeliverableInput): Promise<DeliverableRow> {
    const v = CreateDeliverableSchema.parse(input)
    if (!(await milestonesRepo.findById(milestoneId))) throw new MilestoneNotFoundError(milestoneId) // orphan guard
    return deliverablesRepo.create({
      milestone_id: milestoneId,
      title: v.title,
      description: v.description ?? null,
      measurement_kind: v.measurement_kind ?? 'milestone', // ADR-011 M1 (NN; create echoes input)
      binding_mode: v.binding_mode ?? null, // ADR-011 M2 (NULL ⇒ derive-natural)
      progress: v.progress ?? null, // NULL ⇒ derive (PJ-3, S4)
      nesting_weight: v.nesting_weight ?? null, // NULL ⇒ equal-weight (ADR-011 M4)
      sort_order: v.sort_order ?? 0,
      deleted_at: null,
    } satisfies CreateInput<typeof deliverables>)
  }

  async function updateDeliverable(id: string, patch: UpdateDeliverableInput): Promise<DeliverableRow> {
    const v = UpdateDeliverableSchema.parse(patch)
    const existing = await deliverablesRepo.findById(id)
    if (!existing) throw new DeliverableNotFoundError(id)
    const data = {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.measurement_kind !== undefined ? { measurement_kind: v.measurement_kind } : {}),
      ...(v.binding_mode !== undefined ? { binding_mode: v.binding_mode } : {}),
      ...(v.progress !== undefined ? { progress: v.progress } : {}),
      ...(v.nesting_weight !== undefined ? { nesting_weight: v.nesting_weight } : {}),
      ...(v.sort_order !== undefined ? { sort_order: v.sort_order } : {}),
    }
    if (Object.keys(data).length === 0) return existing
    return deliverablesRepo.update(id, data)
  }

  async function listDeliverables(milestoneId: string): Promise<DeliverableRow[]> {
    const rows = await deliverablesRepo.findWhere(
      and(eq(deliverables.milestone_id, milestoneId), isNull(deliverables.deleted_at))!,
    )
    return rows.slice().sort((a, b) => a.sort_order - b.sort_order)
  }

  async function softDeleteDeliverable(id: string): Promise<void> {
    if (!(await deliverablesRepo.findById(id))) throw new DeliverableNotFoundError(id)
    await deliverablesRepo.delete(id)
  }

  return {
    // S1 — projects
    createProject,
    updateProject,
    softDeleteProject,
    getProject,
    listProjects,
    // S2 — milestones
    createMilestone,
    updateMilestone,
    getMilestoneTree,
    softDeleteMilestone,
    // S3 — deliverables
    createDeliverable,
    updateDeliverable,
    listDeliverables,
    softDeleteDeliverable,
  }
}
