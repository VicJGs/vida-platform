<!-- Slice Map — features/projects · Entity Delivery Flow Step 2 (Decomposition Gate).
     Each slice tagged backend|frontend|shared. ① = this build (backend). ② frontend = fe-projects (P6).
     DECIDE-mode where net-new; RATIFY where doc-fixed. Approved at Approval 1 before per-slice work. -->

# Slice Map — Projects ① backend (#54)

**Scope:** 9 backend slices over the 4 DB-4 tables, composing `foundation/measurement` + Spaces + Notes +
deny-safe partner ports. Each slice runs the full per-slice track (Steps 3–11): api-contract → implement →
tsc → **live-store Verification Gate** → code-review → /critique → §XXIX currency. No batching.

| #      | Slice                                             | Tag     | What ships                                                                                                                                                                                                                                                                                                                        | Key BR / cite                                               |
| ------ | ------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **S1** | Project CRUD + queries                            | backend | `createProject`·`updateProject`·`softDeleteProject` (cascade) ·`listProjects(filter)` (dashboard/timeline; archived = status filter, G9) · `getProject`. `ProjectsServiceDeps` skeleton + repos. Extend `validators/project.ts`. DB-11 reconcile note (−tags, progress→nullable).                                                 | PJ-1/PJ-9/PJ-12 · `contract.md:14-18`                       |
| **S2** | Milestones (nestable tree)                        | backend | `createMilestone`(nest via `parent_milestone_id`)·`updateMilestone`·`getMilestoneTree(projectId)`·`softDeleteMilestone` (SET NULL sub-milestone/doc links, reparent/cascade deliverables) · `sort_order`.                                                                                                                         | PJ-2/PJ-9 · `contract.md:20-22`                             |
| **S3** | Deliverables                                      | backend | `createDeliverable(milestoneId,{measurement_kind,binding_mode?,nesting_weight?})`·`updateDeliverable`·`listDeliverables(milestoneId)`·`softDeleteDeliverable`. measurement_kind NN dflt `milestone`; binding_mode nullable. No status/due_date (by design).                                                                       | PJ-2/PJ-4 · `db-4-projects/_index.md §3c`                   |
| **S4** | Progress derivation engine                        | backend | `getProjectProgress`·`getMilestoneProgress`·`getDeliverableProgress` — bottom-up rollup (Task→Deliverable→Milestone→Project) via `foundation/measurement` `rollup`/`resolveProgress`; **nullable override wins**; `nesting_weight` weighting (NULL⇒equal); `assertAcyclic` guard. The heart (PJ-3).                               | PJ-3/PJ-3b · `ADR-011 §3.3/§3.4` · `foundation/measurement` |
| **S5** | Document vault                                    | backend | `addDocument`(inline `encrypted_blob` ≤threshold, else deny-safe `attachment?`/R2)·`getDocument`·`listDocuments(projectId)`. `project_documents` `softDelete:false`; hard-delete-with-project cascade. R2 reject ⇒ `DocumentFileError`, kept local.                                                                               | PJ-8 · `contract.md:47-48`                                  |
| **S6** | Pages (vision/mission/notes) + tags               | backend | vision/mission/notes as `pages` via `NotesService` (`entity_type` ∈ project·milestone·deliverable); `getProjectPage(id,'vision'\|'mission')`. `entity_tags` via `SpacesService.tagEntity` (scoped). vision column = one-line summary only.                                                                                        | PJ-7/PJ-12/G3/G10 · `contract.md:33-35`                     |
| **S7** | Deliverable derived-pull measurement (M5/R7 seam) | backend | `linkDeliverableSource(id, entityRef)` (an `entity_links` row) + the source seam resolving a bound source for a `derived-pull` deliverable (deny-safe `finance?` / external metric ports); progress derives from source; unreachable ⇒ last-known + typed flag.                                                                   | PJ-4 · `business-rules.md` edge · `conventions.md:14-16`    |
| **S8** | Tasks→Projects seam + rollup leaf                 | backend | service surface `getProjectTasks`/`getProjectTime` (PJ-6 focus-session sum) over deny-safe `tasks?: TasksProjectsPort` (port: `listProjectTasks`/`getTaskRollup`/`getFocusMinutes`). Absent ⇒ no task leaf (rollup uses deliverables only). Never a direct task-table read. (g1-nit-3: keep service/port names aligned at build.) | PJ-5/PJ-6 · `contract.md:28-30`                             |
| **S9** | Cross-module fan-out + Journal                    | backend | `effects?` emit-only on project/milestone/deliverable completion (guarded/idempotent/post-commit; gamification XP INTENDED via registry-guarded) · `registerProjectsJournal`+`getDayProjectsDigest` (`/summary` PULL: active projects + due milestones) · external/AI deny-safe ports finalized (ADR-014/015, M2-facing).         | PJ-10/PJ-11/G8 · `contract.md:38-41`                        |

## Backend / frontend split

- **All 9 slices are backend (①).** This task builds `@vida/core` service logic only.
- **② `fe-projects` (P6, separate):** dashboard/timeline/board/Kanban views, pinned-project, standalone pages,
  the project-task UI. **`pinProject` + active-view + pinned-project are ② (Zustand ephemeral)** — explicitly
  OUT of ① (no schema column; `interpretation.md` IMPLICIT RULE 1). No shared slice in this task.

## Mode per slice

- **RATIFY-leaning:** S1–S6 shapes are doc-fixed (schema + aspect docs close them) → author to spec, no design decision.
- **DECIDE-leaning (bounded by docs):** S7 source-seam resolution shape + S9 fan-out grain — resolve against
  `foundation/measurement` source-registry + the C-E2 emit-only precedent (learning/books); no net-new axis.
- **S4 `ProgressView` flag-channel (`{value,derived,partial?}`) is a DECIDE, not RATIFY** (the precedent returns
  bare `number|null`): the richer shape serves PJ-3 "flagged partial/last-known" (`business-rules.md:73-74`) —
  resolve the exact shape at S4's `/api-contract` step. (g1-nit-2.)

## Deferred / out of scope (homed, not dropped)

- Schema/DDL (DB-4 done) · `project_contacts`/`project_habits`/events (partner domains) · R2 live pipeline
  (M2) · external-ingest/AI live (M2) · `@vida/types` interface reconcile (DB-11, mirror-only) · the entire
  ② surface (fe-projects, P6) · `contributions` UP-ladder writes (Purpose-owned).
