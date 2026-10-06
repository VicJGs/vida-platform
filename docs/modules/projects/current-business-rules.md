<!-- CURRENT-BUSINESS-RULES · module: projects · §XXIX Currency Rule · never lags the code -->

# Projects — CURRENT BUSINESS RULES  (`@vida/core` `services/projects`)

> Born at mod-projects ① S1 (LIF-135, #54). Inherits the core constitution (`docs/core/business-rules.md`) +
> the Projects aspect invariants (`docs/features/projects/business-rules.md`, PJ-1…PJ-12). The `BR-PJ-S*` rules
> below are the as-built, per-slice truth.

## S1 — projects CRUD + queries

- **BR-PJ-S1-1** — A project's `[E]` content (`title`/`description`/`vision`) is stored M1.0 pass-through
  (`encryptedFields:[]`); real field-level encryption is the M3 target (PJ-1).
- **BR-PJ-S1-2** — `progress` is a **nullable override slot**: omitted ⇒ `NULL` (⇒ derive on read, S4); an
  explicit 0-100 is a manual override. Never `NOT NULL DEFAULT 0` (PJ-3).
- **BR-PJ-S1-3** — `createProject` backfills the NN-default columns (`scope='personal'`,
  `complexity='moderate'`, `status='not_started'`, `priority='medium'`) in the create input (the
  `Repository.create` echoes-input contract).
- **BR-PJ-S1-4** — `updateProject`/`softDeleteProject` on an unknown id reject with `ProjectNotFoundError`
  (fail-loud; async reject, not sync throw).
- **BR-PJ-S1-5** — A no-op `updateProject` patch (all fields undefined) returns the existing row **without a
  write** — no `updated_at` bump, no `sync_queue` row.
- **BR-PJ-S1-6** — `softDeleteProject` soft-deletes (sets `deleted_at`); the row still syncs (LWW). Soft-deleted
  projects are hidden from `getProject` and `listProjects`. The **PJ-9 cascade** now soft-deletes the project's
  milestones (retrofit at S2, once `milestonesRepo` existed); deliverables + documents cascade layer in at S3/S5.
- **BR-PJ-S1-7** — `listProjects` reads via `findAll` (which applies the soft-delete filter), NOT `findWhere`
  (which skips it); filtering by `status`/`scope` is in-memory. **Archived is a status filter (completed/
  cancelled), not a distinct state** (G9).
- **BR-PJ-S1-8** — Service methods return **`ProjectRow`** (Drizzle row), not the `@vida/types` `Project`
  interface (reconcile deferred to DB-11, mirror-only).

## S2 — milestones (nestable tree)

- **BR-PJ-S2-1** — A milestone cannot be created without an existing project (`ProjectNotFoundError`); no-FK, so
  the service enforces the orphan guard (PJ-9).
- **BR-PJ-S2-2** — A `parent_milestone_id` must resolve to a live milestone of the **same project**
  (`MilestoneParentError` on cross-project; `MilestoneNotFoundError` if absent). Milestones nest arbitrarily deep.
- **BR-PJ-S2-3** — Reparenting (`updateMilestone` with `parent_milestone_id`) is rejected if it is self, a
  different project, or would create a **cycle** (`wouldCycle` ancestor-walk) — `MilestoneParentError`.
- **BR-PJ-S2-4** — `getMilestoneTree` returns milestones nested by `parent_milestone_id`, each level ordered by
  `sort_order`; it filters soft-deleted rows explicitly (`findWhere` skips the filter). Roots = parent NULL or a
  parent no longer in the live set.
- **BR-PJ-S2-5** — `softDeleteMilestone` SET-NULLs direct children's `parent_milestone_id` (children reparent to
  top-level under the project) then soft-deletes the milestone (PJ-9 SET-NULL). The row still syncs; it is hidden
  from the tree. Document-link + deliverable cascade land at S5/S3.
- **BR-PJ-S2-6** — `status` backfills to `not_started` on create; `progress` NULL⇒derive (S4), `nesting_weight`
  NULL⇒equal-weight (ADR-011 M4); a no-op patch is a no-write; methods return `MilestoneRow`.

## S3 — deliverables (ADR-011 pursuable)

- **BR-PJ-S3-1** — A deliverable cannot be created without an existing milestone (`MilestoneNotFoundError`;
  orphan guard, no-FK). Deliverables sit under exactly one milestone (PJ-2).
- **BR-PJ-S3-2** — `measurement_kind` (ADR-011 M1) is NN, defaulting to `'milestone'` on create; `binding_mode`
  (M2) is nullable with **no default** (NULL ⇒ derive-natural). These live on `deliverables` ONLY — projects and
  milestones are pure rollups with an implicit `'milestone'` kind (PJ-4).
- **BR-PJ-S3-3** — A deliverable carries **no `status`/`due_date`/`source`** (deliberate asymmetry vs milestones);
  measurement + progress carry its state, and source binding is an `entity_links` row + the M5/R7 seam (S7).
- **BR-PJ-S3-4** — `listDeliverables` returns a milestone's live deliverables ordered by `sort_order` (explicit
  soft-delete filter). `updateDeliverable`/`softDeleteDeliverable` fail loud on an unknown id
  (`DeliverableNotFoundError`); a no-op patch is a no-write; methods return `DeliverableRow`.
- **BR-PJ-S3-5** — **PJ-9 cascade:** deleting a milestone cascade-soft-deletes its deliverables (cascade, not
  reparent — a deliverable has no project-level existence); deleting a project cascades its milestones and their
  deliverables. Document cascade lands at S5.

## S4 — derived progress (PJ-3)

- **BR-PJ-S4-1** — `getDeliverableProgress`/`getMilestoneProgress`/`getProjectProgress` return `ProgressView
  {value, derived, partial}`. `value` is 0-100 or `null` (unmeasured — never 0, BR-2).
- **BR-PJ-S4-2** — A non-null stored `progress` is a **manual override** and wins (`derived=false`,
  `partial=false`); a null stored value is **derived** on read (`derived=true`).
- **BR-PJ-S4-3** — Derivation rolls up bottom-up: a milestone = weighted rollup of its sub-milestones +
  deliverables; a project = weighted rollup of its top-level milestones. Weight = `nesting_weight` (NULL⇒equal).
  Internal math is [0,1]; the 0-100 column is scaled at the boundary.
- **BR-PJ-S4-4** — Unmeasured children are **excluded** from the rollup (an unrated child can't drag a parent
  down); a rollup drawn from a measured **subset** sets `partial=true` (PJ-3 flagged-partial); an all-unmeasured
  set yields `value:null` (not partial).
- **BR-PJ-S4-5** — The deliverable **leaf** is `null` at S4 (no measured source/tasks yet) — the derived-pull
  source wires at S7, the task rollup at S8. Hierarchy recursion is cycle-guarded (S2 write-time + a `seen`
  backstop). `getXProgress` throws the typed not-found error on an unknown id.

## S5 — document vault (PJ-8)

- **BR-PJ-S5-1** — `project_documents` has no `deleted_at` → `softDelete:false`; `addDocument`/`getDocument`/
  `listDocuments`. A document belongs to a project; `milestone_id` is a secondary scope.
- **BR-PJ-S5-2** — **M1 vault is INLINE-ONLY.** The schema has no `storage_ref` column, so the R2 large-file
  pipeline (ADR-003) is deferred to M2. `addDocument` stores already-encrypted `bytes` inline in `encrypted_blob`
  (`Buffer`); metadata-only (no bytes) ⇒ null blob + null `file_size`. Server never sees plaintext (ZK, PJ-11).
- **BR-PJ-S5-3** — `addDocument` fails loud if the project is absent (`ProjectNotFoundError`); an optional
  `milestoneId` must resolve to a milestone of the same project (`MilestoneNotFoundError`/`MilestoneParentError`).
- **BR-PJ-S5-4** — **PJ-9 document cascade:** milestone delete SET-NULLs its documents' `milestone_id` (document
  survives under the project); project delete **hard-deletes** its documents (§5.4). Cascade chain complete for all
  4 tables.

## S6 — vision/mission pages + entity_tags

- **BR-PJ-S6-1** — `spaces: SpacesService` + `notes: NotesService` are REQUIRED deps (entity_tags WRITE + `pages`).
- **BR-PJ-S6-2** — Vision & Mission are `pages` with `entity_type='project'` (NOT a dedicated `PAGE_TYPE` —
  `db-4-projects/_index.md:32-33`). `getProjectPage(id, kind)` find-or-creates a `type='note'` page keyed by a
  reserved app-managed title ('Vision'/'Mission'); idempotent; orphan-guarded (`ProjectNotFoundError`). The
  `projects.vision` column remains the one-line summary (PJ-7).
- **BR-PJ-S6-3** — `tagEntity`/`untagEntity(entityType, entityId, tagId)` delegate to SpacesService (PJ-12); the
  registry validates `entity_type` (project/milestone/deliverable registered; unregistered ⇒ throws). Idempotent
  write / resolve-then-soft-delete. General entity notes are FE-managed via NotesService.

## S7 — deliverable derived-pull measurement (M5/R7 seam)

- **BR-PJ-S7-1** — A deliverable→source binding is an `entity_links` row (`_index §3c`), WRITTEN via
  `spaces.createLink(deliverableId, sourceType, sourceId)` (deliverable id as the source anchor); source
  `entityType` must be registered. `linkDeliverableSource` fails loud if the deliverable is absent
  (`DeliverableNotFoundError`); `getDeliverableSources` reads the outbound links.
- **BR-PJ-S7-2** — A `derived-pull` deliverable derives its progress by querying `measurementSources` (ADR-011
  §3.6) by key `"${entityType}:${entityId}"`; the first bound+advertised [0,1] measure wins (clamped). It overrides
  nothing — a stored `progress` still wins (S4).
- **BR-PJ-S7-3** — Deny-safe/unmeasured (BR-2): absent `measurementSources`, an unadvertised key, or no binding ⇒
  `null` (never fabricated). `manual`/`event-trigger` bindings do not pull a source. Last-known+flag on source
  outage is deferred runtime (M2).
- **BR-PJ-S7-4** — Real source advertisement (Finance etc.) + composition root, and raw→[0,1] normalization
  (baseline/target columns — the deferred taxonomy DDL) are M2. The binding persistence + resolution path are M1.

## S8 — Tasks→Projects seam

- **BR-PJ-S8-1** — Tasks are reached ONLY through the deny-safe `tasks?: TasksProjectsPort` (PJ-5); Projects never
  reads the tasks table. ABSENT at M1 ⇒ `getProjectTasks`=[], `getProjectTime`=0, no task leaf.
- **BR-PJ-S8-2** — `getProjectTime` = sum of task focus-session minutes via the port (PJ-6); no project-level timer.
- **BR-PJ-S8-3** — Deliverable progress precedence: **manual override > task rollup leaf > derived-pull source >
  null**. The task leaf (`getTaskRollup`, [0,1]|null) is consulted first (PJ-3/PJ-4); a null leaf falls through to
  the S7 source. `getProjectTasks`/`getProjectTime` fail loud on a missing project.

## Deferred (homed, not dropped)
PJ-9 cascade completion (S2/S3/S5) · tags via `entity_tags` (S6) · vision/mission/notes pages (S6) · progress
derivation (S4) · deliverable measurement source seam (S7) · Tasks→Projects seam + project time (S8) · effects
fan-out + Journal `/summary` (S9) · `@vida/types` interface reconcile (DB-11) · external/AI integrations (M2) ·
the entire ② surface incl. `pinProject`/views (fe-projects, P6).
