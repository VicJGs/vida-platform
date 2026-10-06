<!-- CURRENT-SPEC · module: projects · the living contract (§XXIX Currency Rule) · never lags the code -->

# Projects — CURRENT SPEC  (`@vida/core` `services/projects`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-projects ① S1 (LIF-135, #54). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createProjectsService(deps)` — the ① backend service tier for **Projects** over DB-4 `016_projects`
(4 tables: `projects` · `milestones` · `deliverables` · `project_documents`). The full design lives in
`docs/features/projects/` (aspect docs) + `docs/features/projects/delivery/` (interpretation · slice-map ·
seam-contract). Build state: **① IN PROGRESS — S4 of 9 shipped.**

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

## Gates (per slice)
- **S1:** tsc 0 · eslint 0 · live-store **10/10** · g1 Decomposition SHIP · g2 code-review SHIP · /critique SHIP.
- **S2:** tsc 0 · eslint 0 · live-store **18/18** (cumulative) · g2 code-review SHIP (+ cascade retrofit) · /critique SHIP.
- **S3:** tsc 0 · eslint 0 · live-store **25/25** (cumulative) · g2 code-review SHIP · /critique SHIP.
- **S4:** tsc 0 · eslint 0 · live-store **33/33** (cumulative, Node 24) · g2 code-review SHIP · /critique SHIP.
- Full `@vida/core` suite green (no regression).
