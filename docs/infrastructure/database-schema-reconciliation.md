# Database Schema Reconciliation — current `schema.ts` vs documented target

> **Produced:** 2026-07-20 (DB-1 baseline; parallel per-domain readers + direct verification)
> **Question answered:** does the implemented `packages/core/src/db/schema.ts` match the documented target schema?
> **Verdict:** **NO.** The current schema is the **v1 pre-consolidation** schema. It matches ADR-002's §5 body
> — which ADR-002 itself declares **stale** (§5.20 D5-a) — not the documented v2 target (§5.20 Stream (i) + the 24
> `structure-data.md` docs).
> **No-Guessing:** claims are `[FACT: path:line]` or `[UNKNOWN]`. `[INTENT]` = documented-but-owed, not implemented.

## Authoritative target = two streams (ADR-002 §5.20)

- **Stream (i)** — enumerated cross-cutting owed set: **RETIRE 10 · ADD ~28 · AMEND ~24** (ADR-003 §17 + ADR-004…015).
- **Stream (ii)** — the **24** `docs/features/*/structure-data.md` docs (per-module target; ADR-002 says "19" — DB-11 owed count fix).
- ADR-002 §5 body itself = pre-amendment v1, explicitly stale. `[FACT: ADR-002:22-24]`

## The current 80 tables, bucketed against the target

### A · CARRY-FORWARD floor — present & broadly correct (~40 tables)
Column-level amendments owed, but the table survives:
- **Relationships (6):** all MATCH — `contacts · contact_events · interactions · contact_reminders · reminder_groups · reminder_group_contacts`. `[FACT: schema.ts:535-614]`
- **Finance (6):** all MATCH; owed cols `opening_balance`, G9 liability/income fields, jurisdiction tag. `[FACT: schema.ts:447-531]`
- **Tasks/Projects (5):** `tasks · task_time_logs · projects · milestones · project_documents` present; owed `completed_at/scheduled_date/kind`, `deliverables`, `mission`. `[FACT: schema.ts:161-249]`
- **Habits (3+1):** `habits · routine_actions · routine_completions` MATCH; `habit_completions` DIVERGENT (no CHECKs). `[FACT: schema.ts:253-328]`
- **Preferences (3):** MATCH; owed `font_size/compact_mode/module_visibility…`. `[FACT: schema.ts:1251-1300]`
- **Notes base (4):** `page_links · tags · note_attachments` MATCH; `entity_links` needs registry CHECK relax. `[FACT: schema.ts:90-141]`
- **Check-ins (2):** templates + questions MATCH. **Gamification (3):** `user_profile · achievements · user_achievements` as-is floor. **Notifications (1):** as-is; owed delivery-audit. **Learning base (3):** `book_chapters · ics_feed_configs · ics_synced_events`.

### B · RETIRE — present but superseded (~22 tables)
Stream (i) RETIRE (10) + Stream (ii) retires:
- `study_sessions`(flat) → redefined as `sessions` extension · `study_availability · availability_exceptions · study_plan_batches · scheduled_study_sessions · session_templates` → ADR-004 model (some reshaped, not dropped) · `flashcard_decks · flashcard_reviews` → generic review engine · `page_tags` → `entity_tags` · `purpose_habits · purpose_routines · purpose_projects` → `contributions` · `xp_history` → `consequence_ledger`. `[FACT: schema.ts:121,413-435,699,761-807,826-888,1213]`
- Plus: `knowledge_notes` → `pages`+`entity_links` · `skill_resources` → `entity_links` · `bucket_list_items` → folds into `dreams` · **9 `language_*` tables** (Languages dissolved → Spaces worked-example; no `structure-data.md`). `[FACT: schema.ts:689,809,892-1067,1147]`
- Column-level retires: SM-2 columns on `flashcards` & `study_topics` → generic curve. `[FACT: schema.ts:721-794]`

### C · MISSING — target requires, absent today (~90-110 tables, ranges + [UNKNOWN] overlap)
- **Stream (i) ADD (~28):** `sessions` spine + 6 extensions · `planned_blocks · session_attachments · applied_effects` · `review_curves/method_bindings/review_events` · `entity_tags · spaces · space_enabled_blocks · views` · capability registry · `block_instances · templates · capability_grants` · `values · contributions · purpose_reviews · plan_steps` · `consequence_ledger · currencies · store · rules`. **[V3: 0 of 11 sampled exist.]**
- **Health (22):** `health_metrics … workout_sets` — **0 of 22 exist**. `[FACT: grep count 0]`
- **Education (~14):** `institutions · programs · curricula · terms · class_sessions · grading_systems …` (courses→subjects reframe).
- **Books (~9):** `book_assets · book_bookmarks · book_highlights · book_quotes · reading_sessions · reading_plans · book_subjects …`
- **Knowledge (~11):** `knowledge_objects · object_kinds · knowledge_containers · study_methods · review_curves · method_bindings · review_events · references · fts_knowledge …`
- **Skills (~6):** `skill_levels · skill_activities · skill_actions · skill_dev_logs · skill_dependencies · skill_definitions`.
- **Fiscal-Legal (3):** `fiscal_residencies · legal_entities · fiscal_obligations`. **Relationships networks (2):** `network_groups · network_group_contacts`. **Projects (2):** `deliverables · project_contacts`. **Journals (1):** `journal_snapshots`.

### D · DIVERGENT reframes — present but wrong shape (~9 tables)
`study_topics`(→knowledge_object, retire SM-2) · `flashcards`(content-only shrink) · `skills`(Composer extend) · `courses`(→subject routing) · `books`(asset split) · `study_sessions`(→sessions extension) · `scheduled_study_sessions`(→planned_blocks) · `pomodoro_sessions`(re-home to sessions) · `dreams`(absorb bucket_list).

## E · SYSTEMIC divergences (cross-cutting — verified directly)
1. **Zero CHECK constraints.** Every enum across every doc specifies a SQL CHECK; `schema.ts` has **none**. `[V1: grep .check( = 0]` Convention (CLAUDE.md) says CHECK+Zod. Migrations not yet inspected for raw CHECKs → the Drizzle layer omits them entirely.
2. **`_sync_field_ts` absent** on every syncable table (ADR-003 §17 AMEND; also DB-2's charter). `[V2: grep = 0]`
3. **Partial indexes are full indexes.** `pages` journal-unique, `tasks` status/due, `notifications` unread — documented `WHERE …` predicates are absent. `[FACT: schema.ts:87,185-186,1246]`
4. **Completions/junction tables omit `updated_at`** (`habit_completions`, `routine_completions`, `check_in_template_questions`, `task_time_logs`, junctions don't spread `baseColumns`). `[FACT: schema.ts:279,317,1130,189]`
5. **No consolidation primitives:** no `effect_event_id`, no `category_bidx`, no HLC representation of `_sync_lww_ts`, no nullable/derive progress semantics.

## Bottom line
- **Carry-forward ~40 · Retire ~22 · Missing ~90-110 · Divergent ~9.** Documented target ≈ **130-150 tables** vs the current **80**.
- The current schema is **v1**; the documented target is **v2 consolidated**. This is a **near-total rebuild of the table set**, not an extension — exactly what ADR-002 §5.20 warned ("the true owed set is large").
- This **vindicates the roadmap's DB cluster order**: DB-1 (primitives + directory) → DB-2 (sync cols) → DB-3 (retire/add consolidation, Stream i) → DB-4 (per-domain, Stream ii) → DB-5 (encryption map) → DB-11 (reconcile ADR-002 §5/§7/§8).
