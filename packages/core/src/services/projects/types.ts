// services/projects — types (mod-projects #54 · LIF-135 ①)
//
// The ProjectsService public surface + deps, built PER SLICE (Entity Delivery Flow).
// `ProjectsServiceDeps` GROWS per slice: S1 = { db, deviceId }; `spaces`/`notes` land at S6; the deny-safe
// partner ports (`tasks?`/`finance?`/`attachment?`/`effects?`/…) at their slices. The seam-contract §A is the
// S9 end-state, NOT the S1 shape (docs/features/projects/delivery/seam-contract.md).
//
// Return types are the Drizzle Row types (NOT @vida/types `Project` — it still carries `tags`/NN-`progress` and
// has no `Deliverable`; the interface reconcile is DB-11 mirror-only). [[drizzle-row-not-assignable-to-vida-types-interface]]

import type { DrizzleDb } from '../../db/adapter'
import type { ProjectRow } from '../../db/schema/projects'
import type { ProjectScope, ProjectComplexity, Status, Priority } from '@vida/types'

// --- deps (S1 subset) --------------------------------------------------------
export interface ProjectsServiceDeps {
  db: DrizzleDb
  deviceId: string
  // grows per slice — see file header.
}

// --- S1 inputs ---------------------------------------------------------------
export interface CreateProjectInput {
  title: string
  description?: string | null
  /** one-line summary only; the guiding vision is a page (PJ-7, S6) */
  vision?: string | null
  scope?: ProjectScope
  complexity?: ProjectComplexity
  status?: Status
  priority?: Priority
  /** 0-100 manual override; omit ⇒ NULL ⇒ derive on read (PJ-3, S4) */
  progress?: number | null
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  /** minutes (despite the name) */
  estimated_hours?: number | null
  actual_hours?: number | null
  color?: string | null
  icon?: string | null
}

export interface UpdateProjectInput {
  title?: string
  description?: string | null
  vision?: string | null
  scope?: ProjectScope
  complexity?: ProjectComplexity
  status?: Status
  priority?: Priority
  progress?: number | null
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  color?: string | null
  icon?: string | null
}

export interface ListProjectsFilter {
  /** archived = a status filter (completed/cancelled), not a new state (G9) */
  status?: Status
  scope?: ProjectScope
}

// --- service surface (S1; grows per slice) -----------------------------------
export interface ProjectsService {
  createProject(input: CreateProjectInput): Promise<ProjectRow>
  updateProject(id: string, patch: UpdateProjectInput): Promise<ProjectRow>
  softDeleteProject(id: string): Promise<void>
  getProject(id: string): Promise<ProjectRow | null>
  listProjects(filter?: ListProjectsFilter): Promise<ProjectRow[]>
}

// --- typed errors ------------------------------------------------------------
export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project not found: ${id}`)
    this.name = 'ProjectNotFoundError'
  }
}
