// ============================================================================
// Domain tables: Knowledge (+flashcards) — DB-4 · group #10 · ADR-002 §5.10 (reshaped roster)
//
// The Knowledge Universe — the largest, most-reframed DB-4 group. 7 owned tables
// author the resolved reframe (the "Subject › Unit › Topic" spine + user kinds,
// containers, references, compound sets, a knowledge lab, and the content-only
// flashcard). ADR-002 §5.10's DDL is STALE: study_topics/topic_reviews/knowledge_notes/
// flashcard_decks/flashcard_reviews are SUPERSEDED (see the retirement map below).
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/022_knowledge.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Reframe (spec docs/specs/foundation/db-4-knowledge/):
// - knowledge_objects generalizes study_topics (the topic-kind row of a general object);
//   parent_object_id (self-ref, no FK) IS the Subject›Unit›Topic + user-kinds hierarchy
//   (BR-KN-1). mastery_level is DERIVED → nullable, no default (BR-KN-2; §5.10 NOT NULL
//   DEFAULT 0 resolved out). SM-2 columns RETIRED → the DB-3 review engine (BR-KN-3).
//   Education-plan/Books-context cols (due_date/estimated_study/study_time/class_date/
//   reading_pages) NOT carried (BR-KN-6, KN-2 "Education plans, Knowledge holds").
// - topic_reviews → review_events (DB-3, foundation/knowledge-review.ts); knowledge_notes →
//   pages (KN-5); flashcard_decks/flashcard_reviews RETIRED (ADR-005); resource_type CHECK →
//   entity_links (KN-6); resource_urls → references (K6).
// - flashcards SHRINKS to content-only (BR-KN-7): no deck_id, no SM-2 cols, no is_mastered.
// - NO FK anywhere (kind_id/parent_object_id/default_method_id/object_id/promoted_object_id
//   plain TEXT; §5.10 REFERENCES superseded, ADR-016 §3.4). FIXED enums → SQL CHECK;
//   user-extensible/un-enumerated vocabs (object_kinds.name/learning_realm, references.type,
//   compound_sets.consumer_module) = plain TEXT no CHECK ([[open-vocab-columns-take-no-sql-check]]).
// - references.url is [E] (a saved URL is knowledge content — KN-1 marks resource_urls [E]).
//   compound_sets.spec = [E] JSON as plain text (opaque blob). key_concepts/data_refs/media = json<T>.
//
// OUT (owned elsewhere / undesigned): DB-3 review engine (review_curves/method_bindings/
// review_events) CONSUMED; study_methods = a kind='study_method' ADR-008 registry partition
// (not a table); fts_knowledge = DB-8; knowledge notes = pages; Education rollup + syllabus-as-
// calendar = Education (KN-10); the compound-set AI-assist + OS automation surface = undesigned
// service (business-rules L78-80). @vida/types row-interface reconcile → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { STUDY_TOPIC_STATUS, TOPIC_DIFFICULTY, KNOWLEDGE_CONTAINER_TYPE, CARD_TYPE } from '@vida/types'
import { baseColumns, enumText, boolInt, json } from './_shared'

// --- knowledge_objects: the object (generalizes study_topics) ---------------
export const knowledgeObjects = sqliteTable(
  'knowledge_objects',
  {
    ...baseColumns,
    kind_id: text('kind_id').notNull(), // → object_kinds, no FK
    parent_object_id: text('parent_object_id'), // self-ref, no FK — THE hierarchy (BR-KN-1)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    /** @encrypted [E] — JSON array */
    key_concepts: json<string[]>('key_concepts'),
    mastery_level: integer('mastery_level'), // DERIVED, nullable (BR-KN-2)
    status: enumText('status', STUDY_TOPIC_STATUS), // FIXED → CHECK; nullable
    difficulty: enumText('difficulty', TOPIC_DIFFICULTY), // FIXED → CHECK; nullable
    is_exam_topic: boolInt('is_exam_topic').notNull().default(false),
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_knowledge_objects_parent').on(t.parent_object_id),
    index('idx_knowledge_objects_kind').on(t.kind_id),
  ],
)

// --- object_kinds: user-extensible kind registry ---------------------------
export const objectKinds = sqliteTable('object_kinds', {
  ...baseColumns,
  name: text('name').notNull(), // OPEN — user-extensible (seeds topic/concept/definition)
  learning_realm: text('learning_realm'), // OPEN — understand/memorize/user (KN-4)
  default_method_id: text('default_method_id'), // → ADR-008 registry, no FK, nullable
  is_default: boolInt('is_default').notNull().default(false),
  deleted_at: integer('deleted_at'),
})

// --- knowledge_containers: Module ⊃ Area ⊃ Subject org ---------------------
export const knowledgeContainers = sqliteTable('knowledge_containers', {
  ...baseColumns,
  container_type: enumText('container_type', KNOWLEDGE_CONTAINER_TYPE).notNull(), // FIXED → CHECK
  /** @encrypted [E] */
  name: text('name').notNull(),
  deleted_at: integer('deleted_at'),
})

// --- references: first-class Reference (K6, replaces resource_urls) ---------
export const references = sqliteTable(
  'references',
  {
    ...baseColumns,
    object_id: text('object_id'), // → knowledge_objects, no FK, nullable
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    source: text('source'),
    /** @encrypted [E] — a saved URL is knowledge content (KN-1: resource_urls [E]) */
    url: text('url'),
    type: text('type'), // OPEN — un-enumerated label (plaintext per KN-1)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_references_object').on(t.object_id)],
)

// --- compound_sets: per-consumer personalization bundle (KN-11) -------------
export const compoundSets = sqliteTable(
  'compound_sets',
  {
    ...baseColumns,
    consumer_module: text('consumer_module').notNull(), // OPEN
    /** @encrypted [E] */
    name: text('name'),
    /** @encrypted [E] — JSON: rules/methods/params (opaque blob at rest) */
    spec: text('spec'),
    is_default: boolInt('is_default').notNull().default(false),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_compound_sets_consumer').on(t.consumer_module)],
)

// --- knowledge_lab_entries: generate NEW knowledge (07-06) ------------------
export const knowledgeLabEntries = sqliteTable('knowledge_lab_entries', {
  ...baseColumns,
  /** @encrypted [E] */
  hypothesis: text('hypothesis').notNull(),
  data_refs: json<string[]>('data_refs'), // JSON own-module refs (plain — ref IDs, like media/object_id)
  /** @encrypted [E] */
  conclusion: text('conclusion'),
  promoted_object_id: text('promoted_object_id'), // → knowledge_objects on promote, no FK, nullable
  deleted_at: integer('deleted_at'),
})

// --- flashcards: content-only reviewable (ADR-005, BR-KN-7) -----------------
export const flashcards = sqliteTable('flashcards', {
  ...baseColumns,
  /** @encrypted [E] */
  front: text('front').notNull(),
  /** @encrypted [E] */
  back: text('back').notNull(),
  /** @encrypted [E] */
  hint: text('hint'),
  /** @encrypted [E] */
  explanation: text('explanation'),
  card_type: enumText('card_type', CARD_TYPE).notNull(), // FIXED → CHECK
  media: json<string[]>('media'), // image/audio refs (restore v1)
  is_suspended: boolInt('is_suspended').notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

// --- inferred row types ------------------------------------------------------
export type KnowledgeObjectRow = typeof knowledgeObjects.$inferSelect
export type KnowledgeObjectInsert = typeof knowledgeObjects.$inferInsert
export type ObjectKindRow = typeof objectKinds.$inferSelect
export type ObjectKindInsert = typeof objectKinds.$inferInsert
export type KnowledgeContainerRow = typeof knowledgeContainers.$inferSelect
export type KnowledgeContainerInsert = typeof knowledgeContainers.$inferInsert
export type ReferenceRow = typeof references.$inferSelect
export type ReferenceInsert = typeof references.$inferInsert
export type CompoundSetRow = typeof compoundSets.$inferSelect
export type CompoundSetInsert = typeof compoundSets.$inferInsert
export type KnowledgeLabEntryRow = typeof knowledgeLabEntries.$inferSelect
export type KnowledgeLabEntryInsert = typeof knowledgeLabEntries.$inferInsert
export type FlashcardRow = typeof flashcards.$inferSelect
export type FlashcardInsert = typeof flashcards.$inferInsert
