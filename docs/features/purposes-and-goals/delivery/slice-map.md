# mod-purposes-and-goals ① — Slice Map

> Entity Delivery Flow (v1) front matter, Step 2 (Decomposition Gate). The vertical-slice plan; each slice runs
> its own §XXVI double-gate + live-store Verification Gate + independent g2 code-review + pre-ship /critique +
> §XXIX currency. Grounded in `interpretation.md` (A–F) + ADR-011. 9 slices.

**Ordering principle:** entities before derivations; the rollup INPUT (contributions, S4) before the rollup
ENGINE wiring (S5); cross-cutting concerns (tags/pages, provider, deletion-propagation) last once all tables exist.

| #      | Slice                                         | Builds                                                                                                                                                                                                                                                                                                                                                                                                       | Composes                                                                                                                                  | Key invariants                                                                                                               |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **S1** | **Spine CRUD + DB-11 reconcile**              | scaffold `createPurposesService` + repos (10) + `values`/`purposes`/`targets` CRUD (create/update/archive/get/list) + the @vida/types interface reconcile                                                                                                                                                                                                                                                    | Repository; @vida/types                                                                                                                   | PG-1/9/19 · nullable spine joints · factory-no-`this` · `create()` echoes input · `encryptedFields:[]`                       |
| **S2** | **Dreams**                                    | `dreams` CRUD (absorbed bucket_list fields: status/category/priority/imagery/steps/location)                                                                                                                                                                                                                                                                                                                 | Repository                                                                                                                                | PG-16 · `steps` plain-text JSON (never `json<T>()`) · no `measurement_kind` on dreams                                        |
| **S3** | **Metrics + value ledger**                    | `purpose_metrics` CRUD + `deleteMetric` (hardDelete + two-hop cascade of its `purpose_metric_values`, g1 #7) + `purpose_metric_values` ledger (`recordMetricValue`) + `calculation_method` derivation (sum/avg/latest/max/min/count) + `is_higher_better`/`baseline_value`                                                                                                                                   | Repository                                                                                                                                | PG-15 · ledger `softDelete:false` · provenance `source{manual,auto}` · direction-aware · metric-delete cascades values       |
| **S4** | **Contributions edge**                        | `linkContribution`/`unlinkContribution`/`reweightContribution` over `contributions` + **two-sided** `InvalidContributor` guard (`goal_type` ∈ `CONTRIBUTION_GOAL_TYPE` `purpose.ts:5` AND `contributor_type` ∈ `CONTRIBUTION_CONTRIBUTOR_TYPE` `purpose.ts:9-17`)                                                                                                                                            | Repository; `CONTRIBUTION_*` enums                                                                                                        | PG-10 · weight-only (never copied value) · BOTH ends ∈ vocabulary · polymorphic                                              |
| **S5** | **Measurability core (the capstone wiring)**  | `progress(entity)` (leaf via `normalize`; quantitative-target = simple `current/target` ratio — no baseline/direction col, g1 #3) + `computeProgress(purpose\|target)` (rollup over contributions + in-module children) + `ProgressView{value,derived,partial,unmeasured?}` + `resolveProgress` override. **Introduces + first-consumes `measurementSources?`** (cross-module contributor resolution; g1 #4) | `foundation/measurement` (`normalize`/`rollup`/`resolveProgress`); S4 contributions; `MeasurementSourceRegistry?` (deny-safe, empty⇒null) | PG-3/4/5/17 · derive-on-read · qualitative→null (never 0) · 0–100↔[0,1] `toPct` boundary · override slot                     |
| **S6** | **Bindings + DAG guard + derived-pull**       | `bind(measurable,{binding_mode,ref})` + `assertAcyclic` cycle rejection (`CyclicBinding`) + `derived-pull` resolution through the source registry (reuses the S5 `measurementSources?`; empty ⇒ `null`, `SourceUnavailable` flag)                                                                                                                                                                            | `foundation/measurement` (`assertAcyclic`); `MeasurementSourceRegistry?` (from S5)                                                        | PG-6/7/8 · acyclic both edge-types · source outage = last-known+flag                                                         |
| **S7** | **Reviews + plan_steps**                      | `target_reviews`/`purpose_reviews` ledgers + `openTargetReview`/`openPurposeReview` + `next_review_date` compute + `plan_steps` DOC CRUD; **required** `sessions` port — register `review` sub-type (`registry.register`) + create session row (`service.createSession`), honouring PG-13 FACT (g1 #1/#2)                                                                                                    | Repository; `sessions:{registry,service}` (REQUIRED)                                                                                      | PG-11/12/13 · two distinct review shapes · plan_steps = doc not tracked · reviews fire as `review` SESSIONS (FACT, wired M1) |
| **S8** | **Tags · links · pages**                      | `entity_tags` + `entity_links` + `pages` for value/purpose/target/dream; add `value`+`dream` to the entity_type registry                                                                                                                                                                                                                                                                                     | `SpacesService` (WRITE); `NotesService` (`pages`); `_registry`                                                                            | PG-18 · tags via Spaces · notes via `pages` (no new PAGE_TYPE) · `value`/`dream` entity_type additions                       |
| **S9** | **Provider + fan-out + deletion propagation** | `registerPurposesJournal` (`summary(date)`) + a `DueProvider.fetch` lane (`dueIn(range)` → canonical `DueItem`, g1 #8) + emit-only effect fan-out (dormant M1) + PG-19 deletion cascade: purpose→target **SET NULL**; cascade `contributions`/`purpose_reviews`/`target_reviews` AND the two-hop **`purpose_metrics` → `purpose_metric_values`** (g1 #6)                                                     | Journal registry; `DueProvider` seam; `effects?` (deny-safe)                                                                              | PG-14/19 · provider aggregator (names no module) · emit-only producer · app-layer cascade (no FK) · two-hop metric cascade   |

## Slice dependency graph (intra-module)

```
S1 (spine) ──┬─> S4 (contributions) ──> S5 (rollup) ──> S6 (bindings/derived-pull)
             ├─> S2 (dreams) ─────────────────────────> S5 (dream progress)
             ├─> S3 (metrics) ───────────────────────-> S5 (quantitative metric feed)
             └─> S7 (reviews/plan_steps)
S1..S7 ──> S8 (tags/links/pages) ──> S9 (provider + fan-out + deletion cascade)
```

- **S5 is the keystone** — it needs S4 (contributions as rollup input) + S2/S3 (dream/metric leaves), and it
  **introduces the `measurementSources?` dep** (first consumed here for cross-module contributors; S6 reuses it) —
  so the S4→S5→S6 graph has no hidden back-edge (g1 #4). Built after S2/S3/S4.
- **S9 is the closer** — provider `summary`/`dueIn` aggregates everything; deletion cascade needs every child table to exist.
- Deletion within a single entity (soft-delete) ships in that entity's slice; **cross-entity propagation** (a
  purpose delete rippling to targets[SET NULL]/contributions/reviews AND the two-hop metrics→metric-values)
  consolidates in S9 (PG-19, g1 #6). The S3 **metric** delete already cascades its own values (two-hop, in-slice).

## Terminal-states coverage (business-rules.md:127-137)

Each read/compute method returns the 4-state shape where applicable (loading/empty/error/success); the derived
rollups (`computeProgress`, `getMetric`, `summary`) additionally carry `derived`/`partial`/`unmeasured` flags so
a `qualitative`-unmeasured or source-outage contributor is honestly surfaced, never coerced (PG-3/6).

## What is NOT in this build (homed, per interpretation §E)

- Real measurement sources (net_worth/streak/body_weight) — advertised by Finance/Habits/Health at **M2**
  (first-consumer-pull); S6's pull path is built but resolves `null` at M1.
- Live `event-trigger` rail writes — emit-only/dormant at M1 (S9 `if (!effects) return`).
- The live Scheduler **firing** of review sessions (notification/surfacing) — M2. **But the review session ROW is
  written at M1** (S7, `sessions` required) honouring PG-13 FACT; only the firing is deferred (g1 #2).
- Real `[E]` field encryption — `encryptedFields:[]` M1.0 seam; M3.
- ② `fe-purposes` (the rendered faces) — separate P6.
