# Task: db-4-per-domain-schema
# Status: in-progress
# Profile: add-backend-component
# Scenario: add-backend-component (schema-foundation build — 5-phase lifecycle, per-domain sub-issues)
# Linear: LIF-66
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/features/<module>/structure-data.md ×19 (ADR-002 §5.20 Stream (ii)) · flow: docs/roadmap/schema-foundation-build-flow.md
<!-- Model B (upfront foundation) decided 2026-08-18: DB-4 is a REAL gated build head, not a stream.
     It authors ALL per-domain schema BEFORE M1.1; M1.1 modules build service+UI on the finished schema. -->

## Goal
Author the **complete per-domain Drizzle schema** (all ~19 domains) as a self-contained, gated M1.0 foundation build,
consuming the DB-3 substrate spine. This finishes the M1.0 schema foundation; M1.1+ modules then build service + UI on
it and **author no schema**. Delivered as **one component sub-issue per domain group** (added when this issue starts),
each running the 5-phase lifecycle at domain granularity.

## Intent source (Phase 1)
- The **19 `docs/features/<module>/structure-data.md`** docs (§5.20 Stream (ii)): books · check-ins · finance
  (+fiscal-legal) · habits · journals · knowledge (+flashcards) · pomodoro · preferences · projects · relationships ·
  routines · sessions-and-scheduling · skills · tasks · health/{core,nutrition,training} · learning/education.
- **Cross-module MOVES** (§5.20): `bucket_list_items`→`dreams`; `pomodoro_sessions`→Sessions realm; `skill_resources`→`entity_links`.

## Dependencies
- blocked by `db-1-schema-primitives` (✅ done)
- blocked by `db-3-stream-i-consolidation` (substrate spine — must finish first)

## Build Steps (per domain group — 5-phase lifecycle, flow doc §2/§4)
- [x] **P0 · Slice** — enumerate the domain groups (canonical list below); track each as a lightweight build-step
      (D3: no Linear sub-issues — DB-4 stays LIF-66). Done 2026-08-18.
- [ ] Per domain group: **P1 intent intake** (ALL 5 aspects + owning ADR + §5.20 ledger, FULL) → **P2 current-state read** →
      **⛔ Phase-1 No-Decisions Gate** (flow doc §2: string-check for "decision/open point/shape point/lean/TBD/choose" =
      drift → re-ground; grep the concept across the corpus; never manufacture a default) → **P1/P2 checkpoint glance to
      Victor** ("zero decisions — every point doc-cited") → **P3 plan double-gate** (a STRAIGHT authoring plan) →
      **P4 implement** (SQL migration + Drizzle modules + `ENTITY_TYPES` appends) → **P5 foundation-soundness verify**
      (the consuming module finds every table/column; DDL-introspection parity bookend).
- [ ] **Close** — when all domains authored + verified, mark DB-4 Done → M1.0 schema foundation complete → M1.1 opens.

## P0 Output — Canonical Domain-Group Slice (2026-08-18, approved)
**21 domain groups** (was 22; **#13 Languages dissolved → Spaces worked-example**, ADR-006 — corrected 2026-08-20), each its own 5-phase run. Resolved grain decisions:
- **D1 Health → SPLIT into 3** (Core / Nutrition / Training) — ~23 tables, distinct concerns.
- **D2 Languages → ~~OWN group~~ DISSOLVED → Spaces worked-example (CORRECTED 2026-08-20, Victor-flagged drift).** The
  original D2 ("OWN group, intent source ADR-002 §5.10, ~9 tables") was a **drift**: ADR-006 (Accepted 2026-07-15) had
  already dissolved Languages from a module into a **Spaces worked-example** (SP7 ✅ CONFIRMED) — *"Not a module — a
  configuration of generic seams"* (`features/README.md:52`; `intake/spaces.md:1-8,91`; `core/spaces/README.md:38`).
  **ADR-002 §5.10 Language Learning Domain is STALE/superseded by ADR-006** (same supersession #10/#11/#12 hit). Languages
  authors **0 tables** — it composes already-authored primitives: vocabulary/base-words/definitions→`knowledge_objects`
  (#10) · `#languages/*` scoping + dictionary/hub view→`entity_tags`/`spaces`/`views` (AR-6) · practice/daily sessions +
  recordings→Sessions (#3) + media capability Block · pronunciation-ABA/immersion/base-words tool→capability Blocks (AR-7
  registry) · "Victor's method" starter→a Template (ADR-009). The worked-example *write-up* is a **build-time deliverable**
  (authored once the primitives exist), NOT a DB-4 schema group. Same class as D4's Bucket List/Duties (which D4 dissolved
  correctly — D2 was the sibling that slipped through).
- **D3 Pomodoro → FOLDED into Sessions & Scheduling** (self-declared "capability within the Sessions realm"; `pomodoro_sessions`→`focus_sessions` via `session_id`).
- **D4 ICS → FOLDED into Learning/Education**; Bucket List → Purpose (`dreams`); Duties → dissolved (intake only).
- **Sub-issue form (D3 answer):** lightweight task-file/build-step checklist, no Linear sub-issues.
- **Ordering:** cross-domain refs are **plain TEXT, no FK** (DB-3 decision) → domain groups have **no hard build-order
  dependency**; **Notes & Pages first** (in-degree-14 hub) is a convention for Phase-5 readiness, not a blocker.

| # | Domain group | Intent source | Status |
|---|---|---|---|
| 1 | Notes & Pages (hub) | `notes-and-pages/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-18) — `schema/notes.ts` + `migrations/012_notes.ts` (`pages`·`page_links`·`note_attachments`) + barrel + runner + parity. Full §XXVI double-gate + post-impl SHIP. `@vida/core` 193 green · v12. Spec: `docs/specs/foundation/db-4-notes-and-pages/`. NOT committed. |
| 2 | Preferences | `preferences/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-19) — `schema/preferences.ts` + `migrations/013_preferences.ts` (`user_preferences`·`nav_preferences`·`command_bar_history`) + barrel + runner + 5 parity rows + ADR-002 §5.17/§5.20 amendment + §XXIX docs. ALL plaintext (PR-1). **Build-phase intent authored, not deferred** (G4 6 cols · PB-2 `module_visibility` · E9 `user_profile` split → Preferences single-writer owner, ADR-012 §3.10). Gate-1 REVISE→fixed · preflight PASSED · gate-2 SHIP · post-impl REVISE→fixed (`time_format` NOT NULL type-lie) → SHIP. `@vida/core` 198 green · v13. Spec: `docs/specs/foundation/db-4-preferences/`. ⚠ **E9 cross-group:** Gamification's `user_profile` (group ~#19) MUST omit `persona`/`motivation_style`/`active_modules`/`onboarding_completed` + `check_in_streak*`. NOT committed. |
| 3 | Sessions & Scheduling (+Pomodoro) | `sessions-and-scheduling/` + `pomodoro/` | ✅ **DONE** (P1–P5, 2026-08-19) — **6 tables**: `study_sessions`·`focus_sessions` (`schema/foundation/session-extensions.ts`) + `study_availability`·`availability_exceptions`·`study_plan_batches`·`session_templates` (`scheduling.ts`) + `migrations/014_sessions_scheduling.ts`. **`focus_sessions` IS the `focus` timer runtime; `pomodoro_sessions` RETIRED** into it (notes-and-pages reframe — resolved after 2 Victor drift-catches: no build-decisions, docs settle it via the consuming-module reframe doc). Extensions: own `id` PK + `session_id UNIQUE` (BR-DB-1 preflight catch). 4 `[E]` fields. `STUDY_PLAN_BATCH_STATUS += 'failed'`; `PRESET_BLOCK` reused; `ENTITY_TYPES += 'session'`. Gates: gate-1 REVISE→resolved · preflight BLOCKED(BR-DB-1)→PASSED · gate-2 REVISE→SHIP · post-impl SHIP. Phase-5 DDL-introspection (24 cases, all 4 dims). `@vida/core` **221 tests** · v14 · typecheck 11/11 · lint 0. Spec `docs/specs/foundation/db-4-sessions-and-scheduling/`. ⚠ X1 → group #2 PD-7 backfill; DB-11 → interface reconcile. |
| 4 | Tasks | `tasks/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-19) — **2 tables** `tasks`·`task_time_logs` (`schema/tasks.ts` + `migrations/015_tasks.ts`, v15). **Zero decisions** (⚠ Victor drift-catch: I first framed 4 "shape points w/ leans" = the Notes-#1 manufactured-decisions drift → all doc-closed). No-FK reconcile (5 parent refs + self-ref + `task_id` → plain TEXT). **Build-phase INTENDED authored:** `completed_at`·`scheduled_date`·`kind`(**TASK_KIND** net-new)·`recurrence_rule`(RRULE)·`measurement_kind`/`binding_mode`(M1/M2)·`nesting_weight`(M4). Boundary: inline `tags`→`entity_tags`(+`ENTITY_TYPES+='task'`)·`task_views`→`views`(AR-6)·notes→`pages`·timer→`focus_sessions`(#3). Gate-2 caught + struck a manufactured `binding_mode NOT NULL DEFAULT 'event-trigger'` → nullable no-default (ADR-011 §3.2 override-slot). Gates: gate-1 SHIP·preflight PASSED·gate-2 REVISE→SHIP·post-impl SHIP. Phase-5 introspection (8). `@vida/core` **240 green** · v15 · typecheck 11/11 · lint 0. Spec `docs/specs/foundation/db-4-tasks/`. Interface reconcile (`Task`+7−`tags`·`TaskTimeLog`+`updated_at`)→DB-11. |
| 5 | Projects | `projects/structure-data.md` | ☐ |
| 6 | Habits | `habits/structure-data.md` | ☐ |
| 7 | Routines | `routines/structure-data.md` | ☐ |
| 8 | Purpose & Goals (+dreams) | `purposes-and-goals/structure-data.md` | ☐ |
| 9 | Skills | `skills/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-20) — **7 tables** (`021_skills`, v21) `skills`·`skill_levels`·`skill_activities`·`skill_actions` (Sessions `practice` sub-type extension)·`skill_dev_logs`·`skill_dependencies`·`skill_definitions` (`schema/skills.ts`). Roster authoritative; **ADR-002 §5.9 DDL STALE** (mastery_level default/skill_resources) → superseded. Mastery DERIVED (BR-SK-1: current_level/progress nullable + mastery_override nullable, no §5.9 default); `skill_actions` = 1:1 session extension (own id PK + session_id UNIQUE, BR-SK-2, group-#3 pattern; SESSION_SUB_TYPE 'practice'); no-FK; no stored measurement_kind (`measurement_config` [E] JSON as text, P-2); 14 FIXED CHECK/11 tuples; **7 net-new enums** (`SKILL_LEVEL_STATUS`/`SKILL_ACTIVITY_TYPE`/`SKILL_FILL_SOURCE`/`SKILL_DEPENDENCY_TYPE`/`SKILL_DEPENDENCY_SCOPE`/`SKILL_DEFINITION_SOURCE`/`SKILL_SETUP_MODE` → `skill.ts`+Zod), reused LIFE_DOMAIN/PRIORITY/FREQUENCY/MASTERY_LEVEL; OPEN no-CHECK (status/difficulty/duration_target/best_time/locale_variant); RETIRE `skill_resources`→entity_links; `ENTITY_TYPES += 6` (**skill_action EXCLUDED** = session sub-type; stale "skill already reserved" corrected — skill was absent). Zero build-decisions; gate-1 SHIP · preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP. `@vida/core` **426 green**; Phase-5 introspection (28). Spec `docs/specs/foundation/db-4-skills/`. ⚠ **Now following P0 table order** (Victor 2026-08-20) — Finance was built out-of-order as table #15. |
| 10 | Knowledge (+flashcards) | `knowledge/` + `knowledge/flashcards/` | ✅ **DONE** (P1–P5, 2026-08-20) — **7 tables** (`022_knowledge`, v22) the "Knowledge Universe": `knowledge_objects`·`object_kinds`·`knowledge_containers`·`references`·`compound_sets`·`knowledge_lab_entries`·`flashcards` (`schema/knowledge.ts`). Largest/most-reframed group. **ADR-002 §5.10 STALE** — `study_topics`/`topic_reviews`/`knowledge_notes`/`flashcard_decks`/`flashcard_reviews` superseded (→ `knowledge_objects` / review_events[DB-3] / pages / retired). Mastery DERIVED (BR-KN-2); SM-2 cols RETIRED→DB-3 review engine (CONSUMED, BR-KN-3); no-FK; `knowledge_objects` = study_topics survivors − Education-plan/Books cols (KN-2, BR-KN-6); `flashcards` content-only (BR-KN-7); `references.url`=[E] (gate-1 F1 catch, ZK). **4 FIXED CHECK=4 tuples** (reused STUDY_TOPIC_STATUS/TOPIC_DIFFICULTY + net-new KNOWLEDGE_CONTAINER_TYPE/CARD_TYPE); OPEN no-CHECK (object_kinds.name/learning_realm user-extensible KN-4, references.type, compound_sets.consumer_module). `ENTITY_TYPES += knowledge_object/knowledge_container/reference/flashcard`. `references`=quoted SQL keyword. OUT: study_methods (ADR-008 registry), fts_knowledge (DB-8), notes→pages, Education rollup, AI-assist/automation (undesigned). compound_sets/lab_entries = base tables only. Zero build-decisions; gate-1 REVISE→resolved · preflight PASSED(8 folds) · gate-2 SHIP · post-impl SHIP (reconciled data_refs→plain). `@vida/core` green; Phase-5 introspection (28). Spec `docs/specs/foundation/db-4-knowledge/`. |
| 11 | Books | `books/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-20) — **10 tables** (`023_books`, v23) the reading Universe: `books`·`book_chapters`·`book_assets`·`book_bookmarks`·`book_highlights`·`book_quotes`·`reading_sessions` (Sessions `reading` sub-type extension)·`reading_plans`·`reading_plan_books`·`book_subjects` (`schema/books.ts`). 2nd-largest reframe; §Books STALE. book=WORK/copies=assets (BK-2); progress DERIVED (BR-BK-2); `reading_sessions` 1:1 session extension (BK-10/S1); 3 annotation natures (BK-6); no-FK; ONE doc-fixed UNIQUE (`book_chapters(book_id,chapter_number)`); **`deleted_at` on 8 of 10** (book_chapters+reading_sessions omit it, F1); **no measurement axes on reading_plans** (C-M1, Purpose-owned); 4 FIXED CHECK=4 tuples (reuse BOOK_STATUS + net-new BOOK_ASSET_FORMAT/READING_PLAN_ARRANGEMENT/READING_PLAN_GOAL_TYPE); `ENTITY_TYPES += book/book_chapter/book_bookmark/book_quote`. OUT: mapping (BK-4 design pass), conflict (BK-8), X*/AI* service, Education pacing. Zero build-decisions; ⚠ **Victor: "read the documentation properly"** → full 5-aspect + rerun read corrected reading_plans measurement (C-M1). gate-1 REVISE→resolved (deleted_at audit) · preflight(7 folds) · gate-2 SHIP · post-impl SHIP. **⚠ Cross-group fix:** `skill_actions.deleted_at` REMOVED (session extension mustn't have it — audit). `@vida/core` **503 green**; Phase-5 introspection (40). Spec `docs/specs/foundation/db-4-books/`. |
| 12 | Learning/Education (+ICS) | `learning/education/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-20) — **15 tables** (`024_learning_education`, v24) THE Learning hub, the heaviest group: 3 FACT-floor reshaped (`subjects`[=courses]·`ics_feed_configs`·`ics_synced_events`) + 12 net-new INTENDED (`institutions`·`self_taught`·`programs`·`curricula`·`terms`·`class_sessions` [Sessions `class` sub-type]·`subject_schedules`·`grading_systems`·`grading_components`·`assessments`·`subject_documents`·`education_measurements`) (`schema/learning.ts`). §5.10/§5.18 STALE; net-new domain. 2 R6 reframes (inline `courses.tags`→entity_tags SP1; `courses.progress NOT NULL DEFAULT 0`→nullable M3). `class_sessions`=`class` session extension (own id + session_id UNIQUE, no deleted_at); `subject_schedules` UNIQUE(subject_id); `education_measurements` axes M1×M2, measurement_kind **notNull no-default** (dedicated entity, diverges from deliverables deliberately); `subject_documents`=PJ-8 vault (no deleted_at). No-FK; **deleted_at on 11 of 15** (ics ×2 + class_sessions + subject_documents omit). **15 FIXED CHECK** = 11 net-new tuples + 4 reused (COURSE_TYPE/COURSE_STATUS/MEASUREMENT_KIND/BINDING_MODE); `subjects.rating` numeric BETWEEN; `subject_documents.doc_type` OPEN. `ENTITY_TYPES += 7` (`class_session` excluded — sub-type). OUT: homework=Tasks-owned (C-HW), AI extraction pipeline (source=ai col authored), grade/GPA compute=service, E2/AI4/M5 guards. **Zero build-decisions** (⚠ Victor drift-catch at P1: author-vs-defer framing of the grading `(design pass)` label → intake §Resolution WHOLE → author now, [[build-phase-flags-mean-resolve-now-not-defer]]). gate-1 SHIP · preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP. `@vida/core` **578 green**; Phase-5 introspection (60); typecheck 11/11; eslint 0. Spec `docs/specs/foundation/db-4-learning-education/`. |
| ~~13~~ | ~~Languages~~ | ~~ADR-002 §5.10~~ | 🚫 **DISSOLVED → Spaces worked-example** (ADR-006 SP7; `features/README.md:52`) — authors **0 tables**; composes #10 `knowledge_objects` · #3 Sessions · AR-6 tags/spaces/views · AR-7 capability Blocks · ADR-009 Template. Build-time write-up, not a schema group. §5.10 STALE. (row # kept stable so #14–#22 refs hold; count = 21 active) |
| 14 | Relationships | `relationships/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-20) — **8 tables** (`025_relationships`, v25) the personal CRM (PII-heaviest): `contacts`·`contact_events`·`interactions`·`contact_reminders`·`reminder_groups`·`reminder_group_contacts` (§5.9 reshaped, authored fresh) + **2 net-new networks** `network_groups`·`network_group_contacts` (G2/RL-4, M:N) (`schema/relationships.ts`). Build-phase INTENDED authored (intake §Resolution WHOLE): inline `contacts.tags` RETIRED→entity_tags (G10/SP1); `contacts.how_we_met`[E]+`closeness_tier` (G4, OPEN — Preferences-defined vocab); `interactions.energy_given`/`energy_received` (INT plaintext)+`key_takeaways`[E] (G8); `contact_reminders.is_snoozed`/`snoozed_until`/`priority` (reuse PRIORITY, G8); `reminder_groups.anchor_type`/`anchor_days_before` (event-anchored, G11, net-new **REMINDER_GROUP_ANCHOR**). `social_links` KEPT (C4). **`deleted_at` on `contacts` ONLY** (§5.9 floor + habit_completions/routine_completions ledger precedent; `interactions`=ledger RL-3). **Junctions reshaped to entity_tags-v2 shape** (synthetic id PK + UNIQUE(pair) + reverse index, NOT §5.9 composite PK — `project_habits`:29-30; **preflight catch F1**). No-FK everywhere (RL-2 app-layer). **9 FIXED CHECK** (RELATIONSHIP_TYPE·FREQUENCY×3·CONTACT_EVENT_TYPE·INTERACTION_TYPE·SENTIMENT·PRIORITY·REMINDER_GROUP_ANCHOR); `closeness_tier` OPEN. `ENTITY_TYPES += contact/network` (child/junction excluded). **No M\*** (C1 — health derived, contacts excluded reference data); no E2 (C2). OUT (cite-not-author): N1/N2 delivery (Notifications), X1/X8 import (ADR-014 service, no import_staging), health-compute, Sigma.js graph. Zero build-decisions; gate-1 SHIP · preflight PASSED (F1 shape-fold + 4 mechanical) · gate-2 SHIP · post-impl SHIP. `@vida/core` **619 green** (1 pre-existing vault-1MB flake, passes standalone); Phase-5 introspection (32); typecheck 11/11; eslint 0. Spec `docs/specs/foundation/db-4-relationships/`. Interface reconcile (Contact/Interaction/ContactReminder/ReminderGroup + new NetworkGroup/NetworkGroupContact) → DB-11. |
| 15 | Finance (+Fiscal & Legal) | `finance/` + `finance/fiscal-legal/` | ☐ |
| 16 | Check-ins | `check-ins/structure-data.md` | ✅ **DONE** (P1–P5, 2026-08-20) — **3 tables** (`026_check_ins`, v26) the lightest group (structured daily-reflection + template form-builder), lone non-ingest: `daily_check_ins`·`check_in_templates` (baseColumns) + `check_in_template_questions` (**id + syncColumns, NO created_at/updated_at** — §5.13 floor + SyncMetadata interface) (`schema/check-ins.ts`). **No `deleted_at` on ANY** (documented FACT: §5.13 + P/E table omit it on all 3 while neighbors list it; CK-10 hard-delete). Build-phase fixes (intake WHOLE): **CK-2** composite `UNIQUE(check_in_date, check_in_type)` (bug fix, old single-col UNIQUE gone); **CK-3** `check_in_type` 3→6 (`+afternoon/monthly_review/yearly_review` — amended the EXISTING `CHECK_IN_TYPE` tuple). No-FK (`template_id` ×2). 4 FIXED CHECK (all the module's OWN existing tuples). `mood`/`energy` numeric BETWEEN. `ENTITY_TYPES += daily_check_in` (no tags, SP1). OUT: E9 streak DERIVED (no col), E2 economy (Gamification), G7 review agg (integration), no M\* (C-M). ⚠ **gate-1 REVISE caught my types-layer miss** — the enums/interfaces/validators already existed in `entities/user.ts`+`validators/user.ts` (I'd dismissed the grep hit) → reconcile-and-extend, not net-new (a new file would double-export); Victor steered "ground on docs" → confirmed `deleted_at`-off is a documented FACT, not a flag. preflight PASSED · gate-2 SHIP · post-impl SHIP. `@vida/core` **635 green**; Phase-5 introspection (12); typecheck 11/11; eslint 0. Spec `docs/specs/foundation/db-4-check-ins/`. Interface reconcile → DB-11. |
| 17 | Health: Core | `health/core/structure-data.md` | ☐ |
| 18 | Health: Nutrition | `health/nutrition/structure-data.md` | ☐ |
| 19 | Health: Training | `health/training/structure-data.md` | ☐ |
| 20 | Journals | `journals/structure-data.md` | ☐ |
| 21 | Gamification | `gamification/structure-data.md` | ☐ |
| 22 | Notifications | `notifications/structure-data.md` | ☐ |

## Route History
- 2026-08-01: created as a `# Stream: true` non-head (Model A).
- 2026-08-18: **re-chartered as a real gated build head (Model B)** — Victor's schema-foundation blueprint. Stream
  header removed; profile add-backend-component; per-domain-sub-issue 5-phase grain. Flow:
  `docs/roadmap/schema-foundation-build-flow.md`. Blocked by DB-3; runs in its own clean-context session(s) after DB-3.
- 2026-08-18: **PICKED UP** — DB-3 PR #31 merged to main (`97a0e0c`); profile switched Project Foundation →
  add-backend-component. Started **P0 · Slice**: verified 24 `structure-data.md` intent docs on disk + inspected
  grain-ambiguous groups (health 3-doc, knowledge+flashcards, finance+fiscal-legal, pomodoro MOVE, languages dissolve).
  Canonical domain-group list proposed for approval before sub-issue creation.
- 2026-08-20: **STRUCTURAL DRIFT CORRECTED (Victor-flagged) — group #13 Languages dissolved → Spaces worked-example.**
  At the top of the session for what was the next head (#13 Languages), Victor flagged: *"Languages is supposed to be a
  space, inside the Spaces scope… check all the other ones that might fall on this scope since it is a drift."* Doc sweep
  confirmed: **ADR-006 (Accepted 2026-07-15) dissolved Languages into a Spaces worked-example (SP7)** well before the
  2026-08-18 P0 slice; the D2 decision applied **ADR-002 §5.10 (STALE, superseded by ADR-006)** as if live. Root cause:
  D2 mis-sourced a superseded ADR-002 §; D4 caught the same class for Bucket List (→`dreams`, #8) + Duties (→Tasks `kind`,
  #4) but D2 slipped Languages through. **Scope sweep of all 3 ADR-006 worked-examples + groups #14–#22 → Languages is the
  SOLE remaining drift** (Bucket List/Duties already correct; no other group is a Spaces composition). **Fix:** struck #13
  from the schema roster (0 tables — composes #10/#3/AR-6/AR-7 + a Template); roster **22→21 active**; §5.10 recorded STALE;
  next concrete head re-routed **#13→#14 Relationships**. **13 of 21 done; 8 remain.** No code/migration touched (nothing
  was authored for #13). Lesson class: [[stale-source-plus-live-convention-is-fact-not-a-decision]] — a later ADR
  supersedes an earlier §; verify the § is live before sourcing a group from it.
- 2026-08-20: **Group #14 Relationships (CRM) — P1–P5 DONE.** 8 tables (`025_relationships`, v25): 6 §5.9 reshaped +
  2 net-new networks (G2/RL-4). Full 5-phase run, triple-gate clean (gate-1 SHIP · preflight PASSED · gate-2 SHIP ·
  post-impl SHIP), all via independent critics. **Preflight caught fold F1** — the §5.9 composite-PK junctions
  (`reminder_group_contacts`) reshape to the live **entity_tags-v2 junction shape** (synthetic `id` PK + `baseColumns` +
  `UNIQUE(pair)` + reverse index; `project_habits`:29-30, NOT §5.9's composite PK). Build-phase INTENDED authored (intake
  §Resolution WHOLE): tags→entity_tags (G10) · `how_we_met`/`closeness_tier` (G4, OPEN — Preferences-defined) ·
  `energy_*`/`key_takeaways` (G8) · reminder snooze/priority (G8) · `reminder_groups` event-anchor (G11, net-new
  `REMINDER_GROUP_ANCHOR`). `deleted_at` on `contacts` ONLY (§5.9 floor + habit_completions ledger precedent). No-FK; no M\*
  (C1); social_links kept (C4); N1/N2/X1/X8 cite-not-author. `ENTITY_TYPES += contact/network`. `@vida/core` **619 green**
  (1 pre-existing vault-1MB perf flake, passes standalone); typecheck 11/11; eslint 0; Phase-5 introspection 32 (8×4).
  §XXIX current-* promoted (BR-RL-1…8). **14 of 21 done; 7 remain. Next concrete head = P0 table #16 Check-ins** (#15 Finance
  built out-of-order at v20; #5–8/#15 roster ☐ marks are stale — migrations 016–020 exist). NOT committed (branch
  `ui-1-vida-ui-primitives`, per prior DB-4 groups). Lesson: [[stale-source-plus-live-convention-is-fact-not-a-decision]]
  (junction PK reshape); the Phase-1 No-Decisions Gate held (zero build-decisions, zero escalated forks).
- 2026-08-20: **Group #16 Check-ins — P1–P5 DONE.** 3 tables (`026_check_ins`, v26) — the lightest group. Full 5-phase
  run. **gate-1 REVISE caught a real miss:** I'd claimed the check-in enums/interfaces/validators were net-new; they
  ALREADY existed in `@vida/types/entities/user.ts` + `validators/user.ts` (I dismissed the grep hit as "unrelated" without
  reading). Rewrote → reconcile-and-extend (amend `CHECK_IN_TYPE` 3→6 in place; a new file would double-export). ⚠ **Victor
  directive "ground everything on the documentation, no deviations"** — I'd flagged `deleted_at` as an arguable call; the docs
  settle it as a FACT (§5.13 DDL + P/E table omit it on all 3 while neighbors list it + CK-10 hard-delete). Also found (re-read,
  not the critic): `check_in_template_questions` = id+syncColumns, NO created_at/updated_at (§5.13 + SyncMetadata interface).
  CK-2 composite UNIQUE + CK-3 type 3→6 authored. No-FK; no M\*/tags/economy; E9 streak DERIVED (no col). preflight PASSED ·
  gate-2 SHIP · post-impl SHIP. `@vida/core` **635 green**; typecheck 11/11; eslint 0; Phase-5 introspection (12). §XXIX
  current-* promoted (BR-CK-1…7). NOT committed. **15 of 21 done; 6 remain. Next concrete head = P0 table #17 Health: Core.**
  Lessons: [[decide-dont-ask-when-docs-give-the-answer]] (deleted_at was doc-fixed, not a flag) · don't dismiss a grep hit
  without reading it (the entities/user.ts miss) · [[build-phase-flags-mean-resolve-now-not-defer]] (CK-2/CK-3 authored).
- 2026-08-18: **Group #1 Notes & Pages — P1 intent intake DONE** → `docs/specs/foundation/db-4-notes-and-pages/_index.md`.
  Read the full 5-aspect feature spec + `note.ts` + ADR-002 §5.2 + the AR-6 substrate on disk. **Key finding (corrects a
  stale routing note):** AR-6 (`schema/foundation/spaces.ts`, migration 003) **already authored `entity_links`, `tags`,
  `entity_tags`** — so N&P's net-new surface is **3 tables only: `pages` · `page_links` · `note_attachments`** (`page_tags`
  retired→`entity_tags`; `pomodoro_sessions` re-homed→`focus_sessions`/Sessions group #3). ADR-002 §5.2 confirmed
  self-flagged STALE (L22).
  ⚠ **Drift Victor caught (corrected same session):** I first wrote §4 as "5 open shape-decisions for P3" (FK · base ·
  home · `has_pomodoro` · `summary_config`). All 5 are **doc-determined, not decisions** — resolved to §4 N-R1…N-R6:
  no-FK convention (BR-DB3-1/spaces.ts) · full `baseColumns` (ADR-016 §3.4 locked pattern) · `schema/notes.ts`+`012`
  (ADR-016 §3.1) · `has_pomodoro` retained (plaintext filter, never retired) · `summary_config` schema-neutral. Root
  cause = treating STALE ADR-002 §5.2 DDL as live ambiguity against the settled conventions. **P3 = a straight authoring
  plan, zero shape to resolve.** P1+P2 done. Next = P3.
- 2026-08-18: **Group #1 Notes & Pages — P3→P5 DONE (full §XXVI double-gate).** P3: `PLAN-2026-08-18-db-4-notes.md` →
  gate-1 independent critique REVISE (1 blocker = my "types already match" claim; the fix was NOT the critic's "promote
  the interfaces" lean — verified the `entity_links`/`EntityLink` divergence already ships + DB-3 added 0 row interfaces →
  kept N-R2, corrected wording, DB-11 owns interface reconcile) → Approval 1 · preflight PASSED +2 folds
  (`summary_config`→plain `text()` not `json<T>`; runner test count-dynamic) → gate-2 SHIP → Approval 2. P4: authored
  `schema/notes.ts` + `migrations/012_notes.ts` + barrel + runner + 4 parity edits; `@vida/core` **193 green** (incl.
  `pages.type` parity) · root typecheck 11/11 · grep gates pass. P5: post-impl independent critique **SHIP** (0
  blocker/material; added `-- [E]` SQL comments per ADR-002 §5.2 source) · §XXIX promoted `database-layer/current-{spec,
  business-rules}.md` · foundation-readiness MOD-notes #31 PASS. **NOT committed** (branch `db-4-per-domain-schema`).
  Next = group **#2 Preferences** (fresh clean-context session).
- **Group #2 Preferences — DONE (P1–P5, 2026-08-19).** `schema/preferences.ts` + `migrations/013_preferences.ts`
  (`user_preferences`·`nav_preferences`·`command_bar_history`, ALL plaintext) + barrel + runner + 5 parity rows +
  ADR-002 §5.17/§5.20 amendment + §XXIX docs. **First group to author build-phase intent (not defer it):** G4 6 cols
  · PB-2 `module_visibility` · E9 `user_profile` split (Preferences single-writer owner, ADR-012 §3.10) — after Victor
  corrected an initial strict-mirror+defer misread ([[build-phase-flags-mean-resolve-now-not-defer]]). Gate-1 REVISE
  (`json<T>()`→`text()`)→fixed · preflight PASSED · gate-2 SHIP · post-impl REVISE (`time_format` NOT NULL type-lie)→fixed
  →SHIP. `@vida/core` **198 green** · v13. Spec `docs/specs/foundation/db-4-preferences/`. **2 of 22 done; 20 remain.**
  Next = group **#3 Sessions & Scheduling (+Pomodoro)** (fresh clean-context session).
- **Group #4 Tasks — P1 intent intake + P2 current-state read DONE (2026-08-19).** Spec
  `docs/specs/foundation/db-4-tasks/_index.md`. **Authoring set = 2 net-new tables** (`tasks` · `task_time_logs`,
  both ABSENT on disk). Read the full `docs/features/tasks/` 5-aspect spec + ADR-002 §5.3 + task.ts + ADR-011/006/007/
  009/004/012. **Boundary confirmed doc-fixed (Notes-#1 pattern):** `views` (spaces.ts:113) + `entity_tags`/`entity_links`
  (AR-6 substrate) are already authored → Tasks authors NEITHER; `task_views` retires → `views`, inline `tasks.tags`
  retires → `entity_tags` (register `entity_type='task'`). **Build-phase INTENDED additions captured (author now, not
  defer — [[build-phase-flags-mean-resolve-now-not-defer]]):** `completed_at` (G5) · `scheduled_date` (G6) ·
  `kind`+recurrence (G8, **TASK_KIND net-new tuple**) · `measurement_kind`/`binding_mode` (M1/M2, tuples already ship
  `measurement.ts`) · sub-task rollup-weight (M4). **No-FK reconciliation:** §5.3's 4 parent FKs + self-ref CASCADE →
  plain TEXT no FK (cascade/set-null = app/sync layer, TK-4) — stale-source-vs-live-convention = FACT. **ZERO shape
  decisions** — every point that first read "open" is doc-closed (⚠ Victor drift-catch: I first framed 4 "shape points
  with leans" = the Notes-#1 manufactured-decisions drift): recurrence = single `recurrence_rule` TEXT/RRULE (locked
  convention — habit/routine freq+days model **explicitly excluded** for tasks, conventions.md:13,25) · sub-task weight =
  `nesting_weight` nullable NULL⇒equal (ADR-011 §3.3 L54, named verbatim) · inline `tasks.tags` = **not authored** (→
  entity_tags, §5.20 RETIRE + conventions.md:29) · `Task` interface reconcile = **DB-11** fixed boundary (group #1/#3
  precedent), only `TASK_KIND` tuple authored now. Migration `015_tasks` → v15. **P3 = straight authoring plan, zero
  forks.** Next = P3 plan double-gate ([[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[build-phase-flags-mean-resolve-now-not-defer]]).
- **Group #4 Tasks — P3→P5 DONE + committed (2026-08-19).** P3: gate-1 critique SHIP (12 claim-classes verified, zero
  manufactured decisions) → Approval 1 · preflight PASSED (both tables own `id` PK → no BR-DB-1 trap) · gate-2 REVISE→SHIP
  (**caught + struck a manufactured `binding_mode NOT NULL DEFAULT 'event-trigger'`** — docs name what event-trigger *means*,
  not a universal default; → nullable no-default, ADR-011 §3.2 override-slot grain; + a fabricated-quote NIT) → Approval 2.
  P4: authored `TASK_KIND` tuple + `TaskKindSchema` · `015_tasks.ts` (v15) · `schema/tasks.ts` · `ENTITY_TYPES += 'task'` ·
  +6 enum-parity rows + `ddlFor` chain→015 · introspection test. Reconciled a stale `spaces.test.ts` fixture (hard-coded
  `'task'` as its unregistered example → now seeded; → synthetic type). P5: DDL-introspection (8) · post-impl critique SHIP ·
  §XXIX promoted (`current-{spec,business-rules}` BR-T4-1…9) · foundation-readiness MOD-tasks PASS. `@vida/core` **240 green**
  · typecheck 11/11 · lint 0 · v15. Committed on branch `db-4-per-domain-schema`. **4 of 22 done; 18 remain. Next = #5 Projects.**
  ⚠ Meta: the manufactured-decisions drift recurred a 3rd time (now reversed as a manufactured DEFAULT) — memory
  [[stale-source-plus-live-convention-is-fact-not-a-decision]] reinforced; the tell is "shape points w/ leans" in P1 framing.
- **2026-08-19 (session 4): groups #5–#8 DONE + committed (15 tables).** **#5 Projects** (`95718c5`, v16:
  `projects`·`milestones`·`deliverables`·`project_documents`) · **#6 Habits** (`7b81702`, v17: `habits`·`habit_completions`·
  `project_habits`) · **#7 Routines** (`10c6c2e`, v18: the orchestration REFRAME `routines`·`routine_step`·`routine_completions`,
  supersedes the §5.6 POC) · **#8 Purpose & Goals** (`55abae9`, v19: the CAPSTONE, 6 tables — §5.7 floor − the 4 DB-3
  substrate) · **#9 Finance (+Fiscal & Legal)** (v20: `020_finance`, 9 tables — 6 §5.8 finance entities [fresh, ex-monolith]
  + 3 net-new Fiscal & Legal `fiscal_residencies`·`legal_entities`·`fiscal_obligations`; largest group; net-new
  `INTEREST_TYPE`+`FISCAL_OWNER_TYPE`; inline `tags` retired; fiscal OPEN vocabs + roster-`?` nullability). Each: full
  §XXVI double-gate + preflight + independent post-impl SHIP; §XXIX promoted. `@vida/core`
  **240→385 green**; v15→v20; typecheck clean; eslint 0. **9 of 22 done; 13 remain. Next = #10.**
  Key rulings: measurement pair scoped by the module-doc roster (deliverables/targets only); `binding_mode` always
  nullable no-default; `project_habits`→entity_tags v2 shape; Routines authors the reframe; `dreams` absorbs
  `bucket_list_items`; nullable no-FK spine (SR-003). DB-11 backlog grows (interfaces + retirements, all groups).
  ⚠ Meta: **3 Victor corrections** on the manufacture-openness drift (#5 measurement-scope escalation via a critic; #7
  Routines twice — "investigate deeper" / "already solved in the documentation"). Two memories:
  [[module-doc-is-db4-roster-not-adr-broad-list]] · [[check-intake-and-reruns-before-triaging-a-design-pass-undone]].
  Standing guard: **grep `docs/intake/<mod>.md` §E + realignment reruns FIRST** for any design-pass-flagged group.
- **2026-08-20 (session): group #12 Learning/Education (+ICS) DONE — P1–P5.** The HEAVIEST group: **15 tables**
  (`024_learning_education.ts`, v24; `schema/learning.ts`) — 3 FACT-floor reshaped + 12 net-new INTENDED (the 8-level academic
  hierarchy + grading builder + measurement). 11 net-new enum tuples (`learning.ts`) + 11 z.enum validators; `ENTITY_TYPES += 7`.
  §XXVI double-gate (gate-1 SHIP · preflight 6 folds · gate-2 SHIP) + post-impl SHIP; both critics prompted-to-refute confirmed
  zero manufactured deferrals + no over-invented columns. `@vida/core` **578 green** (incl. 60 introspection + 15 new parity
  rows); typecheck 11/11; eslint 0. §XXIX promoted (`database-layer/current-{spec,business-rules}` BR-ED-1…10). **13 of 22 done;
  9 remain. Next = #13 Languages.** ⚠ **Victor drift-catch (P1):** I framed the grading `(design pass)` label as an
  author-vs-defer boundary (14 vs 15 tables) + put it to Victor; the intake §Resolution was already marked WHOLE (H3 fully
  specified the grading builder). Victor: "I already solved the gap inside the documentation … that is a clear drift." Corrected
  → author `grading_components` now; reinforced [[build-phase-flags-mean-resolve-now-not-defer]] (a `(design pass)` LABEL is
  still a build-phase forward-pointer when the intake §Resolution shows the model resolved). ⚠ Key rulings: `class_sessions` =
  the `class` session extension (SESSION_SUB_TYPE:21 already had it); `measurement_kind` notNull no-default (dedicated measure
  entity, deliberate divergence from deliverables' default); homework stays Tasks-owned (C-HW). DB-11 carry-forward += Learning
  interfaces (Course→Subject rename, `default_course_id`→`default_subject_id`, stale Course progress/tags).
