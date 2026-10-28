# DB-4 · Domain Group #8 — Purpose & Goals · Unit Spec

<!-- Forward spec for DB-4 group #8 (Purpose & Goals — the CAPSTONE). Per-domain schema authoring under the
     5-phase lifecycle (docs/roadmap/schema-foundation-build-flow.md §2). No-Guessing: FACT/INTENT/UNKNOWN.
     Authored 2026-08-19 (branch db-4-per-domain-schema). DB-3 already authored the substrate
     (values · contributions · purpose_reviews · plan_steps) — this unit authors the 6 remaining §5.7 tables. -->

- **Unit:** DB-4 group #8 — Purpose & Goals (`purposes` · `targets` · `purpose_metrics` · `purpose_metric_values` · `target_reviews` · `dreams`)
- **Profile / scenario:** add-backend-component / Default (schema-foundation build)
- **Blocked by:** DB-3 substrate (`values`/`contributions`/`purpose_reviews`/`plan_steps`) + #4 Tasks/#5 Projects/#6 Habits/#7 Routines (contributor refs, no-FK)
- **Intent source:** ADR-002 §5.7 (FACT floor) + §5.20 + the 5 `docs/features/purposes-and-goals/` aspects (PG-\*) + the bucket-list intake (PG-16 dreams absorption) + ADR-011
- **Precedent:** #4/#5/#6/#7 (measurement grain, ledger baseColumns, net-new enums, no-FK)

---

## §0. Source model

Backend schema only. The 6 tables are the §5.7 FACT floor MINUS the 4 DB-3 substrate tables; their ADR-011 amendments
(progress→nullable, target_type→measurement_kind, restored fields, dreams absorption) are the build-phase resolution
of the documented intent (structure-data.md §Intended). Shape-open where the doc leaves it; grounded at Phase 3.

---

## §1. Identity — what this unit is

The **capstone** meaning-spine: Values → Purposes → Targets (+ Dreams beside), the derived-progress rollup apex.
`purposes`/`targets`/`purpose_metrics`/`purpose_metric_values`/`target_reviews`/`dreams` are the 6 owed §5.7 tables;
`values`/`contributions`/`purpose_reviews`/`plan_steps` are DB-3 (consumed, not re-authored). `[FACT: ADR-002 §5.7; foundation/purpose.ts]`

### Scope boundary — doc-DECIDED

- **`values`/`contributions`/`purpose_reviews`/`plan_steps`** → DB-3 substrate (authored) — NOT re-created.
- **The measurement-source READ seam, binding effect-rail (INT-2), DAG guard, provider (`dueIn`/`summary`)** → SERVICES (PG-7/PG-14).
- **Tags** → `entity_tags` (inline `dreams.tags` retired); **notes** → `pages`; **progress** derives (PG-4/PG-17, no counters).

### Boundary — what this unit is NOT (doc-cited)

| Not authored here                                                | Home                     | Cite                      |
| ---------------------------------------------------------------- | ------------------------ | ------------------------- |
| `values`/`contributions`/`purpose_reviews`/`plan_steps`          | DB-3 substrate           | foundation/purpose.ts     |
| `purpose_habits`/`purpose_routines`/`purpose_projects` (retired) | → `contributions` (DB-3) | §5.20; PG-10              |
| `bucket_list_items` (retired)                                    | collapsed → `dreams`     | PG-16; bucket-list intake |
| measurement-source seam · binding rail · provider                | services                 | PG-7/PG-14/PG-15          |

---

## §2. Business Rules (inherited invariants the intake honors)

- **PG-1 — Encrypted [E]:** purposes title/description/vision/why; targets title/description/unit/success_criteria;
  metrics name/description/unit; metric_values context_notes; target_reviews reflection/next_actions; dreams
  title/description/estimated_cost/location/imagery/steps. `[FACT: ADR-002 §5.7 [E]; PG-1]`
- **PG-4 — Derive-by-default + override slot.** `purposes.progress` / `targets.current_value` / `dreams.progress_percentage`
  are **nullable** override slots (NULL⇒derive), never trusted counters. `[INTENT PG-4; ADR-011 §3.2]`
- **PG-3 — Measurement pair on `targets` ONLY (within Purpose).** `structure-data.md:47` converts `targets.target_type`
  → `measurement_kind` + adds `binding_mode`; the dreams-widen列表 (:57-59) and metric amendments (:54) do NOT list the
  pair; `purposes` is the rollup **apex** (:28 "not the owner"). The ADR-011 broad "Dreams/…" list does not override the
  specific module列表 ([[module-doc-is-db4-roster-not-adr-broad-list]]). `[FACT: structure-data.md:47]`
- **PG-9 — Spine joints OPTIONAL.** `targets.purpose_id` → **nullable** (SR-003 relaxed); `purposes.value_id` nullable;
  `dreams.purpose_id` nullable. All no-FK; delete-parent = app-layer SET NULL (PG-19). `[INTENT PG-9]`
- **PG-15 — Metrics restore + provenance.** `purpose_metrics` += `is_higher_better`/`baseline_value`;
  `purpose_metric_values` += `source`{manual,auto} (distinct from binding_mode) + `context_notes[E]`. `[INTENT PG-15]`
- **PG-16 — Dreams = the single aspiration entity.** `bucket_list_items` collapses into `dreams` (absorbs
  category/status/priority/completed_date/imagery/location/progress/steps/project_id). `[FACT: PG-16; bucket-list intake]`
- **PG-17/PG-20 — analytics derive (no counters); local-first LWW.** `[FACT: PG-17; ADR-003]`

### Enum CHECK sets (FIXED → SQL CHECK, tuple-sourced)

purposes: `domain`(LIFE_DOMAIN), `status`(STATUS). targets: `measurement_kind`(MEASUREMENT_KIND), `binding_mode`
(BINDING_MODE), `status`(STATUS), `priority`(PRIORITY), `review_frequency`(**FREQUENCY** — reused, not net-new;
the floor `Target.review_frequency: Frequency`). purpose_metrics: `calculation_method`(CALCULATION_METHOD).
purpose_metric_values: `source`(**METRIC_VALUE_SOURCE** — NET-NEW 2). dreams: `domain`(LIFE_DOMAIN),
`category`(BUCKET_LIST_CATEGORY), `status`(BUCKET_LIST_STATUS), `priority`(PRIORITY). **Range CHECK (not parity):**
`target_reviews.progress_rating` BETWEEN 1 AND 10. **13 parity rows.**

---

## §3. Intended shape — the 6 tables (floor + ADR-011 amendments, cited)

### §3a. `purposes` `[FACT: §5.7 L1797-1825; AMEND PG-4/PG-9]`

`...baseColumns` · `title[E]` NN · `description[E]` · `vision[E]` · `why[E]` · **`value_id`** (nullable, no-FK — NEW PG-9) ·
`domain` CHECK (LIFE_DOMAIN, nullable) · `status` CHECK NN dflt 'in_progress' · **`progress` INTEGER nullable** (override,
was NN DEFAULT 0) · `start_date`/`target_date` · `is_primary` boolInt NN dflt 0 · `sort_order` NN dflt 0 · `deleted_at`.

### §3b. `targets` (= Goals) `[FACT: §5.7 L1831-1864; AMEND PG-5/PG-9/PG-11]`

`...baseColumns` · **`purpose_id` nullable** (no-FK, SR-003) · `title[E]` NN · `description[E]` ·
**`measurement_kind`** CHECK NN dflt 'quantitative' (MEASUREMENT_KIND — replaces `target_type`) · **`binding_mode`**
CHECK nullable (BINDING_MODE) · `target_value`/`current_value` REAL (nullable) · `unit[E]` · **`success_criteria[E]`**
(NEW) · **`measurement_method`** TEXT (NEW, nullable) · `status` CHECK NN dflt 'not_started' · `priority` CHECK NN dflt
'medium' · `start_date`/`target_date`/`next_review_date` · `review_frequency` CHECK dflt 'weekly' (**FREQUENCY** —
reused, nullable) · `sort_order` NN dflt 0 · `deleted_at`. Index `idx_targets_purpose`. `is_achieved` = derived (no column).

### §3c. `purpose_metrics` `[FACT: §5.7 L1870-1890; AMEND PG-15]`

`...baseColumns` (created_at+updated_at, **NO deleted_at** — faithful floor) · `purpose_id` (no-FK) · `name[E]` NN ·
`description[E]` · `unit[E]` · `target_value`/`current_value` REAL · `calculation_method` CHECK NN dflt 'latest'
(CALCULATION_METHOD) · **`is_higher_better`** boolInt (NEW, nullable) · **`baseline_value`** REAL (NEW, nullable).

### §3d. `purpose_metric_values` (ledger) `[FACT: §5.7 L1896-1910; AMEND PG-15]`

`...baseColumns` (adds created_at+updated_at — task_time_logs precedent; **NO deleted_at** — ledger) · `metric_id`
(no-FK) · `value` REAL NN · `recorded_at` `timestampMs` NN · **`source`** CHECK NN dflt 'manual' (METRIC_VALUE_SOURCE —
NEW) · **`context_notes[E]`** (NEW, nullable). Index `idx_metric_values_metric`.

### §3e. `target_reviews` (ledger) `[FACT: §5.7 L1916-1930]`

`...baseColumns` (adds created_at+updated_at; **NO deleted_at** — ledger) · `target_id` (no-FK) · `progress_rating`
INTEGER (range CHECK 1–10) · `reflection[E]` · `next_actions[E]` · `reviewed_at` `timestampMs` NN.

### §3f. `dreams` (floor + `bucket_list_items` absorption) `[FACT: §5.7 L1936-1958 + §5.14 L3324; PG-16]`

`...baseColumns` · `title[E]` NN · `description[E]` · `domain` CHECK (LIFE_DOMAIN, nullable) · **`category`** CHECK dflt
'other' (BUCKET_LIST_CATEGORY, absorbed) · **`status`** CHECK NN dflt 'dream' (BUCKET_LIST_STATUS, absorbed) ·
**`priority`** CHECK NN dflt 'medium' (PRIORITY, absorbed) · `target_age` INTEGER · `target_date`/`completed_date`
(absorbed) · `estimated_cost[E]` (cents) · `location[E]`/`image_url[E]`/`cover_image_url[E]`/`inspiration_url[E]`
(absorbed) · **`progress_percentage` INTEGER nullable** (override, absorbed — was NN DEFAULT 0) · `steps[E]` TEXT (JSON,
absorbed) · `purpose_id` (nullable, no-FK) · `project_id` (nullable, no-FK, absorbed) · `deleted_at`. **Inline `tags`
RETIRED** → `entity_tags`. **No measurement_kind** (widen列表 doesn't list it — #5 roster rule). Index `idx_dreams_purpose`.

### §3g. `ENTITY_TYPES` registry — reconcile append

`+= 'purpose', 'target', 'dream', 'purpose_metric_value'` (pages/entity_links targets, PG-18; `'value'` already present
from DB-3). Ledgers (metric_values addressed via metric_id; but `purpose_metric_value` IS reserved as a link target per
§5.7) — registered per PG-18. `target_reviews` addressed via target_id → not registered. `[FACT: PG-18; structure-data.md:60]`

### §3h. `@vida/types` — net-new enums now; interfaces → DB-11

- **NET-NEW** `METRIC_VALUE_SOURCE = ['manual','auto']` in `purpose.ts`. **REUSE** the shared `FREQUENCY` tuple for
  `targets.review_frequency` (gate-1 F2: byte-identical to a net-new REVIEW_FREQUENCY + the floor `Target` interface
  already types it `Frequency` — reuse over duplicate).
- Interface reconcile (`Purpose` +value_id/progress→null; new `Target`/`PurposeMetric`/`PurposeMetricValue`/
  `TargetReview`/`Dream`; retire `TARGET_TYPE`; `BucketListItem` → `Dream`) → **DB-11** (mirror-only; compiles).

---

## §4. Physical home & authoring model

- **CREATE** `schema/purposes.ts` (6-table mirror) + `migrations/019_purposes.ts` (hand-written SQL, v19).
- **MODIFY** `@vida/types/purpose.ts` (+`METRIC_VALUE_SOURCE`; rebuild dist), `schema/index.ts`, `_registry.ts` (+4), `runner.ts`.
- Tests: enum-parity FIXTURE (13 rows) + splice migration019; new `db/tests/purposes-introspection.test.ts` (6 tables).
- **Encryption (BR-DB6-3):** `[E]` fields are the M3 target; EMPTY `[E]` set in M1.0.

---

## §5. Phase-1 completion checklist

- [x] All 5 aspects + bucket-list intake + ADR-002 §5.7/§5.20 + ADR-011 + the DB-3 `foundation/purpose.ts` substrate read.
- [x] DB-3 substrate separated (4 tables NOT re-authored); 6 owed tables + amendments cited.
- [x] Measurement pair scoped to `targets` (#5 roster rule); dreams absorption enumerated; boundaries scoped.
- [x] No manufactured DEFAULT beyond doc-licensed naturals (measurement_kind 'quantitative' inherits target_type; source 'manual'; status/category naturals from the floor); nullable override slots.

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. **6 tables** (§5.7 floor − DB-3's 4). `[FACT: §5.7; foundation/purpose.ts]`
2. **progress/current_value/progress_percentage nullable** override slots. `[INTENT PG-4]`
3. **`target_type` → `measurement_kind` (targets only) + binding_mode.** `[FACT: structure-data.md:47]`
4. **Restored fields:** targets success_criteria[E]/measurement_method; metrics is_higher_better/baseline_value; metric_values source/context_notes. `[INTENT PG-15]`
5. **`dreams` absorbs `bucket_list_items`; `bucket_list_items` retired; inline tags → entity_tags.** `[FACT: PG-16]`
6. **`purpose_id`/`value_id` nullable, all no-FK** (SR-003, PG-9). `[INTENT PG-9]`
7. **1 net-new enum (METRIC_VALUE_SOURCE); REUSE `FREQUENCY` for review_frequency; retire TARGET_TYPE → DB-11.** `[FACT: @vida/types; gate-1 F2]`
8. **Ledgers (metric_values, target_reviews) baseColumns (+updated_at), no deleted_at; metrics no deleted_at (floor).** `[FACT: task_time_logs precedent; §5.7]`

_String-check (self-analysis): clean — no decision / lean / TBD / open-point / either-or._

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create

`values`/`contributions`/`purpose_reviews`/`plan_steps` (DB-3 `foundation/purpose.ts`) · `entity_tags`/`pages`
(substrate) · `tasks`/`habits`/`routines`/`projects` (contributors, no-FK). `'value'` in `ENTITY_TYPES`.

### To author — 6 confirmed ABSENT (net-new in v2)

`purposes`·`targets`·`purpose_metrics`·`purpose_metric_values`·`target_reviews`·`dreams`. No `schema/purposes.ts`.

### `ENTITY_TYPES` diff · Migration slot · `@vida/types`

Append `'purpose','target','dream','purpose_metric_value'`. Highest = `018_routines` (v18) → new `019_purposes` (v19).
Net-new `METRIC_VALUE_SOURCE` (reuse `FREQUENCY`).

### Baseline verdict

Net-new authoring; `real` reused (target/current/baseline/metric-value); bucket*list_items collapses into dreams (no
separate table). Purpose-domain enums historically live in `project.ts` (TARGET_TYPE/CALCULATION_METHOD/BUCKET*\*);
new enums go in `purpose.ts`.

---

## Phase 3 — Implementation Plan (gate-1 draft)

### §P3.0 — Grounding recap

1. 6 tables (DB-3's 4 excluded); measurement pair on `targets` only; dreams absorbs bucket_list.
2. progress slots nullable; restored fields authored; 2 net-new enums; TARGET_TYPE retire → DB-11.
3. All refs no-FK; ledgers no deleted_at; metrics no deleted_at (floor).

### §P3.1 — Exact DDL intent

Per §3a-§3f. Full `...baseColumns`; purposes/targets/dreams add `deleted_at`; metrics/metric_values/target_reviews
omit it. FIXED enums → SQL CHECK from tuple. measurement_kind NN dflt 'quantitative'; binding_mode/measurement_method/
review_frequency nullable; source NN dflt 'manual'; progress cols nullable. Range CHECK progress_rating 1–10.

### §P3.2 — Registry & validators

`_registry.ts += 'purpose','target','dream','purpose_metric_value'`. `purpose.ts += REVIEW_FREQUENCY, METRIC_VALUE_SOURCE`.

### §P3.3 — Files, migration, tests

CREATE `schema/purposes.ts`, `migrations/019_purposes.ts`, `db/tests/purposes-introspection.test.ts`; MODIFY
`purpose.ts`, `schema/index.ts`, `_registry.ts`, `runner.ts`, `enum-parity.test.ts` (13 rows + splice + imports).

### §P3.4 — DB-11 deferrals (cited, not fixed here)

new `Target`/`PurposeMetric`/`PurposeMetricValue`/`TargetReview`/`Dream`; `Purpose` +value_id/progress→null; retire
`TARGET_TYPE`; `BucketListItem`→`Dream`.

### §P3.5 — Plan checklist (pre-critique)

- [x] DDL intent complete + cited · [x] no-FK · [x] no manufactured default beyond doc naturals · [x] 2 net-new enums
- [x] registry (+4) · [x] migration slot · [x] files/tests named · [x] boundaries scoped · [x] DB-3 substrate excluded

### §P3.6 — Gate-1 critique verdict (independent) → SHIP

Independent critic, 2026-08-19. Verdict **SHIP** — no blocker/material; the crux (measurement pair on `targets` only)
CONFIRMED via the roster rule (structure-data.md:47 explicit; dreams/metrics/purposes lists omit it). Verified: all 6
FACT-floor tables line-accurate; DB-3 substrate correctly excluded (no collision — `schema/purposes.ts` plural ≠
`foundation/purpose.ts`); measurement_kind NN DEFAULT 'quantitative' = the floor target_type default (doc-licensed);
binding_mode nullable (trap avoided); source NN DEFAULT 'manual' (natural); dreams absorption faithful (domain+category
both kept — different vocabs); ledger treatment correct; registry +4 correct (`purpose_metric_value` reserved as a link
target). 3 MINOR: **F1** add the `source='manual'` natural-justification comment in-code; **F2** REVIEW_FREQUENCY
duplicated FREQUENCY → **reuse FREQUENCY** (applied); **F3** filename → `019_purposes.ts` + `schema/purposes.ts` (applied).

### §P3.7 — Approval 1 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → preflight

### §P3.8 — Preflight → PASSED (6 folds)

1. **`real`** for `target_value`/`current_value`/`baseline_value` + `purpose_metric_values.value` (habit_completions.value precedent).
2. **`boolInt`** for `purposes.is_primary` (NN dflt false), `purpose_metrics.is_higher_better` (nullable).
3. **`METRIC_VALUE_SOURCE`** net-new in `purpose.ts`; reuse `FREQUENCY` (import from @vida/types); reuse `TARGET_TYPE` NOT used (retired). Import CALCULATION_METHOD/BUCKET_LIST_CATEGORY/BUCKET_LIST_STATUS from @vida/types (defined in project.ts, barrel-exported).
4. **Ledgers** (`purpose_metric_values`, `target_reviews`): `...baseColumns` (+updated_at), no `deleted_at`; `purpose_metrics` no `deleted_at` (floor). Introspection oracle = the mirror.
5. **Range CHECK** `progress_rating BETWEEN 1 AND 10` (002_sessions precedent) — not a parity row.
6. **13 enum-parity rows** + splice migration019 + add imports (METRIC_VALUE_SOURCE, FREQUENCY, CALCULATION_METHOD, BUCKET_LIST_CATEGORY, BUCKET_LIST_STATUS — STATUS/PRIORITY/LIFE_DOMAIN/MEASUREMENT_KIND/BINDING_MODE already imported).

### §P3.9 — Gate-2 critique (independent, post-preflight) → SHIP

Independent critic, 2026-08-19. Verdict **SHIP** — zero blocker/material; all enum tuples exist (FREQUENCY 6-value
confirmed; METRIC_VALUE_SOURCE genuinely net-new); barrel/dist ReferenceError trap closed (add 5 imports to
enum-parity: METRIC_VALUE_SOURCE/FREQUENCY/CALCULATION_METHOD/BUCKET_LIST_CATEGORY/BUCKET_LIST_STATUS); DB-3 no
collision (`values` exists for `value_id`); migration 019 next; default-normalizer passes for all 11 defaulted cols;
pk='id' ×6; ledgers emit created_at+updated_at (no deleted_at); 13 parity rows arithmetic confirmed. 2 MINOR
(confirmatory): introspection oracle = the mirror not the stale `Dream` interface; ledgers carry both sync +
domain timestamps (emit all four). ⚠ mechanical: splice migration019 into enum-parity in BOTH the import block AND the
`ddlFor` apply-chain.

### §P3.10 — Approval 2 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → Phase 4 (implement)

## Phase 4 — Implement (DONE)

- MODIFY `@vida/types/purpose.ts` (+`METRIC_VALUE_SOURCE`; rebuilt dist). CREATE `schema/purposes.ts` (6 tables) + `migrations/019_purposes.ts` (v19).
- MODIFY `schema/index.ts`, `_registry.ts` (+4), `runner.ts`. Tests: 13 enum-parity rows (+5 imports) + splice migration019; new `purposes-introspection.test.ts` (6 tables).

## Phase 5 — Foundation-soundness verify (DONE)

- **DDL-introspection** (`purposes-introspection.test.ts`, 24 cases × 6 tables) — GREEN.
- `@vida/core` **336 tests** green (was 299 → +24 introspection + 13 enum-parity); typecheck clean; eslint 0-err; `LATEST_VERSION`=19.
- Independent post-impl `/critique` → **SHIP** (SQL↔mirror faithful, FACT-floor complete, DB-3 not re-authored, no-FK, measurement pair on targets only, dreams absorption faithful, [E] dual-marked, ledgers no deleted_at). 2 MINOR = column-order doc-nits (introspection is order-agnostic).
- **§XXIX Currency promote:** `database-layer/current-spec.md` + `current-business-rules.md` (BR-PG8-\*) updated.
- **Foundation-readiness:** MOD-purpose finds the Values→Purposes→Targets spine + Dreams + metrics/reviews — PASS.

### Deferred / cross-group (tracked, not this unit)

- **DB-11:** `Purpose` +value_id/progress→null; new `Target`/`PurposeMetric`/`PurposeMetricValue`/`TargetReview`/`Dream`; retire `TARGET_TYPE`; `BucketListItem`→`Dream`.
- measurement-source READ seam · binding effect-rail (INT-2) · DAG guard · provider (`dueIn`/`summary`) → services.
