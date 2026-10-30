# DB-4 · Domain Group Skills · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** Skills (P0 table #9 · 10th to build) · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `021_skills` (v21) · **Schema file:** `schema/skills.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** skills ✅ IMPLEMENTED (2026-07-24, SHIP / 0 blocking — 6th consecutive clean unit; the FIRST X*/AI* unit). The ADR-realignment is DONE; DDL is this build's job ([[check-intake-and-reruns-before-triaging-a-design-pass-undone]]).

> A game-like growth engine — **7 owned tables** authored fresh (only `_legacy/` carries the old 2-table floor).
> Every shape is doc-determined; **zero build-decisions**, consistent with groups #1–#9. The heaviest gap-fill in
> the campaign, but PURE additive — no wrong-model retirement (the one retire, `skill_resources`→`entity_links`,
> is already-substrate on disk, verify-only).

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/skills/{identity,business-rules,structure-data,contract,conventions}.md` (rerun implemented across all 5)
· the rerun PLAN `realignment-master-plan/part-1.2-reruns/skills.md` (the resolved intent) · `ADR-002 §5.9` (the STALE
pre-reshape DDL — read to know what is superseded) · `@vida/types` (`common.ts` LIFE_DOMAIN/PRIORITY/FREQUENCY,
`learning.ts` MASTERY_LEVEL) · `session-extensions.ts` (the group-#3 1:1 extension pattern) · `_registry.ts` (the
ENTITY_TYPES convention) · `database-layer/current-*.md` (no-FK convention + prior-group precedent).

## §1. Identity — what this unit is
The Skills **capability-forging engine** — the reshaped `skills` table + 6 net-new tables (Levels · Activities ·
Actions · Dev-logs · Dependencies/Graph · Definition Library). The `structure-data.md` roster (Stream ii) is the
authoritative table/column source ([[module-doc-is-db4-roster-not-adr-broad-list]]); **ADR-002 §5.9 is STALE**
(pre-reshape: `mastery_level NOT NULL DEFAULT 'novice'`, `practice_hours`, `proficiency_test_score`, `skill_resources`
CHECK 'course','book') — superseded by the roster, read only as the FACT-floor being replaced.

### Scope boundary — doc-DECIDED
**AUTHOR (7 tables, roster-fixed):** `skills` (reshaped) · `skill_levels` · `skill_activities` · `skill_actions`
(Sessions `practice` sub-type extension) · `skill_dev_logs` · `skill_dependencies` · `skill_definitions`.

**OUT (owned elsewhere / service / undecided — rerun §5, all cited-not-authored):**
- `skill_resources` → **RETIRED** to `entity_links` (AR-6 substrate on disk; verify-only, C-EL). Not authored.
- **X*/AI* ingestion layer** (Skill-DB import, template export, AI-draft) — service-layer; `external_in_ok`/
  `external_out_ok` are **ADR-010 grant fields** (X5: no new column), `ai_connections` is **AI-layer-owned** (AI2),
  `import_staging` is **ADR-014-owned**. Skills stores only the provenance columns on `skill_definitions`.
- **Measurability pursuable** — the Target-Mastery target's `measurement_kind`/`binding_mode` is **Purpose-owned**
  (M1/M2 on the Purpose target, SK-10). **No stored `skills.measurement_kind` column** (C-M1, critic-ruled correct).
- **`grant_currency(XP)`** — **Gamification-owned** (E2); skills emits the signal, stores nothing.
- The Sessions `practice` spine (scheduler/timer) — **Sessions-owned** (S1 exact, C-S1); `skill_actions` is only the
  1:1 extension.

## §2. Business rules (the invariants this DDL must encode)
- **BR-SK-1 — mastery is DERIVED, never a stored default.** `current_level` + `progress` are nullable derived slots
  (service-written); `mastery_override` is the nullable manual override (M3). The §5.9 `mastery_level NOT NULL DEFAULT
  'novice'` anti-signal is **resolved out** (rerun critique: "correctly deferred to build"). No stored mastery default.
  `[FACT: structure-data.md:11-12; conventions.md:10]`
- **BR-SK-2 — `skill_actions` is a Sessions `practice` sub-type**, NOT a standalone table: own `id` UUIDv7 PK (BR-DB-1)
  + `session_id` UNIQUE (1:1 key, plain TEXT no FK); spine fields (timer/scheduling) live on `sessions`, never
  re-stored (the group-#3 `study_sessions`/`focus_sessions` pattern exactly). `SESSION_SUB_TYPE` already carries
  `'practice'` (OPEN vocab). `[FACT: session-extensions.ts; session.ts:24; structure-data.md:23-25]`
- **BR-SK-3 — no FK anywhere.** All roster `FK` notations → plain TEXT (parent refs, self-ref `parent_skill_id`,
  `definition_id`); cascade/set-null is app/sync-layer (ADR-016 §3.4; §5.9 REFERENCES superseded). `[FACT]`
- **BR-SK-4 — no stored measurement_kind.** The Composer `measurement_config` **[E] JSON** references the ADR-011
  taxonomy at the service layer; it is NOT a typed CHECK column on `skills` (C-M1). `[FACT: rerun §C]`
- **BR-SK-5 — tags/notes/links ride the AR-6 substrate.** No inline tags column; tags via `entity_tags`, notes via
  `pages`, cross-links via `entity_links` (`entity_type` registered per §4). `[FACT: structure-data.md:44; SP1]`
- **BR-SK-6 — provenance columns only for AI/external.** `skill_definitions` carries `source` (curated/community/ai =
  dataset origin, AI6) + `fill_source` (manual/llm/import) + `provenance [E]`; the ingestion/AI *mechanics* are
  deferred (§1 OUT). `[FACT: structure-data.md:32-38; rerun N2]`

## §3. Structure — the 7 tables (P=plain · E=[E]; all `...baseColumns` + `deleted_at`, platform baseline)

**`skills`** — the capability.
`domain` (LIFE_DOMAIN, FIXED, NOT NULL) · `name` E NN · `description` E · `why_important` E · `parent_skill_id` P null
(self-ref, no FK) · `ladder_template` P null · `current_level` (MASTERY_LEVEL, FIXED, **null** — derived) · `progress`
INT null (derived) · `mastery_override` (MASTERY_LEVEL, FIXED, null) · `status` P null (**OPEN no-CHECK** — un-enumerated)
· `priority` (PRIORITY, FIXED, null) · `practice_frequency` (FREQUENCY, FIXED, null) · `target_mastery_date`
calendarDate null · `definition_id` P null (→ Library, no FK) · `components_tracked` json null (Composer) ·
`measurement_config` E json null (Composer; NOT a typed column, BR-SK-4) · `setup_mode` (SKILL_SETUP_MODE, FIXED, null —
no invented default).

**`skill_levels`** — ladder stage. `skill_id` P NN (no FK) · `sequence` INT NN · `name` E NN · `completion_criteria` E
· `success_indicators` E · `typical_challenges` E · `key_skills` E · `duration_target` P null (**OPEN plain text** —
no unit fixed) · `status` (SKILL_LEVEL_STATUS, FIXED, NN).

**`skill_activities`** — typed practice task. `level_id` P NN (no FK) · `name` E NN · `type` (SKILL_ACTIVITY_TYPE,
FIXED, NN) · `difficulty` P null (**OPEN no-CHECK** — un-enumerated, no shared DIFFICULTY vocab) · `duration` INT null
(minutes) · `frequency` (FREQUENCY, FIXED, null) · `instructions` E · `prerequisites` E · `success_criteria` E ·
`fill_source` (SKILL_FILL_SOURCE, FIXED, null).

**`skill_actions`** — Sessions `practice` sub-type (BR-SK-2). `session_id` P NN UNIQUE (1:1 key, no FK) · `activity_id`
P NN (no FK) · `scheduled_at` INT null · `best_time` P null (OPEN) · `quality` INT null (rating) · `energy_required`
INT null · `energy_after` INT null · `focus_required` INT null · `completed` boolInt NN default 0.

**`skill_dev_logs`** — reflective log. `skill_id` P NN · `activity_id` P null · `session_date` calendarDate null ·
`duration` INT null · `progress_feeling` INT null · `focus` INT null · `motivation` INT null · `energy` INT null ·
`what_worked` E · `what_to_improve` E · `next_plan` E · `key_insights` E.

**`skill_dependencies`** — Skill Graph edges. `from_skill_id` P NN · `to_skill_id` P NN · `type` (SKILL_DEPENDENCY_TYPE,
FIXED, NN) · `scope` (SKILL_DEPENDENCY_SCOPE, FIXED, NN).

**`skill_definitions`** — Definition Library. `name` E NN · `domain` (LIFE_DOMAIN, FIXED, NN) · `locale_variant` P null
· `ladder_template` E json null · `activities_template` E json null · `source` (SKILL_DEFINITION_SOURCE, FIXED, NN) ·
`provenance` E null.

### Enum plan
- **REUSE (existing tuples, FIXED CHECK + parity):** `LIFE_DOMAIN` (skills.domain, skill_definitions.domain) ·
  `PRIORITY` (skills.priority) · `FREQUENCY` (skills.practice_frequency, skill_activities.frequency) ·
  `MASTERY_LEVEL` (skills.current_level, skills.mastery_override).
- **NET-NEW (7 tuples → `@vida/types` skill.ts + Zod validators, FIXED CHECK + parity):** `SKILL_LEVEL_STATUS`
  =[upcoming,active,complete] · `SKILL_ACTIVITY_TYPE` =[practice,study,project,assessment,review] (lowercased per
  convention) · `SKILL_FILL_SOURCE` =[manual,llm,import] · `SKILL_DEPENDENCY_TYPE` =[requires,unlocks,synergy] ·
  `SKILL_DEPENDENCY_SCOPE` =[global,personal] · `SKILL_DEFINITION_SOURCE` =[curated,community,ai] · `SKILL_SETUP_MODE`
  =[quick,advanced].
- **OPEN no-CHECK plain (un-enumerated in any aspect doc — No-Guessing, [[open-vocab-columns-take-no-sql-check]]):**
  `skills.status` · `skill_activities.difficulty` · `skill_levels.duration_target` · `skill_actions.best_time`.
  Integer rating scales (`quality`/`energy_*`/`focus_*`/`progress_feeling`/`focus`/`motivation`/`energy`) = plain INT.

### ENTITY_TYPES registry additions
**ADD 6:** `skill` (correcting the roster's stale "already reserved" — NOT in live `_registry.ts`) · `skill_level` ·
`skill_activity` · `skill_dev_log` · `skill_dependency` · `skill_definition`.
**EXCLUDE 1 (disclosed):** `skill_action` — the roster lists it, but it is a `sessions` sub-type addressed via base
`session_id`; group #3 established that sub-types are NOT registered ("only the base `session` is registered", ADR-004
§3.1, `_registry.ts:24-27`). Registering it would contradict that live convention.

## §4. Acceptance
- [ ] 7 tables authored in `schema/skills.ts` (Drizzle) + `migrations/021_skills.ts` (hand-written SQL), registered in
      the runner (v21); `LATEST_VERSION`=21.
- [ ] `skill_actions` follows the 1:1 extension pattern (own `id` PK + `session_id` UNIQUE, no FK); no spine fields.
- [ ] No FK on any table; no `mastery_level NOT NULL DEFAULT` (mastery derived, BR-SK-1); no stored `measurement_kind`.
- [ ] **14 FIXED-CHECK columns** (across **11 distinct tuples** — LIFE_DOMAIN×2, MASTERY_LEVEL×2, FREQUENCY×2, +8
      single-use) parity-asserted against `@vida/types` in `validators/enum-parity.test.ts`; OPEN columns carry NO
      CHECK; `skill_resources` NOT authored. *(Preflight P-1: the spec earlier said "11 columns" — that counts tuples;
      the parity test has one row per CHECK **column** = 14, per-column CHECK↔tuple. The Finance 12→13 lesson.)*
- [ ] 7 net-new enums in **new** `packages/types/src/skill.ts` (+ `export * from './skill'` in `index.ts`) + Zod
      validators in **new** `packages/core/src/validators/skill.ts`; parity rows added.
- [ ] `ENTITY_TYPES += skill·skill_level·skill_activity·skill_dev_log·skill_dependency·skill_definition` (skill_action
      excluded). NB: `entity_type` is OPEN (no SQL CHECK — validated at runtime via `isEntityType`), so this is a
      TS-registry append only; no migration regeneration (the Finance/all-prior-group live pattern).
- [ ] Phase-5 DDL-introspection test (all 4 dims); `@vida/core` green; typecheck 11/11; eslint 0.
- [ ] §XXIX `database-layer/current-*` promoted (BR-SK-1…6).

## §5. Disclosed calls (critic VERIFIES, not catches)
1. **`skill_action` registration exclusion** — deviates from the roster's blanket entity_type list; justified by the
   group-#3 session-subtype convention (`_registry.ts:24-27`). Is the roster-vs-convention resolution sound?
2. **OPEN no-CHECK columns** (`skills.status`, `skill_activities.difficulty`, `skill_levels.duration_target`,
   `skill_actions.best_time`) — un-enumerated in every aspect doc; No-Guessing → plain TEXT. Over-conservative, or correct?
3. **`setup_mode` / `status` / `priority` / `practice_frequency` nullability** — no doc-fixed default; authored nullable
   with NO invented default (the Tasks/Finance "no manufactured NOT NULL DEFAULT" lesson). Correct?
4. **Rating scales as plain INT** (`quality`/`energy_*`/`focus_*`) — not enumerated; INT not CHECK. Correct?
5. **`skill` was NOT actually reserved** — the roster claimed it; live registry disproves ([[cite-tokens-from-emitted-output-not-source-files]]). Verified.
6. **`SKILL_LEVEL_STATUS` drops the "locked" synonym.** `business-rules.md:75` groups the terminal state as
   `upcoming/locked · active · complete`; the roster column (`structure-data.md:19`, authoritative) enumerates only
   `upcoming/active/complete`. "locked" = a display synonym of `upcoming`, not a 4th value → the FIXED tuple follows
   the roster. Correct?
7. **`skill_dev_logs` is deliberately NOT a Sessions sub-type** (unlike `skill_actions`). The roster
   (`structure-data.md:26-29`) lists `session_date`/`duration`/ratings as owned `skill_dev_logs` columns — a
   reflective log composing the Adaptation engine, not the `practice` timer spine. So it does NOT ride `sessions`.
   Correct boundary?

## §5b. Preflight folds (completeness — applied)
- **P-1 (material) — parity count** = 14 CHECK columns / 11 tuples (see §4). Not "11 columns."
- **P-2 — `measurement_config` = `text()` /* [E] */, NOT `json<T>()`.** An encrypted field is an opaque blob at rest,
  not a typed JSON column (the Notes `summary_config` preflight precedent). `components_tracked` (plain) stays `json<T>()`.
- **P-3 — enum home:** net-new tuples → new `packages/types/src/skill.ts` (MASTERY_LEVEL stays in `learning.ts`,
  reused by import); Zod → new `validators/skill.ts`; parity rows → `validators/enum-parity.test.ts`.
- **P-4 — indexes:** add ref indexes on hot paths (`idx_skill_levels_skill`, `idx_skill_activities_level`,
  `idx_skill_dependencies_from`, `idx_skill_dependencies_to`, `idx_skills_parent`); `skill_actions.session_id` is
  already indexed by its UNIQUE (the `study_sessions` precedent). Engineering convention, not a roster mandate.
- **P-5 — no invented UNIQUE / natural key.** Beyond `skill_actions.session_id UNIQUE` (doc-fixed 1:1), assert NO other
  UNIQUE — the roster is silent on `skill_levels(skill_id,sequence)` and `skill_definitions(name,locale_variant)`;
  add-only dedup is service-layer (X8). No-Guessing → no manufactured constraint.
- **P-6 — P5 test:** `db/tests/skills-introspection.test.ts`, mirroring `finance-introspection.test.ts` (all 4 dims
  × 7 tables).

## §6. Out of scope (explicit)
The X*/AI* ingestion/AI substrate · ADR-010 grant fields · `ai_connections` · `import_staging` · Purpose-target
measurability DDL · `grant_currency`/`consequence_ledger` · the Sessions `practice` spine · AI4 agent envelope
(C-AI4, NA) · interface reconcile (`@vida/types` skill row interfaces → **DB-11**). All cited, none authored here.
