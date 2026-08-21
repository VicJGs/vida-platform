// Public surface for the v2 schema primitives. Table modules (DB-3+) are re-exported here as authored.
// The v1 monolith was quarantined to `../_legacy/schema.v1.ts` in Part 2 (ADR-018) — with no adjacent
// `schema.ts` file, `./db/schema` (index.ts) and `./schema` (adapter.ts) now unambiguously resolve to THIS
// directory. Tables are authored per-feature at build phase (ADR-016 §3.5 / ADR-017).
export * from './_shared'
export * from './_registry'
// Foundation tables (device-local infra, not domain data): DB-6 sync_queue · DB-7 app_state.
export * from './foundation/sync-queue'
export * from './foundation/app-state'
// Foundation substrate: AR-5 Sessions base (spine + integration-contract structure).
export * from './foundation/sessions'
// Foundation substrate: AR-6 Spaces base (tags/links/spaces/enabled-blocks/views).
export * from './foundation/spaces'
// Foundation substrate: AR-7 effect rail (applied_effects dedup ledger).
export * from './foundation/effects'
// Foundation substrate: AR-7 capability registry (definitions · block_instances · grants).
export * from './foundation/capability'
// Foundation substrate: AR-7 economy (currencies · consequence_ledger) + DB-3 (store · rules).
export * from './foundation/economy'
// Foundation substrate: DB-3 Purpose domain (values · contributions · purpose_reviews · plan_steps).
export * from './foundation/purpose'
// Foundation substrate: DB-3 generic review engine (review_curves · method_bindings · review_events).
export * from './foundation/knowledge-review'
// Foundation substrate: DB-3 scheduling (planned_blocks — aggregator-scheduled) +
// DB-4 group #3 Planner tables (study_availability · availability_exceptions ·
// study_plan_batches · session_templates).
export * from './foundation/scheduling'
// DB-4 group #3 (Stream ii): Sessions sub-type extensions (study_sessions · focus_sessions).
export * from './foundation/session-extensions'
// Foundation substrate: DB-3 templates (light seed-bundle store).
export * from './foundation/templates'
// DB-4 domain (Stream ii): Notes & Pages (pages · page_links · note_attachments).
export * from './notes'
// DB-4 domain (Stream ii): Preferences (user_preferences · nav_preferences · command_bar_history).
export * from './preferences'
// DB-4 domain (Stream ii): Tasks (tasks · task_time_logs).
export * from './tasks'
// DB-4 domain (Stream ii): Projects (projects · milestones · deliverables · project_documents).
export * from './projects'
// DB-4 domain (Stream ii): Habits (habits · habit_completions · project_habits).
export * from './habits'
// DB-4 domain (Stream ii): Routines (routines · routine_step · routine_completions) — the orchestration reframe.
export * from './routines'
// DB-4 domain (Stream ii): Purpose & Goals (purposes · targets · purpose_metrics · purpose_metric_values ·
// target_reviews · dreams) — the CAPSTONE. (DB-3 substrate values/contributions/purpose_reviews/plan_steps → foundation/purpose.ts.)
export * from './purposes'
// DB-4 domain (Stream ii): Finance (accounts · transactions · assets · liabilities · investments · income_streams)
// + Fiscal & Legal sub-context (fiscal_residencies · legal_entities · fiscal_obligations). (DB-3 substrate store/rules → foundation/economy.ts.)
export * from './finance'
// DB-4 domain (Stream ii): Skills (skills · skill_levels · skill_activities · skill_actions [Sessions
// `practice` sub-type extension] · skill_dev_logs · skill_dependencies · skill_definitions). skill_resources RETIRED → entity_links.
export * from './skills'
// DB-4 domain (Stream ii): Knowledge Universe (knowledge_objects · object_kinds · knowledge_containers ·
// references · compound_sets · knowledge_lab_entries · flashcards). Retired → review engine (DB-3) + pages.
export * from './knowledge'
// DB-4 domain (Stream ii): Books (books · book_chapters · book_assets · book_bookmarks · book_highlights ·
// book_quotes · reading_sessions [Sessions `reading` sub-type] · reading_plans · reading_plan_books · book_subjects).
export * from './books'
// DB-4 domain (Stream ii): Learning: Education (+ICS) — THE Learning hub (15 tables): subjects[=courses]
// · ics_feed_configs · ics_synced_events · institutions · self_taught · programs · curricula · terms ·
// class_sessions [Sessions `class` sub-type] · subject_schedules · grading_systems · grading_components ·
// assessments · subject_documents · education_measurements. Homework = Tasks-owned (C-HW). Inline tags → entity_tags.
export * from './learning'

// DB-4 group #14 — Relationships (CRM): contacts · contact_events · interactions · contact_reminders ·
// reminder_groups · reminder_group_contacts + net-new networks (network_groups · network_group_contacts, G2).
// Inline contacts.tags → entity_tags (G10); social_links KEPT (C4); health derived (no M*, C1).
export * from './relationships'

// DB-4 group #16 — Check-ins: daily_check_ins · check_in_templates · check_in_template_questions
// (§5.13). Enums reused from @vida/types entities/user.ts (CHECK_IN_TYPE amended 3→6, CK-3). No tags (SP1).
export * from './check-ins'

// DB-4 group #17 — Health: Core (12 tables): health_metrics · health_metric_values · health_domains ·
// health_factors · health_exams · assigned_exams · health_goals · physical_roles · health_experiments ·
// health_responses · medical_profile_entries · safety_flags. Recovered domain (no v2 schema). Goal `type`
// decomposed → measurement_kind × binding_mode (ADR-011). deleted_at on health_goals ONLY (floor). No tags
// owned (SP1 consumer); X*/AI*/M4/M5 = cite-not-author. Nutrition #18 / Training #19 are separate groups.
export * from './health-core'
