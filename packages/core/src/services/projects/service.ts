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

import { createRepository, type CreateInput } from '../../db/repository'
import { projects } from '../../db/schema/projects'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectsFilterSchema,
} from '../../validators/project'
import {
  type ProjectsService,
  type ProjectsServiceDeps,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ListProjectsFilter,
  ProjectNotFoundError,
} from './types'
import type { ProjectRow } from '../../db/schema/projects'

export function createProjectsService(deps: ProjectsServiceDeps): ProjectsService {
  const { db, deviceId } = deps

  // `projects` has deleted_at → softDelete:true.
  const projectsRepo = createRepository(db, projects, { deviceId, softDelete: true, encryptedFields: [] })

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
    // S1: soft-deletes the project row only. The PJ-9 cascade to milestones/deliverables/documents is layered
    // in as those child repos land (S2/S3/S5) — honest incremental; no child repo exists yet at S1.
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

  return {
    createProject,
    updateProject,
    softDeleteProject,
    getProject,
    listProjects,
  }
}
