# DB-4 · Domain Group #10 Knowledge (+flashcards) · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #10 of 22 (P0 table #10) · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `022_knowledge` (v22) · **Schema file:** `schema/knowledge.ts` · **Branch:** `db-4-per-domain-schema`
**Reruns:** knowledge = parent context "reframed→aligned" (row 8, campaign Part 1); flashcards ✅ IMPLEMENTED (2026-07-24, SHIP — the narrowest unit). The ADR-realignment is DONE; DDL is this build's job ([[check-intake-and-reruns-before-triaging-a-design-pass-undone]]).

> The **largest, most-reframed group** — the "Knowledge Universe." 7 owned tables author the resolved reframe; 5 v2
> tables collapse into the generic engine + `pages` + `knowledge_objects`. Every shape is doc-determined; **zero
> build-decisions**. The genuinely-undesigned surfaces (AI-assist, OS automations, Education rollup, FTS5) are
> cited-not-authored per explicit "not designed" flags.

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/knowledge/{identity,business-rules,structure-data,contract,conventions}.md` + `knowledge/flashcards/{…}.md`
(both reruns done) · `ADR-002 §5.10` (STALE FACT floor: `study_topics` L2590, `flashcards` L2688, `knowledge_notes` L2748)
· ADR-005 (study-method service framework — retires flashcard SM-2) · `@vida/types` (`knowledge.ts` STUDY_TOPIC_STATUS/
TOPIC_DIFFICULTY) · `foundation/knowledge-review.ts` (the DB-3 review engine — CONSUMED) · `_registry.ts` · `database-layer/current-*.md`.

## §1. Identity — what this unit is
The Knowledge Universe — a general **knowledge-object** engine on the `Subject › Unit › Topic` spine (+ user kinds
below), a user-extensible **kind registry**, tag-based **containers**, first-class **references**, per-consumer
**compound sets**, a **knowledge lab**, and the content-only **flashcard** (Knowledge's reference study-method).
The `structure-data.md` roster is authoritative ([[module-doc-is-db4-roster-not-adr-broad-list]]); **ADR-002 §5.10 is
STALE** — `study_topics`/`topic_reviews`/`knowledge_notes`/`flashcard_decks`/`flashcard_reviews` are superseded.

### Scope boundary — doc-DECIDED
**AUTHOR (7 tables):** `knowledge_objects` · `object_kinds` · `knowledge_containers` · `references` · `compound_sets`
· `knowledge_lab_entries` · `flashcards` (content-only).

**RETIRE (not authored):** `flashcard_decks` · `flashcard_reviews` (→ review engine, ADR-005); `study_topics` →
`knowledge_objects`; `topic_reviews` → `review_events` (DB-3); `knowledge_notes` → `pages` (KN-5); `resource_type`
CHECK → `entity_links` (KN-6); `study_topics.resource_urls` → `references` (K6).

**OUT (owned elsewhere / undesigned — cited, not authored):**
- `review_curves`/`method_bindings`/`review_events` — **DB-3 substrate on disk** (`knowledge-review.ts`, migration 008), consumed.
- `study_methods` — **not a table**: a `kind='study_method'` partition of the ADR-008 capability registry (F2/D2, contract "thin wrappers over the one OS registry, not a parallel store").
- `fts_knowledge` — FTS5 → **DB-8** ("absent today", `[FACT: L3641-3670]`).
- knowledge notes → **`pages`** (KN-5, personalizable render, not a table).
- Education mastery rollup + **syllabus-as-calendar** — Education-owned forward dep (KN-10).
- Compound-set **AI-assist** (KN-C) + the **OS automation surface** (penalties/rewards/self-testing — "requires a
  cross-module automation/rules surface **not yet documented anywhere** — flagged, not designed", business-rules L78-80)
  → deferred service layer (the Skills X*/AI* precedent). Base tables authored; the automation/AI layer is not.

## §2. Business rules (the invariants this DDL must encode)
- **BR-KN-1 — the recursive spine.** `knowledge_objects.parent_object_id` (self-ref, no FK) IS the `Subject›Unit›Topic`
  + user-kinds hierarchy (KN-3); every object has `kind_id` → `object_kinds`. `[FACT: structure-data.md:35; KN-3]`
- **BR-KN-2 — mastery DERIVED, never hand-set.** `knowledge_objects.mastery_level` is nullable (service-computed at the
  leaf, rolls up the spine, KN-9); the §5.10 `NOT NULL DEFAULT 0` anti-signal resolved out. `[FACT: KN-9; §5.10:2599]`
- **BR-KN-3 — SM-2 cols RETIRED to the engine.** No `easiness_factor`/`repetition_number`/`interval_days`/`next_review_date`/
  `last_reviewed_at` on `knowledge_objects` OR `flashcards`; scheduling state is DB-3 `review_curves`/`method_bindings`/
  `review_events` (KN-8, ADR-005). `[FACT: structure-data.md:67-68; flashcards/structure-data.md:16-19]`
- **BR-KN-4 — cross-module reach via `entity_links`, tags via `entity_tags`, notes via `pages`.** No `course_id`/
  `linked_book_id`/`reading_chapter_id` FK (→ `entity_links`, KN-6); no inline tags (containers + tags via `entity_tags`,
  KN-7); no `resource_type` CHECK. `[FACT: KN-5/6/7]`
- **BR-KN-5 — no FK anywhere** (self-ref, `kind_id`, `default_method_id`, `promoted_object_id`, `object_id` all plain
  TEXT; §5.10 REFERENCES superseded, ADR-016 §3.4). `[FACT]`
- **BR-KN-6 — Education plans, Knowledge holds (KN-2).** Planning columns (`due_date`, `estimated_study_minutes`,
  `study_time_minutes`) and class/reading context (`class_date`, `reading_start_page`/`end_page`) are **NOT carried** onto
  `knowledge_objects` — they are Education-plan / Books-context, reached via `entity_links`. Knowledge holds only the
  acquired-knowledge intrinsics. `[FACT: KN-2; disclosed §5.1]`
- **BR-KN-7 — flashcards is content-only** (ADR-005): `front/back/hint/explanation` `[E]`, `card_type`, `media`,
  `is_suspended`, `sort_order`; NO `deck_id`, NO SM-2 cols, NO `is_mastered` (derived). Registered as a reviewable with
  Knowledge's engine. `[FACT: flashcards/structure-data.md:22-24]`

## §3. Structure — the 7 tables (P=plain · E=[E]; all `...baseColumns` + `deleted_at`, platform baseline)

**`knowledge_objects`** — the object (generalizes `study_topics`). `kind_id` P NN (→ object_kinds, no FK) ·
`parent_object_id` P null (self-ref, no FK) · `title` E NN · `description` E · `key_concepts` E json (JSON array) ·
`mastery_level` INT null (**derived**, BR-KN-2) · `status` (STUDY_TOPIC_STATUS, FIXED, null) · `difficulty`
(TOPIC_DIFFICULTY, FIXED, null) · `is_exam_topic` boolInt NN default 0 · `sort_order` INT NN default 0.
*(EXCLUDED survivors — BR-KN-6: course/book/chapter FK, resource_urls, resource_type, SM-2 cols, due_date,
estimated/study_time_minutes, class_date, reading_start/end_page.)*

**`object_kinds`** — user-extensible kind registry. `name` P NN (OPEN — user-extensible, seeds topic/concept/definition)
· `learning_realm` P (OPEN — understand/memorize/user, KN-4) · `default_method_id` P null (→ ADR-008 registry, no FK) ·
`is_default` boolInt NN default 0. *(No `parent_kind_id` — `[INTERP]` flat registry, disclosed §5.2.)*

**`knowledge_containers`** — Module⊃Area⊃Subject org. `container_type` (KNOWLEDGE_CONTAINER_TYPE, FIXED, NN) · `name` E
NN. *(Membership many-to-many via `entity_tags`, KN-7 — no `parent_id`.)*

**`references`** — first-class Reference (K6). `object_id` P null (→ knowledge_objects, no FK) · `title` E NN · `source`
E · `url` **E** (ZK: replaces `study_topics.resource_urls` which KN-1 marks `[E]` — a URL is saved knowledge content,
no per-column doc reclassifies it plain; F1) · `type` P (OPEN — un-enumerated label; kinds/realms/enums are plaintext per KN-1).

**`compound_sets`** — per-consumer personalization bundle (KN-11). `consumer_module` P NN (OPEN) · `name` E · `spec` E
json (rules/methods/params) · `is_default` boolInt NN default 0. *(Base table only — AI-assist/builder deferred, §1 OUT.)*

**`knowledge_lab_entries`** — generate new knowledge (07-06). `hypothesis` E NN · `data_refs` P json (own-module refs) ·
`conclusion` E · `promoted_object_id` P null (→ knowledge_objects on promote, no FK). *(Base table only — the real-time
automation/analysis layer is undesigned, §1 OUT.)*

**`flashcards`** — content-only reviewable (ADR-005, BR-KN-7). `front` E NN · `back` E NN · `hint` E · `explanation` E ·
`card_type` (CARD_TYPE, FIXED, NN) · `media` P json (image/audio refs) · `is_suspended` boolInt NN default 0 ·
`sort_order` INT NN default 0.

### Enum plan
- **REUSE (existing `knowledge.ts` tuples, FIXED CHECK + parity):** `STUDY_TOPIC_STATUS` (knowledge_objects.status) ·
  `TOPIC_DIFFICULTY` (knowledge_objects.difficulty).
- **NET-NEW (2 tuples → `@vida/types/knowledge.ts` + Zod, FIXED CHECK + parity):** `KNOWLEDGE_CONTAINER_TYPE`
  =[module,area,subject] · `CARD_TYPE` =[basic,reversed,cloze,image_occlusion].
- **OPEN no-CHECK (user-extensible / un-enumerated — [[open-vocab-columns-take-no-sql-check]]):** `object_kinds.name`,
  `object_kinds.learning_realm` (user-extensible, KN-4), `references.type`, `compound_sets.consumer_module`.
- **JSON-as-text:** `key_concepts`, `data_refs`, `media` = plain `json<T>`; `compound_sets.spec` = `text()` `[E]` (opaque
  blob, the Notes summary_config / Skills measurement_config precedent, P-2).

### ENTITY_TYPES registry additions
**ADD 4:** `knowledge_object` (links/tags target, KN-6/7; supersedes the roster's `study_topic`) · `knowledge_container`
(entity_tags membership, KN-7) · `reference` (linkable to objects) · `flashcard` (SP2, flashcards/structure-data.md:27
registers `entity_type='flashcard'`).
**EXCLUDE:** `object_kind`/`compound_set`/`knowledge_lab_entry` — registry/config/child entities addressed via their own
refs, not polymorphic pages/entity_links/entity_tags targets (the task_time_logs/junction precedent). Disclosed §5.5.
*(`knowledge_note` NOT added — notes are `pages` rows of an existing page `entity_type`, KN-5, not a knowledge table.)*

## §4. Acceptance
- [ ] 7 tables in `schema/knowledge.ts` + `migrations/022_knowledge.ts` (v22); runner registered; `LATEST_VERSION`=22.
- [ ] No FK; no `mastery_level NOT NULL DEFAULT 0`; no SM-2 columns on any table; no `deck_id`/`resource_type`.
- [ ] **4 FIXED-CHECK columns = 4 tuples** (all single-use — no LIFE_DOMAIN×2-style collapse, so columns==tuples here;
      2 reused + 2 net-new) parity-asserted; OPEN columns carry NO CHECK;
      `flashcard_decks`/`flashcard_reviews`/`study_topics`/`topic_reviews`/`knowledge_notes` NOT authored.
- [ ] 2 net-new enums APPENDED to existing `@vida/types/knowledge.ts` + Zod appended to existing
      `packages/core/src/validators/knowledge.ts` (both files already hold the reused tuples); parity rows added.
- [ ] `ENTITY_TYPES += knowledge_object·knowledge_container·reference·flashcard` (4).
- [ ] Phase-5 DDL-introspection test (all 4 dims × 7 tables); `@vida/core` green; typecheck 11/11; eslint 0.
- [ ] §XXIX `database-layer/current-*` promoted (BR-KN-1…7).

## §5. Disclosed calls (critic VERIFIES, not catches)
1. **`knowledge_objects` column derivation (the heavy call)** — carried the Knowledge-intrinsic `study_topics`
   survivors (`title`/`description`/`key_concepts`/`status`/`difficulty`/`is_exam_topic`/`sort_order`) + reframe
   (`kind_id`/`parent_object_id`/derived `mastery_level`); EXCLUDED the Education-plan/Books-context cols per KN-2
   (`due_date`/`estimated_study_minutes`/`study_time_minutes`/`class_date`/`reading_start/end_page`) and the
   explicitly-retired (FK refs/resource_urls/resource_type/SM-2). Sound, or over/under-carried?
2. **`object_kinds.parent_kind_id` OMITTED** — `[INTERP]` "flat registry may suffice" (contract + No-Guessing).
3. **`compound_sets`/`knowledge_lab_entries` = base tables only** — the AI-assist + automation layers are explicitly
   "not designed anywhere" (business-rules L78-80); base shape from the contract. Author-now correct vs defer-whole-table?
4. **`media`/`data_refs` = plain `json`, `spec` = `text() [E]`** — media/refs un-marked `[E]`; spec is a config blob.
   **`references.url` = `[E]`** (F1 fix, gate-1): the content `references` replaces (`resource_urls`) is `[E]` under
   KN-1 — a URL is saved knowledge content; no doc reclassifies it plain. `references.type` stays plain (a label).
5. **ENTITY_TYPES: 4 added, 3 excluded** (object_kind/compound_set/knowledge_lab_entry = non-target). Correct?
6. **`card_type` / `container_type` FIXED closed-set** vs OPEN — both are closed structural vocabularies (not user-extensible), unlike `object_kinds.name`/`learning_realm`. Correct?

## §5b. Preflight folds (completeness — applied)
- **P-1 — parity = 4 CHECK columns = 4 tuples** (all single-use). No tuple/column mismatch (the Skills 14/11 case
  doesn't arise). Fixture in `validators/enum-parity.test.ts`; migration applied there via `migration022Knowledge.up`.
- **P-2 — enum home:** `CARD_TYPE` + `KNOWLEDGE_CONTAINER_TYPE` APPEND to existing `knowledge.ts` (alongside
  STUDY_TOPIC_STATUS/TOPIC_DIFFICULTY); Zod appends to existing `validators/knowledge.ts`. Not new files.
- **P-3 — `references.url` `[E]`** (F1, gate-1). `compound_sets.spec` = `text() [E]`; `key_concepts`/`data_refs`/`media`
  = plain `json<T>`.
- **P-4 — indexes** on hot refs: `idx_knowledge_objects_parent` (parent_object_id) · `idx_knowledge_objects_kind`
  (kind_id) · `idx_references_object` (object_id) · `idx_compound_sets_consumer` (consumer_module). Engineering
  convention (the study_topics idx precedent), not a roster mandate.
- **P-5 — no invented UNIQUE / natural key.** The roster is silent on any UNIQUE for these net-new tables; add none
  (No-Guessing). The v2 `study_topics` had no natural-key UNIQUE either.
- **P-6 — `flashcards` gains `deleted_at`.** The §5.10 FACT floor omitted it (only created/updated), but platform
  baseline soft-delete applies to all syncable tables → `...baseColumns` + `deleted_at`, schema-consistent with the group.
- **P-7 — P5 test:** `db/tests/knowledge-introspection.test.ts`, mirroring the Skills/Finance introspection (4 dims × 7 tables).
- **P-8 — no seed rows.** `object_kinds.is_default` (topic/concept/definition seeds) is a first-run app concern — the
  migration authors the column, NOT seed INSERTs.

## §6. Out of scope (explicit)
DB-3 review engine · ADR-008 `study_methods` registry · DB-8 `fts_knowledge` · `pages` knowledge notes · Education
rollup/syllabus-as-calendar · the compound-set AI-assist + OS automation surface · `@vida/types` row-interface reconcile
→ **DB-11**. All cited, none authored.
