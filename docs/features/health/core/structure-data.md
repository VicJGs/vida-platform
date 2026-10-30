<!-- Structure & Data — features/health/core · Phase 2.
     ⚠ NO v2 schema exists — all NEW → ADR-002 additions. P=plaintext · E=field-encrypted [E]. -->

# Structure & Data — Health: Core

All entities are **new** (Health is a recovered domain with no v2 schema) → **ADR-002 additions**. IDs UUIDv7 TEXT;
timestamps Unix ms; dates `YYYY-MM-DD`; money cents; `_sync_*` on every syncable table; soft-delete `deleted_at`.

**Subject to (R6 named-ADR set):** ADR-002 (data model) + **ADR-011** (universal measurability — M1/M2/M3/M4/M5), **ADR-006**
(Spaces/universal tags — SP1/SP2), **ADR-014** (external ingestion — X1/X2/X4/X5/X8), **ADR-015** (AI/LLM — AI1/AI3/AI5/AI6).
Because there is **no v2 schema**, every token below is already `[INTENT]` — there is no As-is FACT floor; the ADR-aligned
model is stated directly (no two-tier split needed). `[INTENT R6]`

## Entities (Core-owned)

- **`health_metrics`** — metric definitions. `id` · `kind` P (body-measure/performance-capacity/test-result/
  biomarker) · `name` **E** · `unit` **E** · `direction` P (higher/lower-better) · `category` P · `body_part` P
  (nullable; biceps/quads/…) · **`side` P** (nullable; left/right/bilateral) · **`formula` P** (nullable; declares a
  **derived** metric — BMR/BEE/LBM/body-fat-mass/1RM — computed from other metrics, HC-21) · `factor_id` FK (nullable
  → monitoring grouping) · `protocol_id` P (nullable → Knowledge protocol for test-results) · `catalog_ref` P
  (nullable → Knowledge reference catalog, e.g. the shipped biomarker panel) · timestamps. `[INTENT Fork 1/CI-2]`
  Metrics are advertised as an **M5 queryable-measure read seam** (via **R7** — `body_weight`/`body_fat`/`1rm(lift)`/
  `progress(goal)`) that `derived-pull` goals + the **PG6 Purposes provider** (HC-5) read through — never a direct
  cross-module table read; outage → last-known + flag. `[INTENT ADR-011 M5 §3.6 + R7]`
- **`health_metric_values`** — time-series. `id` · `metric_id` FK · `value` P · `recorded_at` P · `source` P
  (manual/photo/wearable/derived/**exam**/import/**ai**) · `exam_id` FK (nullable → HC-20) · `context` **E** (life-context) ·
  `photo_blob` **E** (nullable) · `_sync_*`. `source` is **value provenance** (ADR-011 M2 keeps this distinct from a
  goal's `binding_mode`); **`ai`** tags LLM/photo-analysis-derived values (AI6 provenance — ADR-015 §3.6); `wearable`/
  `import` values enter via **device-mediated ingestion (X1)** under an `external_in_ok` grant (X5 — ADR-014), never a
  server fetch. Same shape as `purpose_metric_values` (shared primitive). `[INTENT Fork 1/HC-2; ADR-015 AI6; ADR-014 X1/X5]`
- **`health_domains`** — monitoring top level. `id` · `name` **E** (cardiovascular/metabolic/hormonal/sleep/immune/
  digestive/…) · `description` **E** · `order` P · timestamps. User-extensible; ship a starter set. `[INTENT CI-1/HC-19]`
- **`health_factors`** — measurable sub-indicators. `id` · `domain_id` FK · `name` **E** · `description` **E** ·
  timestamps. A factor groups metrics; a factor result IS a metric value. `[INTENT CI-1/HC-19]`
- **`health_exams`** — user-configured medical exams. `id` · `name` **E** (blood panel/checkup/imaging) · `kind` P ·
  `schedule` P (JSON recurrence) · `produces_metrics` P (JSON metric_ids) · `provider_note` **E** (nullable) ·
  timestamps. Composes Scheduler + Notifications; results flow to `health_metric_values`. `[INTENT CI-1/HC-20]`
- **`assigned_exams`** — scheduled exam instances. `id` · `exam_id` FK · `due_date` P · `status` P (scheduled/due/
  overdue/logged/skipped) · `logged_at` P (nullable) · `_sync_*`. `dueIn()` surfaces these on the Calendar/agenda. `[INTENT HC-20]`
- **`health_goals`** — unified goals; the **pursuable** that carries the ADR-011 measure. `id` · **`measurement_kind` P**
  (CHECK ∈ `quantitative·milestone·rate·qualitative`, M1) · **`binding_mode` P** (CHECK ∈ `manual·derived-pull·event-trigger`,
  M2 — how progress updates; distinct from value `source`) · `title` **E** · `description` **E** · `metric_id` FK (nullable) ·
  `target_value` P · `unit` **E** · `horizon` P (short/med/long) · `start_date`·`target_date` P · `status` P ·
  **`progress` P (nullable override — `NULL ⇒ derive`; `progress()` derived-on-read, M3)** · `review_frequency` P ·
  `purpose_id` P (nullable → the **M7-kept** `targets.purpose_id`; ladders to a life Purpose) · **`role_id` FK** (nullable) ·
  timestamps · `deleted_at`. Specializes the Purposes target/metric primitive. The bespoke `type` enum is **retired** →
  decomposed into `measurement_kind` × `binding_mode` × the `metric_id`/`role_id` **subject** (read via the M5 seam):
  metric-target/body-composition = `quantitative` + `derived-pull`(metric); physical-role = `qualitative`/`milestone` +
  `derived-pull`(role mastery); event-prep = `milestone` + `manual`. `[INTENT Fork 2/CI-4/HC-3/HC-5; ADR-011 M1/M2/M3]`
- **`physical_roles`** — the trainable-capability unit (**merges the old `disciplines` + capacity goals**). `id` ·
  `name` **E** (calisthenics/swimmer/muay-thai/jiu-jitsu/triathlete/…) · `type` P (martial-art/sport/calisthenics/
  endurance/… — this is **modality**, a property not a measurement axis; kept, NOT decomposed — C1 guard) ·
  `objectives` **E** · `can_do` **E** (the capability definition) · `mastery` P (**nullable override — `NULL ⇒ derive`;
  `deriveMastery()` = a per-child weighted rollup over linked exercises/goals (default NULL = equal-weight), M3/M4; the
  up-ladder role→purpose rides `contributions`, Purposes-owned**) · `knowledge_subject_id` P (→ Knowledge, technique) ·
  `skill_id` P (→ Skills #2, nullable
  stub — Roles are a heavy Skills resource) · `exercise_refs` P (JSON → the exercises it generates/links) ·
  `session_sub_types` P (JSON) · `authoring_source` P (manual/llm/import) · `locale_variant` P (nullable; geo/lang/
  culture/location — for curated import) · `approach` **E** · timestamps. Medically-aware (reads Medical Profile).
  `[INTENT Fork 4 merged / CI-4/HC-9]`
- **`health_experiments`** — N-of-1. `id` · `name` **E** · `pillar` P (training/nutrition/cross) · `hypothesis`
  **E** · `type` P (meal-timing/food-choice/portion/exercise-var/…) · `arm_a` **E** (control) · `arm_b` **E**
  (test) · `metrics` P (JSON metric_ids measured) · `duration` P · `phase` P (A/B/analysis/done) · `winner` P ·
  `key_learning` **E** · `source` P (self/claim/prescription) · timestamps. `[INTENT Fork 3/HC-7; FACT Notion rows]`
- **`health_responses`** — observation logs (per training-type / food). `id` · `subject_ref` P (poly: metric/
  exercise/food) · `energy_response` P · `digestion_response` P · `overall_feeling` P · `pattern_type` P ·
  `life_context` P (JSON) · `notes` **E** · `recorded_at` P · `_sync_*`. `[INTENT]`
- **Profiles = DERIVED (not a base table).** The response profile is computed from `health_responses` +
  resolved `health_experiments` (a materialized/cached view), feeding the AI planner. `[INTENT HC-8]`
- **Protocols (Testing/Recovery) = Knowledge, NOT a Core table** (kind=`protocol`; Core references by id). `[INTENT HC-12]`
- **`medical_profile_entries`** — the fast medical set (Health-owned, read module-wide). `id` · `kind` P (condition/
  allergy/intolerance/injury/limitation/medication/supplement/prescription/clearance/contraindication) · `label`
  **E** · `severity`/`status` P · `details` **E** · `affected_refs` P (JSON → exercises/muscles/ingredients it
  constrains) · `source` P (manual/imported-doctor) · `start_date`·`end_date` P · timestamps · `_sync_*`. `[INTENT HC-16]`
- **`safety_flags`** — advisory warnings (raised from metrics/responses/profile). `id` · `trigger` P (overtraining/
  extreme-deficit/rapid-weight-change/biomarker/injury-pattern/warning-response) · `severity` P · `message` **E** ·
  `source_ref` P (poly) · `raised_at` P · `status` P (active/**dismissed**/acknowledged) · `_sync_*`. Never blocks. `[INTENT HC-15]`

## Composed (NOT Core tables — owned elsewhere)

- Workout instances/logs → **Sessions** (`workout` sub-type + Training's `workout_sessions` extension). `[FACT ADR-004]`
- Catalogs (exercises/ingredients/dishes) → **Training/Nutrition** pillars (+ Knowledge kinds). `[INTENT]`
- Notes/tags/views → **Notes & Pages / Spaces**. Goal↔Purpose ladder → **Purposes**. Cost → **Finance**. `[INTENT]`

## ADR-002 additions

New tables above + new Core entity_types that become **taggable/linkable by registering in the open taggable-type
registry** (**SP2** — ADR-006 §3.2; NOT a closed `entity_type CHECK`), consumed by **`entity_tags`** (**SP1**, the
universal tag primitive — `tag_id, entity_type, entity_id`) + `entity_links`/`pages`: `health_metric` ·
`health_metric_value` · `health_domain` · `health_factor` · `health_exam` · `assigned_exam` · `health_goal` ·
`physical_role` · `health_experiment` · `medical_profile_entry` · `safety_flag` (+ pillar types `workout_session` ·
`exercise` · `meal` · `nutrition_plan` from Training/Nutrition). Health is a **consumer** of the ADR-006 tag registry,
never a tag-table owner. New value-`source` enum values (`exam`·`import`·**`ai`** [AI6 — ADR-015 §3.6]) + goal
`measurement_kind`/`binding_mode` columns + metric `side`/`formula` columns. Fold into the standing consolidated
ADR-002 amendment. `[INTENT HL10/CI-1/CI-2/CI-4; ADR-006 SP1/SP2; ADR-011 M1/M2; ADR-015 AI6]`

## Completion checklist

- [x] entities + P/E flags · [x] composed-vs-owned split · [x] ADR-002 additions noted · [x] no `{{…}}`
