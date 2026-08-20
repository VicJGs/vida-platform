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
  // DB-4 group #7 — Routines (reframe). Notes/tags at routine-group + step level (RT-15/16);
  // supersedes the docs' pre-reframe `routine_action`. routine_completions addressed via
  // routine_step_id → not registered.
  'routine',
  'routine_step',
  // DB-4 group #8 — Purpose & Goals. purpose/target/dream + purpose_metric_value are valid
  // pages/entity_links targets (PG-18; `value` already registered by DB-3). purpose_metrics +
  // target_reviews addressed via their refs → not registered.
  'purpose',
  'target',
  'dream',
  'purpose_metric_value',
  // DB-4 group #9 — Finance. account/transaction/asset/investment/liability are valid pages/
  // entity_links/entity_tags targets (notes-via-pages G12; shared tags retire inline
  // transactions.tags, FN-10/SP1). income_streams NOT a note target (G12 lists 5, conventions.md:26).
  // Fiscal entities NOT registered (legal_entity composes Projects; obligation → Tasks — both already registered).
  'account',
  'transaction',
  'asset',
  'investment',
  'liability',
  // DB-4 group Skills. skill + the structural/library children are valid pages/entity_links/
  // entity_tags targets (notes+tags on a skill via `entity_type='skill'`, structure-data.md:44;
  // the roster names all 6 as entity_type extensions, structure-data.md:47-48). The roster's
  // "skill already reserved" was STALE — skill was absent from this list. `skill_action` is
  // EXCLUDED: it is a `sessions` sub-type addressed via base session_id, and sub-types are not
  // registered — only the base `session` is (ADR-004 §3.1, the group-#3 precedent above).
  'skill',
  'skill_level',
  'skill_activity',
  'skill_dev_log',
  'skill_dependency',
  'skill_definition',
  // DB-4 group #10 — Knowledge Universe. knowledge_object (links/tags target, KN-6/7 — supersedes the
  // roster's `study_topic`) · knowledge_container (entity_tags membership, KN-7) · reference (linkable to
  // objects) · flashcard (SP2 — flashcards/structure-data.md:27 registers `entity_type='flashcard'`).
  // EXCLUDED: object_kind/compound_set/knowledge_lab_entry (registry/config/child entities addressed via
  // their own refs, not polymorphic targets). knowledge_note is a `pages` row of an existing page type (KN-5).
  'knowledge_object',
  'knowledge_container',
  'reference',
  'flashcard',
  // DB-4 group #11 — Books. book (work: tags/notes/links target, BK-16 + Knowledge linked_book_id) ·
  // book_chapter (Knowledge topic↔chapter link target, structure-data:62) · book_bookmark · book_quote
  // (both take notes via pages + inter-links, BK-6). EXCLUDED: book_highlight (BK-6 — deliberately no
  // notes/links), reading_session (session sub-type → base `session`, ADR-004 §3.1), book_asset/reading_plan/
  // reading_plan_books/book_subjects (config/junction/child entities addressed via their own refs).
  'book',
  'book_chapter',
  'book_bookmark',
  'book_quote',
  // DB-4 group #12 — Learning: Education (+ICS). subject (=courses; tags/notes/links target,
  // SP1 entity_type='subject') · institution · program · curriculum · term · assessment ·
  // subject_document are valid pages/entity_links targets (H11 tags on Program/Curriculum/Subject
  // is an app-layer scope, not a registry split — the list is one ENTITY_TYPES feeding all three).
  // EXCLUDED: class_session (a `sessions` sub-type → base `session`, ADR-004 §3.1, the reading_session/
  // skill_action precedent); ics_feed_config/ics_synced_event/self_taught/subject_schedule/grading_system/
  // grading_component/education_measurement (config/child/junction entities addressed via their own refs).
  'subject',
  'institution',
  'program',
  'curriculum',
  'term',
  'assessment',
  'subject_document',
  // DB-4 group #14 — Relationships (CRM). contact (standalone page + notes via pages `entity_type='contact'`,
  // G9; shared tags retire inline contacts.tags, RL-10/SP1) + network (standalone page + notes, G9; entity_tags
  // registers `entity_type='network'` now that networks land, SP2/RL-4). EXCLUDED: contact_event/interaction/
  // contact_reminder/reminder_group (addressed via contact_id/own refs → not polymorphic targets, the
  // habit_completions precedent) + the 2 junctions.
  'contact',
  'network',
  // DB-4 group #16 — Check-ins. daily_check_in is a pages/entity_links target (the check-in↔Journal-day-page
  // link + review backlinks, G10/CK-7; already in note.ts ENTITY_LINK_TARGET — this is the pages/registry side).
  // NO tags (SP1 opt-out — registration valid, tagging is a per-use choice). check_in_template/_question EXCLUDED
  // (config/child, addressed via own refs — the habit_completions precedent).
  'daily_check_in',
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const isEntityType = (v: string): v is EntityType =>
  (ENTITY_TYPES as readonly string[]).includes(v)
