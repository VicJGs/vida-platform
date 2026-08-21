# DB-4 · Domain Group #19 — Health: Training · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #19 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `029_health_training` (v29) · **Schema file:** `schema/health-training.ts` · **Types file:** `packages/types/src/training.ts` (net-new) · **Branch:** `db-4-per-domain-schema`
**Rerun:** **NONE** — health/training was **row 21 = ALIGNED** in the staleness sweep (no realignment owed; unlike Core row-19-stale / Nutrition row-20-gap). The 5 aspect docs are the sole authoritative source.

> **The Physical Training pillar** — the exercise lever. **5 owned tables** on the five-layer spine: Catalog → Plan →
> Template → Instance → Log. Net-new (recovered domain, no v2 schema); the `structure-data.md` roster IS the documented
> per-table floor. A workout **IS a Session** (composes `sessions` `workout` sub-type + a `workout_sessions` extension,
> ADR-004 — the C3 inverse of Nutrition). Composes Core #17 (goals/metrics/roles/adaptation/medical). **Zero build-decisions.**

## §0. Source model
Frontend/data source-of-truth = documented intent. Ground truth for THIS unit: `docs/features/health/training/{identity,
business-rules,structure-data,contract,conventions}.md` (all 5 aspects, read) · `docs/intake/health.md` **STATUS: WHOLE**
(the 9 Physical-Training Notion DBs) · `ADR-004` (table-per-type Sessions — the `workout_sessions` extension) · `ADR-002`
(conventions; Training = additions, no existing §) · `packages/types/src/{health,common}.ts` (`METRIC_SIDE`/
`PHYSICAL_ROLE_AUTHORING_SOURCE` reuse from #17) · `packages/types/src/session.ts` (`SESSION_SUB_TYPE` reserves `workout`) ·
`schema/_shared.ts` (`baseColumns` no `deleted_at`; `money()` cents) · `schema/foundation/session-extensions.ts` +
`schema/{books,learning,skills}.ts` (the session-extension shape: own id + `session_id` UNIQUE, no `deleted_at`) ·
`schema/health-core.ts` (#17 — the Core spine Training composes) · `schema/_registry.ts` (`ENTITY_TYPES`).

## §1. Identity — what this unit is
The exercise pillar. **5 owned tables:**
- **Catalog** — `exercises` (movement library: pattern/muscles/equipment/form/risk).
- **Plan** — `exercise_plans` (periodization: progression model/deload/energy-system; → Core goals + a Physical Role).
- **Template** — `workout_templates` (reusable session defs).
- **Instance** — `workout_sessions` (the **Sessions `workout` sub-type extension**, ADR-004).
- **Log** — `workout_sets` (per-exercise, per-set planned-vs-actual; child of a workout).

### Scope boundary — doc-DECIDED (intake WHOLE, no rerun → author the floor, cite the rest)
**AUTHOR (the doc-described shape — build phase):**
- The 5 tables per `structure-data.md` §Entities, with P/E flags, nullable notation, and the enum split below.
- **`workout_sessions` = the session-extension shape** (BR-DB-1 / the live precedent): `...baseColumns` (own `id` PK) +
  `session_id text notNull unique` (1:1 key → `sessions.id`, no FK), **NO `deleted_at`** (base `sessions` owns lifecycle).
  The floor's "id = session_id FK" notation reshapes to this live shape (the `skill_actions`/`class_sessions`/`reading_sessions`
  precedent — spine fields live on `sessions`, not re-stored).
- Register the 4 `entity_type`s in `_registry.ts` (OPEN SP2 registry).
- **`packages/types/src/training.ts`** (net-new — grep-confirmed none exists): 3 FIXED tuples + Zod.

**OUT (cite-not-author / owned elsewhere — Core inheritance + composition):**
- **HT-5 — no local KPI store.** PRs/1RM/volume/max-reps are emitted as **Core `health_metric_values`** (kind=
  performance-capacity, source=derived, per-lift/per-side); Training keeps no parallel KPI table. `[HT-5; conventions L12]`
- **Base session + runtime + scheduler → Sessions (ADR-004).** `workout_sessions` is ONLY the extension; the base `sessions`
  row, rest-timer/pause runtime, and `dueIn()` scheduling are Sessions-owned. `[HT-2/HT-3; FACT ADR-004]`
- **Protocols → Knowledge** (kind=`protocol`) · **technique → Knowledge** (kind=`exercise`, `exercises.knowledge_object_id`
  no-FK ref). `[HT-10; conventions L14]`
- **Core refs (no-FK):** `exercise_plans.goal_ids` (JSON → Core `health_goals`) + `role_id` (→ Core `physical_roles`, a Role
  generates/links the plan, medically-aware); no measurement axes (Training composes Core goals, like Nutrition — no
  `measurement_kind`/`binding_mode`). `[HT-6/HT-13; identity "not the metric owner"]`
- **No economy** (streaks/PRs → Gamification is a PROVIDES seam) · **modality = OPEN enum/tag** (HT-7, never a table per
  modality) · **Medical Profile filter** = Core-owned, advisory (HT-12) · **AI/import** = extension-model (`ai_generated`/
  `authoring_source` provenance only; no integration table).

### Boundary — what this unit is NOT (doc-cited)
NOT a session engine (composes Sessions, ADR-004) · NOT the metric owner (performance → Core, HT-5) · NOT the protocol
library (Knowledge) · NOT modality-fragmented (property, not machineries) · NOT the goal owner (composes Core goals).

## §2. Business Rules (inherited invariants the DDL honors)
- **HT [E] set** (ZK-1): `[E]` per structure-data — exercise `name`/`form_cues`/`common_errors`/`instructions`/`variations`/
  `video_url`; plan `name`/`description`; template `name`; session `performance_notes`/`issues`/`recovery_needs`; set
  `planned_reps`/`planned_weight`/`actual_reps` (encrypted numeric — the money[E] pattern: typed column + `@encrypted`).
  (M1.0 = empty `[E]` set, pass-through — BR-DB6-3; `@encrypted` JSDoc.)
- **HT-1** — five-layer spine (Catalog → Plan → Template → Instance → Log).
- **HT-2** — a workout IS a `workout` Session (ADR-004) + the `workout_sessions` extension; never a standalone workout table.
- **HT-4** — set logging is planned-vs-actual (planned + actual sets/reps/weight + RPE + form quality); volume = sets×reps×weight (service-computed).
- **HT-5** — performance → Core `health_metric_values` (per-lift, bilateral via `side`); no Training-local KPI store.
- **HT-7** — modality (training focus/workout type/movement pattern/set structure/exercise category) = enum/tag property.

### Enum CHECK sets

**REUSE — existing `@vida/types` tuples (no new tuple; parity rows added):**

| Column | Reused tuple (home) | Members |
|---|---|---|
| `workout_sets.side` | `METRIC_SIDE` (`health.ts`, #17) | left·right·bilateral (nullable) |
| `exercise_plans.authoring_source` | `PHYSICAL_ROLE_AUTHORING_SOURCE` (`health.ts`, #17) | manual·llm·import |

**NET-NEW FIXED — closed sets (author tuple + Zod + SQL CHECK) in `training.ts`:**

| Tuple | Members | Source |
|---|---|---|
| `MOVEMENT_PATTERN` | push·pull·hinge·squat·lunge·carry·rotation | structure-data L10 |
| `WORKOUT_SET_CATEGORY` | warm-up·main·accessory·cardio·mobility·cool-down | structure-data L26 |
| `BURN_SOURCE` | formula·wearable·manual | structure-data L24 |

**OPEN vocab — modality / not-inline-enumerated → plain TEXT (or JSON), NO CHECK, NO tuple** ([[open-vocab-columns-take-no-sql-check]]; conventions L16 "Modality = enum/tag"):

| Column(s) | Why OPEN | Source |
|---|---|---|
| `exercises.{primary_muscle, difficulty, risk_level}` | not inline-enumerated | L11 |
| `exercise_plans.{progression_model, deload_frequency, energy_system_focus, status}` | modality / not inline-enumerated (Notion values not lifted into the floor entity-def) | L14-16 |
| `workout_templates.{workout_type, set_structure}` | modality (conventions L16), not inline-enumerated | L19 |
| `workout_sessions.location` | free label | L22 |
| `workout_sets.form_quality` | not enumerated | L28 |

## §3. Intended shape — 5 tables (all net-new ADR-002 additions; all `[INTENT]`, no As-is floor)

**Conventions applied to all 5:** UUIDv7 TEXT PK · Unix-ms timestamps · `YYYY-MM-DD` dates · JSON-as-TEXT · `_sync_*` on
every table · **no cross-table FK** (plain TEXT ids — ADR-016 §3.4; the floor "FK" notation is superseded) · enums = SQL
CHECK (FIXED) or plain TEXT (OPEN) · `[E]` via `@encrypted` JSDoc (M1.0 pass-through).

**`deleted_at` split — the documented floor → `exercises` + `exercise_plans`:** the floor marks `deleted_at` on **two**
tables — `exercises` (L13) + `exercise_plans` (L18), the soft-deletable catalog/periodization entities. The other 3 omit
it: `workout_templates` (bare "timestamps", L20), `workout_sessions` (session extension — base owns lifecycle), `workout_sets`
(child log). Follow the floor per-table (the #17/#18 ruling). `[FACT: structure-data L13,18]`

**Table shapes** (P=plaintext · E=`[E]` · all ids no-FK plain TEXT · REAL=numeric):
- **§3a `exercises`** `[INTENT L10-13]` — `baseColumns` **+ `deleted_at`**; `name`E · `movement_pattern`(FIXED
  `MOVEMENT_PATTERN`) · `primary_muscle`(OPEN) · `secondary_muscles`(JSON) · `equipment`(JSON) · `difficulty`(OPEN) ·
  `risk_level`(OPEN) · `form_cues`E · `common_errors`E · `instructions`E · `variations`E · `video_url`E ·
  `knowledge_object_id`(P, null → Knowledge technique).
- **§3b `exercise_plans`** `[INTENT L14-18]` — `baseColumns` **+ `deleted_at`**; `name`E · `description`E ·
  `progression_model`(OPEN) · `deload_frequency`(OPEN) · `energy_system_focus`(OPEN) · `training_focus`(JSON) ·
  `frequency`(INTEGER, null — sessions/week) · `rest_days`(JSON) · `start_date`·`end_date`(calendarDate, null) ·
  `status`(OPEN) · `goal_ids`(JSON → Core health_goals) · `role_id`(P, null → Core physical_roles) ·
  `authoring_source`(FIXED `PHYSICAL_ROLE_AUTHORING_SOURCE`, dflt 'manual').
- **§3c `workout_templates`** `[INTENT L19-20]` — `baseColumns` (no `deleted_at` — floor L20); `name`E ·
  `workout_type`(OPEN) · `set_structure`(OPEN) · `primary_muscle_groups`(JSON) · `expected_duration`(INTEGER, min, null) ·
  `ai_generated`(boolInt, dflt 0) · `exercise_refs`(JSON).
- **§3d `workout_sessions`** `[INTENT L21-24; FACT ADR-004]` — **session extension**: `...baseColumns` (own `id`) +
  `session_id`(text notNull **unique** — 1:1 key → `sessions.id`, no FK); `plan_id`(P, null) · `template_id`(P, null) ·
  `location`(OPEN) · `pre_energy`(INTEGER 1-10, null) · `satisfaction`(INTEGER 1-10, null) · `completion_pct`(REAL, null) ·
  `performance_notes`E · `issues`E · `recovery_needs`E · `calories_burned`(REAL, null) · `burn_source`(FIXED `BURN_SOURCE`, null).
  **NO `deleted_at`** (base `sessions` owns lifecycle). idx on `session_id` is the UNIQUE; idx on `plan_id`.
- **§3e `workout_sets`** `[INTENT L25-29]` — `baseColumns` (no `deleted_at` — child log); `workout_session_id`(P, notNull) ·
  `exercise_id`(P, notNull) · `category`(FIXED `WORKOUT_SET_CATEGORY`) · `order`(INTEGER) · `side`(FIXED `METRIC_SIDE`, null) ·
  `planned_sets`(INTEGER, null) · `planned_reps`(INTEGER E, null) · `planned_weight`(REAL E, null) · `sets_done`(INTEGER, null) ·
  `actual_reps`(INTEGER E, null) · `weight_used`(REAL, null) · `rpe`(REAL, null) · `form_quality`(OPEN) · `is_pr`(boolInt, dflt 0).
  idx on `workout_session_id`, `exercise_id`.

### §3f. `ENTITY_TYPES` registry — append 4 (SP1/SP2 open registry)
`exercise` · `exercise_plan` · `workout_session` · `workout_set` (conventions L21; structure-data §ADR-002 additions L37).

### §3g. `packages/types/src/training.ts` — NET-NEW
- 3 FIXED tuples (`MOVEMENT_PATTERN`, `WORKOUT_SET_CATEGORY`, `BURN_SOURCE`) `as const` + unions + 3 `z.enum` (in `validators/training.ts`).
- REUSE (import, don't redefine): `METRIC_SIDE`, `PHYSICAL_ROLE_AUTHORING_SOURCE` (health.ts).
- Barrel: export from `packages/types/src/index.ts` + `validators/index.ts`.

## §4. Physical home & authoring model
- **Schema:** `packages/core/src/db/schema/health-training.ts` (register in `schema/index.ts` barrel; import `blob`? — no
  blob here; import `sqliteTable, text, integer, real, index`).
- **Migration:** `packages/core/src/db/migrations/029_health_training.ts` (`version: 29`, `name: 'health_training'`,
  hand-written SQL, mirrors the schema). Register in `runner.ts` `ALL_MIGRATIONS` → `LATEST_VERSION` 28→29.
- **Types:** `packages/types/src/training.ts` (net-new) + barrel + `ENTITY_TYPES` append in `_registry.ts`.
- **Validators:** the 3 `z.enum` in `validators/training.ts`.
- **Tests:** `health-training-introspection.test.ts` (DDL introspection ×4 dims + `deleted_at`-floor guard [exercises +
  exercise_plans] + the `workout_sessions` `session_id`-UNIQUE-no-deleted_at check) + enum-parity rows for the 5 FIXED
  columns (3 net-new + 2 reused). Author model mirrors group #17/#18.

## §5. Phase-1 completion checklist + shape resolutions
- [x] All 5 aspect docs read (no rerun — row 21 ALIGNED) · [x] no `training_*` on disk (net-new) · [x] boundaries = Core #17
  + Sessions/Knowledge (composed) · [x] FIXED/OPEN split cited to floor lines · [x] `deleted_at` = exercises + exercise_plans
  (floor L13/L18) · [x] session-extension shape verified (own id + session_id UNIQUE, no deleted_at).

### Shape resolutions — doc-determined (candidate ZERO decisions; the gate confirms)
1. **`deleted_at` on `exercises` + `exercise_plans`** `[FACT: structure-data L13,18]` — the floor marks two; the other 3
   omit it (template bare "timestamps"; session-extension + child-log by convention). Follow the floor (#17/#18 ruling).
   ⚠ `workout_templates` gets NO `deleted_at` (floor bare "timestamps") despite being a definition entity — the one
   floor-notation reading the gate stress-tests (I follow the floor, not a blanket "definitions get soft-delete").
2. **`workout_sessions` = session-extension shape** (own id + `session_id` UNIQUE, no `deleted_at`) — the floor's "id =
   session_id" reshapes to the live BR-DB-1 pattern `[FACT: session-extensions.ts + books.ts:152 + learning.ts:230]`.
3. **REUSE `METRIC_SIDE` + `PHYSICAL_ROLE_AUTHORING_SOURCE`** (member-exact from #17), don't redefine `[FACT — grep match]`.
4. **3 net-new FIXED** (movement_pattern/set-category/burn_source, inline-enumerated) + **rest OPEN** (modality per
   conventions L16; not inline-enumerated) `[FACT: floor inline-enumeration]`.
5. **[E] numeric** (`planned_reps`/`planned_weight`/`actual_reps`) = typed column (INTEGER/REAL) + `@encrypted` (the money[E]
   pattern) `[FACT: finance.ts precedent]`.
6. **No-FK / no measurement-economy-local-KPI / performance → Core / modality OPEN** `[FACT: HT-5/HT-7 + platform conventions]`.

### DB-11 carry-forward (cited, not fixed here)
+= 5 Training row interfaces + 3 net-new enums; the volume/PR/1RM deriver (→ Core metrics) + the workout runtime are
service-phase (M1.1+), not DB-4.

## §6. Preflight — folds resolved (SQL types + NOT-NULL/DEFAULT + indexes; convention-grounded)
- **F1 · numeric `INTEGER`** (`integer()`): `exercise_plans.frequency` (sessions/week) · `workout_templates.expected_duration`
  (min) · `workout_sessions.{pre_energy,satisfaction}` (1–10) · `workout_sets.{order,planned_sets,sets_done}` ·
  `workout_sets.{planned_reps,actual_reps}` (**[E]** — INTEGER + `@encrypted`, the money[E] pattern). **`REAL`** (`real()`):
  `workout_sessions.{completion_pct,calories_burned}` · `workout_sets.{planned_weight[E],weight_used,rpe}` (rpe carries
  .5 increments). All baseColumns + `exercises.deleted_at` + `exercise_plans.deleted_at` = INTEGER.
- **F2 · dates:** `exercise_plans.{start_date,end_date}` → `calendarDate` (TEXT `YYYY-MM-DD`). (No wall-clock timestamps beyond
  baseColumns; the workout's scheduled time lives on the base `sessions` row, not the extension.)
- **F3 · `[E]` text → `text()` + `@encrypted`** (M1.0 pass-through): exercise `name`/`form_cues`/`common_errors`/
  `instructions`/`variations`/`video_url` · plan `name`/`description` · template `name` · session `performance_notes`/
  `issues`/`recovery_needs`. **`[E]` numeric** (`planned_reps`/`actual_reps` INTEGER, `planned_weight` REAL) = typed column
  + `@encrypted` (finance.ts precedent). No `blob` in this group.
- **F4 · JSON → `json<T>()`** (TEXT): `exercises.{secondary_muscles,equipment}` · `exercise_plans.{training_focus,rest_days,
  goal_ids}` · `workout_templates.{primary_muscle_groups,exercise_refs}`.
- **F5 · boolean → `boolInt()`**: `workout_templates.ai_generated` (dflt 0) · `workout_sets.is_pr` (dflt 0).
- **F6 · indexes** (query-driven): `idx_workout_sessions_plan`(plan_id) · `idx_workout_sets_session`(workout_session_id) ·
  `idx_workout_sets_exercise`(exercise_id) · `idx_exercise_plans_status ON exercise_plans(status) WHERE deleted_at IS NULL`
  (partial, the `idx_health_goals_status` precedent). `workout_sessions.session_id` UNIQUE is its own index. SQL-migration-only.
- **F7 · CHECK ↔ tuple parity:** SQL CHECK on the **5 FIXED** columns (`exercises.movement_pattern`,
  `workout_sets.category`, `workout_sets.side` [reuse METRIC_SIDE], `workout_sessions.burn_source`,
  `exercise_plans.authoring_source` [reuse PHYSICAL_ROLE_AUTHORING_SOURCE]); OPEN columns take NO CHECK. Parity asserts CHECK ≡ tuple for all 5.
- **F8 · NOT NULL / DEFAULT posture:**
  - **notNull:** the primary `name` [E] (exercises/plans/templates) · `workout_sessions.session_id` (unique) ·
    `workout_sets.{workout_session_id, exercise_id}` (within-module required parent links — the `health_factors.domain_id` precedent).
  - **notNull + default:** `exercise_plans.authoring_source` DEFAULT 'manual' · `workout_templates.ai_generated` DEFAULT 0 ·
    `workout_sets.is_pr` DEFAULT 0.
  - **NULLABLE, no default:** the FIXED-but-not-universal discriminators — `exercises.movement_pattern` (a cardio/mobility
    exercise has no strength pattern), `workout_sets.category`/`side`, `workout_sessions.burn_source` (no manufactured
    default on a classification/optional field) · all OPEN columns (`status`/`risk_level`/`difficulty`/etc.) · all optional
    numerics/dates/refs (`goal_ids`/`role_id`/`plan_id`/`template_id`/`knowledge_object_id`).
- **F9 · no cross-table FK** — every id/ref (`session_id`/`plan_id`/`template_id`/`workout_session_id`/`exercise_id`/
  `role_id`/`knowledge_object_id`/`goal_ids`) is plain `text()`/`json()`, no `references()` (ADR-016 §3.4).
