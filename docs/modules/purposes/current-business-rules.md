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

## S4 — Contributions edge (weighted polymorphic goal-edge, PG-10)

- **BR-PG-S4-1** — `linkContribution(goal, contributor, {weight, notes?})` creates a `contributions` row holding the
  **weight ONLY** (`contribution_percentage`, 0–100) — **never a copied progress value** (PG-10). The contributor's
  live progress is read through a measure at rollup time (S5), never stored here.
- **BR-PG-S4-2** — Two-sided `InvalidContributor` guard: BOTH ends must be in vocabulary — `goal.type` ∈
  `CONTRIBUTION_GOAL_TYPE` (`purpose`|`target`) AND `contributor.type` ∈ `CONTRIBUTION_CONTRIBUTOR_TYPE`
  (`habit`|`routine`|`project`|`task`|`dream`|`finance_target`|`check_in`). An out-of-vocabulary ref is a **typed
  domain error** (`InvalidContributor`), not a ZodError.
- **BR-PG-S4-3** — `contributions` carries `deleted_at` → `softDelete:true`; `unlinkContribution` soft-deletes;
  `listContributions(goal)` reads the active edges for a goal via `findWhere` with an **explicit** `isNull(deleted_at)`
  (findWhere skips the soft-delete filter). `reweightContribution` updates only the weight. `ContributionNotFoundError`
  on an unknown id.

## S5 — Measurability core (derive-on-read; composes foundation/measurement)

- **BR-PG-S5-1** — `progress(entity)` is the LEAF. A **target** leaf = `normalize()` by `measurement_kind`:
  `quantitative` ⇒ `clamp(current_value/target_value)` with **baseline 0, higher-better** (the schema split — targets
  carry no baseline/direction column, those live on metrics; null current/target ⇒ unmeasured); `milestone` ⇒
  `status==='completed' ? 1 : 0`; `rate` ⇒ `clamp(current_value)` (null ⇒ unmeasured); `qualitative` ⇒ **null**
  (no rating/scale column on targets ⇒ unmeasured at M1, **never 0**, PG-3). A **dream** leaf = its
  `progress_percentage` override slot or null (no `measurement_kind` ⇒ no derive).
- **BR-PG-S5-2** — All rollup/normalize math is in **[0,1]** (the engine's unit); the stored/override columns
  (`purposes.progress`, `dreams.progress_percentage`, 0–100) are converted only at the `PurposeProgressView` edge
  (`toPct` out / `fromPct` when a child view feeds a parent rollup). `measurementSources.query` returns [0,1] directly.
- **BR-PG-S5-3** — `computeProgress(purpose)` = the `purposes.progress` override (0–100, `derived:false`) when set;
  else a **two-channel** rollup (build-phase resolution, ADR-011 §3.8 — the docs don't fix cross-channel mixing):
  **Channel A** = in-module LEAVES (spine-targets via `purpose_id` each `computeProgress(target)` + `purpose_metrics`
  each `metricLeaf01`), equal-weight peers; **Channel B** = direct CONTRIBUTIONS, weighted by `contribution_percentage`.
  Each channel rolls up on its own scale, then the two channel-results combine **equal-weight**. This keeps
  `contribution_percentage` meaningful *within* B and stops a weight-1 in-module leaf drowning under a weight-60
  contribution. Targets + metrics feed a purpose via the direct `purpose_id` channel (PG-5 "contributor→target→purpose";
  `target`/`purpose_metric` ∉ contributor vocabulary, so never via contributions). A `purpose_metric` leaf is
  **direction-aware** (it carries `baseline_value` + `is_higher_better`, unlike a target), reading its current value
  via `getMetricCurrent`. `partial` reflects the raw leaves (a channel that excluded a null child), not the two channels.
- **BR-PG-S5-4** — `computeProgress(target)` = its **leaf** (measurement override) when measured; else the `rollup` of
  **its contributions**. Leaf/override wins over contributions (PG-4). A target never contributes to a target → no cycle.
- **BR-PG-S5-5** — Unmeasured children (null progress) are **excluded** from a rollup (the engine drops null-progress
  children) so an un-rated goal never drags a parent to 0 (PG-3); `partial:true` flags that some child was excluded.
  An all-unmeasured / empty set ⇒ `value:null, unmeasured:true` (never 0).
- **BR-PG-S5-6** — A **dream** contributor resolves in-module (its override slot); a **cross-module** contributor
  (`habit`/`routine`/`project`/`task`/`finance_target`/`check_in`) resolves through the deny-safe `measurementSources`
  seam keyed `${contributor_type}:${contributor_id}` — **empty at M1 ⇒ null (unmeasured, excluded)**; real sources are
  advertised by their modules at M2 (zero-signature swap). A deleted dream contributor degrades to null, never throws.
- **BR-PG-S5-7** — The mixed-weight math is **delegated to the built `rollup` engine** (`weight == null || 0 ⇒ 1`,
  `engine.ts:48`) — composed, never reinterpreted. `progress`/`computeProgress` reject an unknown id with the typed
  `*NotFoundError`.
