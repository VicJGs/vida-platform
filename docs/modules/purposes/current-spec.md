# Purposes & Goals — Current Spec (as-built)

> §XXIX living doc — the durable contract/structure of `createPurposesService`, kept current with the code.
> The measurability **capstone**: Values → Purposes → Targets, composing the built `foundation/measurement`
> engine (ADR-011; Purpose = rollup APEX + consumer, NOT owner). Ground truth = `packages/core/src/services/purposes/`.
> Built per slice (Entity Delivery Flow); this doc grows with each. **As of: S1.**

## Factory

`createPurposesService(deps: PurposesServiceDeps): PurposesService` — factory-object (no `this.`). Deps grow per
slice; **S1 = `{ db, deviceId }`** only (later: S5 `measurementSources?`, S7 `sessions`, S8 `spaces/notes/registry`,
S9 `journal`, `effects?`). Return types are Drizzle **Row** types at M1 (the @vida/types interface reconcile is
DB-11, mirror-only).

## Tables (composed across two migration sets)

- DB-4 `019_purposes`: `purposes` · `targets` · `purpose_metrics` · `purpose_metric_values` · `target_reviews` · `dreams`
- DB-3 `007_purpose`: `values` · `contributions` · `purpose_reviews` · `plan_steps`

All cross-table refs are plain TEXT, **no FK** (SR-003 relaxed; delete-propagation is app-layer, PG-19 → S9).

## Surface — S1 (spine CRUD)

| Method | Returns | Notes |
|--------|---------|-------|
| `createValue/updateValue/archiveValue/getValue/listValues` | `ValueRow` | first-class core-beliefs (PG-9) |
| `createPurpose/updatePurpose/archivePurpose/getPurpose/listPurposes` | `PurposeRow` | rollup apex; `progress` override slot |
| `createTarget/updateTarget/archiveTarget/getTarget/listTargets(purposeId?)` | `TargetRow` | the pursuable entity; `measurement_kind` |

- **Repositories** — `createRepository(db, table, { deviceId, softDelete: true, encryptedFields: [] })` for all 3
  spine tables (each carries `deleted_at`). M1.0 `encryptedFields:[]` seam (real `[E]` = M3).
- **create-echoes-input** — `Repository.create()` returns the INPUT row, so NN-default columns are backfilled in the
  create input: purposes `status ?? 'in_progress'` · `is_primary ?? false` · `sort_order ?? 0`; targets
  `measurement_kind ?? 'quantitative'` · `status ?? 'not_started'` · `priority ?? 'medium'` · `sort_order ?? 0`;
  values `sort_order ?? 0`. Override/nullable cols coalesce to `null`.
- **Override slots (PG-4)** — `purposes.progress`, `targets.current_value` default to `null` (⇒ derive on read, S5),
  never `0`.
- **`review_frequency`** — nullable with a DB `DEFAULT 'weekly'` that never fires under create-echo (every key is in
  the INSERT) → an omitted value persists `NULL`.
- **Listing** — `listValues/listPurposes` = `findAll()` (excludes soft-deleted); `listTargets(purposeId?)` =
  `findAll()` then JS-filter by `purpose_id` (`undefined` ⇒ all active; avoids the `findWhere` soft-delete-skip trap).
- **Update** — async, typed `*NotFoundError` after `findById`; `stripUndefined` drops omitted keys (preserves an
  explicit `null` = clear-to-null); empty patch ⇒ returns the existing row (no wasted write).

## Typed errors (S1)

`ValueNotFoundError` · `PurposeNotFoundError` · `TargetNotFoundError` (async, thrown after a failed `findById`).

## DB-11 @vida/types reconcile (S1, mirror-only)

`packages/types/src/project.ts`: `Purpose` += `value_id`, `progress`→nullable; `Target` `purpose_id`→nullable,
`target_type`→`measurement_kind`, += `binding_mode`/`success_criteria`/`measurement_method`; `PurposeMetric` +=
`is_higher_better`/`baseline_value`; `PurposeMetricValue` += `source`/`context_notes` (extends `SyncableEntity`);
`TargetReview` → `SyncableEntity`; `Dream` widened (absorbs `bucket_list_items`); **added** `Value`/`Contribution`/
`PurposeReview`/`PlanStep`; **retired** `BucketListItem` + `PurposeHabit`/`PurposeRoutine`/`PurposeProject` + `TARGET_TYPE`
(+ `TargetTypeSchema`). Zero live consumers of the retired symbols (verified).

## Deferred (homed to later slices)

S2 dreams · S3 metrics+value-ledger · S4 contributions · S5 measurability core (`progress`/`computeProgress`) ·
S6 bindings+DAG · S7 reviews+plan_steps+sessions · S8 tags/links/pages · S9 provider+fan-out+deletion-cascade.
