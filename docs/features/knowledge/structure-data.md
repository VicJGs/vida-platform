<!-- Structure & Data — features/knowledge · /documentation Phase 2 · sources: ADR-002 §5.10 Learning (study_topics L2557-2621, knowledge_notes L2715-2738) · schema.ts L721-759,L809-825 · intake -->

# Structure & Data — Knowledge (level: Feature / own module)

## Data model — FACT base: 3 tables `[FACT: ADR-002 §5.10 Learning: study_topics L2557-2621; knowledge_notes L2715-2738; schema.ts L721-759, L809-825]`

| Table             | Purpose                  | `[E]` fields                                    | Key constraints                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `study_topics`    | the study/knowledge unit | title, description, key_concepts, resource_urls | `course_id`→subjects SET NULL; `linked_book_id`; `reading_chapter_id`; `status` CHECK(4); `mastery_level` 0-100; `difficulty` CHECK(4); `is_exam_topic`; SM-2 cols (`easiness_factor` 2.5, `repetition_number`, `interval_days`, `next_review_date`, `last_reviewed_at`); `class_date`/`reading_start_page`/`reading_end_page`; idx by course + partial by next_review_date |
| `topic_reviews`   | one SM-2 review event    | — (all plaintext)                               | `topic_id` CASCADE; `quality` 0-5; `response_time_seconds`; `reviewed_at`; **no created/updated/deleted** (id + sync only)                                                                                                                                                                                                                                                  |
| `knowledge_notes` | atomic knowledge note    | title, content, topic, subtopic, tags           | `parent_note_id` self-ref SET NULL; `resource_type` CHECK(**course/book/topic**); `resource_id`; `is_pinned`; `is_archived`                                                                                                                                                                                                                                                 |

- `study_topic` and `knowledge_note` are valid **`entity_links`** targets. `[FACT: ADR-002 L1342-1347]`
- **FTS5 does NOT cover knowledge** — virtual tables exist only for pages/tasks/contacts/courses. `[FACT: L3641-3670]`
- Dependency graph today: `courses → study_topics → topic_reviews`. `[FACT: L3752]`
- **0 lines of logic**: `packages/core/src/models/learning.ts` empty; schema only. `[FACT: wc -l = 0]`

## ⚠ INTENDED model (the reframe — a large ADR-002 amendment) `[INTENT: KN-A/B/C + K1/K3/K4/K5/K10]`

**The FACT base survives, reinterpreted:** `study_topics` becomes the **`topic`-kind** row of a general
knowledge-object entity; its SM-2 columns become **one scheduling preset's state** (KN-8); `mastery_level`
becomes **derived** (KN-9); `topic_reviews` generalizes to a review-event log across methods; `knowledge_notes`
**retires into `pages`** (KN-5); the `resource_type` CHECK **retires** in favor of `entity_links` (KN-6).

**⭐ The knowledge environment hierarchy — `Subject › Unit › Topic` (Victor 2026-07-10).** This is the fixed
academic spine _to reach_ a Topic — "very important for the environment of the knowledges." Above a Topic sit
**Unit** then **Subject** (Subject = the leaf of the container org, KN-B); **below** a Topic attach the
user-defined kinds (concept/definition/…, KN-3). All of `Subject`/`Unit`/`Topic`/kinds are `knowledge_objects`
chained by `parent_object_id`. **Mastery derives at the leaf and rolls UP the spine: kind → Topic → Unit →
Subject** → (Program, via Education's measurement, KN-10). Study methods/curves bind at any level of this spine
(KN-8). `[INTENT: Victor 2026-07-10]`

| New / reshaped entity        | Role                                                                                                                                                                     | Key points                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `knowledge_objects`          | the object (generalizes `study_topics`)                                                                                                                                  | `kind_id` → `object_kinds`; **`parent_object_id` self-ref — THE stated hierarchy** ("a whole hierarchy of entities below topics", K1); `title`[E]/`description`[E]; `mastery_level` **derived** (KN-9); links out via `entity_links` (KN-6)                                                        |
| `object_kinds`               | the user-extensible kind registry                                                                                                                                        | `name`; `learning_realm` (`understand`/`memorize`/user); `default_method_id`; `is_default` (seeds: **topic**, **concept**=understand, **definition**=memorize); `parent_kind_id?` self-ref `[INTERP — whether the kind registry itself nests vs. stays flat is an open choice; validate at build]` |
| `knowledge_containers`       | Module ⊃ Area ⊃ Subject organization                                                                                                                                     | `container_type` (`module`/`area`/`subject`); membership is **many-to-many via the `entity_tags` primitive** (ADR-006 SP1, scoped), NOT `parent_id` (KN-7); Areas may belong to multiple OS-modules                                                                                                |
| `study_methods`              | `kind='study_method'` partition of the OS capability registry (ADR-008), **not a parallel base table** (F2/D2); review engine (curves/bindings/events) stays Knowledge's | flashcards · Feynman · self-test · … ; composable/mixable; bound per level (KN-8)                                                                                                                                                                                                                  |
| `review_curves`              | personalizable scheduling curves                                                                                                                                         | decay/review/test curves; **SM-2 = one preset**; user-tunable (KN-8/KN-9)                                                                                                                                                                                                                          |
| `method_bindings`            | which method+curve applies where                                                                                                                                         | polymorphic target (area/subject/unit/topic/kind); resolves the default from `learning_realm` (KN-4)                                                                                                                                                                                               |
| `review_events`              | generalizes `topic_reviews`                                                                                                                                              | `object_id` (or level ref) · `method_id` · `quality`/signal · `reviewed_at`; feeds derived mastery                                                                                                                                                                                                 |
| `compound_sets`              | per-consumer personalization bundle                                                                                                                                      | rules + methods + params; **built in a builder**; a **default ships** (KN-11); one per consumer module (Education/Skills/Finance/…)                                                                                                                                                                |
| `references`                 | first-class Reference (K6)                                                                                                                                               | `title` · `source`/`url` · `type`; replaces the `resource_urls`[E] JSON array; linkable to objects                                                                                                                                                                                                 |
| knowledge note → **`pages`** | the object's written content (KN-5)                                                                                                                                      | `pages` row, knowledge-specific `entity_type`, personalizable render; via `entity_links`                                                                                                                                                                                                           |
| `knowledge_lab_entries`      | generate NEW knowledge                                                                                                                                                   | hypothesis/theory + live own-module data refs → conclusion → promotes to a catalog object `[INTENT 07-06]`                                                                                                                                                                                         |
| `fts_knowledge`              | full-text search (K11)                                                                                                                                                   | FTS5 virtual table over object/note text (absent today)                                                                                                                                                                                                                                            |

**Cross-module measurement contract (KN-10).** Knowledge exposes a mastery **source** compounded from object
mastery + assessment results + **pace-vs-syllabus**; **Education owns the rollup** and the **syllabus-as-
calendar** entity (Education-owned, forward dep). `[INTENT K10]`

**Sync.** Structured rows sync **LWW**; page content follows the Yjs-per-page path; large refs via the
attachment pipeline. `[FACT: ADR-003]`

## Relationships

- `knowledge_objects` ⊳ self (`parent_object_id`) — **the user's stated entity hierarchy under Topic** (K1).
- `object_kinds` — flat user-extensible registry (`learning_realm` per kind); optional `parent_kind_id` is `[INTERP]`, not stated.
- `knowledge_objects` ⊳ self (`parent_object_id`); → `object_kinds`; ⇄ courses/books/skills/languages/… via
  `entity_links` (KN-6); ↦ `pages` for notes (KN-5); ↦ `references`.
- `knowledge_containers` ⇄ objects/subjects via **`entity_tags`** (ADR-006 SP1, scoped; many-to-many, KN-7).
- `method_bindings` → `study_methods` + `review_curves`, targeting any level; `review_events` → objects/levels.
- `compound_sets` → a consumer module; Education reads Knowledge mastery as a measurement source (KN-10).

## Migration landmines (from FACT base)

- `knowledge_notes` table + its `resource_type` CHECK are **superseded** (→ `pages` + `entity_links`). Don't
  build against them. `[FACT superseded: L2715-2738]`
- `study_topics` fixed SM-2 columns + hand-settable `mastery_level` are **superseded** by the pluggable
  method/curve family + derived mastery. `[FACT superseded: L2565, L2570-2590]`
- `study_topics.resource_urls`[E] JSON → first-class `references` (K6). `[FACT superseded: L2568]`
- Single `linked_book_id` FK → many-books-per-object via `entity_links` (restores v1's `linked_book_ids[]`).
  `[FACT: v1 types L291-327; superseded single FK L2560]`
