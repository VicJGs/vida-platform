<!-- Structure & Data — features/skills · Phase 2 · sources: intake/skills.md (v2 floor + Notion context + current
     intent). v2 has 2 tables (skills, skill_resources); the rest are NEW → ADR-002 additions. P=plain · E=[E]. -->

# Structure & Data — Skills

v2 floor: `skills` (kept, extended) + `skill_resources` (**RETIRED** → `entity_links`). Everything else NEW →
**ADR-002 additions**. Platform baselines apply (UUIDv7 · Unix-ms · `_sync_*` · soft-delete · no inline notes).

## Entities (Skills-owned)
- **`skills`** — the capability. `id` · `domain` P (6) · `name` **E** · `description` **E** · `why_important` **E** ·
  `parent_skill_id` P (→ graph grouping, kept from v2) · `ladder_template` P (nullable) · `current_level` P
  (**derived**) · `progress` P (**derived**) · `mastery_override` P (nullable, flagged) · `status` P · `priority` P
  · `practice_frequency` P · `target_mastery_date` P · `definition_id` P (→ Library, nullable) · **Composer config**
  (`components_tracked` P JSON · `measurement_config` **E** JSON · `setup_mode` P quick|advanced) · timestamps · `deleted_at`.
- **`skill_levels`** — per-skill ladder stage. `id` · `skill_id` FK · `sequence` P · `name` **E** · `completion_criteria`
  **E** · `success_indicators` **E** · `typical_challenges` **E** · `key_skills` **E** · `duration_target` P ·
  `status` P (upcoming/active/complete). `[FACT Notion Levels]`
- **`skill_activities`** — typed practice task. `id` · `level_id` FK · `name` **E** · `type` P (Practice/Study/
  Project/Assessment/Review) · `difficulty` P · `duration` P · `frequency` P · `instructions` **E** · `prerequisites`
  **E** · `success_criteria` **E** · `fill_source` P (manual/llm/import). Dispatches per `type`. `[FACT Notion; INTENT CI-2]`
- **`skill_actions`** — scheduled/executed instance (**= a Sessions `practice` sub-type**). `id` = `session_id` FK →
  base `sessions` · `activity_id` FK · `scheduled_at` P · `best_time` P · `quality` P · `energy_required`/`after` P ·
  `focus_required` P · `completed` P. `[FACT ADR-004; Notion Actions]`
- **`skill_dev_logs`** — reflective practice log (**composes the shared reflective/Adaptation engine w/ Health**).
  `id` · `skill_id` FK · `activity_id` FK · `session_date` P · `duration` P · `progress_feeling` P · `focus`/
  `motivation`/`energy` P · `what_worked` **E** · `what_to_improve` **E** · `next_plan` **E** · `key_insights` **E**
  (→ Knowledge objects). `[FACT Notion Tracker; INTENT CI-3]`
- **`skill_dependencies`** — the Skill Graph edges. `id` · `from_skill_id` · `to_skill_id` · `type` P (requires/
  unlocks/synergy) · `scope` P (global/personal). Powers path-recommendation + synergy-detection. `[INTENT CI-3]`
- **`skill_definitions`** — the Definition Library. `id` · `name` **E** · `domain` P · `locale_variant` P
  (language/region) · `ladder_template` **E** JSON · `activities_template` **E** JSON · `source` P (curated/
  community/ai) · `provenance` **E**. Opt-in external Skill-DB import + community submission. `[INTENT CI-1]`

## Composed / emitted (NOT Skills tables)
- Base session row + scheduler → **Sessions**. Theory/mastery + insights + SRS review-curve → **Knowledge**.
  Project-activities → **Projects**. Target-Mastery ladder → **Purposes** (metric). Evidence → **pages/attachments**.
  Tags/views/tree → **Spaces**. `[FACT/INTENT reshape]`

## ADR-002 changes
**RETIRE** `skill_resources` (CHECK 'course','book') → `entity_links` (broad cross-domain). **ADD** the tables above +
`entity_type` extensions: `skill_level` · `skill_activity` · `skill_action` · `skill_dev_log` · `skill_dependency` ·
`skill_definition` (`skill` already reserved). Consolidate into the standing ADR-002 amendment. `[INTENT SK7/HL10]`

## Completion checklist
- [x] entities + P/E · [x] composed-vs-owned · [x] ADR-002 changes (retire + add) · [x] no `{{…}}`
