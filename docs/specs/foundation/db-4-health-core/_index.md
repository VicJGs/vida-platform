# DB-4 · Domain Group #17 — Health: Core · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #17 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `027_health_core` (v27) · **Schema file:** `schema/health-core.ts` · **Types file:** `packages/types/src/health.ts` (net-new) · **Branch:** `db-4-per-domain-schema`
**Rerun:** health/core ✅IMPLEMENTED (2026-07-24, LITE gate SHIP/0-blocking) — the ADR-realignment (M1/M2 goal-`type` decomposition · M3 nullable-derive · SP1/SP2 tags · X*/AI* name-the-contract) is DONE across all 5 aspects; its payload is **cite-not-author**. The DDL is THIS build's job.

> **The shared Health spine** — the body's state (Metrics + Monitoring), direction (Goals), adaptation
> (Experiments/Profiles/Responses), Physical Roles, and Safety & Medical. **12 owned tables.** Health is a
> **recovered domain with NO v2 schema** → every token is already `[INTENT]`; there is **no As-is FACT floor** to
> two-tier (the one way this is *lighter* than projects — rerun §1). **Zero build-decisions**; every shape is
> doc-determined, consistent with groups #1–#16.

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/health/core/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects, read) ·
`docs/intake/health.md` **STATUS: WHOLE — ENHANCED** (Victor 2026-07-14) · `part-1.2-reruns/health-core.md` (IMPLEMENTED,
the M-axis reframe) · `ADR-002` (data-model conventions; Health = **additions**, no existing §) + `ADR-002:3816`
(the `measurement_kind`+`binding_mode` pair **names Health** as a pursuable measurable — contract locked, per-table DDL
is the build job) · `ADR-011` (measurability M1–M5) · `ADR-006` (Spaces SP1/SP2) · `ADR-014` (ingestion X1/X2/X4/X5/X8) ·
`ADR-015` (AI1/AI3/AI5/AI6) · `packages/types/src/{measurement,common}.ts` (the **existing** reusable tuples) ·
`schema/_shared.ts` (`baseColumns` = id+created_at+updated_at+6 `_sync_*`, **no `deleted_at`**) · `schema/_registry.ts` (`ENTITY_TYPES`).

## §1. Identity — what this unit is
The **shared spine** both Health pillars (Training #18, Nutrition #19) act on — it owns no exercises and no recipes.
Six capabilities, **12 owned tables**:
- **Metrics + Monitoring** — `health_metrics` (definitions; the M5 read-seam source) · `health_metric_values`
  (time-series ledger) · `health_domains` ⊃ `health_factors` (monitoring grouping) · `health_exams` + `assigned_exams`
  (user-configured scheduled medical events → metric values).
- **Goals** — `health_goals`, the **pursuable** carrying the ADR-011 measure (`measurement_kind`×`binding_mode`).
- **Adaptation** — `health_experiments` (N-of-1) · `health_responses` (observation logs). (Profiles = DERIVED view, not a table.)
- **Physical Roles** — `physical_roles`, the trainable-capability unit (merges old disciplines + capacity goals).
- **Safety & Medical** — `medical_profile_entries` (module-wide provider) · `safety_flags` (advisory, never blocks).

### Scope boundary — doc-DECIDED (the intake §Resolution WHOLE → author full intent)
Health's intake is **WHOLE** ([[build-phase-flags-mean-resolve-now-not-defer]]) and the rerun already fixed the model.
This unit **authors the 12-table DDL as the docs describe it**; the rerun's driver payload (M/SP/X/AI tokens) is
**named, not re-specified** (Health is a *consumer* of ADR-011/006/014/015).

**AUTHOR (the doc-described shape — build phase):**
- The 12 tables per `structure-data.md` §Entities, with the P/E flags, nullable notation, and the exact enum sets below.
- **G-M1/G-M2 (ADR-011):** `health_goals` carries `measurement_kind` (CHECK, reuse `MEASUREMENT_KIND`) + `binding_mode`
  (CHECK, reuse `BINDING_MODE`); the bespoke `type` enum is **not authored** (decomposed away — rerun §2 Primary A).
- **G-M3:** `health_goals.progress` **and** `physical_roles.mastery` = **nullable override slots** (`NULL ⇒ derive`) —
  plain nullable columns; `progress()`/`deriveMastery()` are service-layer (not authored here). No DEFAULT.
- **G-AI (C4):** `health_metric_values.source` enum **includes `ai`** (AI6 provenance).
- **G-SP1/SP2 (ADR-006):** register the 11 taggable Core `entity_type`s in `_registry.ts` `ENTITY_TYPES` (open registry;
  no closed `entity_type CHECK`). Health is a tag **consumer** — no `tags` column, no `entity_tags` ownership.
- **`packages/types/src/health.ts`** (net-new file — grep confirms none exists): the net-new Health enum tuples + Zod +
  the 12 row interfaces.

**OUT (cite-not-author / owned elsewhere — the rerun's C-guards + §5):**
- **C1 guard** — `physical_roles.type` is **modality** (martial-art/sport/…), NOT the measurement axis. Kept as-is; only
  `health_goals.type` decomposed (which we simply never author). `[rerun C1; conventions L24]`
- **C2 guard** — `health_metrics.kind` is the metric **data-taxonomy** (body-measure/…/biomarker), NOT `measurement_kind`.
  Kept as-is. `[rerun C2]`
- **C3 guard** — **no economy/E1–E5 columns.** Health feeds XP via the **Sessions S4 `award_xp` effect** (the workout
  session), already authored in group #3 — not owned here. `[rerun C3]`
- **M4/M5 seams** — `deriveMastery()` per-child weighted rollup + the M5 queryable-measure read seam (R7) are
  **service-layer**; the up-ladder role/goal→purpose rides `contributions` (Purposes-owned). No column here beyond the
  nullable slots + the existing `purpose_id`/`metric_id`/`role_id` subject FKs (plain TEXT, no-FK). `[rerun M4/M5; §5]`
- **X*/AI* integration wiring** — wearable/Google-Health INPUT, medical OUTPUT egress (X4), LLM/photo/prescription — all
  **forward-dep stubs / INTENT**, never wired here. The only DDL trace is: `source` provenance values (`wearable`/`import`/
  `ai`) on `health_metric_values`, and the `authoring_source`/`source` provenance columns. No integration table. `[rerun §5; HC-22]`
- **Composed, not owned** — workouts → Sessions (`workout` sub-type); catalogs (exercises/ingredients/dishes) →
  Training/Nutrition + Knowledge; notes/tags/views → Notes&Pages/Spaces; Protocols → Knowledge (`kind=protocol`);
  Profiles = a DERIVED/cached view (not a base table). `[structure-data §Composed]`
- **Nutrition (#18) / Training (#19)** — separate DB-4 groups; their tables (`workout_sessions`, `meal`, `nutrition_plan`,
  exercise/ingredient catalogs) and entity_types are authored there. This unit is **Core only** (rerun §5).

### Boundary — what this unit is NOT (doc-cited)
NOT a pillar (no exercises/recipes) · NOT the metric/goal *primitive* owner (specializes Purposes' target/metric — HC-5) ·
NOT a session engine (workouts = Sessions, ADR-004) · NOT an AI/wearable/exchange service (extension-model, forward-dep) ·
NOT a warden (Safety advises, never blocks — HC-14).

## §2. Business Rules (inherited invariants the DDL honors)
- **HC [E] set** (ZK-1, R3 — Health is the most-sensitive class): `[E]` fields per structure-data — metric `name`/`unit`,
  value `context`/`photo_blob`, domain/factor `name`/`description`, exam `name`/`provider_note`, goal `title`/`description`/
  `unit`, role `objectives`/`can_do`/`approach`, experiment `hypothesis`/`arm_a`/`arm_b`/`key_learning`, response `notes`,
  medical `label`/`details`, safety `message`. (M1.0 = **empty `[E]` set, pass-through** — BR-DB6-3; marked via `@encrypted` JSDoc.)
- **HC-1** — one unified `health_metric` (kind × unit × direction × category × optional side/formula); no separate
  body/performance/test systems. **HC-19** — `health_domains` ⊃ `health_factors` group metrics; a Factor result **IS** a
  metric value (no parallel store). **HC-21** — derived metrics (`formula` declared on the metric) are computed on-device;
  the value is a cache, source rows are truth (the M3 nullable-derive shape at the metric level).
- **HC-2** — a metric value carries its `source` (value provenance — **distinct** from a goal's `binding_mode`, ADR-011 M2);
  `wearable`/`import` enter device-mediated (X1) under `external_in_ok` (X5); `ai` tags LLM/photo-derived values (AI6).
- **HC-3** — the goal is the **pursuable**: `measurement_kind`×`binding_mode`; `progress` is a nullable override
  (`NULL ⇒ derive`), never hand-typed for measurable goals.
- **HC-9** — a `physical_role` owns objectives + a can-do def + a **derived mastery** (nullable override; per-child
  weighted rollup, service-layer); medically-aware (reads the Medical Profile).
- **HC-14/HC-15/HC-16/HC-23** — Safety & Medical is **advisory, never blocking**: `safety_flags` surface/notify/log
  (dismissible); `medical_profile_entries` is the module-wide provider (filters are advisory, excluded ≠ removed).
- **HC-20** — an Exam is user-configured + scheduled (composes Scheduler + Notifications); results enter as metric values
  (`source=exam`). **HC-11** — units canonical stored, Preferences-displayed.

### Enum CHECK sets

**REUSE — existing `@vida/types` tuples (no new tuple; parity rows added):**

| Column | Reused tuple (home) | Members |
|---|---|---|
| `health_goals.measurement_kind` | `MEASUREMENT_KIND` (`measurement.ts:5`) | quantitative·milestone·rate·qualitative `[ADR-011 M1]` |
| `health_goals.binding_mode` | `BINDING_MODE` (`measurement.ts:9`) | manual·derived-pull·event-trigger `[ADR-011 M2]` |
| `health_goals.status` | `STATUS` (`common.ts:32`) | not_started·in_progress·completed·on_hold·cancelled |
| `health_goals.review_frequency` | `FREQUENCY` (`common.ts:44`) | daily·weekly·biweekly·monthly·quarterly·yearly (nullable) |

**NET-NEW FIXED — closed sets (author tuple + Zod + SQL CHECK) in `health.ts`:**

| Tuple | Members | Source |
|---|---|---|
| `HEALTH_METRIC_KIND` | body-measure·performance-capacity·test-result·biomarker | structure-data L15 (C2 taxonomy) |
| `METRIC_DIRECTION` | higher-better·lower-better | L16; conventions L12 "direction is mandatory" |
| `METRIC_SIDE` | left·right·bilateral | L17 (nullable) |
| `HEALTH_METRIC_VALUE_SOURCE` | manual·photo·wearable·derived·exam·import·ai | L24 (**`ai`** = AI6, C4) |
| `HEALTH_GOAL_HORIZON` | short·med·long | L42 |
| `ASSIGNED_EXAM_STATUS` | scheduled·due·overdue·logged·skipped | L37 |
| `HEALTH_EXPERIMENT_PILLAR` | training·nutrition·cross | L60 |
| `HEALTH_EXPERIMENT_PHASE` | A·B·analysis·done | L62 |
| `HEALTH_EXPERIMENT_SOURCE` | self·claim·prescription | L63 |
| `MEDICAL_PROFILE_KIND` | condition·allergy·intolerance·injury·limitation·medication·supplement·prescription·clearance·contraindication | L71 |
| `MEDICAL_PROFILE_SOURCE` | manual·imported-doctor | L73 |
| `SAFETY_FLAG_TRIGGER` | overtraining·extreme-deficit·rapid-weight-change·biomarker·injury-pattern·warning-response | L74 |
| `SAFETY_FLAG_STATUS` | active·dismissed·acknowledged | L76 |
| `PHYSICAL_ROLE_AUTHORING_SOURCE` | manual·llm·import | L57 |

**OPEN vocab — user-extensible / under-specified → plain TEXT, NO CHECK, NO tuple** ([[open-vocab-columns-take-no-sql-check]]):

| Column | Why OPEN | Source |
|---|---|---|
| `physical_roles.type` (modality) | "martial-art/sport/calisthenics/endurance/**…**" — user-extensible modality (C1 guard: NOT a measurement axis) | L50; conventions L24 |
| `health_experiments.type` | "meal-timing/food-choice/portion/exercise-var/**…**" | L61 |
| `health_exams.kind` | "blood panel/checkup/imaging" — **user-configured** medical exams (HC-20) | L34 |
| `health_metrics.category` | free category label (no member set given) | L15 |
| `health_metrics.body_part` | "biceps/quads/**…**" (nullable) | L17 |
| `health_responses.{energy_response,digestion_response,overall_feeling,pattern_type}` | subjective observation scales — no member set specified | L64-65 |
| `{safety_flags,medical_profile_entries}.severity` | no member set specified in structure-data — do NOT invent a closed set | L72, L75 |
| `medical_profile_entries.status` | no member set specified | L72 |
| `health_experiments.winner` | free (an arm ref / label) | L62 |

## §3. Intended shape — 12 tables (all net-new ADR-002 additions; all `[INTENT]`, no As-is floor)

**Conventions applied to all 12:** UUIDv7 TEXT PK · Unix-ms timestamps · `YYYY-MM-DD` dates · JSON-as-TEXT · `_sync_*` on
every table · **no cross-table FK** (plain TEXT ids — ADR-016 §3.4; the §-doc "FK" notation is superseded) · enums = SQL
CHECK (FIXED) or plain TEXT (OPEN) · `[E]` marked via `@encrypted` JSDoc (M1.0 pass-through).

**`deleted_at` split — the documented floor is authoritative → `health_goals` ONLY:** `baseColumns` excludes `deleted_at`
(`_shared.ts:35`); it is added per-table **only where the floor marks it.** The **structure-data roster IS the authoritative
per-table floor** (the Phase-2 spec authored from the 18-DB Notion design, marked `[FACT]`/AUTHORITATIVE — intake L77-81;
[[module-doc-is-db4-roster-not-adr-broad-list]]). "No v2 *code*" (the doc's own "no As-is FACT floor" — L11) is **not** "no
*documented* floor" — the roster is the floor, and its per-table notation is deliberate. The floor marks `deleted_at` on
**`health_goals` only** (structure-data L45 "timestamps · `deleted_at`"); every other table's tail-notation omits it
("timestamps" = `baseColumns`; "_sync_*" = ledger). Header L7 lists `soft-delete deleted_at` as the platform deletion
*mechanism* (used where a table needs it), NOT "on every table" (contrast: "`_sync_*` **on every syncable table**"). The
design is status/append-oriented (Notion instances carry `Status`; goals carry progress + are the one entity a user
deletes-with-recovery). Therefore:
- **`deleted_at` on `health_goals` ONLY** `[FACT: structure-data L45; the documented floor]`.
- **All other 11 tables = `baseColumns`, no `deleted_at`** (entities manage lifecycle via `status`/`end_date`/`phase`;
  ledgers append + cascade). Do NOT override the floor with a blanket baseline ([[follow-created-structure-questions-are-add-or-deviate]]).

**Table shapes** (P=plaintext · E=`[E]` · all ids no-FK plain TEXT):

- **§3a `health_metrics`** `[INTENT structure-data L15-23]` — `baseColumns` (no `deleted_at` — floor L20); `kind`(FIXED `HEALTH_METRIC_KIND`) · `name`E ·
  `unit`E · `direction`(FIXED `METRIC_DIRECTION`) · `category`(OPEN) · `body_part`(OPEN, null) · `side`(FIXED `METRIC_SIDE`, null) ·
  `formula`(P, null — declares a derived metric) · `factor_id`(P, null) · `protocol_id`(P, null) · `catalog_ref`(P, null).
- **§3b `health_metric_values`** `[INTENT L24-29]` — **ledger**: `baseColumns`, no `deleted_at`; `metric_id`(P) ·
  `value`(P) · `recorded_at`(P) · `source`(FIXED `HEALTH_METRIC_VALUE_SOURCE`) · `exam_id`(P, null) · `context`E ·
  `photo_blob`E(null). idx on `metric_id`, `recorded_at`.
- **§3c `health_domains`** `[INTENT L30-31]` — `baseColumns` (no `deleted_at` — floor L31); `name`E · `description`E · `order`(P).
- **§3d `health_factors`** `[INTENT L32-33]` — `baseColumns` (no `deleted_at` — floor L33); `domain_id`(P) · `name`E · `description`E. idx on `domain_id`.
- **§3e `health_exams`** `[INTENT L34-36]` — `baseColumns` (no `deleted_at` — floor L36); `name`E · `kind`(OPEN) · `schedule`(JSON P) ·
  `produces_metrics`(JSON P) · `provider_note`E(null).
- **§3f `assigned_exams`** `[INTENT L37-38]` — **ledger**: `baseColumns`, no `deleted_at`; `exam_id`(P) · `due_date`(P) ·
  `status`(FIXED `ASSIGNED_EXAM_STATUS`) · `logged_at`(P, null). idx on `exam_id`, `due_date`.
- **§3g `health_goals`** `[INTENT L39-48]` — **the pursuable**: `baseColumns` **+ `deleted_at`**;
  `measurement_kind`(FIXED `MEASUREMENT_KIND`, M1) · `binding_mode`(FIXED `BINDING_MODE`, M2) · `title`E · `description`E ·
  `metric_id`(P, null) · `target_value`(P) · `unit`E · `horizon`(FIXED `HEALTH_GOAL_HORIZON`) · `start_date`·`target_date`(P) ·
  `status`(FIXED `STATUS`) · `progress`(P, **null override — `NULL ⇒ derive`, M3**) · `review_frequency`(FIXED `FREQUENCY`, null) ·
  `purpose_id`(P, null → the M7-kept ladder) · `role_id`(P, null).
- **§3h `physical_roles`** `[INTENT L49-59]` — `baseColumns`; `name`E · `type`(**OPEN** modality, C1 guard) · `objectives`E ·
  `can_do`E · `mastery`(P, **null override — `NULL ⇒ derive`, M3/M4**) · `knowledge_subject_id`(P, null) · `skill_id`(P, null) ·
  `exercise_refs`(JSON P) · `session_sub_types`(JSON P) · `authoring_source`(FIXED `PHYSICAL_ROLE_AUTHORING_SOURCE`) ·
  `locale_variant`(P, null) · `approach`E. (no `deleted_at` — floor L58.)
- **§3i `health_experiments`** `[INTENT L60-63]` — `baseColumns` (no `deleted_at` — floor L63); `name`E · `pillar`(FIXED `HEALTH_EXPERIMENT_PILLAR`) ·
  `hypothesis`E · `type`(**OPEN**) · `arm_a`E · `arm_b`E · `metrics`(JSON P) · `duration`(P) ·
  `phase`(FIXED `HEALTH_EXPERIMENT_PHASE`) · `winner`(OPEN, null) · `key_learning`E · `source`(FIXED `HEALTH_EXPERIMENT_SOURCE`).
- **§3j `health_responses`** `[INTENT L64-66]` — **ledger**: `baseColumns`, no `deleted_at`; `subject_ref`(P poly) ·
  `energy_response`(OPEN) · `digestion_response`(OPEN) · `overall_feeling`(OPEN) · `pattern_type`(OPEN) ·
  `life_context`(JSON P) · `notes`E · `recorded_at`(P). idx on `recorded_at`.
- **§3k `medical_profile_entries`** `[INTENT L70-73]` — `baseColumns` (no `deleted_at` — floor L73; lifecycle via
  `status`/`end_date`); `kind`(FIXED `MEDICAL_PROFILE_KIND`) · `label`E ·
  `severity`(OPEN, null) · `status`(OPEN, null) · `details`E · `affected_refs`(JSON P) ·
  `source`(FIXED `MEDICAL_PROFILE_SOURCE`) · `start_date`·`end_date`(P, null).
- **§3l `safety_flags`** `[INTENT L74-76]` — **ledger**: `baseColumns`, no `deleted_at`; `trigger`(FIXED `SAFETY_FLAG_TRIGGER`) ·
  `severity`(OPEN) · `message`E · `source_ref`(P poly) · `raised_at`(P) · `status`(FIXED `SAFETY_FLAG_STATUS`). idx on `status`.

### §3m. `ENTITY_TYPES` registry — append 11 (SP1/SP2 open registry)
Append to `_registry.ts` `ENTITY_TYPES`: `health_metric` · `health_metric_value` · `health_domain` · `health_factor` ·
`health_exam` · `assigned_exam` · `health_goal` · `physical_role` · `health_experiment` · `medical_profile_entry` ·
`safety_flag` (11 — the pillar types `workout_session`/`exercise`/`meal`/`nutrition_plan` are #18/#19's). `[structure-data §ADR-002 additions]`

### §3n. `packages/types/src/health.ts` — NET-NEW (grep-confirmed: no `health.ts` exists)
- 14 net-new FIXED tuples (above) `as const` + derived unions + 14 `z.enum` validators.
- REUSE (import, do not redefine): `MEASUREMENT_KIND`/`BINDING_MODE` (measurement.ts), `STATUS`/`FREQUENCY` (common.ts).
- 12 row interfaces (`HealthMetric`, `HealthMetricValue`, …) extending the base/sync shape; `[E]` fields JSDoc-`@encrypted`.
- Barrel: export from `packages/types/src/index.ts`. (The Health domain enum home; Nutrition #18 / Training #19 append here.)

## §4. Physical home & authoring model
- **Schema:** `packages/core/src/db/schema/health-core.ts` (Core tables; #18/#19 get `health-nutrition.ts`/`health-training.ts`).
  Register in `schema/index.ts` barrel.
- **Migration:** `packages/core/src/db/migrations/027_health_core.ts` (`version: 27`, `name: 'health_core'`, hand-written
  SQL, mirrors the schema). Register in `runner.ts` `ALL_MIGRATIONS` → `LATEST_VERSION` 26→27.
- **Types:** `packages/types/src/health.ts` (net-new) + barrel + `ENTITY_TYPES` append in `_registry.ts`.
- **Validators:** the 14 `z.enum` in `health.ts` (colocated, mirroring `skill.ts`/`learning.ts`).
- **Tests:** `health-core-introspection.test.ts` (DDL introspection ×4 dims: columns/PK/notNull/CHECK vs the Drizzle mirror) +
  enum-parity rows (SQL CHECK ↔ tuple) for the 14 FIXED + 4 reused columns. Author model mirrors group #16.

## §5. Phase-1 completion checklist + shape resolutions
- [x] All 5 aspect docs + rerun + intake §Resolution read (WHOLE) · [x] no `health_*` on disk (net-new confirmed) ·
  [x] reuse map grounded (MEASUREMENT_KIND/BINDING_MODE/STATUS/FREQUENCY) · [x] 14 FIXED + OPEN split cited to structure-data lines ·
  [x] `deleted_at` split cited · [x] C1/C2/C3 guards named · [x] X*/AI*/M4/M5 = cite-not-author.

### Shape resolutions — doc-determined (candidate ZERO decisions; the gate confirms)
1. **Goal-`type` NOT authored** — decomposed into `measurement_kind`×`binding_mode`×subject-FK `[FACT rerun G-M1/G-M2]`.
2. **`progress`/`mastery` nullable, no DEFAULT** — the `NULL ⇒ derive` override slot `[FACT rerun G-M3; HC-3/HC-9]`.
3. **`source` enum includes `ai`** `[FACT rerun C4; AI6]`.
4. **REUSE 4 tuples, don't redefine** `[FACT — grep member-match]`.
5. **OPEN vocabs take no CHECK** — modality/experiment-type/exam-kind/category/body_part/response-scales/severity/status/winner
   `[FACT — "…" notation + under-specified; [[open-vocab-columns-take-no-sql-check]]]`.
6. **No-FK / `[E]` M1.0 pass-through / `_sync_*` on all** `[FACT — platform conventions]`.
7. **`deleted_at` on `health_goals` ONLY** `[FACT: the documented floor, structure-data L45]`. The **structure-data roster
   IS the authoritative per-table floor** (Phase-2 spec from the AUTHORITATIVE 18-DB Notion design, intake L77-81); "no v2
   *code*" ≠ "no *documented* floor." The floor marks `deleted_at` on `health_goals` alone; the other 11 omit it (entities
   manage lifecycle via `status`/`end_date`/`phase`; ledgers append). Header L7 lists soft-delete as the deletion
   *mechanism*, not "on every table." Follow the floor per-table; do not override it with a blanket baseline. *(Gate-1
   REVISE was itself over-corrected: the independent critic ruled the floor "under-annotation" on a false "no floor"
   premise — Victor corrected it. Lesson: doc-check a critique's ruling before acting, [[verify-a-critiques-escalation-and-defer-target-before-relaying]].)*

### DB-11 carry-forward (cited, not fixed here)
+= all 12 Health-Core interfaces + 14 net-new enums; the M5 read-seam service + `deriveMastery()`/`progress()` derivers +
X*/AI* integration wiring are service-phase (M1.1+), not DB-4.

## §6. Preflight — folds resolved (SQL types + indexes; convention-grounded, no build-time guess)
The structure-data floor marks P/E + nullability but not the SQL primitive; resolved from the live schema conventions
(`_shared.ts` helpers + sibling precedents), so the migration author guesses nothing:

- **F1 · numeric primitives → `REAL`** (`real()`): `health_metric_values.value` (precedent `habit_completions.value` REAL,
  `habits.ts:100`) · `health_goals.target_value` (precedent `targets.target_value` REAL, `purposes.ts:85`) ·
  `health_goals.progress` (nullable override; REAL for the `[0,1]` derive, rerun M3 `progress():[0,1]`) ·
  `physical_roles.mastery` (nullable override; REAL). No DEFAULT on the two override slots (`NULL ⇒ derive`).
- **F2 · `INTEGER`** (`integer()`): `health_domains.order` · `health_experiments.duration` (day-count) · all
  `_sync_*`/`created_at`/`updated_at` (baseColumns) · `health_goals.deleted_at`.
- **F3 · dates vs timestamps:** `*_date` (`start_date`/`target_date`/`due_date`/`end_date`) → `calendarDate` (TEXT
  `YYYY-MM-DD`); **event timestamps** (`recorded_at`/`raised_at`/`logged_at`) → `timestampMs` (INTEGER Unix ms — full
  time, time-series can be intra-day).
- **F4 · `[E]` text fields → `text()` + `/** @encrypted [E] */` JSDoc** (M1.0 empty-[E] pass-through, BR-DB6-3):
  `name`/`unit`/`context`/`description`/`title`/`objectives`/`can_do`/`approach`/`hypothesis`/`arm_a`/`arm_b`/
  `key_learning`/`notes`/`label`/`details`/`provider_note`/`message` = TEXT [E]. **`photo_blob` = `blob('photo_blob',
  {mode:'buffer'})` (nullable, `@encrypted`)** — the inline-encrypted-binary precedent (`note_attachments.encrypted_blob`
  `notes.ts:94`; `projects.ts:32`; `learning.ts:319` — all `blob()` buffers), NOT TEXT.
- **F5 · JSON columns → `json<T>()`** (TEXT): `health_exams.{schedule,produces_metrics}` · `physical_roles.{exercise_refs,
  session_sub_types}` · `health_experiments.metrics` · `health_responses.life_context` · `medical_profile_entries.affected_refs`.
- **F6 · indexes** (query-driven, mirroring sibling practice): `idx_health_metric_values_metric`(metric_id) +
  `_recorded`(recorded_at) · `idx_health_factors_domain`(domain_id) · `idx_assigned_exams_exam`(exam_id) +
  `_due`(due_date) · `idx_health_responses_recorded`(recorded_at) · `idx_safety_flags_status`(status) ·
  **`idx_health_goals_status ON health_goals(status) WHERE deleted_at IS NULL`** (partial — the `status`/soft-delete
  precedent is `idx_tasks_status` `015:94` / `idx_projects_status` `016:78`, NOT `idx_habits_active` which keys `is_active`
  that goals lacks). All indexes are SQL-migration-only.
- **F7 · CHECK ↔ tuple parity:** the migration writes a SQL `CHECK (col IN (...))` for each of the **14 FIXED** columns +
  the **4 reused** (`measurement_kind`/`binding_mode`/`status`/`review_frequency`) columns, sourced from the tuple; the
  introspection/parity test asserts CHECK-set ≡ tuple for all 18. **OPEN columns take NO CHECK** (§2 OPEN table). No
  numeric range CHECK (Health has no 1–10 scale like check-ins; `value`/`progress` are free REAL).
- **F8 · `_sync_id` UNIQUE + `_sync_status` DEFAULT 'pending'** come from `syncColumns` (all 12); no per-table restate.
- **F9 · no cross-table FK** — every `*_id` (`metric_id`/`factor_id`/`domain_id`/`exam_id`/`role_id`/`purpose_id`/
  `protocol_id`/`knowledge_subject_id`/`skill_id`/`catalog_ref`) is plain `text()`, no `references()` (ADR-016 §3.4).
- **F10 · NOT NULL / DEFAULT posture for FIXED-enum columns** (mirror `targets.status ...notNull().default('not_started')`
  purposes.ts:92; honoring the tasks gate-2 lesson — no *manufactured* NOT-NULL-DEFAULT on a measure/binding discriminator):
  - **Lifecycle-status → NOT NULL + natural initial default:** `health_goals.status` DEFAULT 'not_started' ·
    `assigned_exams.status` DEFAULT 'scheduled' · `health_experiments.phase` DEFAULT 'A' · `safety_flags.status`
    DEFAULT 'active' · `health_metric_values.source` DEFAULT 'manual' · `medical_profile_entries.source` DEFAULT 'manual' ·
    `physical_roles.authoring_source` DEFAULT 'manual'.
  - **Intrinsic discriminators → NOT NULL, NO default** (the app must choose at creation; the education_measurements
    `measurement_kind` notNull-no-default precedent): `health_metrics.kind` · `health_metrics.direction` (conventions
    L12 "direction is mandatory") · `health_goals.measurement_kind` · `health_experiments.pillar` ·
    `health_experiments.source` · `safety_flags.trigger` · `medical_profile_entries.kind` · `health_goals.horizon`.
  - **Override / optional → NULLABLE, no default:** `health_goals.binding_mode` (ADR-011 §3.2 override — the tasks gate-2
    ruling struck a NOT-NULL-DEFAULT here) · `health_goals.progress`/`physical_roles.mastery` (M3 `NULL⇒derive`) ·
    `health_goals.review_frequency` · `health_metrics.side` · all OPEN vocabs.
