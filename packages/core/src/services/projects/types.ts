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
import type { ProjectRow, MilestoneRow, DeliverableRow } from '../../db/schema/projects'
import type { ProjectScope, ProjectComplexity, Status, Priority, MeasurementKind, BindingMode } from '@vida/types'

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

// --- S2 inputs (milestones) --------------------------------------------------
export interface CreateMilestoneInput {
  title: string
  description?: string | null
  status?: Status
  /** 0-100 manual override; omit ⇒ NULL ⇒ derive (PJ-3, S4) */
  progress?: number | null
  /** ADR-011 §3.3 M4 DOWN weight; omit ⇒ NULL ⇒ equal-weight */
  nesting_weight?: number | null
  due_date?: string | null
  sort_order?: number
  /** nest under another milestone of the SAME project (self-ref, no-FK) */
  parent_milestone_id?: string | null
}

export interface UpdateMilestoneInput {
  title?: string
  description?: string | null
  status?: Status
  progress?: number | null
  nesting_weight?: number | null
  due_date?: string | null
  sort_order?: number
  /** reparent: must resolve to a milestone of the same project, non-self, non-descendant (acyclic) */
  parent_milestone_id?: string | null
}

/** A milestone row plus its nested children (by `parent_milestone_id`), ordered by `sort_order`. */
export type MilestoneNode = MilestoneRow & { children: MilestoneNode[] }

// --- S3 inputs (deliverables — the ADR-011 pursuable level) -------------------
export interface CreateDeliverableInput {
  title: string
  description?: string | null
  /** ADR-011 M1 — the measure shape. Omit ⇒ 'milestone' (the implicit-rollup default). */
  measurement_kind?: MeasurementKind
  /** ADR-011 M2 — how progress binds. Omit ⇒ NULL ⇒ derive-natural (not a column default). */
  binding_mode?: BindingMode | null
  /** 0-100 manual override; omit ⇒ NULL ⇒ derive (PJ-3, S4) */
  progress?: number | null
  /** ADR-011 §3.3 M4 DOWN weight; omit ⇒ NULL ⇒ equal-weight */
  nesting_weight?: number | null
  sort_order?: number
}

export interface UpdateDeliverableInput {
  title?: string
  description?: string | null
  measurement_kind?: MeasurementKind
  binding_mode?: BindingMode | null
  progress?: number | null
  nesting_weight?: number | null
  sort_order?: number
}

// --- service surface (grows per slice) ---------------------------------------
export interface ProjectsService {
  // S1 — projects
  createProject(input: CreateProjectInput): Promise<ProjectRow>
  updateProject(id: string, patch: UpdateProjectInput): Promise<ProjectRow>
  softDeleteProject(id: string): Promise<void>
  getProject(id: string): Promise<ProjectRow | null>
  listProjects(filter?: ListProjectsFilter): Promise<ProjectRow[]>
  // S2 — milestones
  createMilestone(projectId: string, input: CreateMilestoneInput): Promise<MilestoneRow>
  updateMilestone(id: string, patch: UpdateMilestoneInput): Promise<MilestoneRow>
  getMilestoneTree(projectId: string): Promise<MilestoneNode[]>
  softDeleteMilestone(id: string): Promise<void>
  // S3 — deliverables
  createDeliverable(milestoneId: string, input: CreateDeliverableInput): Promise<DeliverableRow>
  updateDeliverable(id: string, patch: UpdateDeliverableInput): Promise<DeliverableRow>
  listDeliverables(milestoneId: string): Promise<DeliverableRow[]>
  softDeleteDeliverable(id: string): Promise<void>
}

// --- typed errors ------------------------------------------------------------
export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project not found: ${id}`)
    this.name = 'ProjectNotFoundError'
  }
}

export class MilestoneNotFoundError extends Error {
  constructor(id: string) {
    super(`Milestone not found: ${id}`)
    this.name = 'MilestoneNotFoundError'
  }
}

/** A parent milestone resolves to a different project, or a reparent would create a cycle (PJ-2/PJ-9). */
export class MilestoneParentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MilestoneParentError'
  }
}

export class DeliverableNotFoundError extends Error {
  constructor(id: string) {
    super(`Deliverable not found: ${id}`)
    this.name = 'DeliverableNotFoundError'
  }
}
