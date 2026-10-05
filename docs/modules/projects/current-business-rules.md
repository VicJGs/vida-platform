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
  projects are hidden from `getProject` and `listProjects`. The **PJ-9 cascade** to milestones/deliverables/
  documents is layered in as those child repos land (S2/S3/S5) — a provable no-op at S1 (no child can yet exist).
- **BR-PJ-S1-7** — `listProjects` reads via `findAll` (which applies the soft-delete filter), NOT `findWhere`
  (which skips it); filtering by `status`/`scope` is in-memory. **Archived is a status filter (completed/
  cancelled), not a distinct state** (G9).
- **BR-PJ-S1-8** — Service methods return **`ProjectRow`** (Drizzle row), not the `@vida/types` `Project`
  interface (reconcile deferred to DB-11, mirror-only).

## Deferred (homed, not dropped)
PJ-9 cascade completion (S2/S3/S5) · tags via `entity_tags` (S6) · vision/mission/notes pages (S6) · progress
derivation (S4) · deliverable measurement source seam (S7) · Tasks→Projects seam + project time (S8) · effects
fan-out + Journal `/summary` (S9) · `@vida/types` interface reconcile (DB-11) · external/AI integrations (M2) ·
the entire ② surface incl. `pinProject`/views (fe-projects, P6).
