# Storage Build Plan — the master table ledger (from-zero rebuild)

> **The living plan every per-table gate reads.** Governed by [ADR-016](../core/decisions/ADR-016-storage-layer-rebuild-from-zero.md).
> Basis: `database-schema-reconciliation.md` (buckets) + ADR-002 §5.20 (Stream i) + the **24** `docs/features/*/structure-data.md` docs (Stream ii, disk-keyed) + dissolved-module docs.
> **No-Guessing:** every table cites a source; shapes/columns are verified at each table's own gate.
> **Readiness:** ✓ drop-in (documented) · ⏳ shape-open (settles at its gate) · ↔ to-verify at build.
> **Row-state:** `planned` → `authored` (Drizzle object + SQL migration written) → `verified` (gate closed).

## How to use

1. Author tables **top-to-bottom** — a table is gated only after every table in its **FK-deps** is `authored`.
2. Each table = one Per-Step Build Gate (ADR-016 §3.5): spec → critique → approve → author **both surfaces**
   (Drizzle `schema/<domain>.ts` object + hand-written SQL migration) → verify → flip this row to `verified`.
3. On gate-close, the **table author** updates this ledger (row-state + any discovered FK). Resume from the ledger.
4. Enum columns: `enumText(col, VALUES)` + a `CHECK` in the migration from the same const + a Zod validator (DB-9).

## DB-cluster → phase map (re-scope owed to Linear — noted, not executed)

| Issue | Role                                       | Phase                                                |
| ----- | ------------------------------------------ | ---------------------------------------------------- |
| DB-1  | primitives (`_shared`/`_registry`)         | **P0 — done** (b234e85)                              |
| DB-2  | `_sync_field_ts` + HLC representation      | **P0.5** — primitive amendment, before domain tables |
| DB-3  | Stream-i consolidation (substrate net-new) | **P1–P3**                                            |
| DB-4  | Stream-ii per-domain (net-new)             | **P4** (one sub-issue per domain)                    |
| DB-5  | encryption boundary map                    | **P-final** (cross-cutting)                          |
| DB-6  | repository layer                           | **P-final**                                          |
| DB-7  | migrations runner                          | cross-cutting (each table adds a migration)          |
| DB-8  | FTS5 virtual tables                        | **P-final**                                          |
| DB-9  | canonical enums ↔ Zod                      | cross-cutting (each enum column)                     |
| DB-10 | seed & fixtures                            | **P-final**                                          |
| DB-11 | ADR-002 §5/§7/§8 reconcile                 | **P-final**                                          |

---

## Phase sequence + ledger

### P0 · Primitives + infra — **DONE** (DB-1)

| Table                                      | Domain | Source       | Ready | FK-deps |                                         State                                          |
| ------------------------------------------ | ------ | ------------ | :---: | ------- | :------------------------------------------------------------------------------------: |
| `app_state` (device-local)                 | infra  | ADR-002 §5.0 |   ✓   | —       | **verified** (DB-7: `schema/foundation/app-state.ts` + runner `ensureInfra` bootstrap) |
| `sync_queue` (device-local)                | infra  | ADR-002 §5.1 |   ✓   | —       |         **verified** (DB-6: `schema/foundation/sync-queue.ts` + migration 001)         |
| _(primitives `_shared.ts`/`_registry.ts`)_ | —      | DB-1         |   ✓   | —       |                                      **verified**                                      |

### P0.5 · Sync-metadata amendment (DB-2)

`_sync_field_ts` added to `syncColumns`; HLC representation of `_sync_lww_ts`/`_sync_field_ts` decided (F6/D4). ⏳ — a primitive amendment, not a table. All later tables inherit it via `baseColumns`.

### P1 · Notes/Tags/Spaces hub + capability substrate (DB-3) — the in-degree-14 hub; most domains FK here

| Table                     | Domain       | Source                              | Ready | FK-deps                                     |  State  |
| ------------------------- | ------------ | ----------------------------------- | :---: | ------------------------------------------- | :-----: |
| `pages`                   | Notes        | notes-and-pages/structure-data.md   |   ✓   | self(`parent_id`) · registry(`entity_type`) | planned |
| `page_links`              | Notes        | notes-and-pages                     |   ✓   | `pages`                                     | planned |
| `entity_links`            | Notes        | notes-and-pages                     |   ✓   | `pages` · registry                          | planned |
| `tags` (+`parent_tag_id`) | Notes        | notes-and-pages · ADR-006           |   ✓   | self                                        | planned |
| `entity_tags`             | Notes/Spaces | ADR-006 §3.2 (replaces `page_tags`) |   ✓   | `tags` · registry                           | planned |
| `note_attachments`        | Notes        | notes-and-pages                     |   ✓   | `pages`                                     | planned |
| `spaces`                  | Spaces       | ADR-006 §3                          |   ✓   | root `tags`                                 | planned |
| `space_enabled_blocks`    | Spaces       | ADR-006 §3.4                        |  ⏳   | `spaces` · capability_registry              | planned |
| `views`                   | Spaces       | ADR-007                             |   ✓   | `spaces`(nullable)                          | planned |
| capability **registry**   | Capabilities | ADR-008 §3.1                        |  ⏳   | —                                           | planned |
| `block_instances`         | Capabilities | ADR-008 §3.4                        |  ⏳   | capability_registry · `pages`               | planned |
| `templates`               | Capabilities | ADR-009                             |   ✓   | —                                           | planned |
| `capability_grants`       | Capabilities | ADR-010                             |   ✓   | capability_registry                         | planned |

### P2 · Sessions foundation (DB-3 · ADR-004) — Health/Books/Learning/Knowledge session-types FK here

| Table                            | Domain   | Source                                                | Ready | FK-deps               |  State  |
| -------------------------------- | -------- | ----------------------------------------------------- | :---: | --------------------- | :-----: |
| `sessions` (spine)               | Sessions | ADR-004 §3.1                                          |  ⏳   | registry              | planned |
| `planned_blocks`                 | Sessions | ADR-004 §3.1                                          |  ⏳   | availability          | planned |
| `session_attachments`            | Sessions | ADR-004 §3.2.1                                        |  ⏳   | `sessions` · registry | planned |
| `session_effects`                | Sessions | sessions-and-scheduling                               |  ⏳   | `sessions`            | planned |
| `session_type_registry`          | Sessions | sessions-and-scheduling                               |  ⏳   | —                     | planned |
| `applied_effects` (device-local) | Sessions | ADR-004 (F1)                                          |  ⏳   | —                     | planned |
| `study_availability`             | Sessions | sessions-and-scheduling (retained)                    |   ✓   | —                     | planned |
| `availability_exceptions`        | Sessions | sessions-and-scheduling (retained)                    |   ✓   | `study_availability`  | planned |
| `study_plan_batches`             | Sessions | sessions-and-scheduling (reshaped, widen scope)       |  ⏳   | —                     | planned |
| `session_templates`              | Sessions | sessions-and-scheduling (reshaped, restore v1 fields) |  ⏳   | —                     | planned |

### P3 · Economy / measurement / review foundation (DB-3 · ADR-005/011/012)

| Table                                                 | Domain                     | Source                                          | Ready | FK-deps                                                                                                                                        |  State  |
| ----------------------------------------------------- | -------------------------- | ----------------------------------------------- | :---: | ---------------------------------------------------------------------------------------------------------------------------------------------- | :-----: |
| `currencies`                                          | Gamification/Finance       | ADR-012                                         |  ⏳   | —                                                                                                                                              | planned |
| `consequence_ledger`                                  | Gamification               | ADR-012 (replaces `xp_history`)                 |  ⏳   | `currencies` · registry                                                                                                                        | planned |
| `rules`                                               | Automation                 | ADR-012                                         |  ⏳   | capability_grants                                                                                                                              | planned |
| `values`                                              | Purpose                    | ADR-011 (PG4)                                   |   ✓   | —                                                                                                                                              | planned |
| `contributions`                                       | Purpose                    | ADR-011 (PG7) — replaces bare purpose junctions |  ⏳   | registry (poly goal/contributor)                                                                                                               | planned |
| `purpose_reviews`                                     | Purpose                    | ADR-011 (PG3)                                   |   ✓   | `purposes`                                                                                                                                     | planned |
| `plan_steps`                                          | Purpose                    | ADR-011 (PG5)                                   |  ⏳   | registry (owner poly)                                                                                                                          | planned |
| `review_curves` · `method_bindings` · `review_events` | Knowledge (generic engine) | ADR-005                                         |   ↔   | registry · `sessions`                                                                                                                          | planned |
| `store`                                               | Finance                    | ADR-012                                         |  ⏳   | self(`parent_id`) · **soft** poly `ref_type`/`ref_id` → account/investment/asset (registry-mediated, NOT a hard FK — so P3 placement is valid) | planned |

### P4 · Domains — one gated sub-issue per domain (DB-4), authored in dependency-wave order

> Each row is a table; retires (monolith tables NOT re-authored) are listed under the domain for traceability.

**Wave 1 — independent**
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `tasks` · `task_time_logs` | Tasks | tasks/structure-data.md | ✓ | cross-module parents (`project_id`/`milestone_id`/`course_id`/`contact_id`) **nullable soft/deferred** (SQLite has no ADD-CONSTRAINT — app-level/registry-enforced) → Wave-1 valid; self(`parent_task_id`) | planned |
| `habits` · `habit_completions` | Habits | habits | ✓ | `habits` | planned |
| `accounts` · `transactions` · `assets` · `liabilities` · `investments` · `income_streams` | Finance | finance | ✓ | `accounts` · `store`? | planned |
| `fiscal_residencies` · `legal_entities` · `fiscal_obligations` | Finance/Fiscal | finance/fiscal-legal | ⏳ | `projects`? · `tasks`? | planned |
| `contacts` · `contact_events` · `interactions` · `contact_reminders` · `reminder_groups` · `reminder_group_contacts` | Relationships | relationships | ✓ | `contacts` · `reminder_groups` | planned |
| `network_groups` · `network_group_contacts` | Relationships | relationships (G2, ⚠INTENT) | ⏳ | `contacts` | planned |
| `daily_check_ins` · `check_in_templates` · `check_in_template_questions` | Check-ins | check-ins | ✓ (fix UNIQUE→(date,type)) | `check_in_templates` | planned |

**Wave 2 — dependent**
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `projects` · `milestones` · `project_documents` · `deliverables` · `project_contacts` | Projects | projects | ⏳ (deliverables G2) | self · `contacts` | planned |
| `books` · `book_chapters` · `book_assets` · `book_bookmarks` · `book_highlights` · `book_quotes` · `reading_plans` · `book_subjects` | Books | books | ⏳ | `books` · registry | planned |
| `courses`→`subjects` · `institutions` · `self_taught` · `programs` · `curricula` · `terms` · `subject_schedules` · `grading_systems` · `assessments` · `ics_feed_configs` · `ics_synced_events` | Education | learning/education | ⏳ (14-entity reframe) | hierarchy chain | planned |
| `knowledge_objects` · `object_kinds` · `knowledge_containers` · `compound_sets` · `references` · `knowledge_lab_entries` | Knowledge | knowledge | ⏳ | self(`parent_object_id`) · `object_kinds` · registry; review engine → P3 | planned |
| `flashcards` | Knowledge/Flashcards | knowledge/flashcards (content-only) | ✓ | `knowledge_objects`/`entity_links` | planned |
| `journal_snapshots` | Journals | journals (J2) | ✓ | — | planned |

**Wave R — recovered (Health · Skills)**
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `health_metrics` · `health_metric_values` · `health_domains` · `health_factors` · `health_exams` · `assigned_exams` · `health_goals` · `physical_roles` · `health_experiments` · `health_responses` · `medical_profile_entries` · `safety_flags` | Health/core | health/core | ⏳ (all net-new) | intra-Health chain · registry | planned |
| `nutrition_ingredients` · `nutrition_dishes` · `nutritional_plans` · `daily_meal_plans` · `meals` · `shopping_items` | Health/nutrition | health/nutrition | ⏳ | `health_goals` · chain | planned |
| `exercises` · `exercise_plans` · `workout_templates` · `workout_sets` | Health/training | health/training | ⏳ | `workout_sessions`(session) · `physical_roles` | planned |
| `skills` · `skill_levels` · `skill_activities` · `skill_actions` · `skill_dev_logs` · `skill_dependencies` · `skill_definitions` | Skills | skills | ⏳ | self · `skill_definitions` | planned |

**Session extensions** (1:1 on `sessions.id`; authored after the P2 spine, and **before** any domain child that FKs them — e.g. `workout_sessions` before `workout_sets`; `practice_sessions` before `skill_actions`)
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `reading_sessions` · `class_sessions` · `workout_sessions` · `work_sessions` · `study_sessions`(redef) · `focus_sessions` · `practice_sessions` · `daily_sessions` · `review_sessions` | Sessions×domain | ADR-004 §3.1 · each domain | ⏳ | `sessions` · owning domain | planned |

**Wave 3/4 — higher-order / peripheral**
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `purposes` · `targets` · `purpose_metrics` · `purpose_metric_values` · `target_reviews` · `dreams` | Purpose (capstone) | purposes-and-goals | ⏳ (nullable-progress; dreams absorbs bucket_list) | `values` · `contributions` · registry | planned |
| `routines` · `routine_step` · `routine_step_membership` · `routine_completions`(retained) | Routines | routines (reframe; only `routine_actions` retires) | ⏳ | `routine_step` · compose Sessions/Tasks/Habits | planned |
| `user_profile`(split) · `achievements` · `user_achievements` | Gamification | gamification | ⏳ (GM-12 split) | `currencies` · `consequence_ledger` | planned |
| `notifications` (+delivery-audit) | Notifications | notifications · ADR-013 | ✓ | registry | planned |
| `user_preferences` · `nav_preferences` · `command_bar_history` | Preferences | preferences | ✓ | — | planned |

**Integrations · AI · Pomodoro (ADR-013/014/015 + Pomodoro reframe — service-layer-adjacent)**
| Table | Domain | Source | Ready | FK-deps | State |
|-------|--------|--------|:---:|---------|:---:|
| `import_staging` · `connection_config` | Integrations | ADR-014 §3.5/§3.8 (§5.20 AMEND) | ⏳ | registry | planned |
| `ai_connections` · `ai_conversations` | AI | ADR-015 §3.5/§3.6 (§5.20 AMEND) | ⏳ | — | planned |
| `pomodoro_sessions` (re-home Notes→Sessions, key `session_id`; or collapse → `focus_sessions` at gate) | Pomodoro | ADR-002 §5.20 (Pomodoro reframe) | ⏳ | `sessions` | planned |

### P-final · Reconcile & wire

- **FTS5** (DB-8): `fts_pages` · `fts_tasks` · `fts_contacts` · `fts_subjects` · `fts_knowledge` + rebuild-on-unlock + `category_bidx` blind index (F7).
- **DB-5** encryption-boundary map · **DB-6** repository · **DB-10** seed · **DB-11** ADR-002 §5/§7/§8 rewrite · delete the v1 monolith at parity.

## Retires (monolith tables NOT re-authored — deleted at parity, per reconciliation §B)

`page_tags`(→`entity_tags`) · flat `study_sessions`(→spine+ext) · `scheduled_study_sessions`(→`planned_blocks`) · `flashcard_decks` · `flashcard_reviews` · `study_topics`(→`knowledge_objects`) · `topic_reviews`(→`review_events`) · `knowledge_notes`(→`pages`) · `skill_resources`(→`entity_links`) · `routine_actions`(→`routine_step`; **`routine_completions` retained**) · `purpose_habits`/`purpose_routines`/`purpose_projects`(→`contributions`) · `xp_history`(→`consequence_ledger`) · `bucket_list_items`(→`dreams`) · **9 `language_*` tables** (Languages dissolved → Spaces worked-example; `docs/features/languages/`, `docs/intake/languages.md`).

> **Retained/reshaped (authored, NOT retired):** `study_availability` · `availability_exceptions` · `study_plan_batches` · `session_templates` · `routine_completions`. **Not a table:** `study_methods` = the `kind='study_method'` partition of the capability registry (ADR-002 §5.20), queried by kind — never authored as a base table.

## Table-spec template (per-table gate input)

```
### <table_name>  ·  domain: <x>  ·  phase: <Pn>  ·  readiness: ✓/⏳/↔  ·  source: <doc/§5.20 row>
Columns:    <name : helper()  [E]?  notes>   (via _shared primitives)
Enums:      <col: enumText(VALUES) + CHECK in migration + Zod>   (registry-derived if entity_type)
Indexes:    <incl. partial WHERE>
FKs-out:    <parent.col  ON DELETE …>   (must be `authored` first)
Encryption: <-- [E] fields (ADR-002 §4)>
Surfaces:   Drizzle object (schema/<domain>.ts)  +  SQL migration (migrations/NNN)
Acceptance: tsc green · INSERT out-of-enum rejected · [E] fields encrypted · row-state → verified
```

## Context machinery

- **Row-state lifecycle:** `planned` → `authored` (both surfaces written) → `verified` (gate closed, acceptance passed). The table's gate author flips the row; a divergence updates FK-deps here (§XXVIII).
- **⏳ shape-decision log:** each ⏳ table records its open shape decision in its gate's PLAN §5; resolved before implementation. Recurring log lives per-domain sub-issue.
- **Resume from the ledger, never memory:** any session reads row-states to know what's authored/blocked.

## Count reconciliation (vs `database-schema-reconciliation.md` buckets)

Target ≈ **130-150**: carry-forward ~40 + missing ~90-110 + divergent ~9 (retire ~22 leave the ledger). The ledger above enumerates the **authored** set (net-new + reshaped + carried); retires are tracked but not authored. Exact per-table counts are pinned as each domain sub-issue (DB-4) enumerates columns at its gate — the ledger is names · phase · deps · readiness (ADR-016 §3.5), not columns.
