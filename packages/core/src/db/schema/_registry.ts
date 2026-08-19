// Single source of `entity_type` values for polymorphic references (pages · entity_links · entity_tags).
// DB-1 seeds ONLY the foundation set; each domain APPENDS its types as its tables are authored (DB-4).
// A registry-derived CHECK authored in the SQL migration (DB-3/DB-4), sourced from ENTITY_TYPES, keeps
// cross-table entity_type references consistent (ADR-006). (DDL is hand-written SQL — no Drizzle check() helper.)
export const ENTITY_TYPES = [
  'page',
  'note',
  'journal',
  'tag',
  'space', // Notes/Pages hub + Spaces foundation (P1)
  // DB-3 Stream (i) substrate entities (ADR-002 §5.20) — registered so they are valid polymorphic
  // link/tag targets; each domain still APPENDS its own per-domain types at DB-4.
  'value',
  'contribution',
  'purpose_review',
  'plan_step',
  'review_curve',
  'method_binding',
  'review_event',
  'store',
  'rule',
  'planned_block',
  'template',
  // DB-4 group #3 — the Sessions base entity becomes a valid polymorphic link/attach
  // target (AR-5 built the tables but never appended it). Sub-types are addressed via
  // the base session_id, so only the base `session` is registered (ADR-004 §3.1).
  'session',
  // DB-4 group #4 — Tasks. A task is a valid pages/entity_links/entity_tags target
  // (notes via pages `entity_type='task'`; tags via entity_tags, TK-8). task_time_logs
  // is addressed via task_id, not polymorphic refs → not registered.
  'task',
  // DB-4 group #5 — Projects. project/milestone/deliverable are valid pages/entity_links/
  // entity_tags targets (notes + vision/mission pages G3/G10; shared tags PJ-12).
  // project_documents is addressed via project_id → not registered (task_time_logs precedent).
  'project',
  'milestone',
  'deliverable',
  // DB-4 group #6 — Habits. A habit is a valid pages/entity_links/entity_tags target
  // (notes via pages `entity_type='habit'`; tags via entity_tags, retiring inline
  // habits.tags). habit_completions + project_habits are addressed via their refs → not registered.
  'habit',
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const isEntityType = (v: string): v is EntityType =>
  (ENTITY_TYPES as readonly string[]).includes(v)
