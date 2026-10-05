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

## Deferred (homed, not dropped)
PJ-9 cascade completion (S2/S3/S5) · tags via `entity_tags` (S6) · vision/mission/notes pages (S6) · progress
derivation (S4) · deliverable measurement source seam (S7) · Tasks→Projects seam + project time (S8) · effects
fan-out + Journal `/summary` (S9) · `@vida/types` interface reconcile (DB-11) · external/AI integrations (M2) ·
the entire ② surface incl. `pinProject`/views (fe-projects, P6).
