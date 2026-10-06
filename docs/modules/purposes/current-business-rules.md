# Purposes & Goals — Current Business Rules (as-built)

> §XXIX living doc — the enforced invariants of `createPurposesService`, kept current with the code. Promoted from
> each slice's IMPLEMENTATION-PLAN. Derived from the PG-1..PG-20 corpus invariants + ADR-011. **As of: S1.**

## S1 — Spine CRUD + DB-11 reconcile

- **BR-PG-S1-1** — The spine joints are optional: `targets.purpose_id` and `purposes.value_id` are nullable, no FK
  (SR-003 relaxed, PG-9). A standalone target (no purpose) and a standalone purpose (no value) are valid.
- **BR-PG-S1-2** — `purposes.progress` and `targets.current_value` are **override slots**: an omitted value persists
  `NULL` (⇒ derive on read, PG-4), **never coerced to `0`**. An explicit numeric value is the user's override.
- **BR-PG-S1-3** — NN-default columns are backfilled in the create input (create echoes the input row, not SQL
  defaults): purposes `status='in_progress'`/`is_primary=false`/`sort_order=0`; targets
  `measurement_kind='quantitative'`/`status='not_started'`/`priority='medium'`/`sort_order=0`; values `sort_order=0`.
- **BR-PG-S1-4** — `targets.measurement_kind` is the SOLID/ABSTRACT discriminator (replaces the retired v1
  `target_type`); it is NN with default `'quantitative'`. `binding_mode` is nullable (NULL ⇒ derive, ADR-011 M2).
- **BR-PG-S1-5** — `review_frequency` is nullable; the schema `DEFAULT 'weekly'` never applies under the create-echo
  write path (every key is in the INSERT), so an omitted value persists `NULL`.
- **BR-PG-S1-6** — Archive = **soft delete** (`deleted_at`) on all 3 spine tables; `getX` returns `null` for a
  soft-deleted row and `listX` excludes it. History is preserved (PG-19). Cross-entity deletion propagation
  (purpose→target SET NULL; cascades) is **homed to S9**.
- **BR-PG-S1-7** — `listTargets(purposeId?)` returns active targets; `undefined` ⇒ all active, a value ⇒ scoped to
  that purpose (JS-filtered over `findAll()`, which applies the soft-delete filter — the `findWhere`-skip trap is avoided).
- **BR-PG-S1-8** — Update is async and rejects an unknown id with the typed `*NotFoundError`; an empty patch returns
  the existing row unchanged (no wasted `updated_at`/sync bump); an explicit `null` in a patch clears the column
  (distinguished from an omitted key by `stripUndefined`).
- **BR-PG-S1-9** — M1.0 encryption seam: all repos use `encryptedFields: []` (the `[E]` title/description/vision/why/
  name/unit/success_criteria fields pass through; real field-level encryption is M3).
- **BR-PG-S1-10** — DB-11 @vida/types reconcile (mirror-only): the retired symbols (`BucketListItem`,
  `PurposeHabit`/`PurposeRoutine`/`PurposeProject`, `TARGET_TYPE`/`TargetType`/`TargetTypeSchema`) have zero live
  consumers; `contributions` (weighted polymorphic edge) supersedes the three bare junctions, and `dreams` absorbs
  `bucket_list_items`. The service returns Row types; the interfaces are the mirror (not consumed at M1).

## S2 — Dreams (single aspiration; absorbs bucket_list_items, PG-16)

- **BR-PG-S2-1** — `dreams` is the single aspiration entity (the retired `bucket_list_items` collapsed in): one
  table carries category/status/priority/imagery/steps/location/progress/target/project — no separate bucket-list
  table. "Bucket List" is a Space over `dreams` (a tag + Gallery view), not service machinery.
- **BR-PG-S2-2** — `dreams.steps` is a plain TEXT column holding a JSON string (`[{id,text,completed}]`), **never
  `json<T>()`** — the service `JSON.stringify`s on write; the Row read returns the raw string (the consumer parses).
  Update distinguishes an omitted `steps` (untouched) from an explicit `null` (clear) from a value (reserialize).
- **BR-PG-S2-3** — Backfills: `status='dream'`, `priority='medium'` (NN defaults). `category` is nullable — its DB
  `DEFAULT 'other'` never fires under create-echo, so an omit persists `NULL` (the S1 `review_frequency` family).
- **BR-PG-S2-4** — `dreams.progress_percentage` is a nullable **override slot** (⇒ derive, PG-4), never `0`; no
  `measurement_kind` on dreams (the widen list omits it — a dream's progress is an override or a rollup, S5).
- **BR-PG-S2-5** — `estimated_cost` is INTEGER cents; `dreams` has `deleted_at` → soft delete; `listDreams(purposeId?)`
  scopes active dreams by purpose (JS-filter over `findAll()`); `DreamNotFoundError` on an unknown id.

## S3 — Metrics + value ledger (PG-15)

- **BR-PG-S3-1** — `purpose_metrics` and `purpose_metric_values` carry **no `deleted_at`** → `softDelete:false` (every
  delete is hard). `createMetric` backfills `calculation_method='latest'` (NN default); `is_higher_better`/`baseline_value`
  nullable (PG-15 direction).
- **BR-PG-S3-2** — `getMetricCurrent` resolves a metric's current value **derive-by-default** (PG-4/PG-17): the
  `current_value` override slot wins when non-null (`override:true, source:'manual'`); otherwise it derives from the
  value ledger via `calculation_method` (`sum`/`average`/`latest`/`max`/`min`/`count`). An **empty ledger ⇒ `value:null`
  (unmeasured), never `0`**.
- **BR-PG-S3-3** — Derived provenance: `source='manual'` iff **every contributing ledger point** is manual, else
  `'auto'`. For `'latest'` the contributing set is the single most-recent point (greatest `recorded_at`, tie → later
  `created_at`); for the aggregates it is all the metric's points.
- **BR-PG-S3-4** — `recordMetricValue(metricId, value, {source?, context_notes?, recorded_at?})` appends a hard ledger
  row; it rejects an unknown `metricId` with `MetricNotFoundError`. `source` backfills `'manual'`; `recorded_at` defaults
  to now (Unix ms) when omitted.
- **BR-PG-S3-5** — `deleteMetric` is a **two-hop app-layer cascade** (no FK, PG-19 locally): it hard-deletes the
  metric's `purpose_metric_values` ledger rows first (found by `metric_id`), then the metric — no orphaned points.
