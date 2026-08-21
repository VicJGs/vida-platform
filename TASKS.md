# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| db-4-per-domain-schema (LIF-66) | Add Backend Component | 2026-08-01 | 2026-08-20 | ⚡ IN PROGRESS — P0 slice DONE (**21 active domain groups**; #13 Languages dissolved→Spaces, ADR-006). **#1 Notes & Pages ✅ COMMITTED** (`f2198ac`) · **#2 Preferences ✅ DONE** (2026-08-19) — `schema/preferences.ts` + `migrations/013_preferences.ts` (`user_preferences`·`nav_preferences`·`command_bar_history`, ALL plaintext) + ADR-002 §5.17/§5.20 amendment; **first group to AUTHOR build-phase intent, not defer it** (G4 · `module_visibility` · E9 `user_profile` split — after a Victor drift-catch, [[build-phase-flags-mean-resolve-now-not-defer]]); §XXVI double-gate + post-impl REVISE→SHIP (`time_format` NOT NULL type-lie); `@vida/core` 198 green · v13. **8 of 22 done. Next = group `#9 Finance (+Fiscal & Legal)`** — open FRESH (clean-context per group). #2 ✅ COMMITTED (`0bc1508` + `0fec077`). **#3 Sessions & Scheduling ✅ DONE** (2026-08-19) — 6 tables (`014_sessions_scheduling`, v14); `focus_sessions`=timer runtime, `pomodoro_sessions` RETIRED (docs settle it — 2 Victor drift-catches, zero build-decisions); double-gate+preflight(BR-DB-1)+post-impl all clean; `@vida/core` 221 green; Phase-5 DDL-introspection (24, all 4 dims). **#4 Tasks ✅ DONE** (2026-08-19) — 2 tables (`015_tasks`, v15) `tasks`·`task_time_logs`; zero decisions (Victor drift-catch on manufactured "shape points w/ leans"); no-FK reconcile; build-phase INTENDED authored (`TASK_KIND` net-new · `completed_at`/`scheduled_date`/`recurrence_rule`/`measurement_kind`/`binding_mode`/`nesting_weight`); gate-2 struck a manufactured `binding_mode` NOT-NULL-DEFAULT; double-gate+preflight+post-impl clean; `@vida/core` 240 green; Phase-5 introspection (8). **#5 Projects ✅ DONE** (2026-08-19) — 4 tables (`016_projects`, v16) `projects`·`milestones`·`deliverables`·`project_documents`; zero build-decisions (Victor drift-catch: a gate-1 critic escalated the measurement-scope → "you should see the documentation, not ask" → module doc is the roster, [[module-doc-is-db4-roster-not-adr-broad-list]]); `deliverables` INTENDED authored; `progress`→nullable slot ×3; measurement pair on `deliverables` only; inline `tags` retired; `ENTITY_TYPES += project/milestone/deliverable`; double-gate+preflight+post-impl clean; `@vida/core` 264 green; Phase-5 introspection (16). **#6 Habits ✅ DONE** (2026-08-19) — 3 tables (`017_habits`, v17) `habits`·`habit_completions`·`project_habits`; zero build-decisions; measurability (HB-13, `measurement_kind` NN dflt 'rate' + `binding_mode` nullable — trap avoided); G8 v1 fields + net-new `HABIT_DIFFICULTY`; `project_habits` (kept junction, from #5) → entity_tags shape; inline `tags` retired; `ENTITY_TYPES += 'habit'`; double-gate+preflight+post-impl clean; `@vida/core` 283 green; Phase-5 introspection (12). **#7 Routines ✅ DONE** (2026-08-19) — 3 tables (`018_routines`, v18) `routines`·`routine_step`·`routine_completions` = the orchestration REFRAME (supersedes §5.6 POC); zero build-decisions (⚠ TWO Victor corrections: reframe design landed §E, DDL=build-job — [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]); pursuable RT-19 (`binding_mode` nullable — trap avoided); `step_type` OPEN; `recurrence_rule` RRULE; net-new `ROUTINE_LIFECYCLE`; `ENTITY_TYPES += routine/routine_step`; double-gate+preflight+post-impl clean; `@vida/core` 299 green; Phase-5 introspection (12). **#8 Purpose & Goals ✅ DONE** (2026-08-19) — **6 tables** (`019_purposes`, v19) `purposes`·`targets`·`purpose_metrics`·`purpose_metric_values`·`target_reviews`·`dreams` = the CAPSTONE (§5.7 floor − DB-3's 4 substrate); zero build-decisions; ADR-011 amendments (progress→nullable slots; target_type→measurement_kind+binding_mode on **targets only**; restored fields; value_id→DB-3); `dreams` absorbs `bucket_list_items` (retired); nullable no-FK spine (SR-003); `METRIC_VALUE_SOURCE` net-new, `FREQUENCY` reused; `ENTITY_TYPES += purpose/target/dream/purpose_metric_value`; double-gate+preflight+post-impl clean; `@vida/core` 336 green; Phase-5 introspection (24). **#9 Finance (+Fiscal & Legal) ✅ DONE** (2026-08-20) — **9 tables** (`020_finance`, v20) 6 §5.8 finance (`accounts`·`transactions`·`assets`·`liabilities`·`investments`·`income_streams`, authored fresh) + 3 net-new Fiscal & Legal (`fiscal_residencies`·`legal_entities`·`fiscal_obligations`); largest group; zero build-decisions; no-FK (§5.8 REFERENCES superseded); build-phase authored (`opening_balance`·`category_bidx`+idx·G9 ×4·`next_payment_date`·`jurisdiction_code` ×5); inline `tags` retired→entity_tags; net-new `INTEREST_TYPE`+`FISCAL_OWNER_TYPE`, `FREQUENCY` ×3; **13 FIXED CHECK** parity + fiscal OPEN vocabs (conventions.md:32); fiscal nullability = roster `?`-notation; `ENTITY_TYPES += account/transaction/asset/investment/liability`; gate-2 REVISE→resolved; ⚠ 3 Victor drift-catches (Phase-1 No-Decisions Gate leaking — FK convention/nullability/enum-vocab all doc-fixed, [[stale-source-plus-live-convention-is-fact-not-a-decision]]); double-gate+preflight+post-impl clean; `@vida/core` 385 green; Phase-5 introspection (36). **Skills (P0 table #9) ✅ DONE** (2026-08-20) — **7 tables** (`021_skills`, v21) `skills`·`skill_levels`·`skill_activities`·`skill_actions` (Sessions `practice` sub-type)·`skill_dev_logs`·`skill_dependencies`·`skill_definitions`; §5.9 DDL STALE→superseded by roster; mastery DERIVED (no §5.9 default, BR-SK-1); `skill_actions` 1:1 session extension (BR-SK-2, group-#3 pattern); no-FK; no stored measurement_kind (`measurement_config` [E] JSON as text); 14 FIXED CHECK/11 tuples; **7 net-new enums** (`skill.ts`+Zod); `ENTITY_TYPES += 6` (**skill_action EXCLUDED** = session sub-type; stale "skill already reserved" corrected — skill was absent); RETIRE `skill_resources`→entity_links; zero build-decisions; gate-1 SHIP·preflight PASSED(6 folds)·gate-2 SHIP·post-impl SHIP; `@vida/core` **426 green**; Phase-5 introspection (28). ⚠ **NOW FOLLOWING P0 TABLE ORDER** (Victor 2026-08-20) — Finance was built out-of-order as table #15. **10 of 22 done; 12 remain. Next = P0 table `#10 Knowledge (+flashcards)`.** **#10 Knowledge (+flashcards) ✅ DONE** (2026-08-20) — **7 tables** (`022_knowledge`, v22) the "Knowledge Universe": `knowledge_objects`·`object_kinds`·`knowledge_containers`·`references`·`compound_sets`·`knowledge_lab_entries`·`flashcards`; largest/most-reframed group; §5.10 STALE (5 v2 tables superseded → knowledge_objects/review_events[DB-3]/pages/retired); mastery DERIVED; SM-2 RETIRED→DB-3 engine (consumed); no-FK; `knowledge_objects`=study_topics survivors − Education-plan cols (KN-2); flashcards content-only; `references.url`=[E] (gate-1 catch); 4 FIXED CHECK=4 tuples (2 reused + 2 net-new); `ENTITY_TYPES += 4`; `references`=quoted keyword; compound_sets/lab_entries=base only (AI/automation undesigned→deferred); zero build-decisions; gate-1 REVISE→resolved·preflight(8 folds)·gate-2 SHIP·post-impl SHIP; `@vida/core` green; Phase-5 introspection (28). **11 of 22 done; 11 remain. Next = P0 table `#11 Books`.** **#11 Books ✅ DONE** (2026-08-20) — **10 tables** (`023_books`, v23) the reading Universe: `books`·`book_chapters`·`book_assets`·`book_bookmarks`·`book_highlights`·`book_quotes`·`reading_sessions` (Sessions `reading` sub-type)·`reading_plans`·`reading_plan_books`·`book_subjects`; 2nd-largest reframe; §Books STALE; book=WORK/copies=assets; progress DERIVED; `reading_sessions` 1:1 session extension (S1); 3 annotation natures (BK-6); no-FK + ONE doc-fixed UNIQUE (book_chapters); **`deleted_at` on 8 of 10** (chapters+reading_sessions omit, F1); no measurement axes on reading_plans (C-M1); 4 FIXED CHECK=4 tuples; `ENTITY_TYPES += 4`; OUT: mapping/conflict/X*AI*-service. Zero build-decisions (⚠ Victor "read docs properly" → C-M1 correction). Double-gate+preflight+post-impl all SHIP. **⚠ Cross-group fix: `skill_actions.deleted_at` REMOVED** (session extensions must not have it — audit found it the sole instance). `@vida/core` **503 green**; Phase-5 introspection (40). **#12 Learning/Education (+ICS) ✅ DONE** (2026-08-20) — 15 tables (`024_learning_education`, v24), the heaviest group; `@vida/core` **578 green**. ⚠ **#13 Languages DISSOLVED → Spaces worked-example** (ADR-006 SP7; drift corrected 2026-08-20): NOT a schema group, 0 tables. **#14 Relationships ✅ DONE** (2026-08-20) — **8 tables** (`025_relationships`, v25) the personal CRM: 6 §5.9 reshaped (`contacts`·`contact_events`·`interactions`·`contact_reminders`·`reminder_groups`·`reminder_group_contacts`) + 2 net-new networks (`network_groups`·`network_group_contacts`, G2/RL-4); build-phase INTENDED authored (tags→entity_tags G10 · `how_we_met`/`closeness_tier` G4 · `energy_*`/`key_takeaways` G8 · reminder snooze/priority G8 · event-anchor G11 net-new `REMINDER_GROUP_ANCHOR`); `deleted_at` on `contacts` ONLY (habit_completions ledger precedent); **preflight fold F1: junctions reshaped to entity_tags-v2 synthetic-id shape** (`project_habits`, NOT §5.9 composite PK); no-FK; no M\* (C1 health derived); social_links kept (C4); N1/N2/X1/X8 cite-not-author; `ENTITY_TYPES += contact/network`; 9 FIXED CHECK; zero build-decisions; gate-1 SHIP·preflight PASSED·gate-2 SHIP·post-impl SHIP; `@vida/core` **619 green** (1 pre-existing vault-1MB flake, passes standalone); Phase-5 introspection (32); §XXIX current-* promoted (BR-RL-1…8). **#16 Check-ins ✅ DONE** (2026-08-20) — **3 tables** (`026_check_ins`, v26) the lightest group: `daily_check_ins`·`check_in_templates` (baseColumns) + `check_in_template_questions` (id+syncColumns, NO created_at/updated_at — §5.13 + SyncMetadata); **no `deleted_at` on any** (documented FACT); CK-2 composite UNIQUE + CK-3 `check_in_type` 3→6 (amended EXISTING `CHECK_IN_TYPE` tuple); 4 FIXED CHECK (module's own existing tuples); no-FK; `ENTITY_TYPES += daily_check_in` (no tags SP1); OUT: E9 streak DERIVED/E2 economy/G7 review/no M\*. ⚠ **gate-1 REVISE** caught my net-new-types miss (enums existed in `entities/user.ts`) → reconcile-and-extend; Victor "ground on docs" → `deleted_at`-off confirmed a FACT. gate-1 REVISE→fixed·preflight PASSED·gate-2 SHIP·post-impl SHIP; `@vida/core` **635 green**; Phase-5 introspection (12); §XXIX current-* promoted (BR-CK-1…7). **#17 Health: Core ✅ DONE** (2026-08-20) — **12 tables** (`027_health_core`, v27) the shared Health spine (Metrics+Monitoring·Goals·Adaptation·Physical Roles·Safety&Medical); recovered domain (no v2 schema) but the `structure-data.md` roster IS the documented per-table floor; goal `type` DECOMPOSED→`measurement_kind`×`binding_mode` (ADR-011 M1/M2, reused tuples); `progress`/`mastery` nullable REAL M3 slots; **`deleted_at` on `health_goals` ONLY** (the floor L45 — ⚠ **Victor drift-catch**: a gate-1 critic's "no floor→blanket baseline" premise was FALSE; the roster IS the floor even w/o v2 code, [[verify-a-critiques-escalation-and-defer-target-before-relaying]]); 18 FIXED CHECK (14 net-new `health.ts` + 4 reused) + OPEN vocabs no-CHECK; no-FK; `photo_blob`=blob(buffer)[E]; `source`+`ai` (AI6); C1/C2/C3 guards held; X*/AI*/M4/M5 cite-not-author; net-new `packages/types/src/health.ts`; `ENTITY_TYPES += 11` (OPEN SP2); gate-1 REVISE→resolved·preflight(10 folds)·gate-2 SHIP(3 folds)·post-impl SHIP; `@vida/core` **702 green**; Phase-5 introspection (49); §XXIX current-* promoted (BR-HC-1…8). **#18 Health: Nutrition ✅ DONE** (2026-08-20) — **6 tables** (`028_health_nutrition`, v28) the fuel pillar (`nutrition_ingredients`·`nutrition_dishes`·`nutritional_plans`·`daily_meal_plans`·`meals`·`shopping_items`); net-new, composes Core spine #17 (goals/metrics/adaptation), Finance (cost), Spaces (tags); **`deleted_at` on `nutritional_plans` ONLY** (floor L22, the #17 ruling applied cleanly); **OPEN-vocab-heavy: only 3 FIXED CHECK** (`MEAL_SOURCE`/`MEAL_GENERATION_METHOD` net-new + reused FREQUENCY) — modality (conventions L17) + editable-starter taxonomy (C5) + bare "status P" all OPEN; **inline `meals.tags` dropped → `entity_tags`** (SP1); money[E]=`money()`cents+@encrypted; `photo_blob`=blob(buffer)[E]; no-FK; C1–C8 guards held (no measurement/economy/session/AI4; cooking_skill_id opt-in nullable; no import_staging); net-new `packages/types/src/nutrition.ts`; `ENTITY_TYPES += 6`; gate-1 SHIP·preflight(9 folds)·gate-2 SHIP·post-impl SHIP (all clean, 4 cosmetic NITs folded); `@vida/core` **730 green**; Phase-5 introspection (25); §XXIX current-* promoted (BR-NT-1…6). **#19 Health: Training ✅ DONE** (2026-08-20) — **5 tables** (`029_health_training`, v29) the exercise pillar (`exercises`·`exercise_plans`·`workout_templates`·`workout_sessions`·`workout_sets`, the Catalog→Plan→Template→Instance→Log spine); net-new, **no rerun** (row 21 ALIGNED); a workout **IS a Session** — `workout_sessions` = the `sessions` `workout` sub-type 1:1 extension (own id + `session_id` UNIQUE, no-FK, **no `deleted_at`** — base owns lifecycle, ADR-004); **`deleted_at` on `exercises`+`exercise_plans`** (floor marks two); **5 FIXED CHECK** — 3 net-new (`MOVEMENT_PATTERN`/`WORKOUT_SET_CATEGORY`/`BURN_SOURCE`) + **2 reused from #17 health.ts** (`METRIC_SIDE`, `PHYSICAL_ROLE_AUTHORING_SOURCE`); rest OPEN (modality); **[E]-numeric asymmetry** preserved exactly (planned_reps/planned_weight/actual_reps [E]; sets/sets_done/weight_used plaintext); performance → Core metrics (no local KPI store); no-FK; net-new `packages/types/src/training.ts`; `ENTITY_TYPES += 4` (template excluded); gate-1 SHIP·preflight(9 folds)·gate-2 SHIP·post-impl SHIP (all clean); `@vida/core` **757 green**; Phase-5 introspection (22); §XXIX current-* promoted (BR-HT-1…6). **The Health domain (Core+Nutrition+Training) is COMPLETE.** **#20 Journals ✅ (`030`, v30, 1 table `journal_snapshots`), #21 Gamification ✅ (`031`, v31, 3 tables — `achievements` = first non-syncable seed), #22 Notifications ✅ (`032`, v32, 1 table + ADR-012 `effect_event_id` UNIQUE). 🎉 DB-4 COMPLETE — 21/21 active groups (012–032) → M1.0 schema foundation done. `@vida/core` 787 green; v32. Task ✅ DONE (2026-08-21). Next = `m1-foundation-closeout` → M1.1 (MOD-notes #31).** |
| m1-foundation-closeout | Project Foundation | 2026-08-17 | 2026-08-18 | ⚡ IN PROGRESS — ⚠ **REROUTED: M1.0 was closed too soon.** Attempted to close M1.0 + open M1.1, but M1.0's schema foundation (DB-3 partial + DB-4 not started) was left unfinished — census "100%" measured homed-code alignment, not issue completion. **M1.0 REOPENED**; docs corrected to flag the mistake (closeout·roadmap·delivery-plan·reconstructed-structure·m1.1-plan). Next M1.0 work = finish DB-3 then DB-4 (schema foundation); **model + flow DECIDED 2026-08-18 (Model B, upfront foundation) → `docs/roadmap/schema-foundation-build-flow.md`**. M1.1 (MOD-notes+all) gated behind M1.0 (modules build on finished schema, don't author it). |
| db-10-seed-and-fixtures (LIF-62) | Add Backend Component | 2026-07-31 | 2026-08-01 | ⏸ PARKED — now correctly homed at **M1 / M1.4** with its REAL dependency (← all 26 modules) encoded in Linear (DF-1 fixed). Un-parks when its milestone (M1.4) is reached in the build order. |

*(**ux-6-home-journal-dashboard LIF-95 → Done + MERGED**, 2026-08-17 — **UX-6 COMPLETE → M1.0 BUILD WAVES COMPLETE** (all `-a/-b/-c/-d` landed; buildable issues #1–#30 done — census 92%, the residual = the DB-3/DB-4 **stream** rows #9/#10 which never ship standalone). The Home = Journal daily-dashboard **design model** (new-feature; no rendered component, no Visual Gate — shape docs-fixed like UX-3/4/5): `apps/web/src/home/{section-model,journal-contribution,section-state,selection}.ts` + 4 tests + `CLAUDE.md` + `docs/core/architecture/home-journal-dashboard.md`. Three sections (summary/agenda/entry) · journal-contribution registry seam (names no module, `JournalSeamNotActivated` per AR-9) · per-section degrade composition (reuses `TerminalState` by TYPE, no `deriveTerminalState`) · pure `resolveSelection`. Full §XXVI double-gate (Gate-1 REVISE→7 fixed [5-vs-4 terminal-state blocker] · preflight PASSED · Gate-2 REVISE→3 fixed [deriveTerminalState-with-no-data blocker] · post-impl SHIP). typecheck 0 · @vida/web **180 tests** (+15) · lint 0-err. Also reconciled **18 stale delivery glyphs** (UX-2…UI-4). **Next: M1.1 opens → MOD-notes #31.** Prior: **ui-4-app-shell-components LIF-89 → Done + MERGED** (S5 PR #29 `7559a4d`) — **UI-4 COMPLETE (S1–S5 all landed)**; the web app-shell chrome. S5 (integration) = the full-`<App/>` seam test + BR-7 `/graph` lazy-split (`app/graph` + `routes.tsx` + `@vida/ui` `sideEffects:false` DF-S5-1 → sigma into a 42 KB lazy chunk, MEASURED). §XXVI double-gate (gate-1 critic MEASURED the build, caught the lazy-route-alone BLOCKER · preflight 3 gzipped builds · gate-2 SHIP no-drift) + Visual Gate SHIP. LIF-89 synced Done; task archived. **The `-c` UI wave is complete → the `-d` UX wave (UX-6) is released.** Filed follow-up: `perf-framework-chunk-split` (§6 init budget, not BR-7). Prior: **ui-3-vida-editor LIF-88 → Done + MERGED** (E8 PR #24 `79ee267`), `@vida/editor` v0.8.0. Prior: ui-2-platform-views LIF-87 PR #13.)*

## 🧭 Delivery Routing — READ THIS FIRST (this repo's routing rule)

> **The authoritative next-head selector for this repo is the `#` GLOBAL BUILD ORDER in
> `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md` — NOT `tracker_sync --next`.**

This repo has a hand-authored, cross-milestone topological order (the `#` column, DF-10). It was created
*because* `--next` had no global order and kept mis-picking heads. So, at **every `/begin`**, for THIS repo:

1. **Compute the head from `#` order.** Walk `reconstructed-structure.md`'s `#` column ascending; the next head
   is the **lowest-`#`** issue that is (a) NOT done, (b) NOT a `〰` stream row, (c) has **all blockers done**,
   **(d) not gated behind an unfinished SUB-WAVE.**
1a. **SUB-WAVE GATE (learned 2026-08-09 — the raw `#` walk alone is INSUFFICIENT).** The per-issue `←` edges do
   NOT encode the coarse sub-wave sequencing in `m1.0-delivery-plan.md:129,140-141`: `-a`∥`-b` → `-c` (UI) → `-d`
   (UX); **`-d needs -c`** ("UX-6 needs UI-4"). A higher-`#` UI-4 (#30) can't be a per-issue blocker of UX-6 (#26)
   without violating DF-3, so this gate lives ONLY in the sub-wave note, not the edges. **Before naming a head,
   check its sub-wave isn't gated by an unfinished earlier wave.** This is why the raw walk wrongly picked UX-6 #26
   when the real head was UI-2 #28. When `--next` disagrees with a raw `#` walk, suspect a sub-wave gate — `--next`
   is usually right about eligibility here.
2. **`tracker_sync --next` is ADVISORY only.** Its `order_nodes` tie-breaks the ready set by *direct-dependent
   count* (`tracker_sync.py:1108`) — a different (also-valid) topo tie-break, so it routinely names a
   higher-`#` issue (e.g. UX-3 #23 over AR-8 #14). **When `--next` and the `#` order disagree, the `#` order
   wins.** Use `--next` only to (a) get the *ready set* and (b) flag divergence. See
   [[doc-order-authoritative-over-next-heuristic]].
3. **DF-3 invariant — audit before trusting `--next`:** every task-file `blocked by` edge MUST point to a
   LOWER `#`. A higher-`#` edge is a bug — it silently drops the true head from `--next`'s ready set (this is
   exactly what a stale `AR-8 ← db-8-fts5-search` [#14 ← #60] edge did, hiding AR-8 and surfacing AR-9 wrongly).
   Fix the edge; don't route around it.
4. **The "Next session" note below is a convenience, not the source.** If it ever disagrees with the computed
   `#`-order head, the `#` order wins.

**🎯 Computed head now (2026-08-20 — DB-4 IN PROGRESS · groups #1–#9 DONE → next concrete = `#10` P1; 9 of 22 done, 13 remain).** **#9 Finance (+Fiscal & Legal) ✅ DONE** (2026-08-20, v20): **9 tables** (`020_finance`) — 6 §5.8 finance entities (fresh) + 3 net-new Fiscal & Legal (`fiscal_residencies`·`legal_entities`·`fiscal_obligations`); largest group; zero build-decisions; no-FK (§5.8 REFERENCES superseded, ADR-016 §3.4); build-phase authored (`opening_balance`·`category_bidx`+idx·G9 ×4·`income_streams.next_payment_date`·`jurisdiction_code` ×5); inline `tags` retired→`entity_tags` (FN-10); net-new `INTEREST_TYPE`+`FISCAL_OWNER_TYPE`, `FREQUENCY` reused ×3; **13 FIXED CHECK** parity + fiscal OPEN vocabs (`residency_type`/`entity_type`/`obligation_type`/`status` per-jurisdiction, conventions.md:32); fiscal nullability = the `structure-data.md` roster `?`-notation; `ENTITY_TYPES += account/transaction/asset/investment/liability`; gate-1 SHIP · preflight PASSED · gate-2 REVISE→resolved (fiscal nullability = roster, not FL-11 inference) · post-impl SHIP; Phase-5 introspection (36); `@vida/core` **385 green**; §XXIX current-* promoted (BR-FN9-1…8). DB-11 carry-forward += Finance `opening_balance`/`category_bidx`/`jurisdiction_code`/G9 · new `FiscalResidency`/`LegalEntity`/`FiscalObligation`. ⚠ 3 Victor drift-catches — the Phase-1 No-Decisions Gate leaking (FK convention · nullability · fiscal enum-vocab ALL doc-fixed; framed as open points/advisories/folds → corrected to pure `[FACT]` citations). **[superseded detail below]** **#8 Purpose & Goals ✅ DONE** (2026-08-19, v19): **6 tables** (`019_purposes`) `purposes`·`targets`·`purpose_metrics`·`purpose_metric_values`·`target_reviews`·`dreams` (`schema/purposes.ts`) — the CAPSTONE (§5.7 floor − the 4 DB-3 substrate tables); zero build-decisions; ADR-011 amendments (progress/current_value/progress_percentage → nullable override slots; `target_type`→`measurement_kind`+`binding_mode` **on targets ONLY**; restored success_criteria/measurement_method/is_higher_better/baseline_value/source/context_notes; `purposes.value_id`→DB-3 `values`); `dreams` absorbs `bucket_list_items` (retired); all spine joints nullable no-FK (SR-003 relaxed); `METRIC_VALUE_SOURCE` net-new + `FREQUENCY` reused (gate-1 F2); `ENTITY_TYPES += purpose/target/dream/purpose_metric_value`; double-gate+preflight+post-impl clean; Phase-5 introspection (24); `@vida/core` **336 green**. **Next head = domain group `#9 Finance (+Fiscal & Legal)`, Phase 1** — open FRESH; **8 of 22 done; 14 remain.** DB-11 carry-forward += `Purpose`+value_id/progress→null · new `Target`/`PurposeMetric`/`PurposeMetricValue`/`TargetReview`/`Dream` · retire `TARGET_TYPE` · `BucketListItem`→`Dream`. **[superseded detail below]** **#4 Tasks ✅ DONE** (2026-08-19, v15): 2 tables (`015_tasks`) `tasks`·`task_time_logs` (`schema/tasks.ts`); zero decisions (Victor drift-catch on manufactured "shape points w/ leans" — all doc-closed); no-FK reconcile; build-phase INTENDED authored (`TASK_KIND` net-new · `completed_at`/`scheduled_date`/`recurrence_rule`/`measurement_kind`/`binding_mode`/`nesting_weight`); gate-2 struck a manufactured `binding_mode` NOT-NULL default (→ nullable, ADR-011 §3.2); `ENTITY_TYPES+='task'`; double-gate+preflight+post-impl clean; Phase-5 introspection (8); `@vida/core` **240 green**. **Next head = domain group `#5 Projects`, Phase 1** — open FRESH; **4 of 22 done; 18 remain.** DB-11 carry-forward += `Task`(+7 −`tags`)·`TaskTimeLog.updated_at`. **[superseded detail below]** **#1 Notes & Pages ✅ COMMITTED** (`f2198ac`, v12) · **#2 Preferences ✅ COMMITTED** (`0bc1508`+`0fec077`, v13) · **#3 Sessions & Scheduling (+Pomodoro) ✅ DONE** (2026-08-19, v14): 6 tables (`014_sessions_scheduling`) — `study_sessions`·`focus_sessions` (`schema/foundation/session-extensions.ts`) + `study_availability`·`availability_exceptions`·`study_plan_batches`·`session_templates` (`scheduling.ts`); **`focus_sessions` IS the `focus` timer runtime, `pomodoro_sessions` RETIRED** (docs settle it via the notes-and-pages reframe — 2 Victor drift-catches, **zero build-decisions**); extensions own `id` PK + `session_id UNIQUE` (BR-DB-1 preflight catch); 4 `[E]`; `STUDY_PLAN_BATCH_STATUS+='failed'`, `PRESET_BLOCK` reused, `ENTITY_TYPES+='session'`; §XXVI double-gate + preflight + post-impl all clean; Phase-5 DDL-introspection (24, all 4 dims); `@vida/core` **221 green**; spec `docs/specs/foundation/db-4-sessions-and-scheduling/`. **Next head = domain group `#4 Tasks`, Phase 1 intent intake** — open FRESH (one clean-context session per group, per flow doc `docs/roadmap/schema-foundation-build-flow.md §2`). Each group runs the 5-phase lifecycle. **3 of 22 done; 19 remain.** `MOD-notes #31` + all M1.1 stay GATED behind M1.0 (DB-4 must finish all 22 groups first). ⚠ carry-forward: X1 → group #2 PD-7 backfill; DB-11 → interface reconcile (`PomodoroSession`/`StudyPlanBatch`/`StudySession`).
<details><summary>(prior 2026-08-11) Computed head = UI-3 #29 — resolved: built E1–E8, merged, Done.</summary></details>
⚠ **SUB-WAVE RULE (learned 2026-08-09, added to the routing steps below):** the raw `#`-order walk is INSUFFICIENT
alone — it does NOT encode the `-c`/`-d` **sub-wave sequencing** (`m1.0-delivery-plan.md:129,140-141`): the **UX
wave `-d` needs the UI wave `-c`** ("UX-6 needs UI-4"). So although `UX-6 #26` is the lowest-`#` not-done issue by
per-issue edges (← UX-3 only), it is **NOT eligible** until UI-2→UI-3→UI-4 land. The eligible head is the next in
the ungated `-c` wave = **UI-2**. This is why `--next` said UI-2. *(A prior "Computed head = UX-6" note here was the
drift Victor caught — it applied the raw `#` walk without the sub-wave gate.)*
> ⚠ **UI-3/UI-4 ORDER — reconcile BEFORE that turn (not before UI-2):** a doc inconsistency exists — `part-3:116`
> lists UI-4 before UI-3 while roadmap:90 / delivery-plan:140 / `#` order all say UI-3 (#29) before UI-4 (#30);
> they're parallel-ready so `#` tie-breaks → UI-3 first. Triaged ISOLATED (head unaffected). Diagnosis +
> open-decision (is "shell before editor" Victor's intent?): `docs/specs/fixes/ui-3-ui-4-ordering-reconcile/`.
> ⚠ **PROFILE NOTE (learned UX-3):** the authoritative per-issue profile is the **delivery-plan** row
> (`m1.0-delivery-plan.md`), NOT the coarse "Generic" in reconstructed-structure's `#`-table. UX-1/2/3/4 =
> **add-frontend-component**; **UX-5/UX-6 = new-feature** (delivery-plan:212-213) — the profile is per-row, NOT a
> blanket UX-* label. Load THAT profile's standards at pickup. See [[load-delivery-plan-profile-not-coarse-order-table-label]].
*(Toolkit follow-up filed: generalize a declared global-order tie-break into `tracker_sync` so `--next` can be correct in any repo — see `~/dev-toolkit/.claude/tasks/`.)*
> NB: the tracker reads task-file `blocked by` edges, **not** Linear blocker relations (it syncs status/identity
> only) — so reconciling an edge never needs a Linear change.

---

## 🧭 Next session

**▶ CURRENT (2026-08-21) — 🎉 DB-4 COMPLETE. Groups `#20 Journals` · `#21 Gamification` · `#22 Notifications` DONE (P1–P5) → 21/21 active groups authored (migrations 012–032) → the M1.0 schema foundation is done. `db-4-per-domain-schema` (LIF-66) is ✅ DONE.**
**Next head:** DB-4 was the last M1.0 schema-foundation piece → resume **`m1-foundation-closeout`** (M1.0 close-out: delivery-structure reconcile + §XXIX currency + tracker/Linear Done + close-out record) → **M1.1 opens → MOD-notes #31** (modules build service+UI on the finished schema, Model B). Also pending in M1.0 later milestones: **DB-11** (interface reconcile) · **db-10** (seed, M1.4 ← all modules). Reload `docs/roadmap/schema-foundation-build-flow.md` · `.claude/tasks/m1-foundation-closeout.md` · `docs/infrastructure/database-layer/current-spec.md`.
This session (2026-08-21) authored the final 3 groups — all committed on `db-4-per-domain-schema` (`4aee56f` Journals · `97295c3` Gamification · `fb4eb28` Notifications):
- **#20 Journals** (`030_journals`, v30): **1 table** `journal_snapshots` (frozen daily record); the aggregation engine is a runtime provider registry (code), reviews/rollups design-pass. Reduced shape (no created_at/updated_at/deleted_at; `captured_at` is the timestamp).
- **#21 Gamification** (`031_gamification`, v31): **3 tables** `user_profile` (ADR-012 §3.10 split residual) · `achievements` (the FIRST non-syncable static-seed table) · `user_achievements`. The ADR-012 economy spine (currencies/consequence_ledger/store/rules) is already-authored DB-3, consumed; `xp_history` retired → `consequence_ledger`.
- **#22 Notifications** (`032_notifications`, v32): **1 table** `notifications` (pure sink); dispatcher/delivery/ZK-wake = service + ADR-013. §5.16 floor + N4 amendments (`metadata[E]` + 3-flag delivery-audit) + `effect_event_id` nullable + UNIQUE (ADR-012 Additive convergence — **gate-1 REVISE caught a real P1 miss**: `applied_effects` is device-local, so the row itself needs the UNIQUE key).
- `@vida/core` **787 green**; `LATEST_VERSION`=32; typecheck 0; eslint 0. §XXIX current-* promoted (BR-JR/GM/NF). DB-11 carry-forward += the 3 groups' interface reconciles. **Lesson: read the owning ADR's mechanism section, not just the module roster's column list.**
<details><summary>(prior 2026-08-20) — DB-4 group #19 Health: Training DONE. Was 18 of 21 · next #20.</summary></details>
Group #19: **5 tables** (`029_health_training`, v29; `schema/health-training.ts` + net-new `packages/types/src/training.ts`) — the exercise pillar, the five-layer spine (Catalog → Plan → Template → Instance → Log): `exercises`·`exercise_plans`·`workout_templates`·`workout_sessions`·`workout_sets`. Net-new (recovered domain, **no rerun** — health/training was row 21 = ALIGNED in the sweep, so the 5 aspects were the sole source). **A workout IS a Session:** `workout_sessions` = the `sessions` `workout` sub-type **1:1 extension** (ADR-004) — own id (baseColumns) + `session_id text notNull unique` (no-FK), **NO `deleted_at`** (base `sessions` owns lifecycle; the skill_actions/class_sessions/reading_sessions precedent; the floor's "id = session_id" reshaped to the live BR-DB-1 shape). **`deleted_at` on `exercises` + `exercise_plans`** (the floor marks TWO this time — L13/L18); workout_templates (bare "timestamps") + session-extension + workout_sets (child log) omit it. **5 FIXED CHECK** — 3 net-new (`MOVEMENT_PATTERN`/`WORKOUT_SET_CATEGORY`/`BURN_SOURCE`) + **2 reused from #17 `health.ts`** (`METRIC_SIDE` on workout_sets.side; `PHYSICAL_ROLE_AUTHORING_SOURCE` on exercise_plans.authoring_source — member-exact cross-group reuse); everything else OPEN (modality per conventions L16). `movement_pattern` FIXED-but-nullable (cardio/mobility have no strength pattern). **[E]-numeric asymmetry preserved exactly** (planned_reps/planned_weight/actual_reps [E]; planned_sets/sets_done/weight_used plaintext — floor L27-28) via typed-column + `@encrypted` (money[E] pattern). Performance → Core `health_metric_values` (no local KPI store, HT-5); goal_ids/role_id/knowledge_object_id no-FK. `ENTITY_TYPES += 4` (workout_template excluded — definition table). gate-1 SHIP · preflight (9 folds) · gate-2 SHIP · post-impl SHIP — all clean, 2 cosmetic NITs folded; `@vida/core` **757 green**; typecheck 11/11; eslint 0; Phase-5 introspection (22). §XXIX current-* promoted (BR-HT-1…6). Committed (see git). ⚠ **For #20 Journals:** read FULL 5-aspect `docs/features/journals/` + grep intake+reruns FIRST. Journals is the **integration layer** (the daily-dashboard connective tissue) — likely composes heavily (pages/entity_links/summary blocks). ⚠ colocation risk: memory [[db4-types-may-be-colocated-grep-name-before-net-new]] flags #20 Journals / #21 Gamification enums may already exist colocated (grep the exact NAME + READ the hit before declaring net-new). The roster IS the floor. Prior (superseded, historical below):
<details><summary>(prior 2026-08-20) — DB-4 group #18 Health: Nutrition DONE. Was 17 of 21 · next #19.</summary>
Group #18: **6 tables** (`028_health_nutrition`, v28; `schema/health-nutrition.ts` + net-new `packages/types/src/nutrition.ts`) — the fuel pillar. Net-new (recovered domain); composes the **Core spine #17** just authored (Nutrition Goals → Core `health_goals`, Experiments/Responses → Core Adaptation, cost → Finance, tags → Spaces). **`deleted_at` on `nutritional_plans` ONLY** (floor L22 — the #17 ruling applied cleanly: the `structure-data.md` roster IS the authoritative per-table floor). **OPEN-vocab-heavy — only 3 FIXED CHECK** (`meals.source`=`MEAL_SOURCE` [manual|ai|import, AI6 triad] + `daily_meal_plans.generation_method`=`MEAL_GENERATION_METHOD`, net-new; + reused `FREQUENCY` on `review_frequency`); everything else OPEN: caloric_strategy/dietary_framework/philosophy/meal_type = modality (conventions L17); `functional_area`/`whole_food_type` = editable STARTERS (C5/HN-12/HN-13, never hard-code as truth); all `status` = bare "status P" (terminal-states prose is ambiguous UI-state). **Inline `meals.tags` dropped → `entity_tags`** (SP1 forward-reframe, no R6). money[E] = `money()` cents + @encrypted; `photo_blob` = `blob(buffer)` [E]; no-FK. **C1–C8 guards held** (no measurement/economy/session/AI4 — a meal is a LOGGED entity via `dueIn()`, not a session; `cooking_skill_id` opt-in nullable; no import_staging). `ENTITY_TYPES += 6` (incl. `nutritional_plan`, not `nutrition_plan`). gate-1 SHIP · preflight (9 folds) · gate-2 SHIP · post-impl SHIP — all clean, 4 cosmetic NITs folded; `@vida/core` **730 green**; typecheck 11/11; eslint 0; Phase-5 introspection (25). §XXIX current-* promoted (BR-NT-1…6). Committed (see git). ⚠ **For #19 Health: Training:** read FULL 5-aspect `docs/features/health/training/` + grep intake+reruns FIRST — Training is the **inverse of Nutrition on C3**: a workout IS a Session (composes `sessions` `workout` sub-type + a `workout_sessions` extension, ADR-004), so it authors the Training pillar catalogs (exercises/plans) + the session extension. Note `health/training` was **row 21 = ALIGNED** in the sweep (may have no rerun; check). The roster IS the floor. Committed (see git).
</details>
<details><summary>(prior 2026-08-20) — DB-4 group #17 Health: Core DONE. Was 16 of 21 · next #18.</summary>
Group #17: **12 tables** (`027_health_core`, v27; `schema/health-core.ts` + net-new `packages/types/src/health.ts`) — the shared Health spine (Metrics+Monitoring·Goals·Adaptation·Physical Roles·Safety&Medical). Recovered domain, **no v2 schema** → all net-new, but the `structure-data.md` roster IS the documented per-table floor. **`deleted_at` on `health_goals` ONLY** (the floor L45) — ⚠ **Victor drift-catch:** a gate-1 critic ruled "no floor exists → apply blanket baseline (deleted_at on all 8 entities)"; I applied the REVISE; Victor: *"The documentation already has all the floors that you are stating that it lacks."* The premise was FALSE — the `structure-data` roster (from the AUTHORITATIVE 18-DB Notion design) IS the per-table floor; "no v2 *code*" ≠ "no *documented* floor." Reverted to goals-only. **Lesson: doc-check a critique's RULING (its premise), not just its escalations** ([[verify-a-critiques-escalation-and-defer-target-before-relaying]] extended). Goal `type` DECOMPOSED→`measurement_kind`×`binding_mode` (ADR-011 M1/M2, REUSE tuples); `progress`/`mastery`=nullable REAL M3 slots (no default); `binding_mode` nullable (tasks gate-2 precedent); 18 FIXED CHECK (14 net-new `health.ts` + 4 reused MEASUREMENT_KIND/BINDING_MODE/STATUS/FREQUENCY) + OPEN vocabs no-CHECK (modality/experiment-type/exam-kind/severity/etc.); no-FK; `photo_blob`=`blob(buffer)`[E] (note_attachments precedent, gate-2 fix); `source`+`ai` (AI6). **C1/C2/C3 guards** held (physical_roles.type=OPEN modality; health_metrics.kind=FIXED taxonomy; no economy). X*/AI*/M4/M5=cite-not-author (only provenance cols). `ENTITY_TYPES += 11` (OPEN SP2; pillar types are #18/#19's). gate-1 REVISE→resolved (deleted_at) · preflight PASSED (10 folds) · gate-2 SHIP (3 folds: photo_blob→blob · idx precedent · F10 NOT-NULL/default) · post-impl SHIP; `@vida/core` **702 green**; typecheck 11/11; eslint 0; Phase-5 introspection (49). §XXIX current-* promoted (BR-HC-1…8). NOT committed (branch `db-4-per-domain-schema`). ⚠ **For #18 Health: Nutrition:** read FULL 5-aspect `docs/features/health/nutrition/` + grep intake+reruns FIRST (`part-1.2-reruns/health-nutrition.md` = the separate Tier-2 gap unit, its own X*/AI6 pass); the Health CORE tables it composes are now authored. The structure-data roster IS the floor; a critique's premise needs doc-checking too. Committed (see git).
</details>
<details><summary>(prior 2026-08-20) — DB-4 group #16 Check-ins DONE. Was 15 of 21 · next #17.</summary>
Group #16: **3 tables** (`026_check_ins`, v26) — the lightest group (structured daily-reflection + template form-builder), lone non-ingest. `daily_check_ins`·`check_in_templates` (baseColumns) + `check_in_template_questions` (**id+syncColumns, NO created_at/updated_at** — §5.13 floor + SyncMetadata interface). **No `deleted_at` on ANY** (documented FACT: §5.13 DDL + P/E table omit it on all 3 while every neighbor lists it; CK-10 hard-delete). Build-phase fixes (intake WHOLE): **CK-2** composite `UNIQUE(check_in_date, check_in_type)` (bug fix, old single-col gone); **CK-3** `check_in_type` 3→6 (`+afternoon/monthly_review/yearly_review` — amended the EXISTING `CHECK_IN_TYPE` tuple, the sole types-layer edit). No-FK; 4 FIXED CHECK (all the module's OWN existing tuples); `mood`/`energy` numeric BETWEEN; `ENTITY_TYPES += daily_check_in` (no tags, SP1). OUT: E9 streak DERIVED (no col; user_profile removal → Gamification #21), E2 economy (Gamification), G7 review (integration), no M\* (C-M). ⚠ **gate-1 REVISE** caught a real miss — the check-in enums/interfaces/validators already existed in `@vida/types/entities/user.ts`+`validators/user.ts` (I'd dismissed the grep hit) → reconcile-and-extend, NOT net-new (new file would double-export). ⚠ **Victor: "ground everything on the documentation, no deviations"** → my flagged `deleted_at` call was doc-fixed (a FACT), not an open decision. preflight PASSED·gate-2 SHIP·post-impl SHIP; `@vida/core` **635 green**; typecheck 11/11; eslint 0; Phase-5 introspection (12). §XXIX current-* promoted (BR-CK-1…7). NOT committed (branch `db-4-per-domain-schema`). Prior (superseded, historical below):
</details>
<details><summary>(prior 2026-08-20) — DB-4 group #14 Relationships DONE. Was 14 of 21 · next #16.</summary>
Group #14: **8 tables** (`025_relationships`, v25) the personal CRM (PII-heaviest) — 6 §5.9 reshaped (authored fresh) + 2 net-new networks (G2/RL-4). Full 5-phase run, triple-gate clean (gate-1 SHIP · preflight PASSED · gate-2 SHIP · post-impl SHIP), all via independent critics. **Preflight caught fold F1** — §5.9 composite-PK junctions reshape to the live **entity_tags-v2 junction shape** (synthetic `id` PK + baseColumns + `UNIQUE(pair)` + reverse index; `project_habits`:29-30, NOT §5.9's composite PK). Build-phase INTENDED authored (intake §Resolution WHOLE): tags→entity_tags (G10) · `how_we_met`/`closeness_tier` (G4, OPEN — Preferences-defined) · `energy_*`/`key_takeaways` (G8) · reminder snooze/priority (G8) · `reminder_groups` event-anchor (G11, net-new `REMINDER_GROUP_ANCHOR`). `deleted_at` on `contacts` ONLY (§5.9 floor + habit_completions/routine_completions ledger precedent; `interactions`=the ledger). No-FK; **no M\*** (C1 — health derived, contacts excluded reference data); social_links kept (C4); no E2 (C2); N1/N2/X1/X8 cite-not-author (no delivery cols, no import_staging). `ENTITY_TYPES += contact/network`. Zero build-decisions. `@vida/core` **619 green** (1 pre-existing vault-1MB perf flake, passes standalone); typecheck 11/11; eslint 0; Phase-5 introspection (32). §XXIX current-* promoted (BR-RL-1…8). NOT committed (branch `ui-1-vida-ui-primitives`, per prior DB-4 groups). ⚠ **For #16 Check-ins:** read FULL 5-aspect `docs/features/check-ins/` + ADR-002 §5.16 + grep intake+reruns FIRST (`part-1.2-reruns/check-ins.md` if present); the Phase-1 No-Decisions Gate is the recurring trap. **NB roster note:** #15 Finance was built out-of-order at v20 (done); the P0-table ☐ marks on #5–8/#15 are stale — migrations 016–020 exist. The real next-undone by migration is #16.
</details>
<details><summary>(prior 2026-08-20) — DB-4 group #12 Learning/Education (+ICS) DONE. Was 13 of 22 · next #13.</summary>
Group #12: **15 tables** (`024_learning_education`, v24) THE Learning hub — the HEAVIEST group. 3 FACT-floor reshaped (`subjects`[=courses]·`ics_feed_configs`·`ics_synced_events`) + 12 net-new INTENDED (`institutions`·`self_taught`·`programs`·`curricula`·`terms`·`class_sessions` [Sessions `class` sub-type]·`subject_schedules`·`grading_systems`·`grading_components`·`assessments`·`subject_documents`·`education_measurements`). §5.10/§5.18 STALE; net-new domain. 2 R6 reframes (tags→entity_tags SP1; progress→nullable M3). `class_sessions`=`class` session extension (no deleted_at); `subject_schedules` UNIQUE(subject_id); `education_measurements` axes M1×M2, `measurement_kind` **notNull no-default** (dedicated entity, deliberate divergence from deliverables); `subject_documents`=PJ-8 vault (no deleted_at). No-FK; **deleted_at on 11 of 15** (ics ×2 + class_sessions + subject_documents omit). **15 FIXED CHECK** = 11 net-new tuples + 4 reused; `ENTITY_TYPES += 7` (class_session excluded). OUT: homework=Tasks-owned (C-HW), AI extraction pipeline (source=ai col authored), grade/GPA compute=service, E2/AI4/M5 guards. **Zero build-decisions** (⚠ Victor drift-catch at P1: I framed the grading `(design pass)` label as author-vs-defer + put it to Victor; intake §Resolution was WHOLE → author now, [[build-phase-flags-mean-resolve-now-not-defer]]). Double-gate+preflight+post-impl all SHIP; `@vida/core` **578 green**; Phase-5 introspection (60). ~~**⚠ For #13 Languages:** intent source = ADR-002 §5.10…~~ **[SUPERSEDED — #13 Languages dissolved → Spaces, see CURRENT above.]** DB-11 carry-forward += Learning interfaces (Course→Subject rename, default_course_id→default_subject_id).
</details>
**▶ (prior 2026-08-20) — DB-4 group #11 Books DONE (P1–P5). Next was #12. 12 of 22 done; 10 remain.**
Group #11: **10 tables** (`023_books`, v23) the reading Universe — 2nd-largest reframe. `books`/`book_chapters` reshaped + 8 net-new (`book_assets`, 3 annotations, `reading_sessions` [S1 session extension], `reading_plans`, 2 junctions). book=WORK/copies=assets (BK-2); progress DERIVED (BR-BK-2); no-FK + ONE doc-fixed UNIQUE; **`deleted_at` on 8 of 10** (book_chapters + reading_sessions omit — F1); **no measurement axes on reading_plans** (C-M1, Purpose-owned, the Skills pattern); 4 FIXED CHECK=4 tuples; `ENTITY_TYPES += book/book_chapter/book_bookmark/book_quote`. OUT: cross-format mapping (BK-4 design pass), conflict (BK-8 Preferences+derived), X*/AI* service, Education pacing. Zero build-decisions. **⚠ Victor directive: "read the documentation properly"** — the full 5-aspect + rerun read corrected reading_plans measurement (C-M1) that a partial read had wrong. **⚠ Cross-group fix (deleted_at audit):** `skill_actions` (Skills) wrongly had `deleted_at`; session extensions must not (base `sessions` owns lifecycle) → REMOVED; audit found it the sole instance across all authored groups. `@vida/core` **503 green**; full double-gate+preflight+post-impl SHIP. ⚠ For #12 Learning/Education (+ICS): grep intake+reruns FIRST — the rerun `part-1.2-reruns/learning-education.md` = the **HEAVIEST unit** (MIXED: 2 R6 reframes [`courses.tags`→entity_tags, `courses.progress`→nullable] + M1/M2 decomposition [ED-10 enum→Projects axes] + X*/AI* [ICS X1/X2/X8, document extraction X11]). Read FULL 5-aspect `docs/features/learning/education/` + ADR-002 §5.10 (`courses`, `ics_feed_configs`, `ics_synced_events`). DB-11 carry-forward += new Book*/Reading* interfaces + retire stale BOOK_FORMAT. Prior (stale, historical detail below):
**▶ (prior 2026-08-20) — DB-4 group #10 Knowledge (+flashcards) DONE (P1–P5). 11 of 22 done; 11 remain.**
Group #10: **7 tables** (`022_knowledge`, v22) the "Knowledge Universe" — `knowledge_objects`·`object_kinds`·`knowledge_containers`·`references`·`compound_sets`·`knowledge_lab_entries`·`flashcards`. The largest/most-reframed group: §5.10 DDL STALE (5 v2 tables superseded); mastery DERIVED (BR-KN-2); SM-2 cols RETIRED→DB-3 review engine (`review_curves`/`method_bindings`/`review_events`, CONSUMED); `knowledge_objects`=study_topics survivors − Education-plan/Books cols (KN-2); `flashcards` content-only; `references.url`=[E] (gate-1 ZK catch); 4 FIXED CHECK=4 tuples; `ENTITY_TYPES += knowledge_object/knowledge_container/reference/flashcard`; `references`=quoted SQL keyword; compound_sets/lab_entries=base tables only. Zero build-decisions; full double-gate+preflight(8 folds)+post-impl all SHIP; `@vida/core` green. ⚠ For #11 Books: grep intake+reruns FIRST (the rerun `part-1.2-reruns/books.md` = MIXED case: 2 live-FACT R6 reframes [`books.tags`→entity_tags, `books.progress`→nullable] + an **S1 reframe** [`reading_sessions` = a `sessions` `reading` sub-type 1:1 extension, like `skill_actions`/group #3] + X*/AI* layering). Read FULL 5-aspect `docs/features/books/` + ADR-002 §5.10 Books DDL. DB-11 carry-forward += new Knowledge/Flashcard interfaces (retire stale learning.ts study_topic/flashcard). Prior (stale, historical detail below):
**▶ (prior 2026-08-20) — DB-4 group Skills DONE (P1–P5). NOW FOLLOWING P0 TABLE ORDER (Victor directive). 10 of 22 done; 12 remain.**
Skills: **7 tables** (`021_skills`, v21) — `skills`·`skill_levels`·`skill_activities`·`skill_actions` (Sessions `practice` sub-type extension)·`skill_dev_logs`·`skill_dependencies`·`skill_definitions`. §5.9 DDL STALE→superseded by the `structure-data.md` roster; mastery DERIVED (BR-SK-1, no §5.9 default); `skill_actions` 1:1 session extension (BR-SK-2); no-FK; no stored measurement_kind; 14 FIXED CHECK/11 tuples; **7 net-new enums** (`@vida/types/skill.ts`+Zod); `ENTITY_TYPES += 6` (**skill_action EXCLUDED** — session sub-type via base `session`; stale "skill already reserved" corrected). Zero build-decisions; full double-gate+preflight+post-impl all SHIP; `@vida/core` **426 green**. ⚠ For #10 Knowledge (+flashcards): grep intake+reruns FIRST, read the FULL 5-aspect `docs/features/knowledge/` (+`knowledge/flashcards/`) roster + ADR-002 § (flashcard_* retired → generic review engine per ADR-005 — the DB-3 `review_curves`/`method_bindings`/`review_events` substrate is ALREADY authored; Knowledge CONSUMES it). Phase-1 No-Decisions Gate is the recurring trap. DB-11 carry-forward += new `Skill`/`SkillLevel`/`SkillActivity`/`SkillAction`/`SkillDevLog`/`SkillDependency`/`SkillDefinition` (retire stale learning.ts `Skill`). Prior (stale, historical detail below):
**▶ (prior 2026-08-20) — DB-4 group #9 Finance (+Fiscal & Legal) DONE (P1–P5). 9 of 22 done; 13 remain.**
Group #9: **9 tables** (`020_finance`, v20) — 6 §5.8 finance (fresh, ex-monolith) + 3 net-new Fiscal & Legal; zero build-decisions; `@vida/core` **385 green**; full double-gate+preflight+post-impl clean; §XXIX current-* promoted. ⚠ For #10: grep intake+reruns FIRST, read the module's FULL 5-aspect `structure-data.md` (the roster) + ADR-002 §, then run the 5-phase lifecycle mirroring #9. **The Phase-1 No-Decisions Gate is the recurring trap** (3 Victor drift-catches this group — FK convention/nullability/enum-vocab all doc-fixed): if the docs fix it, it's a `[FACT]`, never a decision/advisory/fold. DB-11 carry-forward += Finance opening_balance/category_bidx/jurisdiction_code/G9 · new FiscalResidency/LegalEntity/FiscalObligation. Prior (stale, historical detail below):
Group #8 Purpose & Goals: **6 tables** (`purposes`·`targets`·`purpose_metrics`·`purpose_metric_values`·`target_reviews`·`dreams`, `019_purposes`, v19) — the CAPSTONE meaning-spine (§5.7 floor MINUS the 4 DB-3 substrate tables), zero build-decisions, full double-gate+preflight+post-impl clean, `@vida/core` **336 green**. ADR-011 amendments: progress/current_value/progress_percentage → nullable override slots; `targets.target_type`→`measurement_kind`+`binding_mode` (**pair on targets ONLY** — module-doc roster over the ADR broad list); restored fields (success_criteria/measurement_method/is_higher_better/baseline_value/source/context_notes); `purposes.value_id`→DB-3 values. `dreams` absorbs `bucket_list_items` (retired). All spine joints nullable no-FK (SR-003 relaxed). `METRIC_VALUE_SOURCE` net-new; `FREQUENCY` reused (gate-1 F2 caught a would-be REVIEW_FREQUENCY dup). `ENTITY_TYPES += purpose/target/dream/purpose_metric_value`. ⚠ For #9 Finance: read the FULL 5-aspect `docs/features/finance/` (+`finance/fiscal-legal/`) + ADR-002 §5.8 + §5.20 (Fiscal & Legal net-new: `fiscal_residencies`/`legal_entities`/`fiscal_obligations` + jurisdiction tag; `category_bidx` blind-index F7; `store` is DB-3 substrate — already authored). Grep intake+reruns FIRST (the [[check-intake-and-reruns-before-triaging-a-design-pass-undone]] lesson). DB-11 carry-forward: `Purpose` +value_id/progress→null · new `Target`/`PurposeMetric`/`PurposeMetricValue`/`TargetReview`/`Dream` · retire `TARGET_TYPE` · `BucketListItem`→`Dream`. Prior (stale, historical detail below):
This session ran the full 5-phase lifecycle for **group #2 Preferences** (branch `db-4-per-domain-schema`, NOT committed):
- **Authored 3 tables, ALL plaintext** — `schema/preferences.ts` + `migrations/013_preferences.ts` (`user_preferences`·
  `nav_preferences`·`command_bar_history`). Spec `docs/specs/foundation/db-4-preferences/`. 5 FIXED CHECK enums (theme/
  time_format/dock_position/dock_size/persona, +5 parity rows); `default_task_priority`/`font_size`/`notification_frequency` OPEN no-CHECK.
- **First group to AUTHOR build-phase intent, not defer it:** G4 6 cols · PB-2 `module_visibility` · **E9 `user_profile`
  split** (`persona`/`motivation_style`/`active_modules`/`onboarding_completed` → Preferences single-writer owner, ADR-012
  §3.10). ADR-002 §5.17 amended + §5.20 E9 ledger fulfilled.
- **Full §XXVI double-gate** (gate-1 REVISE `json<T>()`→`text()`→fixed · preflight PASSED §XXIX-path-fix · gate-2 SHIP) +
  post-impl critique **REVISE→SHIP** (`time_format` NOT NULL type-lie — a §5.17 gap a CHECK-only parity test is blind to).
  `@vida/core` **198 green** · typecheck 11/11 · lint 0-err · runner v13.
- ⚠ **Drift Victor caught + corrected:** I first recommended a strict-mirror + DEFER of G4/E9/visibility. Victor: "both
  are important since we are in the build phase … read/interpret docs based on what we're doing." The `⚠ INTENDED`/
  `[DEFERRED — build phase]` flags point TO this build phase → author now. Memory: [[build-phase-flags-mean-resolve-now-not-defer]].
- ⚠ **E9 CROSS-GROUP CONSTRAINT (record for group ~#19 Gamification):** `user_profile` MUST omit `persona`/
  `motivation_style`/`active_modules`/`onboarding_completed` + `check_in_streak*` (→ Check-ins); keeps PII + `focus_areas[E]`
  + `life_stage` + `skipped_modules` + `timezone` + derived counters. No field with two writers.

**▶ NEXT ACTION (fresh session):** domain group **`#3 Sessions & Scheduling (+Pomodoro)`** — **Phase 1 intent intake**
(`docs/features/sessions-and-scheduling/` + `pomodoro/`) → P2 → P3 double-gate → P4 → P5. One clean-context session per group.
⚠ Reload for group #3: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" (22-group table) · flow doc §2
(`docs/roadmap/schema-foundation-build-flow.md`) · **groups #1/#2 as the pattern** (`schema/{notes,preferences}.ts` +
`migrations/012_notes.ts`/`013_preferences.ts`) · memories [[build-phase-flags-mean-resolve-now-not-defer]] ·
[[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[open-vocab-columns-take-no-sql-check]].
⚠ Note: group #3 authors the session sub-type 1:1 extensions DEFERRED from DB-3 (`focus_sessions` incl. pomodoro re-home, BR-DB3-3).
⚠ Model B still holds: DB-4 authors ALL 22 groups (M1.0) before M1.1 modules open.

<details><summary>(prior 2026-08-18) — DB-3 MERGED · DB-4 P0 slice (22 groups). Next was #1 Notes & Pages.</summary>

This session: (1) merged DB-3 PR #31 → `main` (`97a0e0c`). (2) Switched profile → add-backend-component; picked up DB-4.
(3) Ran P0 · Slice: **22 domain groups** (Health split ×3 · Languages own-group ADR-002 §5.10 · Pomodoro→Sessions ·
ICS→Learning · Bucket List→Purpose `dreams`). Tracking = lightweight build-steps, no Linear sub-issues. Ordering =
plain-TEXT no-FK → no hard build-order; Notes-first is a Phase-5 convention. Full table in the task file "## P0 Output".
</details>

<details><summary>(superseded 2026-08-18) prior CURRENT — the premature "M1.0 complete → MOD-notes" handoff</summary>

**▶ (superseded) CURRENT (2026-08-17) — UX-6 COMPLETE → M1.0 BUILD WAVES COMPLETE. LIF-95 → Done. Next head = MOD-notes (#31, M1.1).**
UX-6 Home = Journal daily dashboard (LIF-95) is DONE — the **design model** (new-feature; no rendered component, no
Visual Gate; shape docs-fixed like UX-3/4/5, resolved via derived-graph.md:31 + delivery-plan:270 + ui-4/_index.md:29,
NOT a fork). Shipped `apps/web/src/home/{section-model,journal-contribution,section-state,selection}.ts` + 4 tests +
`CLAUDE.md` + `docs/core/architecture/home-journal-dashboard.md` (+README row). Three sections (summary/agenda/entry,
all in the shell `content` region) · **journal-contribution registry seam** (names no module; `JournalSeamNotActivated`
per AR-9) · **per-section degrade composition** (`resolveDashboardStates`/`journalStillRenders`, reuses the `@vida/core`
`TerminalState` canon by TYPE — does NOT call `deriveTerminalState`, no live query in a data-less model) · pure
`resolveSelection` (override-wins, no module dropped). Full §XXVI double-gate: **Gate-1** REVISE → 7 fixed (blocker: I
invented a 5th terminal state; canon is 4) → Approval 1 · **preflight** PASSED · **Gate-2** REVISE → 3 fixed (blocker:
`section-state.ts` can't call `deriveTerminalState` — no live query in a design model) → Approval 2 · **post-impl
critique SHIP**. Strict-TS caught the `resolveSelection` `Partial`-merge type-hole. typecheck 0 · @vida/web **180 tests**
(+15) · lint 0-err. Also refreshed **18 stale delivery glyphs** (UX-2…UI-4 merged but marked ◻/⏳).
**HANDOFF — M1.0 BUILD WAVES COMPLETE** (`-a/-b/-c/-d` all landed; buildable #1–#30 done, #9/#10 = DB-3/DB-4 streams →
census M1.0 92% is those non-standalone stream rows, not un-built work). **M1.1 (Hub & Foundation Modules) opens →
next head = `MOD-notes` `#31`** (Notes & Pages, the in-degree-14 HUB, ← DB-6 ✅ · DB-9 ✅ · AR-6 ✅; `--next` confirms,
dependent-count 17). Notes & Pages before everything (roadmap §Sequencing ②). Also un-parked (NOT the
head): `db-10` (M1.4) · `tsconfig-strict-index-access` (repo-wide §XV) · `perf-framework-chunk-split` (§6 init budget).
⚠ **Shape lesson (memory saved):** UX-6 = design model, docs-fixed — I twice manufactured a "UI-4 shipped without Home →
must render → ask" fork; the docs already settle it (UI-4 scoped Home content OUT by design). Reuse a canon by TYPE, not
by runtime — the design model borrows the vocabulary, the engine (MOD-journals #33) borrows the derivation.
⚠ CI red repo-wide = the known pnpm action-setup infra conflict (local green); no branch protection.
</details>

<details><summary>(prior) 2026-08-12 — UI-3 / E1 + E2 + E3 DONE & MERGED (per-unit PRs). Clean handoff to E4.</summary>

**▶ (prior) 2026-08-12 — UI-3 / E1 + E2 + E3 DONE & MERGED (per-unit PRs). Clean handoff to E4.**
`@vida/editor` **v0.3.0** on `main` — the per-unit PR chain (Victor's directive: each E its own branch+PR): **#15 (E1)
`290470f` · #16 (E2) `d903cb0` · #17 (E3 toolbar) `438a1ec`**, all merged; **#14 closed** (old combined E1+E2 PR,
superseded). main is clean linear `eb13b32 → E1 → E2 → E3`. **E3** = the formatting toolbar: `toolbar.tsx`
(`EditorToolbar` + `ToolbarButton`, APG `role=toolbar` + roving tabindex composing UI-1 Button/Menu) +
`internal/toolbar-state.ts` (`useToolbarState`→`useEditorState` reflects marks/can/activeBlock — resolves E1 §8's
`shouldRerenderOnTransaction:false`); additive `toolbar?:boolean` (default true), null-gated mount inside the frame.
Callout insert via `insertContent(calloutInsertContent())` + node `isolating` (**DEV-1/2**: the `setCallout` chain
augmentation didn't propagate in this pnpm monorepo). Active-bg = a Tamagui `active` VARIANT (not injected CSS);
**DEF-E3-a** filed (Button has no toggle state). Full §XXVI gate (gate-1 REVISE 2 blockers · preflight +4 folds ·
gate-2 REVISE 3 material) + **post-impl critique REVISE** (MAT-A/B: roving `rovingId` never reconciled to
`effectiveRoving` → tab-stop teleport → reconcile effect) + **Visual Gate PASS**. typecheck 11/11 · editor **60/60** ·
build + build-storybook ✓ · boundary clean · no hex.
**HANDOFF — next = `E4` (slash menu)**: the `/`-triggered block-insertion menu — composes UI-1 Menu/Popover +
type-ahead; lists `INTEGRATION_BLOCK_COMMANDS` (E1's enum→command map) that resolve to E5's placeholder node-views
(soft forward-dep on E5's TYPE MAP, already in E1). Re-enter the §XXVI gate; spec `…/ui-3-vida-editor/e4-slash-menu.md`;
branch `ui-3-e4-slash-menu` off main → own PR. Sequence remaining: E4 → E5 registry+placeholders → E6 markdown →
E7 PDF → E8 DOCX. After E1→E8: UI-4 (#30, ← UX-5 renders+wires it); UX-6 stays gated behind `-c`. Also un-park:
db-10 (M1.4), tsconfig-strict-index-access (repo-wide §XV hygiene). ⚠ App note (UI-4): lazy-load the graph route
(heavy WebGL deps).
⚠ **CI (filed, not done here):** all checks are red from a pnpm `action-setup@v4` version conflict (`ci.yml` `version:9`
+ `packageManager: pnpm@9.15.9`) — a Planned hygiene task (own gate). Other reds owned ahead: `@vida/server#test`→P2-1,
Format Check (673 files)→the Prettier Planned task. No branch protection → red CI doesn't block merges.
</details>

<details><summary>(prior) 2026-08-11 — UI-2 Platform views DONE + MERGED (PR #13).</summary>

The **7 UI-2 views** (list·gallery·timeline·calendar·pomodoro-widget·export-dialog·neural-graph) + the shared
`internal/data-view` spine shipped in **@vida/ui v0.2.0**. Built V1..V7, each §XXVI double-gate + component Visual
Gate; UF consolidated gate **SHIP**. **PR #13 MERGED** (`e3872fc`); LIF-87 → Done; task archived; green (317/317).
**3 Victor drift-catches** (memories [[capability-framework-resolves-enum-vs-renderer-gaps]] +
[[verify-a-critiques-escalation-and-defer-target-before-relaying]]).
</details>

<details><summary>(prior) 2026-08-09 — UX-5 First-run onboarding DONE + MERGED.</summary>

**▶ (prior) — UX-5 First-run onboarding DONE + MERGED. Clean handoff.**
First-run onboarding **design model** (new-feature/Default; **no rendered component, no Visual Gate** — screens
deferred to UI-4; shape fixed by authority ADR-019/new-feature + not-visual-gated-by-render-table + `impl UI-4`, same
as UX-3/UX-4 [[deliverable-shape-is-fixed-by-authority-plus-visualgate-plus-dep]]). Shipped:
`apps/web/src/onboarding/{steps,first-run}.ts` (+8 tests) + `CLAUDE.md` + `docs/core/architecture/onboarding.md`
(+README row). **The M1.0 boundary is the crux (docs-fixed):** auth OFF (ADR-017:22) → the vault-unlock half is
carved to **UX-5b/M3**; UX-5 designs the full flow with every crypto/auth element a **deferred seam** (AR-3/UX-5b/M3),
no step presumes a vault key. **Two-signal independence:** the branch keys ONLY on `app_state['first_run:completed']`,
NOT `exists()` (they disagree on first launch by design). Device-local marker deliberately distinct from the synced
`UserProfile.onboarding_completed`. §XXVI double-gate (gate-1 REVISE 2-blockers→fixed · preflight PASSED +2 folds ·
gate-2 SHIP +2 material integrity fixes: key-collision→namespaced, citation) — both critiques independent. **PR #12
MERGED to `main`** (`f14d01c`, --merge); **LIF-94 → Done** (`--sync`); task archived. Merged main re-verified green
(**typecheck 10/10 · @vida/web 87/87 · lint 0-err**).
**HANDOFF — next head by the `#`-order rule = `UX-6` Home = Journal daily dashboard (`#26`, ← UX-3 ✅, profile
new-feature)** — lowest-`#` ready. `--next` says UI-2 (#28) by dependent-count → overridden by the `#` order. Also
ready: UI-2 (#28) · UI-3 (#29) · UI-4 (#30). UX-5 unblocks UI-4 (renders+wires it); feeds UX-5b/M3.
</details>

<details><summary>(prior) 2026-08-09 — UX-4 State conventions DONE + MERGED (PR #11).</summary>

Engineering-gated state-conventions LOGIC (convention doc + pure logic artifact; no rendered component, no Visual
Gate). Shipped `apps/web/src/state-conventions/{terminal-state,keyboard}.ts` (+13 tests) + `CLAUDE.md` +
`docs/core/architecture/state-conventions.md`. **PR #11 MERGED** (`26fd4ba`); **LIF-93 → Done**; archived. Green
(typecheck 10/10 · @vida/web 79/79 · lint 0-err).
</details>

<details><summary>(prior) 2026-08-09 — U10 Toast (10/10) build detail.</summary>

**▶ (prior) — UI-1: ALL 10 PRIMITIVES shipped (…Toast), Visual-Gate PASS (10/10).**
U10 Toast (3rd/last overlay + the **ONLY imperative primitive**) built to `toast.md`: `toast(options)→id` / `toast.dismiss(id)`
callable from OUTSIDE the React tree, bridged to a mounted `ToastProvider` via a module-level **external store** + React 19
**`useSyncExternalStore`** (the sonner/react-hot-toast reducer model, zero-dep — `@vida/ui` has no zustand). Provider portals
to `<body>` under `<Theme name="Toast">` + renders **TWO persistently-mounted live regions** (`role=status`/polite for
info·success · `role=alert`/assertive for danger — **both present when empty** so an inserted toast announces, §XIV).
**Focus NEVER moved on appear**; F6 → the globally-newest toast; **Esc item-local** (`onKeyDown`+`stopPropagation`, no leak
to an overlay behind). **Cap = STORE-enforced, per-region, evict-oldest** (NOT a render slice — a slice would drop the oldest
the same commit it starts exiting, killing its exit animation); provider renders every record, exiting ones cap-exempt.
`dismissToast` **idempotent** → `onDismiss` once across all paths. **Timer effect deps `[id,duration]` ONLY** — a store
`emit()` re-renders ALL items, so a `record`-dep would re-arm the timer on unrelated sibling emits and a busy screen's
toasts would never dismiss; pause-on-hover/focus is imperative via refs. Left accent = an abs-positioned 3px bar clipped by
`overflow:hidden`. §XXVI double-gate: **Gate 1** critique REVISE (2 blockers [queued-timer; Esc/F6 document-leak] + 7 material
+ 4 minor) → fixed → Approval 1; **/preflight PASSED + 6 folds** (single-provider dev-warn, action-no-dismiss, F6 target,
geometry, harness, atomic-announce); **Gate 2** critique REVISE — **confirmed all gate-1/preflight fixes landed** + caught
**2 NEW gaps the edits opened** (timer effect deps under store-emit re-render; `.slice(-limit)` vs exit-animation
contradiction) → resolved by moving the cap to the STORE (evict-oldest), which also dissolved the "queued" state → Approval 2.
**Visual Gate PASS measured in real Brave** (Victor, both themes): radius 12px (DEF-U8-h avoided), theme crosses the portal
(bg+text+accent shift), accents distinct per intent (info `rgb(99,102,241)`·success `rgb(16,185,129)`·danger `rgb(239,68,68)`),
zIndex 1400, regions status/polite+alert/assertive, enter `vida-toast-in` / reduced-motion none, **B12 clean** (opacity/transform
only), top/bottom placement, dismiss = real focusable button. typecheck 2/2 · @vida/ui **219/219** (+16) · build + build-storybook
✓ · root 10/10. DEFs U10-a…f flagged for DS. **NEXT = UF** — final consolidated gate sweep across all 10 (design → components →
motion → engineering) + version/changelog + §XXIX currency + **PR** (branch `ui-1-vida-ui-primitives`, NOT merged). Spec:
`docs/specs/components/ui-1-vida-ui-primitives/u10-toast.md`. Lessons: an external store re-renders ALL subscribers per emit →
a per-item timer/effect deps only on stable per-item keys, not the record; enforce a visible cap in the store (evict), not a
render slice ([[measure-browser-bugs-dont-hypothesize]] — the gate re-targeted the measurement panel→title to avoid a false
dark-mode-text bug).

</details>

<details><summary>(prior) 2026-08-09 — UI-1: U0–U9 shipped (…Popover), Visual-Gate PASS (9/10).</summary>

U9 Popover (2nd overlay) built to `popover.md`: a **NON-modal `role="dialog"`** anchored surface — the app behind stays
interactive (no scrim, no focus trap, no `inert` — the Dialog contrast). A genetic HYBRID: **Menu's floating machinery**
(trigger `cloneElement` `aria-haspopup="dialog"`, portal-to-body under `<Theme name="Popover">`, `position:fixed`
seed→refine→reveal, outside-pointerdown/capture-scroll/resize dismiss) + **Dialog's `getFocusable` focus-into** (focus
moves into the panel, NOT trapped). Trigger opens on **`onClick` only** (a dialog opener, not a menu → no arrow-open;
sidesteps the U7 Enter/Space double-fire). **Non-modal close model:** a React `onBlur` closes only when `relatedTarget`
is a real focusable OUTSIDE panel+trigger (Tab-away); ignores internal moves + `null` relatedTarget (survive
window-blur) + the trigger (Esc-return carve-out). Esc closes + returns focus. **8 placements via AXIS-SPLIT** (top/bottom
= vertical primary/single `top`; left/right = horizontal primary/single `left` — Menu's refine was vertical-only;
`offset` prop). **Arrow toward anchor** (rotated-45° square, `borderWidth:0` floor + 2 outer edges 1px inline, bg blends;
instant swap on flip — the Tabs precedent). §XXVI double-gate: **Gate 1** independent critique REVISE (**3 blockers**
[left/right positioning hand-waved → axis-split spec; focusout `relatedTarget` gating; Esc↔focusout race] + 4 material)
→ fixed → Approval 1; **Gate 2** /preflight PASSED (3 folds: onClick-only open, onBlur mechanism, jsdom-defers-geometry)
+ 2nd critique **SHIP** → Approval 2. **Visual Gate PASS measured in real Brave** (both themes; geometry unverifiable in
jsdom): role=dialog/no-aria-modal, z=1200, radius=12px, transition=`[opacity,transform]`@0.15s (B12), theme-crossing bg
(light `#fff`/dark `#0f172a`), focus-into=input, all 8 placements+flip, arrow direction per side, reduced-motion=none.
**The gate caught 2 arrow bugs typecheck+203-tests+2 critiques all missed:** missing `rotate(45deg)` (axis-aligned
square) + `border-style:solid` with no width → `border-width:medium`≈3px bleed on unset edges (→ `borderWidth:0` floor)
— [[measure-browser-bugs-dont-hypothesize]]. **§XXVIII deviation (mechanical):** spec said "no `tamagui.config.ts`
change" — wrong, the `light_/dark_Popover` sub-theme must be registered in `createTamagui` for the `ThemeName` type;
corrected in code + spec. **Drift Victor caught:** I ran an AskUserQuestion "implement the arrow or defer?" — the
contract (popover.md:27) already specifies the arrow → deliver-the-doc, don't escalate a fork
([[deliverable-is-the-doc-not-my-discretion]]). typecheck 2/2 · @vida/ui **203/203** (18 new) · build + build-storybook
✓ · root 10/10. DEFs U9-a…e flagged for DS. **NEXT = U10 Toast** (`toast.md`; last overlay — `zIndex.toast`), then **UF**
final consolidated gate + version/changelog + §XXIX + PR. Branch `ui-1-vida-ui-primitives` (NOT merged). Spec:
`docs/specs/components/ui-1-vida-ui-primitives/u9-popover.md`.

</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U7 (…Menu) shipped, Visual-Gate PASS (7/10).</summary>

**▶ (prior) — U7 Menu (4th/last molecular — 2nd FLOATING primitive)** built to `menu.md`: reuses U4 Select's portal + single-`top`
positioning + dismiss handlers, but the WAI-ARIA **menu-button** model — trigger `role=button`+`aria-haspopup=menu`+
`aria-expanded`; `role="menu"` panel portalled to body under `<Theme name="Menu">`; items `role="menuitem"` with
**ROVING DOM FOCUS** (only the active item `tabIndex=0`, real `.focus()`; NOT Select's `aria-activedescendant`), Esc
returns focus to the trigger. `trigger` is a consumer SLOT wired via **`cloneElement`** (aria + composed handlers +
merged ref — React 19 `props.ref`). 4 placements (start/end align + vertical flip), wrapping arrow nav, type-ahead.
Danger = an `intent` variant on the **label** `<Text>` (not the row); highlight = an `active`-state variant (NOT
`:focus-visible`, racy for programmatic focus); empty = a disabled "No actions" `menuitem`. §XXVI double-gate: **Gate 1**
independent critique REVISE (**1 blocker** [danger colour on the wrong element] + **4 material** [`:focus-visible`
highlight racy → active-state variant; click-open didn't seed activeIndex; empty-row aria-hidden axe risk; row-layout
omitted] + 3 minor) → all fixed (Rev 3) → Approval 1; preflight PASSED (1 fold: trigger Enter/Space `preventDefault` vs
native-button double-fire) + gate-2 SHIP → Approval 2. **Visual Gate PASS measured in real Brave** (flip/colour
unverifiable in jsdom): B12 `transition: opacity+transform 0.15s out` ONLY; danger `rgb(239,68,68)` distinct; roving
highlight on the active item; disabled skipped by ↑/↓; Esc→trigger; `bottom-end` right-aligns; `top-start` opens UP +
flips when clipped; empty row; both themes. **No pipeline touch** (`light_/dark_Menu` already generated by DS-5).
typecheck 2/2 · @vida/ui **160/160** (24 new) · build + build-storybook ✓ · root 10/10. **Impl bug jsdom caught:**
portal open commits TWICE (pos null first) → focus/refine layout effects must dep on `pos`/`entered`
([[portal-open-focus-needs-a-mount-gated-effect-dep]], carries to U8/U9). **NEXT = U8 Dialog** (`dialog.md`; first
overlay/organism — focus TRAP + scrim + `zIndex.overlay`/`modal`), then U9 Popover · U10 Toast · UF final gate + PR.
Branch `ui-1-vida-ui-primitives` (NOT merged).
</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U6 (…Tabs) shipped, Visual-Gate PASS (6/10).</summary>

**▶ (prior) — U6 Tabs (3rd molecular — the B12 showcase)** built to `tabs.md`: a `role="tablist"` of `render:'button'`
tabs (roving tabindex, AUTOMATIC activation, arrows WRAP + skip disabled, Home/End) + a selection **indicator** whose
**transform** animates (250/inOut) while its **width/height resize is an INSTANT inline swap** (B12 asymmetry). Panels =
compound **`<Tabs.Panel value>`** children (DEF-U6-a); only the active panel mounts. Gate 1 REVISE (2 blockers + 3
material + 4 minor) → fixed → Approval 1; preflight PASSED + gate-2 SHIP → Approval 2. **Visual Gate PASS in real Brave**:
indicator `translateX(0)→(118px)` + width 118→83, `transition: transform 0.25s inOut` ONLY (B12); both themes. @vida/ui
**136/136** (23 new).
</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U5 (…Card) shipped, Visual-Gate PASS (5/10).</summary>

**▶ (prior) CURRENT (2026-08-08) — UI-1: U0 + U1 Button + U2 Input + U3 Checkbox + U4 Select + U5 Card shipped, Visual-Gate PASS (5/10).**
U5 Card (2nd molecular — a STATIC container, no floating layer) built to `card.md`: a `<div>` (`role="group"` |
`role="button"` + hand-rolled Enter-keydown/Space-keyup when `interactive`; NEVER a native `<button>` — it can't
legally contain the focusable `actions`/`footer`). **Slot composition** (header `<header>` + actions top-right · body ·
footer `<footer>`) + **elevation = opacity of a raised-shadow overlay (B12)**; the resting shadow **self-cancels in
dark** (its colour = the dark surface) so the border carries dark elevation (design §V) — no theme detection. §XXVI
double-gate: independent critique **REVISE (2 blockers + 4 material)** all fixed → Approval 1; preflight PASSED
(currency-doc gap folded in) + gate-2 SHIP → Approval 2. **B1**: `var(--shadow-*)` never resolved (shadow was AUX/
CSS-only/unwired) → added typed **`shadow.ts`** (`vida/shadow` format, the `motion.ts` precedent, DEF-U5-e). **§XXVIII
deviation:** contract authors **no `loading` prop** → shipped verbatim, loading/empty are consumer-composed (DEF-U5-f).
typecheck 2/2 · @vida/ui **113/113** · build + build-storybook ✓ · root 10/10. **NEXT = U6 Tabs** (`tabs.md`; 3rd
molecular), then U7 Menu · U8–U10 overlays · UF final gate + PR. Branch `ui-1-vida-ui-primitives` (NOT merged).

</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U4 (…Select) shipped, Visual-Gate PASS (4/10).</summary>

**▶ (prior) CURRENT (2026-08-08) — UI-1: U0 + U1 Button + U2 Input + U3 Checkbox + U4 Select shipped, Visual-Gate PASS (4/10).**
U4 Select (first molecular + first floating primitive) built to `select.md` on `@tamagui/core` (hand-build-on-core vs
Tamagui-kit was a drift Victor corrected — [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]):
`<button role=combobox>` + listbox panel portalled to `document.body` (react-dom `createPortal`, `zIndex.dropdown`,
re-wrapped `<Theme name="Select">` so the sub-theme crosses the portal); WAI-ARIA 1.2 select-only (focus stays on
trigger via `aria-activedescendant`), full keyboard + type-ahead, flip-up + h-clamp, close-on-capture-scroll. §XXVI
double-gate (independent critique REVISE→12 findings fixed → Approval 1; preflight PASSED → Approval 2). **Visual Gate
caught 2 bugs** typecheck+92-tests missed: flip mixed top+bottom (Tamagui stale inline `top`) → single-`top`; text
clipped to a 1.5px line box — **createFont fed lineHeight RATIOS as px**, latent on ALL primitives, fixed ratio→px in
`tamagui.config.ts` (**DEF-U4-e**, [[tamagui-createfont-lineheight-ratio-is-px]]), Button/Checkbox re-verified.
typecheck 2/2 · @vida/ui **92/92** · build + build-storybook ✓ · root 10/10.
</details>

<details><summary>(prior) 2026-08-07 — UI-1: U0 + U1 (Button) + U2 (Input) + U3 (Checkbox) shipped, Visual-Gate PASS.</summary>

**▶ (prior) CURRENT (2026-08-07) — UI-1: U0 + U1 (Button) + U2 (Input) shipped, Visual-Gate PASS.**
UI-1 (`#27`, LIF-86, Design System) is under way, gated per component on branch `ui-1-vida-ui-primitives` (NOT merged):
**U0** stood up the component Visual-Gate harness (Storybook 9.1.20 + react-vite + addon-a11y); **U1 Button** built to
`button.md`; **U2 Input** built to `input.md` — frame + inner `render:'input'`, leading/trailing slots, all 8 states
(error/empty live), `forwardRef`→HTMLInputElement, `InputProps`; registered `light_/dark_Input` in `tamagui.config.ts`.
typecheck 2/2 · @vida/ui **51/51** · root 10/10 · build+build-storybook ✓ · **Visual Gate PASS**. **Lessons locked
for U3–U10:** (1) never Tamagui `group` on a content-hugging primitive ([[tamagui-group-breaks-content-width]]);
(2) the Visual Gate = *looking at the render*; (3) **the deliverable is what the DOCS specify — not my discretion**:
`:focus-visible` was mandated (input.md:37,55 + §VIII), a `:focus-within` shortcut was wrong; delivered the documented
selector via `.frame:has(input:focus-visible)`; (4) for uncertain Tamagui behavior, **measure in-browser + probe the
compiled CSS** (`placeholderTextColor` isn't consumed on a core `render:'input'` → injected `::placeholder` reading the
real `--placeholder` theme var). **NEXT = U3 Checkbox** (`checkbox.md`; `light_/dark_Checkbox` sub-theme: backgroundChecked
/border/borderError/checkmark/radius), then U4 Select…U10 Toast · UF final gate + PR.
Still-open (DS-2 brand-pass, not UI-1's): dark-mode overlay direction; filled-`danger` AA gap.
</details>

<details><summary>(prior) 2026-08-05 — AR-9 + DS-5 shipped; UI-1 was next head.</summary>

**▶ (prior) CURRENT (2026-08-05) — AR-9 (#15, LIF-80) DONE + DS-5 (#20, LIF-85) DELIVERED. Next head = UI-1 (#27).**
Session shipped three units, all merged to `main` (`5a9e0f9`): **AR-9** (`#15`, LIF-80 → Done, PR #4) — no-flush sync
stub skeleton in `core/src/sync/*` (seams throw `SyncNotActivated`); **F003** (PR #5) — DS-1 emitter fix so
component sub-themes dark-resolve (`light.<k>`/`dark.<k>` per DS-1:113); **DS-5** (`#20`, LIF-85 → In Progress, PR #7)
— 10 primitive contracts + the full `component.json` component-token set (refs into DS-2 semantics). DS-5 authors
references + contracts, **no built components and no token Visual Gate** (that's UI-1's, per the render table).
Note: `#16–19` (DS-1..DS-4) done; `#14` AR-8 done. **NEXT HEAD = UI-1 `#27` (LIF-86)** — Vida UI primitives, ← DS-5,
Design System / Add-Frontend-Component: build the components against DS-5's contracts; carries the component **Visual
Gate** (Storybook, 8 states) + registering the 9 new `light_/dark_<Comp>` sub-themes in `tamagui.config.ts` (fenced
to UI-1 by DS-5). Contracts to implement: `docs/specs/components/ds-5-primitive-contracts/`.
</details>

<details><summary>(prior) 2026-08-04 — QA-1 shipped + delivery-routing reconciled.</summary>

**▶ (prior) 2026-08-04 — QA-1 shipped (PR #3 → main). Delivery-routing reconciled.**
This session: fixed the recurring `--next` vs `#`-order conflict. Root cause = the tracker tie-breaks by
dependent-count (permanent, structural) + a stale illegal `AR-8 ← db-8` edge (#14←#60, DF-3 violation) that hid
the true head. Reconciled: AR-8 edge fixed (search → DB-8 stream, not a whole-issue block), 5 stale doc glyphs
refreshed (QA-1/AR-7/DS-3/DS-4/UX-1 → ✅), the `## 🧭 Delivery Routing` rule above added, glyph-snapshot caveat
added to the doc.
</details>

<details><summary>(prior) 2026-08-03 — DS-4 (Tamagui config + dark mode) DONE.</summary>

**▶ (prior) CURRENT (2026-08-03) — DS-4 (Tamagui config + dark mode) DONE.**
`packages/ui/src/tamagui.config.ts` composes the generated DS-1→DS-3 outputs into `createTamagui` (createTokens +
2× createFont [role keys + `$true` default] + light/dark + createAnimations) + `provider.tsx` (UIProvider/
useVidaTheme) + ambient `tamagui.d.ts` augmentation. **Animation driver = `@tamagui/animations-css`** per ADR-001 §9
(CSS-on-web + no-extra-dep; consumes motion.ts duration+easing losslessly). **First unit to COMPOSE the tokens**
(crossed DS-1's ⊥ DS-4). @vida/ui **30/30 · typecheck 10/10** · imports at runtime with NO react-native-web.
**Frontend Visual Gate PASS** (composed light｜dark theme surface). §XXIX: token-pipeline deferrals resolved +
`packages/ui/src/CLAUDE.md` layer-doc. ⚠ **Mid-build RN-driver drift triaged (STRUCTURAL) + corrected**
(`@tamagui/animations-react-native` → CSS; diagnosis `docs/specs/fixes/ds-4-rn-driver-drift/`).
**NEXT HEAD = QA-1 (Playwright + OPFS E2E harness, LIF-103)** — chosen 2026-08-03 by **strict `#` global build
order** (`reconstructed-structure.md:21` DF-10): QA-1 is `#8`, the lowest-`#` not-done ready issue (← AR-2 ✅),
ahead of AR-8 (#14), AR-9 (#15), and DS-5 (#20). Profile: **Add Backend Component** (fixed, DF-8). The earlier
"DS-5 next head" note was `TASKS.md` prose (Design-System track-continuity), NOT the authoritative order — superseded.
DS-5 (#20, ← DS-4 ✅) remains ready and is the head whenever the DS track is advanced next. DS-4 is committed +
merged (PR #2 → `main` @ 7e54176) — the prior "NOT committed" note was stale.
</details>

<details><summary>(prior) 2026-08-03 — DS-3 (Motion foundation) DONE.</summary>

**▶ (2026-08-03) — DS-3 (Motion foundation) DONE.**
Motion primitives shipped: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing`
(out/in/inOut cubic-beziers + linear) added as a **third aux consumer** — `AUX` factored
`[...TYPOGRAPHY, 'shadow', ...MOTION]`, `vida/fonts` narrowed to typography (fonts↔motion leak closed by
construction), new `vida/motion` format → `motion.ts`, index re-export, B11/B12. Values trace to
`standards/motion.md §IX`. **@vida/ui 26/26 · root typecheck 10/10 · deterministic.** 2 critiques (plan
REVISE→5 fixed; post-impl SHIP) + live-smoke render fix + Victor's Visual-Gate fix (`instant` static, not a
1ms flicker-loop). **Frontend Visual Gate PASS** (2nd run; standard-derived, not a placeholder). §XXIX docs
promoted. Spec `docs/specs/components/ds-3-motion-foundation/` (implemented). LIF-83 → Done.
**NEXT HEAD = DS-4 (Tamagui config + dark mode)** — `reconstructed-structure` #19, ← DS-3, Design System
(consumes `fonts.ts`→createFont + `motion.ts`→createAnimations; owns the dark-mode mechanism + CSS-var/unit
reconciliation deferred through DS-1→DS-3). ✅ **Merged + pushed to `origin/main`** (`8f9cbe2`, --no-ff of branch
`ds-3-motion-foundation`); re-verified green on merged main (26/26 · typecheck 10/10); branch deleted.
</details>

<details><summary>(prior) 2026-08-03 — DS-2 (foundations) DONE + two frontend gates stood up.</summary>

**▶ (2026-08-03) — DS-2 (foundations) DONE + two frontend gates stood up.**
Built DS-2's real foundation token VALUES + 2 pipeline extensions (aux namespaces font*/shadow → CSS+`fonts.ts`,
skipped from createTokens [B9]; `semantic.dark.json` parallel dark overlay [B7]) + B8 4pt-grid + `source`→3-file
list. Indigo/slate/emerald **placeholder** palette (⚠ NOT Vida's brand — [[ds-2-palette-is-provisional-placeholder]]),
7-size type scale (Space Grotesk/Inter), radius/shadow. `@vida/ui` **20/20** · root typecheck **10/10** · Frontend
Visual Gate **PASS (provisional)**. LIF-82 → Done.

This session ALSO produced two durable foundation artifacts (before more build loops):
- **`docs/specs/foundation/frontend-source-of-truth.md`** — the source-of-truth planning layer (code-first interim;
  Figma-later via MCP scripter, NOT Tokens Studio; release-gated M4 P2-⑦) + mechanical guard `pnpm check:frontend-source-model`.
- **`docs/specs/foundation/frontend-visual-gate.md`** — the visual gate (preflight → critique → `pnpm preview:tokens`
  render → Victor's visual approval) for all visual frontend issues.

**NEXT HEAD = DS-3 (Motion foundation)**, per `reconstructed-structure.md` #18 (← DS-2). Stay in **Design System**
(DS-3→DS-4→DS-5→UI-1). DS-3 is a visual issue → runs the Frontend Visual Gate. ⚠ NOT committed — DS-2 + both gate artifacts are on the
working tree of **`main`**; per convention, branch first before committing/PR.
</details>

<details><summary>(prior) 2026-08-01 — delivery structure reconstructed + live</summary>

**DELIVERY STRUCTURE RECONSTRUCTED + LIVE; BACK TO THE BUILD LOOP.**
The reconstruction is DONE (Phase V): Linear is re-organized to ADR-016 (Initiative→Project M1–M4→Milestone→Issue),
91 issues, 0 deferred edges, db-10 fixed (← all 26 modules). Committed on branch `phase-v-delivery-reconstruction`
(ff35a6f) — merge to main + push when ready. Toolkit Phase-T @ ~/dev-toolkit (4b31176 + 02ab9ea).
- **The loop is LIVE:** `tracker_sync --next` → **`ux-1-information-architecture`** (M1/M1.0 root, 9 ready · 66 blocked).
  Trust `--next` — the frontier is real again.
- **FIRST STEP next session (2-min, before trusting `--census`):** retire/replace the stale `docs/roadmap/m1.0-delivery-plan.md`
  with `reconstructed-structure.md` as the census home-source (else `--census` shows old milestone names like "Substrates";
  `--next` is unaffected). Then resume the per-issue build gate on the computed head.
- Db-10 un-parks when its milestone (M1.4) is reached in build order. Manual Linear hygiene: DONE (Victor, 2026-08-01).

<details><summary>(prior) 2026-07-31 — reconstruction kickoff context</summary>

**DELIVERY STRUCTURE UNDER RECONSTRUCTION.** The db-10 triage escalated STRUCTURAL: the
whole **Project > Milestone > Issue** setup is malformed at its core (db-10 is a symptom — mis-homed to M1.0 with an
unencoded "needs the whole OS" dep; see the harvest DF register). We STOPPED building and switched to **Project
Foundation** (NEW scenario `delivery-structure-reconstruction`). **Step 1 (harvest draft) is DONE:**
`docs/specs/foundation/delivery-structure-reconstruction/intent-and-provenance-harvest.md` — the grounded,
fully-cited organization of PROJECT → MILESTONES M1–M4 → all deliverables (repo-home + ADR + docs + relationship
layer) + legacy/migration provenance + DF-1…DF-9.
- **NEXT:** /begin → resume the reconstruction. Victor confirms (1) milestone framing INT-1..4→M1..4, (2) module-row
  granularity → then RECONSTRUCT the real structure (granular issues, file-deliverables matching repo/architecture/
  docs, corrected relationships + outcomes, no orphans).
- **⚠ DO NOT trust `--next` / build any M1.0 head until the reconstruction lands** — the delivery-plan/tracker encode
  the malformed structure (that is what surfaced db-10 wrongly). The loop is sound; its input graph is not.
- db-10 PARKED (un-parks when re-homed). The 9 built units + 20 ADRs are immutable/preserved.
</details>
</details>

---

**▶ (prior) CURRENT (2026-07-30).** Done = ar-1/db-1/ar-2/db-6/db-9/ar-5/ar-6/db-7/**ar-4** (9 of 30). ar-4 committed on
branch `ar-4-state-routing-forms` @ 955a255 (NOT merged/pushed yet). Prior spine pushed to origin/main @ 60a0a60.

**▶ NEXT — RE-COMPUTE the head via `tracker_sync.py --next`** (do not hand-read). After ar-4, the parallel-ready
alts flagged were **db-10** (dogfood seed ← db-6/db-7/db-9 — now all ✅) and **qa-1** (Playwright+OPFS E2E ← ar-2).
AR-4 unblocks UI-3 (editor, ← ui-1+ar-4) and UI-4 (app shell) once their other blockers land. Profile per head.
⚠ First `/begin` next session: merge/push the `ar-4-state-routing-forms` branch, then run `--next`.

✅ **Item 1 DONE — the delivery-planning loop is built + merged** (in `~/dev-toolkit`, ADR-015): the `--next` re-plan
grew into the legacy-aware, hierarchical, file-traceable loop — `tracker_sync --census` / `--next` / `--plan <scope>`
+ begin/delivery-plan/§XXX wiring. 4 units, 6 independent critiques, 25 tests, live-verified (`--next`→db-7). The
loop now COMPUTES the frontier from this plan (dep-graph + `_clusters.md` milestones + statuses) with a per-node
progress + legacy digest — hand-deriving the frontier is retired. See the delivery-plan §4 Consumption Rule.
✅ **Branch cleanup DONE** (merged branches deleted incl. `fix-tracker-sync-dedup-guard`).

**✅ ar-4 DONE (2026-07-30, LIF-75).** Was the computed head off db-7; built as generic-coding (profile switched).
apps/web client runtime + the D5 main↔worker binding + ADR-020. Details in the Completed table + session-log.
Homes landed at `apps/web/src/{stores,routes.tsx,hooks,lib,db}` (architecture homes, NOT the §149 `{stores,router,forms}`
shorthand — §149 cell is a flagged hygiene follow-up).
> **AR-7 is NOT the head** — READY (blockers all ✅) but in the *later* `Substrates` sub-wave. Boot & DB spine
> drains first (ar-4 · db-10 · qa-1). Always trust `--next`, never hand-read a prose "next".

**🔎 DELIVERY-LOOP AUDIT (2026-07-29) — VERIFIED SOUND.** The loop (ADR-015) resolves correctly: `--verify` 47/47
live · map complete (47 issues, all 38 active nodes ⊆ map) · 0 duplicate active nodes · **0 dangling blockers**
(nothing falsely suppressed) · all frontier waits legitimate. The db-7-vs-AR-7 "disagreement" was sub-wave
ordering working as designed, not a bug. Robustness comes from `parse_tasks` globbing active-only + `is_done`
file-wins-then-map. Details: [[delivery-loop-verified-sound]].

**✅ AR-7 edge reconcile DONE (this session):** added the intra-tier `AR-7 ← AR-6` blocker (was missing from both
the task file and delivery-plan §5) + wrote `AR-5, AR-6, DB-6, DB-9` into §5 row 165 + §4 model. Confirmed `--next`
unchanged (graph-honesty, not a re-route). NB: `ar-5-sessions-framework` (LIF-76) is CANONICAL — not a stale slug.

**🧹 Hygiene follow-ups:**
- ✅ RESOLVED 2026-07-30 (Phase A re-org): Delivery-plan §5 AR-6 Home `{spaces,views,effects}` → `{spaces,views}`
  (`effects/` is AR-7's home).
- ✅ RESOLVED 2026-07-30 (Phase A re-org): purged the one true dedup residue `ar-6-spaces-and-tags` (a keyless /
  `# Linear:`-less duplicate of `ar-6-spaces` LIF-77). The other 3 files the earlier note lumped in —
  `ar-5-sessions-base`, `ar-6-spaces`, `db-9-enums-and-zod-validators` — are CANONICAL archived-done tasks, NOT
  residue; kept. (Now that the loop reads `archive/`, the "inert" assumption no longer holds — hence the correction.)

**⚠ Manual-Linear (Victor, Linear UI only):** **NEW → LIF-78 (AR-7) blocked-by LIF-76 (AR-5) + LIF-77 (AR-6)**
(the tracker writes identity, not blocker relations); archive the 5 empty ①–⑤ Project shells; db-2 (LIF-64) disposition.

Full detail in `.claude/session-log.md`. Historical AR-*-era notes below (kept for reference):

---

**AR-2 DONE + M1.0 -a spine dep-graph RECONCILED (commit ef481c1). Corrected ready-frontier below.**
- **AR-2 recap:** async DatabaseAdapter + web-adapter (wa-sqlite/OPFS + drizzle-orm/sqlite-proxy). 5/7 DoD (contract);
  browser open/persist carried by **LIF-103** (Playwright+OPFS harness). Details: 2026-07-27→28 session-log.
- **Dep-graph reconcile (this session):** the -a spine was inconsistent (plan table vs Linear vs ADRs). Fixed +
  ADR-critiqued + repaired Linear (db-6/ar-9 were batch-TRASHED — restored). See docs/specs/fixes/m1.0-a-spine-dep-reconcile/.
- **CORRECTED READY-FRONTIER** (done = ar-1/db-1/ar-2):
  - **DB-6 (LIF-68) — Repository** ← ar-2 ✅ (spurious db-4 edge REMOVED → now genuinely unblocked). Owns the
    co-transactional sync_queue write + authors the sync_queue fragment. **Strong next head.** Profile: Add Backend Component.
  - **DB-9 (LIF-71) — enums+Zod** ← db-1 ✅ · **DB-7 (LIF-69) — migrations runner** ← ar-2 ✅ (authors app_state). Both ready, parallel.
  - **AR-4 (LIF-75) — state/routing/forms** ← ar-1 ✅ · **UX-1 (LIF-90) — IA** (no blockers). Parallel tracks.
  - Substrates **AR-5/AR-6 ← DB-6, DB-9** (NOT ready until those land) → AR-7 ← AR-5,DB-6,DB-9. **DS-1** built-but-parked (-b wave, unparkable).
- ✅ **FULL-M1.0 GRAPH NOW VALIDATED (2026-07-28, LIF-105, commit 5e36376).** The b/c/d tracks + db-3/4/8/10 + ar-4/8
  + qa-1 were per-edge reconciled across all 3 sources; independent ADR-critique clean; `--verify` 47 live. The
  ready-head→gated-build→next loop is now SAFE to run end-to-end. Key corrections: **db-8 ← db-7** (not db-6 — was an
  illegal M1.0←M3 edge; db-8 now rides db-7); ux-5 ← ux-1 (ar-3/M3 removed); db-10 ← +db-9; ds-4 ← +ds-3; ar-8 ← ar-6.
  Streaming loop settled: db-3/db-4 fold into consumer gates. Rule: graph edges = build-order blockers, not feeds (§5.1.1).
- ✅ **DB-6 DONE (2026-07-28, commit 7f90c9b, LIF-68)** — repository + sync_queue producer landed; unblocks the
  substrate tier (ar-5/6/7) + db-10 seed. See Completed table.
- ✅ **DB-9 DONE (2026-07-28, commit a137a44, LIF-106)** — 81 canonical enum tuples (C2 tuple-as-source) + 81 z.enum
  validators + SQL-CHECK↔tuple parity test; zod added (first in repo). Double-gated + 2 independent critiques; root
  typecheck 10/10 zero consumer edits, 89 tests green. **Substrates AR-5/6/7 now FULLY unblocked** (← db-6 ✅ + db-9 ✅).
- ▶ **READY HEADS NOW** (done = ar-1/db-1/ar-2/**db-6**/**db-9**): **DB-7** (migrations authoring ← ar-2), **AR-4**
  (state/routing/forms ← ar-1), **UX-1** (IA, no blockers) — all parallel; **AR-5/6/7** substrates now ready (← db-6+db-9);
  **DS-1** unparkable for the -b wave. Profile for DB/substrate heads: Add Backend Component.
- ✅ **AR-5 DONE (2026-07-28, commit f045ac1, merged 4956c81, pushed; LIF-107 → Done).** Sessions base substrate
  (Option-1 grain: spine + integration-contract STRUCTURE + 5 enums + thin registry). Effect-firing rail /
  transition engine / scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques; typecheck 10/10,
  core 110/110. **CORRECTION to the prior head note:** AR-5 does NOT own the effect rail — that is AR-7
  (`foundation/effects`, ADR-004 §3.2.5 is the spec-OWNER, AR-7 builds it, AR-7 ← AR-5). See
  [[dont-manufacture-forks-from-non-authoritative-notes]].
- 🎯 **NEXT HEAD (done = ar-1/db-1/ar-2/db-6/db-9/ar-5, 6 of 30): AR-6 — Spaces (LIF-77)** OR **AR-7 — Capability
  + measurability + effect rail (LIF-78)**. AR-6 = independent 2nd substrate root (← db-6+db-9, ready now); AR-7
  MUST wait for AR-5 ✅ + **AR-6** (needs both). So **AR-6 is the ready head**; AR-7 unlocks once AR-6 lands.
  Profile: Add Backend Component. AR-8 ← AR-6 + DB-8.
- 🔧 **Dep-graph gap to reconcile (non-blocking):** write the intra-tier edge **AR-7 ← AR-5 + AR-6** into the
  delivery-plan §5 + Linear (the plan encodes only the external ← db-6+db-9). Same class LIF-105 cleaned for the -a spine.
- ⚠ **Manual Linear (Victor):** DB-9 synced as **LIF-106** (new) — reconcile vs roadmap **LIF-71** (dedup: keep one, remap slug).
- **Tracked follow-ups:** LIF-103 (browser E2E harness) · LIF-104 (toolkit: harden tracker visibility) · NIT-3 count()→count(*).
- **Manual Linear (Victor):** archive the 5 empty ①–⑤ shells · db-2 (LIF-64) disposition · confirm old LIF-56–59 gap · **dedup DB-9: LIF-106 (task-synced) vs LIF-71 (roadmap) — keep one, remap the slug.**

**PARKED — DS-1 token pipeline** (branch `ds-1-token-pipeline` @ fd9f144): complete + green but out of sequence
(M1.0-b, not the -a critical path); LIF-81 → Backlog. Resumes when the -b wave's turn comes. (This session built
DS-1 first, then course-corrected to the -a spine head AR-2 per the milestone order.)

**Linear hygiene done:** LIF-72 (ar-1) + LIF-61 (db-1) → Done (were lagging Backlog). LIF-73 (ar-2) → In Progress.

---
<details><summary>✅ FOUNDATION-REALIGNMENT CAMPAIGN COMPLETE (2026-07-25) — prior context</summary>

Part 1 (docs realignment, 34/34 aligned) + Part 2 (repo structure, ADR-018) + Part 3 (roadmap resequence, ADR-019)
done; docs + structure + roadmap coherent (ADRs 001–019). Linear mirrors M1→M4 (M1.0 = 30 issues). M1.0 build is
now underway (AR-2 above).</details>

**Standing follow-ons (create-at-gate, not tasks yet):** net-new module/integration/venue Linear issues are created as
each M-phase begins. **Manual:** archive the 5 empty ①–⑤ Linear Projects in the Linear UI (tracker can't delete Projects).

**Git:** `main` pushed to `origin/main` through `3c2adb7` (AR-5 merged + closed out, 2026-07-28). In sync.

**FIRST ACTION next session — Part 2.0 planning (its own gate-1):**
Part 2 is FORWARD-DECLARED, not yet detailed — it earns its own gate-1 plan before execution (per the master-plan
umbrella framing). Derive the target repo structure from the now-realigned docs: package boundaries; `core/src` homes
for the 5 substrates (sessions/spaces/capability/measurability/economy); `schema/` organization; a disposition ledger
(keep/migrate/quarantine/delete) for every censused file/dir; execute the reorg (quarantine legacy → `Old/_legacy`,
stand up the correctly-shaped skeleton, unwire the v1 `schema.ts` monolith). **Structure only — no feature code.**
Likely **ADR-018** (retire Phase-0 architecture; re-derive from docs). Full double-gate per unit + exit gate.

**The Part-1/Part-2 boundary is now LIVE:** Part 1 deliberately deferred every code/directory-home call
(`[DEFERRED — Part 2]`) — Part 2 is where those homes get decided. The realigned docs cite conceptual owners (ADRs);
Part 2 places them.

**Read first on resume:** `realignment-master-plan/_index.md` (Part-2 forward-declaration + the umbrella framing)
+ the `current-state-baseline/baseline.md` (the file census Part 2's disposition ledger works from) + `ADR-016`
(storage rebuild — the `schema.ts` monolith unwire) + `ADR-017` (features-first, what Part 3 sequences).

**Deferred open Qs (still open):** "RP" abbreviation (Part 3.0, non-blocking); V1/ADR-007 saved-views dedicated
reframe pass; the noted gamification stale-half-line was fixed this session (no longer open).

**Reusable patterns locked across the campaign** (full per-unit detail in the session-log; kept here as the Part-2 toolkit):
- **Per-unit LITE loop:** ground → read ALL 5 aspects to refine the sweep's single-aspect verdict → **grep the live schema floor FIRST** → persist a PLAN → independent adversarial critique → fix → approve → implement → grep-verify.
- **Two critiques for big work:** a PLAN critique (can't catch execution drift) AND a POST-IMPLEMENTATION critique on the prose (catches stale mechanisms surviving as ordinary English).
- **R6 has two shapes:** recovered-domain (no As-is floor, e.g. health/core) vs live-schema (real floor → two-tier retire, e.g. habits/projects/finance) — grep the schema to tell which.
- **Substrate reframes:** X*/AI* ingest layering · M1/M2 measured framing · S1 sessions reframe · E9 god-table split · pure-gap net-new token-naming.
- **The gate's own lesson (this session):** a sweep "aligned/gap" label scores the *token surface* — a context that is *silent* (names no retired token) can still fail applicable predicates ("aligned by omission"). The whole-corpus exit gate + sibling-doc cross-check is what catches it. Check verdicts against *applicability* (framework §4), not just anti-signal presence.

## 🔴 Blocked

_(none)_

## 📋 Planned

| Task | Profile | Priority |
|------|---------|----------|
| **Storage rebuild — from zero** (v1 schema ~60% stale → author v2 from scratch; `ADR-016` + `storage-build-plan.md` ledger + per-table gating. DB-1/LIF-61 ✅ done.) | Generic Coding Session | ⏸ **PARKED by ADR-017** — sequencing inverted to features-first; schema now authored per-feature, not full-schema-first. Resurfaces (incl. encryption/sync at DB-5/DB-2) in the post-validation hardening pass. |
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |
| Global Calendar (cross-module read-only aggregator over `dueIn`) | (feature) | parked platform surface — build when its feeder modules are built |
| **Repo-wide Prettier conformance** (CI `format-check` job is pre-existing-RED: `pnpm format:check` reports **673** drifted files repo-wide. ⚠ NOT a blind `pnpm format` — the glob `**/*.{…,md}` + current `.prettierignore` pulls in `Old/` [quarantined legacy — must NOT touch] + `.claude/` [tracking artifacts] + 373 docs. **Fix `.prettierignore` scope FIRST** [add `Old/`; decide `.claude/`], THEN sweep only governed source. Surfaced by QA-1, 2026-08-04; not owned by any feature issue.) | Generic Coding Session | hygiene — do as a standalone sweep before the next broad touch |
| **CI: pnpm action-setup version conflict** (ALL `ci.yml`+`deploy.yml` jobs fail at *setup* in ~6s: `pnpm/action-setup@v4` throws `ERR_PNPM_BAD_PM_VERSION` because the workflow sets `version: 9` AND `package.json` pins `packageManager: pnpm@9.15.9`. **Doc-confirmed fix** [action-setup README]: remove `version:` from the `action-setup@v4` steps → it reads `packageManager` [exact 9.15.9, matches local+lockfile]. `ci.yml` ×5 [PR-gating]; `deploy.yml` ×3 is P2-1/deploy territory — leave. NOT owned by any issue [AR-1 done didn't scope GH Actions]; masks all real CI signal until fixed. Surfaced UI-3/E3, 2026-08-12.) | Generic Coding Session | hygiene — own PR; unblocks real CI signal (Test@server stays P2-1's, Format stays Prettier task's) |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| **ux-2-command-bar-search** (LIF-91 → Done · M1.0 `#22` · Generic Session/default · ← UX-1. The **⌘K command-bar + search interaction model** (design doc `docs/core/architecture/command-bar-and-search.md`) + declarative contract `apps/web/src/command-bar/`: `types.ts` (Command/Provider/SearchResult, 7 search terminal states, `CommandHistoryEntry`=exact v1 shape, keybind-as-data), `nav-commands.ts` (derives **21** nav commands from `module-map.ts` — dedupe-by-route, `visibleWhen` carried, routePath UX-facing not `'/'+key`), `frecency.ts` (pure pinned-first recency rank, `now` injected), `search-provider.ts` (DB-8 seam → `search-unavailable` stub, fail-loud), `registry.ts` (providers + Toggle-sidebar seed, no theme-toggle D4), `stores/command-bar-ui-store.ts` (ephemeral open/query/mode, AR-4/BR-RT-6). **Design-spec class** (UX-1 precedent): NO rendered component — UI-4 owns render. **Three unbuilt backing systems designed as typed SEAMS, never coded against**: `command_bar_history`/MOD-prefs (M1.1), FTS5/DB-8 (#60, M1.4), UI-4 host. Full §XXVI gate: Approval 1 (independent critique REVISE→2 material [focus contract; D5 keybind/platform] +4 minor fixed) + `/preflight` PASSED+3 folds + Approval 2 (gate-2 critique SHIP, 21-derivation hand-verified) + engineering gate PASS. typecheck 0 · lint 0-err · @vida/web **44/44** (23 new) · **zero unbuilt-system imports** · no `.tsx`/barrel · `routes.tsx` untouched. PR #9 merged (`299f452`); LIF-91 → Done. Spec `docs/specs/foundation/ux-2-command-bar-search/`. Leaf. Next head **UX-3 #23**.) | 2026-08-09 | 1 (2026-08-09) |
| **ar-8-foundation-services** (LIF-79 → Done · M1.0 `#14` · Add Backend Component / Default · ← AR-6. Delivered its ONE bespoke `@vida/core` piece — the **backlink / entity-link resolver** (`services/search/backlink-resolver.ts`: read-only `getBacklinksTo`/`getLinksFrom`/`resolveLink` over AR-6 `entity_links`, soft-delete-aware, index-hitting; `createBacklinkResolver(db, deviceId)`). Chosen as the `#`-order head (the reconciled routing rule; `--next` greedily said UX-3). `⊞≥2` pinned at its turn (DF-11) resolved — grounded in the plan — to just this one: the other named pieces are homed elsewhere IN the plan → **graph-prep** = AR-6 `ViewEngine`/`ViewProviderRegistry` seam + per-module providers (M1.1) + `@vida/ui` neural-graph (UI-2 #28); **export serializers** = UI-3 (#29 "block editor + serializers", `@vida/editor`, ADR-001 §8); **search (FTS5)** = DB-8 (#60 stream). Double-gated: plan critique REVISE→4 fixed (flat-file→`services/search/` dir per ADR-018 §3.2; `and(...)!`; soft-delete wording; notes/ boundary); post-impl critique SHIP + 2 hardening tests (partial-exclusion, revive). @vida/core **177/177** · root typecheck **10/10** · zero regression. Also this session: reconciled the recurring `--next`-vs-`#`-order routing conflict (stale illegal AR-8←db-8 #14←#60 edge fixed; `## 🧭 Delivery Routing` rule installed; 5 stale doc glyphs refreshed; toolkit task filed for a general `--next` build-order tie-break). §XXIX `docs/core/backlinks/current-*`. Spec `docs/specs/infrastructure/ar-8-foundation-services/`. NOT committed (working tree on `main`). Unblocks HARD-3.) | 2026-08-05 | 1 (2026-08-04→05) |
| **qa-1-e2e-harness-opfs** (LIF-103 → Done · M1.0 #8 · Add Backend Component / **new scenario `E2E Test Harness`** · ← AR-2. The repo's shared **browser-E2E foundation** (Playwright + wa-sqlite/OPFS worker), AR-2 verification as first consumer. Chosen by **strict `#` order** (Victor); profile switch Design System→Backend. Reframed scaffolding→**foundation** (Victor: nothing wasted, help following issues): reusable `db` backdoor fixture + OPFS-reset in `apps/web/e2e/fixtures.ts` (reused by UI-3 CRUD / MOD-* persistence / DB-10 seed — documented extension points), `harness.{html,ts}` backdoor (live ops only, never the deferred `values/batch` seam, never in `dist/`), `db-persistence.spec.ts`. **Zero throwaway** — item-2 persistence proven via a probe row in the DURABLE `app_state` table (not a synthetic table; not `schema_version`). Config at app root (`testDir ./e2e`) + `PW_EXECUTABLE_PATH` escape hatch + `e2e` turbo task + `ci.yml` job. Gates: 2 plan critiques + gate-2 critique + post-impl review (all independent); **live-smoke caught 2 bugs** (config-discovery collision; Vite dep-optimize reload race). Verified **2/2 green, twice, no flake** in a real Chromium worker (Brave on macOS 12). Zero regression (web typecheck ✓ · web 21/21 · core 169/169). **Closes AR-2 items 1 & 2 (7/7)**; Drizzle-write variant → UI-3/M1.1+. commit `4ee122d` → PR #3 merged to `main` (`3c7db3c`). Flagged 2 pre-existing CI reds on owners (`@vida/server` no-tests → P2-1; repo-wide Prettier drift → new Planned hygiene task). Spec `docs/specs/infrastructure/qa-1-e2e-harness-opfs/`.) | 2026-08-04 | 1 (2026-08-03→04) |
| **ds-4-tamagui-config-dark-mode** (LIF-84 · M1.0-b Design System · ← DS-2/DS-3 · reconstructed #19. `packages/ui/src/tamagui.config.ts` composes the generated outputs into `createTamagui` (createTokens + 2× createFont [role keys + `$true` default, guards the passthrough trap] + light/dark themes + createAnimations) + `provider.tsx` (`UIProvider`/`useVidaTheme`) + ambient `tamagui.d.ts` augmentation (avoids the `typeof config` TS2742 cycle under `declaration:true`). **First unit to COMPOSE the tokens** — crossed DS-1's ⊥ DS-4 standalone-typecheck boundary. **Animation driver = `@tamagui/animations-css`** per ADR-001 §9 (CSS-on-web + no-extra-dep; consumes motion.ts duration+easing losslessly). Gate: DS-* LITE (delivery-plan §3). Independent critique (read installed @tamagui/web types) REVISE→5 fixed (addThemeClassName=setting-not-prop · useThemeSetting→useVidaTheme · pinned switch mechanism · createFont `$true` render-assert · CSS-var reconciliation). ⚠ **Mid-build RN-driver drift triaged STRUCTURAL + corrected** (`/victor-triage`; I'd picked `@tamagui/animations-react-native` — not in docs for web, forced react-native-web violating ADR-001; diagnosis `docs/specs/fixes/ds-4-rn-driver-drift/`; memory [[dont-let-downstream-shape-reopen-an-adr]]). Also: core+driver pinned 2.6.2 (family align); jsx/DOM/react added (first JSX in @vida/ui); source-model guard scoped to `components/`. @vida/ui **30/30** · root typecheck **10/10** · imports at runtime with NO react-native-web. **Frontend Visual Gate PASS** (composed light｜dark theme surface). §XXIX: token-pipeline current-* deferrals resolved + `packages/ui/src/CLAUDE.md`. NOT committed — on `main` working tree; branch-first pending. Unblocks DS-5/UI-*/UX-*.) | 2026-08-03 | 1 (2026-08-03) |
| **ds-3-motion-foundation** (LIF-83 · M1.0-b Design System · ← DS-2 · reconstructed #18. Motion foundation: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing` (out/in/inOut cubic-beziers + linear) primitives added as a **third aux consumer** — `AUX` factored `[...TYPOGRAPHY, 'shadow', ...MOTION]`, `vida/fonts` narrowed to typography (closed the fonts↔motion leak by construction), new `vida/motion` format → `motion.ts` (mirrors `fonts.ts`), index re-export, B11/B12. Values trace to `standards/motion.md §IX`. LITE gate: plan-critique REVISE→5 fixed (F2 AUX sweep · F8 positive css-vars test · F6 createAnimations UNKNOWN · F5 band-floor INTERP · F9 both sort layers); post-impl critique SHIP + 2 NITs (linear-type→`easing`; camelCase `--easing-inOut`→DS-4). Live-smoke caught a preview render bug (cubic-bezier commas → isShadow miscapture → 3 easings as invalid box-shadow; motion branch moved above shadow). @vida/ui 26/26 · root typecheck 10/10 · deterministic. **Frontend Visual Gate PASS** (2nd run; `instant` render fixed static-not-flicker per Victor; values standard-derived, NOT a provisional placeholder). §XXIX docs promoted (current-spec/current-business-rules B11/B12 + themes CLAUDE.md = B12 enforcement artifact). Merged + pushed to origin/main (`8f9cbe2`, --no-ff); branch deleted; re-verified green. LIF-83 → Done. Unblocks DS-4.) | 2026-08-03 | 1 (2026-08-03) |
| **ds-1-token-pipeline** (LIF-81 · M1.0-b Design System ROOT · **RE-LANDED** — un-parked as the computed next head (`--next`/`--plan` rank #1 among READY; unblocks ds-2/3/4/5). The build was already gated+green on the parked branch @ fd9f144 (2026-07-27); this session INTEGRATED the isolated `packages/ui/src/themes` Style Dictionary→Tamagui+CSS pipeline onto current main 57 commits forward. Main never touched `packages/ui` → 0 clobber; only `docs/specs/_index.md` line-merged + `pnpm-lock.yaml` regenerated (+style-dictionary@5.5.0). Re-verified green vs today's main: tokens:build ✓ · @vida/ui 13/13 ✓ · root typecheck 10/10 ✓ · no artifact drift. Ship gate SHIP. commit ab5966c (merge of `ds-1-reland`) → pushed to origin/main. LIF-81 → Done. Currency §XXIX: `docs/ui/token-pipeline/current-*` verified current. Profile switched Add Backend Component → Design System.) | 2026-08-03 | 1 (2026-08-03) |
| **ar-7-capability-registry** (LIF-78 · M1.0 substrate spine · FINAL substrate) — the ⊞4 capstone: **4 gated increments** (effects rail · capability registry · measurability engine · points economy) in `core/src/foundation/{effects,capability,measurement,economy}` (ADRs 004/008/010/011/012). Delivered under the DF-11 per-substrate gating rule (written this session) with a DF-12 deferral-homing pass (new `#85 CAP-authoring`). Added `Repository.createInTx` (docs-grounded §XXVIII). @vida/core 169 tests, root typecheck 10/10. 6 commits on branch `ar-7-capability-registry` (`403d25f`→`b52d7b4`), **not merged/pushed**. Unblocks MOD-purposes, MOD-gamification, HARD-2. | 2026-08-03 | 1 (2026-08-02→03) |
| **ux-1-information-architecture** (LIF-90 · M1/M1.0 experience-track ROOT · computed head via `--next`. The web app's IA + **co-primary dual-axis nav model** — module dock (content home) + Spaces bar (cross-cutting overlays); amends ADR-007:88, ADR-006 §3.4 cover; Spaces bar = seam live M1.1. Deliverables: `docs/core/architecture/information-architecture.md` + `apps/web/src/nav/module-map.ts` (23 modules placed) + layer-doc. Grain: design/spec issue that also emits a declarative code artifact (dual home). 4 gates (PLAN critique+preflight, map critique — 3 REVISE all fixed) + **Victor primary-doc audit** caught Routines misclassified (harvest read the cockpit as inside-Sessions). Placements: Routines→dock, Check-ins→secondary, Gamification→conditional dock, Sessions→dock, Pomodoro/Flashcards→non-nav, Languages/Bucket-List→spaces-only. Homes verified vs ADR-018 (per-app, not shared pkg). typecheck 0, lint 0-err, routes.tsx untouched. Currency: BR-NAV-1..4 promoted. commit f5a863b → merged+pushed to main. Unblocks UX-2/3/4/5.) | 2026-08-02 | 1 (2026-08-01→02) |
| **ar-4-state-routing-forms** (LIF-75 · M1.0 Boot & DB spine · COMPUTED head via `--next` off db-7. apps/web client runtime: Zustand + React Query v5 + TanStack Router + TanStack Form/Zod, **+ the main↔worker DB binding AR-2 assigned to AR-4** (D5: `db/client.ts` SqliteDriver proxy over the worker RPC w/ timeout+crash handling; extended `worker.ts` protocol; `boot.ts` DB-ready gate). Grain = mechanism + 1 reference/plane; values/batch = deferred seam. **ADR-020** resolves the long-deferred ADR-001:286 (Zustand placement = per-app hooks). Profile switched → Generic Coding Session. Full §XXVI double-gate + §XXX: 2 plan critiques + preflight (surfaced the missing D5 layer) + post-impl critique (happy-path-only error handling → RPC timeout/onerror + worker default + boot memo-clear + App error/retry) + engineering gate PASS. typecheck 10/10, @vida/web 21/21, build green. commit 955a255 on branch `ar-4-state-routing-forms`. Victor corrected 2 manufactured forks (grain + binding ownership both already in docs). §XXIX docs at docs/infrastructure/web-client-runtime/.) | 2026-07-30 | 1 (2026-07-29→30) |
| **db-7-migrations-runner** (LIF-69 · M1.0 Boot & DB spine · COMPUTED head via `--next`. Reconcile+extend of the existing runner: authored the `app_state` infra table (`schema/foundation/app-state.ts`, ADR-002 §5.0) + `ensureInfra` pre-loop bootstrap + dev-only `resetDev`. **Closed a latent boot bug** — engine assumed `app_state` but no production migration created it → `migrate()` threw at real web boot (`worker.ts:23`), masked by 4 test fixtures (retired). Engine untouched; forward-only preserved (no `down()`, inherited §9.2 divergence → DB-11). Full §XXVI double-gate + 3 independent critiques (all SHIP; gate-1 caught a 4th fixture + BR-5 mechanism). typecheck 10/10, @vida/core 131/131, @vida/web 6/6. §XXIX docs shipped together. commit d7aa1e0. Also this session: manufactured-fork correction (memory [[read-architecture-before-implementing]]) + delivery-loop audited sound + AR-7 edge reconcile.) | 2026-07-29 | 1 (2026-07-29) |
| **ar-6-spaces** (LIF-77 · M1.0 substrate spine · Spaces per ADR-006 (SP1–SP7) + ADR-007 (V1–V5). 6 tables (`tags`·`entity_tags`·`entity_links`·`spaces`·`space_enabled_blocks`·`views`, migration 003) + `TaggableTypeRegistry` (SP2 open) + `SpacesService` (BR-14 idempotent junctions, BR-15 resolve-then-soft-delete, BR-3/5 cycle guards, BR-13 M1.0 empty-[E] pass-through) + `ViewsService` + `ViewProviderRegistry` (empty V4/R7 seam) + `ViewEngine` (V3/V4/V5). Deferred: capability registry/block_instances→AR-7, backlink resolver→AR-8, effect rail→AR-7, DSL/layout/resolution-surface→build-time. Double-gated + 3 independent critiques [g1×2: scope-drift + link_type-in-prompt; g2: 3 executability defects vs real repository.ts; post-impl: missing spaces cycle-guard]. §2.1 gather-protocol born after a triage. typecheck 10/10, spaces 14/14, parity 7/7. commit e2a170d → merged fad233b. Currency §XXIX docs at docs/core/spaces/. Unblocks AR-7. LIF-77 canonical (Facet A reconciled the LIF-108 dup).) | 2026-07-29 | 1 (2026-07-28→29) |
| **ar-5-sessions-base** (LIF-107 · M1.0 substrate SPINE · Sessions base per ADR-004. Option-1 grain: `sessions` spine + integration-contract STRUCTURE (`session_type_registry` + `session_attachments`) + 5 canonical enums (EFFECT_TYPE=12 incl. ADR-012 amendment) + thin SessionRegistry (register/get/list, BR-3/4/1, user types → db-6 Repository → sync_queue). Effect-firing rail/transition engine/scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques [gate-1: EFFECT_TYPE 8→12 subset drift; gate-2: registry PK/Repository mismatch; post-impl: BR-4 effects⊆allowed⊆shipped]. typecheck 10/10, core 110/110. commit f045ac1, merged 4956c81, pushed. Currency §XXIX docs born. Unblocks AR-7. ⚠ LIF-107 dup roadmap LIF-76 — reconcile.) | 2026-07-28 | 1 (2026-07-28) |
| **db-9-enums-zod** (LIF-106 · M1.0-a spine · canonical enums+Zod. 81 @vida/types enums → `as const` tuple + derived union [C2 tuple-as-source = exhaustive, not `satisfies` ⊆] + 81 `z.enum` validators in @vida/core [zod ^4.4.3, first in repo] + SQL-CHECK↔tuple parity test [ADR-002 §2.3, ADR-016 §3.3 assert-only]. Double-gated + 2 independent critiques [PLAN caught buried tuple-location decision + sqlEnumCheck ADR-overreach; IMPL caught stale-dist false-green risk + 2 missed enums]. Verified: root typecheck 10/10 ZERO consumer edits, core 83 + web 6 green, literal-sets byte-identical vs HEAD. commit a137a44. Unblocks substrates AR-5/6/7) | 2026-07-28 | 1 (2026-07-28) |
| **db-6-repository-layer** (LIF-68 · M1.0-a1 spine · reconcile+extend of the v1-carried repository: sync_queue foundation table [ADR-002 §5.1 CHECKs+UNIQUE] + migration 001 registered; co-transactional UPSERT enqueue per mutation [ADR-004 §3.4]; M1.0 pass-through seam = empty [E] set + lazy vault key [ADR-017:20]. Baseline caught it was NOT from-zero. Independent /critique [7 fixed, 3 by source-verify — incl. refuting the "proxy has no .transaction()" risk] + 2nd critique [5 exec fixes incl. UPSERT correctness bug]. 10-case tests; @vida/core 55/55; commit 7f90c9b. Unblocks ar-5/6/7 + db-10) | 2026-07-28 | 1 (2026-07-28) |
| **m1.0-dep-graph-validation** (full-M1.0 dep-graph validated per-edge vs ADR contracts + reconciled across task files/Linear/delivery-plan §5; independent ADR-critique caught db-8←db-6 as illegal M1.0←M3; 9 edges corrected, 7 Linear mutations, --verify clean; streaming loop model settled. commit 5e36376) | 2026-07-28 | 1 (2026-07-28) |
| **ar-2-database-adapter-web** (LIF-73 · M1.0 critical-path ROOT · async DatabaseAdapter + web-adapter over wa-sqlite/OPFS + drizzle-orm/sqlite-proxy. DIRECTION corrected sync→async mid-build [wa-sqlite Factory API async-only] — Rev 3 re-gated. 5/7 DoD [contract]; items 1&2 [browser open/persist] → LIF-103. commit e55010f. Unblocks db-6/7, ar-5/6/8/9) | 2026-07-27 | 1 (2026-07-27) |
| **m1.0-delivery-plan** (Milestone Delivery Planning — new scenario crystallized. docs/roadmap/m1.0-delivery-plan.md: 30 M1.0 issues bound 1:1 to entity·ADR-018 home·intent·profile·flow·DOC spine·deps·gate; critic SHIP after 1 fix; grain+dep reconcile caught fold/split + inversion + 2 stale Linear edges [cleaned both sides]. Strategy meta-task, not a Linear issue) | 2026-07-26 | 1 (2026-07-26) |
| **linear-projectize** (U3 — re-scoped LIF-61…95 onto the roadmap M1→M4: created M1.0/M1.4/M2/M3/M4 Projects, moved 33 existing issues to final homes, created split/head issues LIF-98…101, old ①–⑤ emptied; LIF-97 Done) | 2026-07-26 | 1 (2026-07-25→26) |
| **build-roadmap-resequence** (→ foundation-realignment campaign: P1 docs realignment + P2 repo structure [ADR-018] + P3 roadmap resequence [ADR-019]; all exit gates accepted; docs+structure+roadmap coherent, derived from ADRs 001–019; LIF-96 Done) | 2026-07-25 | many (2026-07-23 → 07-25) |
| **storage-master-plan** (ADR-016 + storage-build-plan master ledger; both gates; commit 58dc813) | 2026-07-22 | 1 (2026-07-22) |
| **db-1-schema-primitives** (LIF-61 · P0 storage-rebuild primitives; both gates + review battery + 4 consistency passes) | 2026-07-22 | 1 (2026-07-20→22) |
| **build-roadmap** | 2026-07-20 | 3 (2026-07-20) |
| **documentation-blueprint** | 2026-07-19 | ~20+ (2026-06-08 → 07-19) |

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
