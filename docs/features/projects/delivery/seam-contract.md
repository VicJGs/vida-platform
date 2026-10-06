<!-- Seam Contract — features/projects · Entity Delivery Flow Step 2.
     The service API the ② UI (fe-projects) consumes, + the deny-safe ports the service consumes.
     Signatures are the designed interface; return types are Row/view types (NOT @vida/types — DB-11 reconcile owed). -->

# Seam Contract — Projects service

## A. `createProjectsService(deps: ProjectsServiceDeps)` — deps the service CONSUMES

```ts
interface ProjectsServiceDeps {
  db: DrizzleDb
  deviceId: string
  spaces: SpacesService           // REQUIRED — entity_tags/entity_links WRITE (tags, source-link, note-link)
  notes: NotesService             // REQUIRED — pages (vision/mission/notes)
  // --- REQUIRED from S7 ---
  registry: TaggableTypeRegistry  // builds the read-only association resolver (entity_links source-link reads)
  // --- deny-safe partner ports (ABSENT at M1; no composition root wires services yet) ---
  measurementSources?: MeasurementSourceRegistry  // S7 — the ADR-011 §3.6 source seam. SUPERSEDES the provisional
                                                  //   finance?/external? typed-port sketch below: all derived-pull
                                                  //   sources resolve through the ONE §3.6 registry by "type:id" key
                                                  //   (g2-S7-nit-1). absent/unadvertised ⇒ null (unmeasured, BR-2).
  tasks?: TasksProjectsPort       // S8 — absent ⇒ no task leaf; progress rolls up from deliverables only
  attachment?: AttachmentPort     // S5 — absent ⇒ store INLINE (encrypted_blob); present+reject ⇒ DocumentFileError
  effects?: { rail: EffectRail; registry: EffectRegistry }  // S9 — DORMANT at M1 (no handler); emit-only
                                                            //   (EffectRail/EffectRegistry from foundation/effects; apply barrel-collision guard, g1-nit-1)
  ai?: AiPort                     // S9 — ADR-015 on_device/cloud; M2-facing
  // ~~finance?: FinanceSourcePort~~ / ~~external?: ExternalMetricPort~~ — SUPERSEDED by measurementSources (S7).
  // Real Finance/external advertisers register INTO the §3.6 registry at M2; no per-domain typed port on Projects.
}
```
> `foundation/measurement` (`normalize`/`rollup`/`resolveProgress`/`assertAcyclic`) is **imported directly**,
> not a port (pure, no table).

### Deny-safe port shapes (first-consumer-pull; absent ⇒ documented no-op/empty, never a thrown error)
```ts
interface TasksProjectsPort {                       // Tasks owns the entity (services/tasks NOT built, #65)
  listProjectTasks(projectId: Id): Promise<ProjectTaskView[]>     // absent ⇒ []
  getTaskRollup(scopeRef: EntityRef): Promise<TaskRollup | null>  // counts + progress leaf; absent ⇒ null
  getFocusMinutes(projectId: Id): Promise<number>                 // PJ-6 project time; absent ⇒ 0
}
interface FinanceSourcePort { getAccountValue(ref: EntityRef): Promise<number | null> }  // absent ⇒ null
//   ↑ g1-nit-5: `getAccountValue` name is provisional — grep-VERIFY the real services/finance read method at S7 build, don't invent.
interface AttachmentPort { upload(blob: Uint8Array, meta: FileMeta): Promise<AttachmentRef> }
```

## B. Exposed surface — what ② `fe-projects` CONSUMES (returns Row/view types)

```ts
interface ProjectsService {
  // S1 — projects
  createProject(input): Promise<ProjectRow>
  updateProject(id, patch): Promise<ProjectRow>
  softDeleteProject(id): Promise<void>              // cascade milestones + deliverables + documents (app-layer)
  getProject(id): Promise<ProjectRow | null>
  listProjects(filter?: { status?; scope?; }): Promise<ProjectRow[]>   // archived = status filter (G9)
  // S2 — milestones
  createMilestone(projectId, input): Promise<MilestoneRow>
  updateMilestone(id, patch): Promise<MilestoneRow>
  getMilestoneTree(projectId): Promise<MilestoneNode[]>               // nested via parent_milestone_id
  softDeleteMilestone(id): Promise<void>                              // SET NULL links; reparent/cascade deliverables
  // S3 — deliverables
  createDeliverable(milestoneId, { measurement_kind, binding_mode?, nesting_weight?, title, description? }): Promise<DeliverableRow>
  updateDeliverable(id, patch): Promise<DeliverableRow>
  listDeliverables(milestoneId): Promise<DeliverableRow[]>
  softDeleteDeliverable(id): Promise<void>
  // S4 — derived progress (nullable override wins; null ⇒ derive)
  getProjectProgress(id): Promise<ProgressView>                       // { value: number|null, derived: boolean, partial?: boolean }
  getMilestoneProgress(id): Promise<ProgressView>
  getDeliverableProgress(id): Promise<ProgressView>                   // derived-pull resolves via S7 seam
  // S5 — vault
  addDocument(projectId, { name, file_type?, bytes, milestoneId? }): Promise<ProjectDocumentRow>
  getDocument(id): Promise<ProjectDocumentRow | null>
  listDocuments(projectId): Promise<ProjectDocumentRow[]>
  // S6 — pages + tags
  getProjectPage(id, kind: 'vision' | 'mission'): Promise<PageRow | null>   // via NotesService
  tagEntity(ref: EntityRef, tagId): Promise<void>                           // via SpacesService (scoped)
  // S7 — deliverable source binding
  linkDeliverableSource(id, source: EntityRef): Promise<void>               // entity_links row
  // S8 — tasks seam (read-through; deny-safe)
  getProjectTasks(projectId): Promise<ProjectTaskView[]>
  getProjectTime(projectId): Promise<number>                                // focus minutes (PJ-6)
  // S9 — journal digest (consumed by the Journals registry /summary PULL)
  getDayProjectsDigest(date: string): Promise<ProjectsDayDigest>
}
```

## C. Journal + effects wiring (S9)
- `registerProjectsJournal(registry, svc)` — registers ONE `JournalContribution`; `summary(date)` →
  `svc.getDayProjectsDigest(date)` (active projects + due milestones). PULL, not a rail push (the
  learning-education `journal.ts` precedent). A no-activity day ⇒ empty section, not an error.
- `registerProjectsEffects(...)` (if needed) — emit-only fan-out on completion; grain = the completed
  entity id; guarded/idempotent/post-commit; gamification XP is INTENDED via a registry-guarded consumer
  (dormant at M1). C-E2 emit-only precedent (books/learning).

## D. Error types (typed, exported)
`ProjectNotFound` · `MilestoneNotFound` · `DeliverableNotFound` · `DocumentFileError` (R2/decrypt) ·
`MeasurementSourceUnavailable` (derived-pull source unreachable → last-known + flag; **NO M1 throw site** —
the real `source-registry` returns `null` for an unreachable key, so unreachable ⇒ last-known+flag, never a
throw; keep exported for the ratified surface only, g1-nit-4) ·
`IntegrationConsentRequired` (external/AI server-plaintext without opt-in). Barrel-collision: rename any
that clash at the flat `@vida/core` barrel (HabitDateRange precedent).
