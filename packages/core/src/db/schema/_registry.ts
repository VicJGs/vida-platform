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
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const isEntityType = (v: string): v is EntityType =>
  (ENTITY_TYPES as readonly string[]).includes(v)
