<!-- Structure & Data — features/health/training · Phase 2 · sources: ADR-004
     (table-per-type sessions). ⚠ NO v2 schema — all NEW → ADR-002 additions. P=plaintext · E=[E] encrypted. -->

# Structure & Data — Health: Training

All new (recovered domain) → **ADR-002 additions**. Platform baselines apply (UUIDv7 · Unix-ms · `_sync_*` ·
soft-delete · no inline notes). Modality = properties, not tables.

## Entities (Training-owned)

- **`exercises`** — catalog. `id` · `name` **E** · `movement_pattern` P (push/pull/hinge/squat/lunge/carry/rotation)
  · `primary_muscle` P · `secondary_muscles` P (JSON) · `equipment` P (JSON) · `difficulty` P · `risk_level` P ·
  `form_cues` **E** · `common_errors` **E** · `instructions` **E** · `variations` **E** · `video_url` **E** ·
  `knowledge_object_id` P (nullable → technique in Knowledge) · timestamps · `deleted_at`.
- **`exercise_plans`** — periodization. `id` · `name` **E** · `description` **E** · `progression_model` P ·
  `deload_frequency` P · `energy_system_focus` P · `training_focus` P (JSON) · `frequency`·`rest_days` P ·
  `start_date`·`end_date` P · `status` P · `goal_ids` P (JSON → Core Health Goals) · **`role_id` FK** (nullable →
  Core `physical_roles`; a Role generates/links this plan, medically-aware) · `authoring_source` P (manual/llm/import)
  · timestamps · `deleted_at`.
- **`workout_templates`** — reusable session defs. `id` · `name` **E** · `workout_type` P · `set_structure` P ·
  `primary_muscle_groups` P (JSON) · `expected_duration` P · `ai_generated` P (0/1) · `exercise_refs` P (JSON) · timestamps.
- **`workout_sessions`** — the **Sessions `workout` sub-type EXTENSION** (ADR-004 table-per-type). `id` =
  `session_id` FK → base `sessions` · `plan_id` FK (nullable) · `template_id` FK (nullable) · `location` P ·
  `pre_energy` P (1-10) · `satisfaction` P (1-10) · `completion_pct` P · `performance_notes` **E** ·
  `issues` **E** · `recovery_needs` **E** · `calories_burned` P · `burn_source` P (formula/wearable/manual). `[FACT ADR-004]`
- **`workout_sets`** — per-exercise-per-set log (child of a workout). `id` · `workout_session_id` FK ·
  `exercise_id` FK · `category` P (warm-up/main/accessory/cardio/mobility/cool-down) · `order` P · **`side` P**
  (nullable; left/right/bilateral — per-limb logging → per-side 1RM) · **planned** (`planned_sets`·`planned_reps`
  **E**·`planned_weight` **E**) · **actual** (`sets_done`·`actual_reps` **E**·`weight_used` P) · `rpe` P ·
  `form_quality` P · `is_pr` P (0/1). `[INTENT HL5/CI-2]`

## Composed / emitted (NOT Training tables)

- Base session row + runtime + schedule → **Sessions** (`sessions` + scheduler). `[FACT ADR-004]`
- Performance KPIs (1RM/volume/PR) → **Core `health_metric_values`** (source=derived). `[INTENT HC-2/HT-5]`
- Testing/Recovery **protocols** → **Knowledge** (kind=`protocol`). Notes/tags → **Notes&Pages/Spaces**. `[INTENT]`

## ADR-002 additions

Tables above + `entity_type` extensions: `exercise` · `exercise_plan` · `workout_session` · `workout_set`. Consolidate
into the standing ADR-002 amendment; coordinate `workout_sessions` with ADR-004's table-per-type scheme. `[INTENT HL10]`

## Completion checklist

- [x] entities + P/E · [x] composed-vs-owned · [x] ADR-002 additions · [x] no `{{…}}`
