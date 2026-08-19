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
