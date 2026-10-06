<!-- CURRENT-SPEC · module: projects · the living contract (§XXIX Currency Rule) · never lags the code -->

# Projects — CURRENT SPEC  (`@vida/core` `services/projects`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-projects ① S1 (LIF-135, #54). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createProjectsService(deps)` — the ① backend service tier for **Projects** over DB-4 `016_projects`
(4 tables: `projects` · `milestones` · `deliverables` · `project_documents`). The full design lives in
`docs/features/projects/` (aspect docs) + `docs/features/projects/delivery/` (interpretation · slice-map ·
seam-contract). Build state: **① COMPLETE — S9 of 9 shipped.**

> **Test runtime: Node 24** (better-sqlite3 ABI = NODE_MODULE_VERSION 137). Run `nvm use 24` before vitest.

Slice plan (9): **S1 projects CRUD + queries** · S2 milestones (nestable tree) · S3 deliverables
(`measurement_kind`×`binding_mode`) · S4 progress-derivation engine (bottom-up rollup via
`foundation/measurement`) · S5 document vault (inline + R2 seam) · S6 pages (vision/mission/notes) +
`entity_tags` · S7 deliverable derived-pull measurement (M5/R7 source seam) · S8 Tasks→Projects seam
(deny-safe) · S9 cross-module fan-out (effects) + Journal `/summary`.

## S1 — projects CRUD + queries (shipped)

- `createProjectsService(deps: { db, deviceId })` → the `ProjectsService` object. `deps` **grows per slice**
  (`spaces`/`notes` at S6; deny-safe `tasks?`/`finance?`/`attachment?`/`effects?`/… at their slices). The
  seam-contract §A is the S9 end-state, not the S1 shape.
- `projects` repo: `softDelete:true`, `encryptedFields:[]` (M1.0 pass-through; `[E]` title/description/vision
  are the M3 target).
- Surface: `createProject` · `updateProject` · `softDeleteProject` · `getProject` · `listProjects(filter?)`.
- Return type = **`ProjectRow`** (Drizzle `$inferSelect`), NOT the `@vida/types` `Project` interface (the
  interface still carries `tags`/NN-`progress` and has no `Deliverable` → reconcile is DB-11 mirror-only).
- `createProject` **backfills NN-default cols** (scope/complexity/status/priority) in the create input, because
  `Repository.create` echoes the input row rather than SQL defaults.
- `progress` omitted ⇒ **NULL** (the nullable override slot — NULL ⇒ derive-on-read at S4; never
  `NOT NULL DEFAULT 0`).
- `updateProject`: existence-check → `ProjectNotFoundError`; a no-op patch (all fields undefined) returns the
  existing row without a write (no `updated_at` bump / sync-queue row).
- `listProjects(filter?)`: reads via `findAll` (applies `isNull(deleted_at)`) then filters `status`/`scope`
  in-memory. **Archived = a status filter (completed/cancelled), not a new state** (G9).

## S2 — milestones (nestable tree) (shipped)

- `milestones` repo: `softDelete:true`, `encryptedFields:[]`. Surface: `createMilestone(projectId, input)` ·
  `updateMilestone` · `getMilestoneTree(projectId)` · `softDeleteMilestone`.
- **Orphan guard (no-FK, PJ-9):** `createMilestone` fails loud (`ProjectNotFoundError`) if the project is
  absent; a `parent_milestone_id` must resolve to a milestone of the **same project** (else
  `MilestoneParentError`).
- **Nesting:** self-ref `parent_milestone_id`. `updateMilestone` reparent is guarded — non-self, parent
  same-project, and **acyclic** (`wouldCycle` walks up from the new parent; `MilestoneParentError` on a cycle).
- `getMilestoneTree`: reads via `findWhere(and(eq(project_id), isNull(deleted_at))!)` (explicit soft-delete
  filter — `findWhere` skips it), builds a nested tree (roots = parent NULL **or** parent not in the live set),
  each level ordered by `sort_order`.
- **PJ-9 delete:** `softDeleteMilestone` SET-NULLs direct children's `parent_milestone_id` (they become
  top-level under the project) then soft-deletes. Document-link SET-NULL (S5) + deliverable reparent/cascade
  (S3) are layered in as those repos land.
- `status` default backfilled (create echoes input); `progress`/`nesting_weight` NULL⇒derive/equal; no-op patch
  is a no-write; returns `MilestoneRow`.

## S3 — deliverables (ADR-011 pursuable) (shipped)

- `deliverables` repo: `softDelete:true`, `encryptedFields:[]`. Surface: `createDeliverable(milestoneId, input)` ·
  `updateDeliverable` · `listDeliverables(milestoneId)` · `softDeleteDeliverable`.
- **Orphan guard:** `createDeliverable` fails loud (`MilestoneNotFoundError`) if the milestone is absent.
- **ADR-011 fields:** `measurement_kind` NN, backfilled to `'milestone'` (create echoes input); `binding_mode`
  nullable, **no default** (NULL ⇒ derive-natural); `progress` NULL⇒derive (S4); `nesting_weight` NULL⇒equal.
  **No `status`/`due_date`/`source`** — deliberate asymmetry vs milestones (`db-4-projects/_index.md §3c`);
  source binding is an `entity_links` row + the M5/R7 seam (S7), not a column.
- `listDeliverables`: `findWhere(and(eq(milestone_id), isNull(deleted_at))!)` sorted by `sort_order`.
- `updateDeliverable`: existence → `DeliverableNotFoundError`; no-op patch is a no-write; returns `DeliverableRow`.
- **PJ-9 cascade completed for live repos:** `softDeleteMilestone` now cascade-soft-deletes its deliverables
  (a deliverable belongs to exactly one milestone — cascade, not reparent) via `cascadeDeliverables`;
  `softDeleteProject` cascades milestones **and** their deliverables. Document cascade lands at S5.

## S4 — derived progress (PJ-3) (shipped)

- Surface: `getDeliverableProgress` · `getMilestoneProgress` · `getProjectProgress`, each → `ProgressView
  { value: number|null, derived: boolean, partial: boolean }` (the g1-nit-2 DECIDE, resolved here).
- Composes `foundation/measurement`: `rollup` (weighted mean of measured children, NULL/0 weight⇒equal,
  all-null⇒null) + `resolveProgress` (stored override wins). Internal resolvers work in **[0,1]**; the stored
  0-100 column is scaled at the boundary (`/100` in, `Math.round(*100)` out).
- **Chain:** Task → Deliverable → Milestone → Project. A milestone rolls up its **sub-milestones + its
  deliverables** (each weighted by `nesting_weight`); a project rolls up its **top-level** milestones
  (`parent_milestone_id` NULL). The deliverable **leaf** (`deriveDeliverableLeaf`) is `null` at S4 — the
  derived-pull source plugs in at S7, the task rollup at S8.
- **Override wins** (`derived=false`); an unmeasured child is **excluded** (never coerced to 0, BR-2); a rollup
  over a measured subset sets `partial=true` (PJ-3 flagged-partial); all-null ⇒ `value:null`, not partial.
- Hierarchy acyclicity is enforced at write (S2 `wouldCycle`) + a `seen`-set recursion backstop; the
  measurement `assertAcyclic` guard is reserved for S7 source bindings.

## S5 — document vault (PJ-8) (shipped)

- `project_documents` repo: **`softDelete:false`** (no `deleted_at` — §5.4 faithful; `delete()` = hard-delete).
  Surface: `addDocument(projectId, input)` · `getDocument(id)` · `listDocuments(projectId)`.
- **M1 is INLINE-ONLY (schema-grounded scope).** `project_documents` has **no `storage_ref` column**, so the
  ADR-003 R2 large-file pipeline (which needs it) is deferred to **M2** — no `attachment?` port is wired at S5
  (nothing to persist a ref to). `addDocument` stores already-encrypted `bytes` inline in `encrypted_blob`
  (`Buffer.from`, buffer-mode column); metadata-only (no bytes) ⇒ null blob + null size. ZK holds: bytes are
  ciphertext content, server never sees plaintext (PJ-8/PJ-11).
- **Guards:** project orphan guard; an optional `milestoneId` must resolve to a milestone of the same project.
- `listDocuments`: `findWhere(eq(project_id))` (no soft-delete filter — table has no `deleted_at`), sorted by
  `created_at`.
- **PJ-9 document cascade:** `softDeleteMilestone` SET-NULLs its documents' `milestone_id` (the document survives
  under the project — a milestone link is secondary); `softDeleteProject` **hard-deletes** its documents
  (§5.4 "deleting a project cascades … project_documents"). The cascade chain is now complete for all 4 tables.
- Barrel: `AddProjectDocumentInput`/`AddProjectDocumentSchema` (renamed to avoid the learning-education
  `AddDocument*` flat-barrel collision — HabitDateRange precedent).

## S6 — vision/mission pages + entity_tags (shipped)

- **Deps change:** `ProjectsServiceDeps` now REQUIRES `spaces: SpacesService` + `notes: NotesService` (the
  entity_tags WRITE + `pages` surfaces). The test harness constructs both over a shared taggable-type registry.
- `getProjectPage(projectId, 'vision'|'mission')`: **title-keyed** find-or-create. Vision/mission are `pages` with
  `entity_type='project'`, **NOT a dedicated `PAGE_TYPE`** (`db-4-projects/_index.md:32-33` — "mission is a page,
  not a column"; `PAGE_TYPE` has no vision/mission slot, and `ensureEntityNote` can't hold two distinct pages per
  entity). Each is a `type='note'` page discriminated by a reserved app-managed title ('Vision'/'Mission');
  idempotent (second call returns the same row). The `projects.vision` column stays the one-line summary (PJ-7).
- `tagEntity`/`untagEntity(entityType, entityId, tagId)`: thin scoped wrappers delegating to
  `SpacesService.tagEntity`/`untagEntity` (which validate `entity_type` against the registry — project/milestone/
  deliverable pre-seeded; unregistered ⇒ throws). General project/milestone/deliverable **notes** are the FE's to
  manage via NotesService directly (entity_type registered); the service owns only the two guiding pages + tags.

## S7 — deliverable derived-pull measurement (M5/R7 seam) (shipped)

- **Deps:** `registry: TaggableTypeRegistry` now REQUIRED (builds the read-only association resolver);
  `measurementSources?: MeasurementSourceRegistry` deny-safe (ADR-011 §3.6).
- **Binding** (`linkDeliverableSource`/`unlinkDeliverableSource`/`getDeliverableSources`): a deliverable→source
  binding is an **`entity_links` row** (`_index §3c`), WRITTEN via `spaces.createLink(deliverableId, sourceType,
  sourceId)` (page_id=deliverableId as the source anchor — plain-TEXT, no page-existence requirement), READ via the
  association resolver's outbound links. Source `entityType` must be registered (account/asset/investment/… are).
- **Resolution** (`deriveDeliverableLeaf`, wiring the S4 leaf): a `derived-pull` deliverable reads its bound
  source(s) and queries `measurementSources` by key `"${entityType}:${entityId}"` (ADR-011 §3.6); first
  bound+advertised [0,1] measure wins (clamped). **M1 deny-safe:** absent registry / unadvertised key / no binding
  ⇒ `null` (unmeasured — never fabricated, BR-2). `manual`/`event-trigger` bindings don't pull a source.
- **Deferred to M2:** real source advertisement (Finance net_worth etc.) + the composition root; raw-value →
  [0,1] normalization needing baseline/target columns (the deferred measurement-taxonomy DDL); last-known+flag on
  source outage (runtime). The resolution PATH + binding persistence are fully M1.
- Deliverable-leaf resolution is now **async** (DB read of the binding); the S4 rollup math is unchanged
  (override-wins, nesting_weight, partial, all-null) — `milestoneChildFracs` `Promise.all`s the deliverable fracs.

## S8 — Tasks→Projects seam (shipped)

- **Deny-safe `tasks?: TasksProjectsPort`** (Tasks owns the entity; `services/tasks` #65 not built; Projects never
  reads the tasks table — PJ-5). ABSENT at M1 ⇒ documented empty values.
- `getProjectTasks(projectId)` → `tasks.listProjectTasks ?? []` (PJ-5 list). `getProjectTime(projectId)` →
  `tasks.getFocusMinutes ?? 0` (PJ-6 — project time = task focus sum; no project-level timer). Both orphan-guarded.
- **Task rollup leaf** (wired into `deriveDeliverableLeaf`): a deliverable's progress precedence is **manual
  override > task leaf > derived-pull source > null**. Tasks-first per PJ-4 ("a deliverable with no tasks derives
  from its measurement backend"); `getTaskRollup({entityType:'deliverable', entityId})` returns [0,1]|null (null ⇒
  falls through to the S7 source). At M1 (tasks absent) the leaf is task-free → source → null, unchanged.

## S9 — cross-module fan-out + Journal (shipped)

- **Deny-safe `effects?: { rail, registry }`** — emit-only producer (no `registerProjectsEffects`; Projects
  registers no handler). On a **project/milestone** not-completed→completed transition (post-commit, in
  `updateProject`/`updateMilestone`), fans out **`emit_measurement_signal` ONLY** (C-E2 — never `award_xp`/
  `grant_currency`; gamification's rule turns the signal into XP). Deliverables have no `status` → no deliverable
  completion signal. Natural key = entity id (grain: completes once; rail-idempotent via `effect_event_id`).
  Dormant without a handler (guard skips, no `NoEffectHandler`); failure-isolated (a handler throw doesn't fail
  the update). Absent rail ⇒ no-op (M1 default).
- **Journal** (`journal.ts`): `getDayProjectsDigest(date)` = active projects (non-terminal, live) + milestones due
  that day (live, non-completed). `createProjectsJournalContribution`/`registerProjectsJournal` — PULL into the
  Journals registry (`module='projects'`, `sectionKey='summary'`), state success/empty by TYPE, idle⇒empty (no
  throw), dedup by module. Project events / global Calendar = partner-owned (no events table) → out of the digest.
- **Deferred M2 seam:** agentic AI over the vault (ADR-015) — no M1 consumer, not a port (YAGNI).

## ① COMPLETE — all 9 slices shipped. Gates (per slice)
- **S1:** tsc 0 · eslint 0 · live-store **10/10** · g1 Decomposition SHIP · g2 code-review SHIP · /critique SHIP.
- **S2:** tsc 0 · eslint 0 · live-store **18/18** (cumulative) · g2 code-review SHIP (+ cascade retrofit) · /critique SHIP.
- **S3:** tsc 0 · eslint 0 · live-store **25/25** (cumulative) · g2 code-review SHIP · /critique SHIP.
- **S4:** tsc 0 · eslint 0 · live-store **33/33** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- **S5:** tsc 0 · eslint 0 · live-store **39/39** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- **S6:** tsc 0 · eslint 0 · live-store **44/44** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- **S7:** tsc 0 · eslint 0 · live-store **50/50** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- **S8:** tsc 0 · eslint 0 · live-store **56/56** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- **S9:** tsc 0 · eslint 0 · live-store **61/61** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- Full `@vida/core` suite green (no regression; 1 known vault-1MB flake, ISOLATED).
