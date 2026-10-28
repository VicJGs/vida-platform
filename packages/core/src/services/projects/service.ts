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
import type { EffectType } from '@vida/types'
import { rollup } from '../../foundation/measurement'
import { createAssociationResolver } from '../../foundation/spaces'
import { projects, milestones, deliverables, projectDocuments } from '../../db/schema/projects'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectsFilterSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  CreateDeliverableSchema,
  UpdateDeliverableSchema,
  AddProjectDocumentSchema,
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
  type ProgressView,
  type AddProjectDocumentInput,
  type ProjectPageKind,
  type DeliverableSourceRef,
  type ProjectTaskView,
  type ProjectsDayDigest,
  ProjectNotFoundError,
  MilestoneNotFoundError,
  MilestoneParentError,
  DeliverableNotFoundError,
} from './types'
import type { ProjectRow, MilestoneRow, DeliverableRow, ProjectDocumentRow } from '../../db/schema/projects'
import type { PageRow } from '../../db/schema/notes'

/** App-managed reserved titles for the two guiding project pages (PJ-7; db-4-projects/_index.md:32-33). */
const PROJECT_PAGE_TITLE: Record<ProjectPageKind, string> = { vision: 'Vision', mission: 'Mission' }

export function createProjectsService(deps: ProjectsServiceDeps): ProjectsService {
  const { db, deviceId, spaces, notes, registry, measurementSources, tasks, effects } = deps
  // READ-only association resolver (entity_links/entity_tags) — the read half of the split (WRITES go via spaces).
  const associations = createAssociationResolver(db, deviceId, registry)
  const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

  // S9 — completion fan-out: emit-only, measurement-signal ONLY (C-E2 — never award_xp/grant_currency; gamification's
  // rule turns the signal into XP). Projects + milestones carry `status`; a deliverable has none (S3) → no deliverable
  // completion signal. The natural key is the entity id (a project/milestone completes once; rail-idempotent via
  // effect_event_id = derive(key‖transition‖type)). post-commit, failure-isolated, DORMANT without a handler.
  const COMPLETION_EFFECTS: readonly EffectType[] = ['emit_measurement_signal']
  // `TERMINAL_STATUSES` (completed|cancelled) gates the digest's "active" count; the completion fan-out below keys on
  // 'completed' ONLY — a 'cancelled' terminal is not a completion achievement and emits no signal.
  const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
  async function fanOutCompletion(entityId: string, transition: string): Promise<void> {
    if (!effects) return // M1 default: no rail wired → dormant
    for (const effectType of COMPLETION_EFFECTS) {
      if (!effects.registry.resolve(effectType)) continue // dormant guard: no handler ⇒ skip (would throw NoEffectHandler)
      try {
        await effects.rail.applyEffect({ subjectNaturalKey: entityId, transition, effectType, targetRef: entityId })
      } catch {
        // post-commit, failure-isolated: the completed entity stands; a handler throw is non-fatal.
      }
    }
  }

  // `projects` + `milestones` + `deliverables` all have deleted_at → softDelete:true.
  const projectsRepo = createRepository(db, projects, { deviceId, softDelete: true, encryptedFields: [] })
  const milestonesRepo = createRepository(db, milestones, { deviceId, softDelete: true, encryptedFields: [] })
  const deliverablesRepo = createRepository(db, deliverables, { deviceId, softDelete: true, encryptedFields: [] })
  // `project_documents` has NO deleted_at (faithful §5.4, the PJ-8 vault pattern) → softDelete:false (delete = hard).
  const projectDocumentsRepo = createRepository(db, projectDocuments, {
    deviceId,
    softDelete: false,
    encryptedFields: [],
  })

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
    const updated = await projectsRepo.update(id, data)
    // S9 post-commit: fan-out on the not-completed → completed transition (idempotent on re-complete).
    if (existing.status !== 'completed' && updated.status === 'completed') {
      await fanOutCompletion(id, 'project_completed')
    }
    return updated
  }

  async function softDeleteProject(id: string): Promise<void> {
    if (!(await projectsRepo.findById(id))) throw new ProjectNotFoundError(id)
    // PJ-9 cascade: deleting a project cascades its milestones + their deliverables (S3) + its documents (S5).
    const childMilestones = await milestonesRepo.findWhere(
      and(eq(milestones.project_id, id), isNull(milestones.deleted_at))!,
    )
    for (const m of childMilestones) {
      await cascadeDeliverables(m.id)
      await milestonesRepo.delete(m.id)
    }
    // project_documents has no deleted_at → HARD-delete with the project (§5.4 "deleting a project cascades … documents").
    const docs = await projectDocumentsRepo.findWhere(eq(projectDocuments.project_id, id))
    for (const d of docs) await projectDocumentsRepo.delete(d.id)
    await projectsRepo.delete(id)
  }

  async function getProject(id: string): Promise<ProjectRow | null> {
    return projectsRepo.findById(id)
  }

  async function listProjects(filter?: ListProjectsFilter): Promise<ProjectRow[]> {
    const f = ListProjectsFilterSchema.parse(filter)
    const rows = await projectsRepo.findAll() // applies isNull(deleted_at)
    if (!f) return rows
    return rows.filter((r) => (f.status ? r.status === f.status : true) && (f.scope ? r.scope === f.scope : true))
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
    const updated = await milestonesRepo.update(id, data)
    // S9 post-commit: fan-out on the not-completed → completed transition (idempotent on re-complete).
    if (existing.status !== 'completed' && updated.status === 'completed') {
      await fanOutCompletion(id, 'milestone_completed')
    }
    return updated
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
    // PJ-9: SET NULL document links (a document belongs to the project; milestone_id is a secondary scope — S5).
    const docs = await projectDocumentsRepo.findWhere(eq(projectDocuments.milestone_id, id))
    for (const d of docs) await projectDocumentsRepo.update(d.id, { milestone_id: null })
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

  // ---- S5: document vault (inline encrypted_blob; R2 large-file pipeline = M2) ----
  // M1 is INLINE-ONLY: project_documents (DB-4, §5.4) has no `storage_ref` column, so the ADR-003 R2 pipeline —
  // which needs that column — is deferred to M2 (zero-signature addDocument when it lands). Documents are ZK: the
  // bytes are already-encrypted content stored locally; the server never sees plaintext (PJ-8/PJ-11).
  async function addDocument(projectId: string, input: AddProjectDocumentInput): Promise<ProjectDocumentRow> {
    const { bytes, ...meta } = input // split the raw bytes off the validated metadata
    const v = AddProjectDocumentSchema.parse(meta)
    if (!(await projectsRepo.findById(projectId))) throw new ProjectNotFoundError(projectId) // orphan guard
    if (v.milestoneId != null) {
      const m = await milestonesRepo.findById(v.milestoneId)
      if (!m) throw new MilestoneNotFoundError(v.milestoneId)
      if (m.project_id !== projectId)
        throw new MilestoneParentError(`milestone ${v.milestoneId} belongs to a different project`)
    }
    // buffer-mode blob column → Buffer (Buffer.from accepts a Uint8Array); null when metadata-only.
    const blob = bytes ? Buffer.from(bytes) : null
    return projectDocumentsRepo.create({
      project_id: projectId,
      milestone_id: v.milestoneId ?? null,
      name: v.name,
      file_type: v.file_type ?? null,
      file_size: blob ? blob.byteLength : null,
      encrypted_blob: blob,
    } satisfies CreateInput<typeof projectDocuments>)
  }

  async function getDocument(id: string): Promise<ProjectDocumentRow | null> {
    return projectDocumentsRepo.findById(id)
  }

  async function listDocuments(projectId: string): Promise<ProjectDocumentRow[]> {
    // project_documents has no deleted_at → no soft-delete filter; findWhere has no orderBy, so sort in-memory.
    const rows = await projectDocumentsRepo.findWhere(eq(projectDocuments.project_id, projectId))
    return rows.slice().sort((a, b) => a.created_at - b.created_at)
  }

  // ---- S6: vision/mission pages + entity_tags ------------------------------
  // Vision & Mission are `pages` with entity_type='project' — NOT a dedicated PAGE_TYPE (db-4-projects/_index.md:32-33
  // "mission is a page, not a column"). The service find-or-creates each by a reserved, app-managed title (type='note').
  // General project/milestone/deliverable notes are the FE's to manage via NotesService directly (entity_type is
  // registered); the projects service only owns the two guiding pages + tag writes.
  async function getProjectPage(projectId: string, kind: ProjectPageKind): Promise<PageRow> {
    if (!(await projectsRepo.findById(projectId))) throw new ProjectNotFoundError(projectId)
    const title = PROJECT_PAGE_TITLE[kind]
    const existing = (await notes.getPagesForEntity('project', projectId)).find(
      (p) => p.type === 'note' && p.title === title,
    )
    if (existing) return existing
    return notes.createPage({ type: 'note', title, entity_type: 'project', entity_id: projectId })
  }

  // entity_tags WRITES delegate to SpacesService (the READ/registry owner); spaces validates entity_type against the
  // taggable-type registry (project/milestone/deliverable are pre-seeded). Thin scoped wrappers (PJ-12).
  async function tagEntity(entityType: string, entityId: string, tagId: string): Promise<void> {
    await spaces.tagEntity(tagId, entityType, entityId)
  }
  async function untagEntity(entityType: string, entityId: string, tagId: string): Promise<void> {
    await spaces.untagEntity(tagId, entityType, entityId)
  }

  // ---- S7: deliverable derived-pull measurement (M5/R7 source seam) --------
  // Binding = an entity_links row (deliverable → source), WRITTEN via spaces.createLink (page_id=deliverableId as
  // the source anchor; db-4-projects/_index.md:32-33 §3c). Resolution = the ADR-011 §3.6 measurement-source seam
  // (deriveDeliverableLeaf, above). The source `entityType` must be a registered taggable type (spaces validates).
  async function linkDeliverableSource(deliverableId: string, source: DeliverableSourceRef): Promise<void> {
    if (!(await deliverablesRepo.findById(deliverableId))) throw new DeliverableNotFoundError(deliverableId)
    // NOTE (g2-S7-nit-2): the ADR-011 §3.7 author-time cycle guard on binding edges is homed to S4/measurement
    // (assertAcyclic) + M2 (when real advertisers land) — at M1 sources are opaque external ids that can't back-
    // reference a deliverable, so no binding DAG can form. Not enforced here by design.
    await spaces.createLink(deliverableId, source.entityType, source.entityId)
  }
  async function unlinkDeliverableSource(deliverableId: string, source: DeliverableSourceRef): Promise<void> {
    if (!(await deliverablesRepo.findById(deliverableId))) throw new DeliverableNotFoundError(deliverableId)
    await spaces.removeLink(deliverableId, source.entityType, source.entityId)
  }
  async function getDeliverableSources(deliverableId: string): Promise<DeliverableSourceRef[]> {
    // outbound entity_links where page_id=deliverableId (the association resolver's read half).
    const res = await associations.resolveAssociations(
      { entityType: 'deliverable', entityId: deliverableId },
      'separate',
    )
    const links = res.mode === 'separate' ? res.links : []
    return links.map((l) => ({ entityType: l.target.entityType, entityId: l.target.entityId }))
  }

  // ---- S8: Tasks→Projects seam (deny-safe; Tasks owns the entity, PJ-5/PJ-6) -----
  // The dedicated read port is the ONLY way Projects touches tasks (never a direct table read). ABSENT at M1
  // (services/tasks #65 not built) ⇒ documented empty values. The Task→Deliverable rollup leaf is wired in
  // deriveDeliverableLeaf (above).
  async function getProjectTasks(projectId: string): Promise<ProjectTaskView[]> {
    if (!(await projectsRepo.findById(projectId))) throw new ProjectNotFoundError(projectId)
    return tasks ? tasks.listProjectTasks(projectId) : []
  }
  async function getProjectTime(projectId: string): Promise<number> {
    if (!(await projectsRepo.findById(projectId))) throw new ProjectNotFoundError(projectId)
    return tasks ? tasks.getFocusMinutes(projectId) : 0 // PJ-6: project time = sum of task focus minutes
  }

  // ---- S9: Journal /summary digest -----------------------------------------
  // active projects (non-terminal, live) + milestones due on `date` (live, non-completed). Project events / global
  // Calendar are partner-domain-owned (no events table) → not in this digest. PULL path (the Journals registry calls
  // this at render; NOT a rail push — the completion fan-out is measurement-only, C-E2).
  async function getDayProjectsDigest(date: string): Promise<ProjectsDayDigest> {
    const allProjects = await projectsRepo.findAll() // applies isNull(deleted_at)
    const activeProjects = allProjects.filter((p) => !TERMINAL_STATUSES.has(p.status)).length
    const due = await milestonesRepo.findWhere(and(eq(milestones.due_date, date), isNull(milestones.deleted_at))!)
    const dueMilestones = due.filter((m) => m.status !== 'completed').length
    return { activeProjects, dueMilestones }
  }

  // ---- S4: derived progress (bottom-up rollup, override-wins, nesting_weight) ----
  // All internal resolvers work in the measurement engine's [0,1] space (columns are 0-100 → scale at the
  // boundary). A null is UNMEASURED and is excluded from the rollup (never coerced to 0, BR-2). The chain is
  // Task → Deliverable → Milestone → Project; the Task leaf (S8) + the derived-pull source (S7) plug into
  // `deriveDeliverableLeaf` later. Hierarchy acyclicity is enforced at write-time (S2 `wouldCycle`); the `seen`
  // set here is a defensive recursion backstop (the measurement `assertAcyclic` guard is for S7 source bindings).

  const toPct = (frac: number | null): number | null => (frac === null ? null : Math.round(frac * 100))

  /** The derived leaf for a deliverable (S7): a `derived-pull` deliverable reads its bound measurement source(s)
   *  via the ADR-011 §3.6 seam. First bound+advertised source (a [0,1] measure) wins. Absent registry / no bound /
   *  unadvertised source ⇒ null (unmeasured — never fabricated, BR-2; last-known+flag on outage is M2 runtime).
   *  `manual`/`event-trigger` (no override) ⇒ null; the task-rollup leaf (S8) is a further input. */
  async function deriveDeliverableLeaf(d: DeliverableRow): Promise<number | null> {
    // (a) Task leaf first (PJ-3 Task→Deliverable; PJ-4 "a deliverable with no tasks derives from its measurement
    //     backend"): a deliverable with tasks derives from their completion via the deny-safe Tasks port (S8).
    if (tasks) {
      const t = await tasks.getTaskRollup({ entityType: 'deliverable', entityId: d.id })
      if (t !== null) return clamp01(t)
    }
    // (b) else a `derived-pull` deliverable measures from its bound measurement source (S7, ADR-011 §3.6).
    if (d.binding_mode === 'derived-pull' && measurementSources) {
      const sources = await getDeliverableSources(d.id)
      for (const s of sources) {
        const v = measurementSources.query(`${s.entityType}:${s.entityId}`)
        if (v !== null) return clamp01(v) // a [0,1] queryable measure; raw-value normalization (baseline/target) = M2 DDL
      }
    }
    return null // unmeasured (never fabricated, BR-2)
  }

  /** Resolve a deliverable to [0,1]|null — stored override wins (ADR-011 §3.2), else the derived leaf (S7). */
  async function resolveDeliverableFrac(d: DeliverableRow): Promise<number | null> {
    if (d.progress !== null) return d.progress / 100 // manual override wins (resolveProgress semantics)
    return deriveDeliverableLeaf(d)
  }

  /** Resolve a milestone to [0,1]|null — override wins, else a weighted rollup of sub-milestones + deliverables. */
  async function resolveMilestoneFrac(m: MilestoneRow, seen: Set<string>): Promise<number | null> {
    if (seen.has(m.id)) return null // defensive cycle backstop
    seen.add(m.id)
    if (m.progress !== null) return m.progress / 100 // manual override wins
    const children = await milestoneChildFracs(m.id, seen)
    return rollup(children)
  }

  /** The direct rollup children of a milestone: its sub-milestones + its deliverables, each with its nesting_weight. */
  async function milestoneChildFracs(
    milestoneId: string,
    seen: Set<string>,
  ): Promise<{ progress: number | null; weight: number | null }[]> {
    const subMs = await milestonesRepo.findWhere(
      and(eq(milestones.parent_milestone_id, milestoneId), isNull(milestones.deleted_at))!,
    )
    const delivs = await deliverablesRepo.findWhere(
      and(eq(deliverables.milestone_id, milestoneId), isNull(deliverables.deleted_at))!,
    )
    const subFracs = await Promise.all(
      subMs.map(async (sm) => ({ progress: await resolveMilestoneFrac(sm, seen), weight: sm.nesting_weight })),
    )
    const delivFracs = await Promise.all(
      delivs.map(async (d) => ({ progress: await resolveDeliverableFrac(d), weight: d.nesting_weight })),
    )
    return [...subFracs, ...delivFracs]
  }

  /** A rollup that also reports whether it drew on a measured SUBSET (PJ-3 partial flag). */
  function rollWithPartial(children: { progress: number | null; weight: number | null }[]): {
    rolled: number | null
    partial: boolean
  } {
    const rolled = rollup(children)
    const measured = children.filter((c) => c.progress !== null).length
    return { rolled, partial: rolled !== null && measured < children.length }
  }

  async function getDeliverableProgress(id: string): Promise<ProgressView> {
    const d = await deliverablesRepo.findById(id)
    if (!d) throw new DeliverableNotFoundError(id)
    if (d.progress !== null) return { value: d.progress, derived: false, partial: false }
    return { value: toPct(await deriveDeliverableLeaf(d)), derived: true, partial: false }
  }

  async function getMilestoneProgress(id: string): Promise<ProgressView> {
    const m = await milestonesRepo.findById(id)
    if (!m) throw new MilestoneNotFoundError(id)
    if (m.progress !== null) return { value: m.progress, derived: false, partial: false }
    const children = await milestoneChildFracs(m.id, new Set([m.id]))
    const { rolled, partial } = rollWithPartial(children)
    return { value: toPct(rolled), derived: true, partial }
  }

  async function getProjectProgress(id: string): Promise<ProgressView> {
    const p = await projectsRepo.findById(id)
    if (!p) throw new ProjectNotFoundError(id)
    if (p.progress !== null) return { value: p.progress, derived: false, partial: false }
    // top-level milestones = parent_milestone_id NULL (sub-milestones roll up inside their parent).
    const topMs = await milestonesRepo.findWhere(
      and(eq(milestones.project_id, id), isNull(milestones.parent_milestone_id), isNull(milestones.deleted_at))!,
    )
    const children = await Promise.all(
      topMs.map(async (m) => ({ progress: await resolveMilestoneFrac(m, new Set()), weight: m.nesting_weight })),
    )
    const { rolled, partial } = rollWithPartial(children)
    return { value: toPct(rolled), derived: true, partial }
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
    // S4 — derived progress
    getDeliverableProgress,
    getMilestoneProgress,
    getProjectProgress,
    // S5 — document vault
    addDocument,
    getDocument,
    listDocuments,
    // S6 — pages + tags
    getProjectPage,
    tagEntity,
    untagEntity,
    // S7 — deliverable derived-pull measurement
    linkDeliverableSource,
    unlinkDeliverableSource,
    getDeliverableSources,
    // S8 — Tasks→Projects seam
    getProjectTasks,
    getProjectTime,
    // S9 — Journal digest
    getDayProjectsDigest,
  }
}
