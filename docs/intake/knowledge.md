# Intake — Knowledge  (level: Feature / OWN MODULE — extracted from Learning, mirrors Books precedent)
<!-- /documentation Phase 1 (Intake). EXTRACTED to own module 2026-07-10 (Victor); renamed
     learning-knowledge.md → knowledge.md. Was "Learning sub-context 2/4". No-Guessing: every claim cited. -->
Context: features/knowledge (Wave 2 — OWN MODULE; the knowledge Universe; companion to Education/Skills/Finance/Health/Languages)
Sources: v2 (ADR-002 §5.10 L2557-2621 + L2715-2738 + schema.ts L721-759, L809-825 + CLAUDE.md §7) · v1 (life-os KnowledgeHubPage + studyTopicsApi + types/learning.ts) · user intent
Session: 2026-07-05 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 3 tables** `[FACT: ADR-002 L2557-2621, L2715-2738; schema.ts L721-759, L809-825]`:
- `study_topics`: `course_id` (→ subjects, SET NULL) · `linked_book_id` · `reading_chapter_id` · `title`[E] ·
  `description`[E] · `status`{not_started,in_progress,reviewing,mastered} · `mastery_level` 0-100 ·
  `difficulty`{easy,medium,hard,very_hard} · `due_date` · `is_exam_topic` · `study_time_minutes` ·
  `estimated_study_minutes` (def 30) · `key_concepts`[E] JSON · `resource_urls`[E] JSON · `sort_order` ·
  **SM-2 state** (`easiness_factor` 2.5, `repetition_number`, `interval_days`, `next_review_date`,
  `last_reviewed_at`) · class context (`class_date`, `reading_start_page`, `reading_end_page`).
  Indexes: by course, by next_review_date (partial, not-deleted). `[FACT: L2557-2602]`
- `topic_reviews`: `topic_id` (CASCADE) · `quality` 0-5 · `response_time_seconds` · `reviewed_at`. All P;
  **no created_at/updated_at/deleted_at** (id + sync columns only). `[FACT: L2608-2621; schema.ts L752-759]`
- `knowledge_notes`: `parent_note_id` self-ref (SET NULL) · `resource_type` CHECK **('course','book','topic')**
  · `resource_id` · `title`[E] · `content`[E] · `topic`[E] · `subtopic`[E] · `tags`[E] JSON · `is_pinned` ·
  `is_archived`. `[FACT: L2715-2738]`

**Cross-cutting facts:**
- `study_topic` and `knowledge_note` are valid `entity_links` note targets. `[FACT: ADR-002 L1342-1347]`
- **FTS5 does NOT cover knowledge**: virtual tables exist only for pages/tasks/contacts/courses. `[FACT: L3641-3670]`
- **0 lines of logic**: `packages/core/src/models/learning.ts` is empty; schema only. `[FACT: wc -l = 0]`
- Dependency graph: `courses → study_topics → topic_reviews`. `[FACT: L3752]`

**Intent (CLAUDE.md §7 — Knowledge Section):** topics, **definitions**, **concepts** per class, each with
standalone pages; **Notes, References & Book Pages** linked to each topic/definition/concept; **All Knowledge
Page** — "all knowledge management across classes, books, skills, languages"; Topic/Definition/Concept
standalone pages **with relationship links to classes, books, skills, languages**. `[FACT: CLAUDE.md §7]`

## Docs existentes incorporados (D5b)
- `docs/features/learning/README.md` (umbrella): Knowledge = the 3 tables above; **Education is the hub**
  ("Knowledge topics belong to subjects"); Skills REMOVED from this sub-context (own module). `[FACT]`
- `docs/features/learning/education/`: the 8-level hierarchy **ends in Subject → Module → Topic**; the
  Education Hub carries **Modules/Units + Topics tabs**; Education's identity marks Knowledge as sibling —
  "Knowledge (**topics' content**)". ⚠ Education's INTENDED entity list has **no `modules`/`topics` tables**
  — the ownership boundary between hierarchy-Topic and `study_topics` is UNRESOLVED (→ K2).
  `[FACT: education/identity.md L6,L37; structure-data.md L17-33,L47-48]`
- `docs/features/books/contract.md`: Knowledge consumes Books via `study_topics.linked_book_id` /
  `reading_chapter_id`; book annotations/quotes are **Books-owned**. `[FACT: books/contract.md L49]`

## B. WHAT v1 DID — life-os (legacy; context, never decision)
`[FACT: life-os src/features/learning + types/learning.ts]`
- **Knowledge Hub page**: 4 tabs — dashboard · topics · by-course · **review** — with status/difficulty/review
  filters, search, sort, grouped-by-course view, import modal. `[FACT: KnowledgeHubPage.tsx L52-75, L202]`
- **v1 StudyTopic extras dropped by v2**: `tags[]` · `linked_book_ids[]` (MANY books per topic; v2 = single
  FK) · `study_notes` inline · `import_source`{syllabus,toc,schedule,csv,manual} · `total_study_time`.
  `[FACT: types L291-327]`
- **SM-2 review flow on topics existed** (ReviewSessionModal + review tab + due-soon queries). `[FACT]`
- **studyTopicsApi behaviors**: due-soon window queries · `logStudyTime` (accumulates minutes) · **bulk
  import** (syllabus/TOC/CSV) · drag reorder (`order_index`) · bulk due-date updates. `[FACT: studyTopicsApi.ts]`
- **v1 KnowledgeNote = TYPE ONLY — never built** (no API, no UI, no table usage). Its design was RICHER than
  v2's table: `content_format` · `source_reference` (page/chapter/timestamp of source) · `skill_ids[]` ·
  `word_count` · `reading_time_minutes`. `[FACT: grep — type appears only in types files]`
- v1 had **no definitions/concepts entities** — CLAUDE.md's topics/definitions/concepts triad was never
  implemented in either version. `[FACT: v1 grep; v2 schema]`

## ⚠⚠ SCOPE REFRAME (Victor, 2026-07-05) — KNOWLEDGE = OWN MODULE (knowledge Universe)
Original K1–K12 below are SUPERSEDED where they assumed a Learning sub-context; reshaped as KN-series.
`[INTENT: Victor 2026-07-05]`
- **Knowledge is a standalone module**: the user's lifelong knowledge catalog across ALL life areas — the
  third extraction from Learning (after Skills, Books). Learning drops to 3 sub-contexts.
- **v1 was minimal + nerfed**: Education-only, organization hard-coded on the Ultralearning book's
  principles for Victor's own needs. v2 intent: **flexible + personalizable** — the user shapes their own
  organization; principles/entities are interchangeable and interconnected building blocks, never imposed.
- **Companion/helper to heavy-consumer modules** — Education, Skills, Finance, Health, Languages, … — each
  with a **compound set** (tailored partition serving that module; Books→Education pattern per consumer).
- **Notebooks metaphor**: study in many areas, describe + catalog one's knowledge ("develop the arsenal"),
  and **see progress within each area**.
- **Interconnected with the majority of modules** so information stays rich and precise as it is shaped.

### Reframe deepened (Victor, 2026-07-06) `[INTENT]`
- **Defaults + total personalization**: object types ship with a default setup; the user reshapes the
  organization per module / area / even per specific subject — how he studies, catalogs, uses, and WRITES
  his knowledge. **The most personalizable module in the OS.**
- **~~Community setup sharing~~ CORRECTED (Victor, 2026-07-06): NO community within the OS**, and none
  encouraged (user-safety risk). Users can **mimic and follow steps** to build their own setups per area /
  module / subject — reproducible setups, not a social surface. (Prior ZK-sharing flag dissolves: nothing
  is published from within the OS.)
- **Pluggable, mixable study methods**: flashcards, Feynman, etc. as composable building blocks; adapts to
  learner types (visual / practical / photographic memory / mixed) — methods can be MIXED.
- **Personalizable curves**: decay, review, and test curves are user-tunable → SM-2 becomes one preset in a
  pluggable scheduling family (supersedes the fixed SM-2 columns as THE model).
- **OS-level integration automations** (user-wired): financial penalties on misses · self-generated
  revenue/rewards on adherence (Finance + Gamification) · self-testing · real-time analysis of own data
  against own assumptions/theories per realm.
  ⚠ Forward dep: requires a cross-module automation/rules surface not yet documented anywhere.
- **The Knowledge Lab**: a user-assembled lab to GENERATE new knowledge — hypotheses/theories + live own-module
  data + conclusions that become catalog entries.

### KN-A RESOLVED — the Education↔Knowledge boundary (Victor, 2026-07-06) `[INTENT]`
- **Education = planning the acquisition**: prepare/plan/organize HOW knowledge will be acquired — steps,
  goals, objectives, contents needed for assessments, homework dates, needed study sessions. It structures
  the path (as an institution does), for formal AND self-taught alike.
- **Knowledge = the learning itself**: acquiring information, **transforming + interpreting** knowledge, and
  **creating new** knowledge — where the user follows the guidelines but **shapes and creates his own
  method**. This method-shaping + knowledge-holding is the module's SOLE role; Education never does it.
- `[INTERP — to validate]` Structural consequence: Education's hierarchy Topic remains an **Education
  planning artifact** (what must be learned, curriculum placement); Knowledge objects are **separate
  entities** (the actual acquired/interpreted knowledge) linked to those artifacts via the Education
  compound set. Two entities, linked — never one shared table.

## C. GAP MAP — genuine unknowns (Victor's intent; not answerable from sources)
K1 — ⚠⚠ **Knowledge object ontology**: CLAUDE.md names THREE kinds — topics, **definitions**, **concepts** —
     each with standalone pages. v2 has only `study_topics`. One entity with a `kind` discriminator, or
     three entities? What IS a definition / a concept structurally (term + meaning? always under a topic,
     or free-standing)?
K2 — ⚠⚠ **Boundary with the Education hierarchy**: Education's levels end Subject → **Module → Topic** and
     its Hub has Modules/Units + Topics tabs, but Education declares no topic table and calls Knowledge
     "topics' content". Is the hierarchy's Topic THE SAME entity as `study_topics` (one entity: placement
     owned by Education, content/mastery owned by Knowledge)? And do topics route through **Module**
     (`module_id`) instead of directly to the subject (`course_id` today)?
K3 — ⚠ **`knowledge_notes` vs Notes & Pages**: platform convention = all notes via `pages` +
     `entity_links`; v1 designed KnowledgeNote but never built it. Is `knowledge_notes` a DISTINCT object
     (an atomic "knowledge card" richer than a note), or should topic/definition/concept notes be `pages`
     and the table be retired/reshaped?
K4 — ⚠ **Cross-module reach**: intent says knowledge spans classes, books, **skills, languages** — but
     `resource_type` CHECK allows only ('course','book','topic'), and Skills/Language are separate modules.
     How do knowledge objects relate cross-module — expand `resource_type`, or `entity_links`
     relationship links (graph-style), or both?
K5 — ⚠ **Topic-level SM-2 vs Flashcards**: two SM-2 systems exist (topic_reviews + flashcard_reviews).
     Keep topic-level review (v1 review tab: self-assess the topic 0-5) alongside Flashcards drills? Is
     `mastery_level` DERIVED from reviews or user-set?
K6 — **References**: "Notes, References & Book Pages" — today references = `resource_urls`[E] JSON. Is a
     Reference first-class (title, url/source, type, own page-section) or does the URL array suffice?
K7 — **Views**: the All Knowledge Page (grouping/filtering across subjects/books/…) + standalone pages per
     knowledge object — what sections do they carry? How does the Knowledge surface relate to the Education
     Hub's Topics/Modules tabs (same data, two surfaces)? Neural graph inclusion?
K8 — **`is_exam_topic` vs Education assessments**: with Education's `assessments` entity INTENDED, does the
     boolean give way to a topic↔assessment LINK ("this topic is covered by exam X")?
K9 — **Auto-population intent**: CLAUDE.md auto-record/auto-linking (topics from syllabus/TOC/schedule; v1
     import_source + bulk import). Describe the intended behavior (what creates topics automatically, from
     what sources) — extension-model applies (device-side parsing, opt-in); maturity flagged, not asked.
K10 — **Mastery rollup**: does topic mastery roll UP the hierarchy (Topic → Module → Subject → Program
     "acing/lacking" on the Programs Dashboard, Education A2)? Does Education's measurement consume
     Knowledge mastery as a source type?
K11 — **Search**: knowledge objects are absent from FTS5. In-scope to search them (fts_knowledge)?
K12 — **Tags**: `knowledge_notes.tags`[E] inline + v1 topic tags → shared scoped tags (the platform
     migration pattern)?

### KN-B RESOLVED — containerized organization (Victor, 2026-07-06) `[INTENT]`
- A real **container entity** exists (naming TBD — "notebooks" was a working metaphor, not binding): the
  containerized organization of the **subjects, modules, and areas** the user maintains for acquiring
  information.
- Hierarchy: **Module ⊃ Area ⊃ Subject** — with **many-to-many membership at every step**: many subjects
  nest in areas, many areas nest within modules, and **one area can belong to multiple modules** (e.g., a
  "Statistics" area serving both Finance and Education).
- **Nesting is expressed via the TAG SYSTEM** (not a rigid parent_id) and rendered through **different
  views** — the same containers regroupable per view. Containers are self-contained.
- `[INTERP — to validate]` This lands on the hybrid model: container entity + link/tag-based multi-membership
  (Relationships network_groups junction pattern), with the tag system as the nesting mechanism.

### KN-C RESOLVED — compound sets are USER-BUILT via a builder, with a shipped default (Victor, 2026-07-06) `[INTENT]`
- Compound sets ARE the personalization layer → **user-built, with a proper BUILDER**: rules + "every inch
  of personalization" — the user's different methods, applications, parameters — so every bit of
  information is endorsed for his own use.
- **AI integrations ease the personalization load** (e.g., Claude) — strictly under the OS's established
  safety rules (extension-model: opt-in, consent-gated, user-owns-risk; ties to the AI-under-ZK ADR backlog
  item).
- **A default compound set ships** for users who don't want the full power — no forced personalization time
  (anti-lost principle, defaults always shipped — ED-15 family).
- "Modules" in KN-B confirmed = **OS modules** (an Area like Statistics can serve Finance AND Education).

## D. GAP RESOLUTIONS (Victor, 2026-07-10) — intake made WHOLE
`[INTENT: Victor 2026-07-10 unless cited]`

**EXTRACTION CONFIRMED** — Knowledge = OWN MODULE, mirror the Books precedent exactly: own folder
`docs/features/knowledge/`, own umbrella, features-index row, and **Learning drops 4 → 3 sub-contexts**
(Education, Study Sessions & Planner, Flashcards); learning umbrella updated to 3 + pointer to Knowledge.

**K1 RESOLVED — user-extensible KIND HIERARCHY below Topic, with a learning-realm per kind.**
- The **Topic** is the top-level knowledge object. **Below it the user builds his OWN hierarchy of knowledge
  kinds.** The kinds Victor seeded come from the **Ultralearning method** — his own study components / how he
  views the world — and ship as *defaults*, never imposed.
- Two seeded default kinds, distinguished by **learning realm**:
  - **Concept** = an *idea within knowledge that has a form* — **a thing to be UNDERSTOOD**, not something
    defined. (realm: **understanding**)
  - **Definition** = an explanation/meaning **to be MEMORIZED**. (realm: **memorization**)
- The user can **infer/create new kinds** anywhere down the hierarchy — "the full explanation of how he
  nurtures and writes down his knowledge." So the data model is **one flexible knowledge-object entity with a
  user-extensible `kind`** (self-referential hierarchy, parent kind → child kinds), and **each kind carries a
  `learning_realm`** (understand | memorize | … user-definable).
- ⭐ **K1↔K5 bridge:** `learning_realm` DRIVES the default study method — memorization kinds → spaced-rep
  drills (Flashcards family); understanding kinds → elaboration methods (Feynman/self-assessment). Default,
  user-overridable (K5).

**K3 RESOLVED (revises earlier INTERP) — knowledge note = a Pages entity-type, NOT a separate table.**
- A knowledge note is "nothing more, nothing less than a note & page **with a specific type and UI/UX only
  for this entity**" — Knowledge gets **its own entity within Notes & Pages** (the platform `pages` +
  `entity_type`/`entity_id` polymorphic pattern), **alike but not the same as Tasks** (task-notes precedent).
- The type's **UI/UX is shapeable/personalizable** per the user's knowledge organization for the entities.
- ⇒ the standalone `knowledge_notes` table **retires into `pages`** (with a knowledge-specific `entity_type`
  + personalizable render). Aligns with the platform convention "no inline notes; all notes via `pages`".

**K4 CONFIRMED** — cross-module reach via **`entity_links` graph relationships**; **retire the narrow
`resource_type` CHECK** (`course`/`book`/`topic`) — it can't scale to skills/languages/finance/health/….

**K5 RESOLVED — pluggable methods/curves at EVERY level, per user need.**
- Not just topics: **areas · subjects · units · topics · and the user-created kinds** each get independently
  configurable study/review methods + decay/review/test curves. The user **mixes methods and infers his own
  patterns** per organization level and per entity. SM-2 = one preset in the pluggable scheduling family.
- `mastery_level` is **DERIVED** from whichever active methods report, not manually set (curves are tunable).

**⭐ MASTERY ENVIRONMENT HIERARCHY (Victor, 2026-07-10) — `Subject › Unit › Topic`.** The path *to reach* a
Topic is the fixed academic spine **Subject › Unit › Topic** — "very important for the environment of the
knowledges." **Above** Topic: Unit, then Subject (= the container-org leaf, KN-B). **Below** Topic: the
user-defined kinds (concept/definition/…, K1). Mastery **derives at the leaf and rolls UP**:
`kind → Topic → Unit → Subject → (Program via Education)`. Study methods/curves bind at any spine level (K5).
Corrects the earlier "Topic is the top object" framing — Topic is the top of the *user-extensible* hierarchy,
not the absolute top. `[INTENT: Victor 2026-07-10]`

**K10 RESOLVED — Knowledge mastery is an Education measurement SOURCE, compounded from 3 signals.**
- Education's measurement consumes Knowledge mastery as a source type (Books→Education partition pattern),
  compounded from: **(1) topic/object mastery** + **(2) assessment results** + **(3) pace-vs-syllabus** —
  whether the student acquires information on schedule or **faster than the subject's syllabus** presents.
- ⚠ **NEW forward-linked entity (Education-owned):** the **subject SYLLABUS as "the calendar of the
  subject"** — the ordered plan the pace signal measures against. Education entity; Knowledge's measurement
  contract references it. Forward dep on Education's measurement design pass. `[INTENT]`

**K6–K12 — INTERP defaults APPLIED (Victor did not redirect; flagged for build-time views review):**
- **K6 References** → first-class Reference object (title · source · type), not just a `resource_urls` array.
- **K7 Views / All Knowledge Page** → **INTENDED-IMMATURE** (needs Skills/Languages/Health documented);
  ship graceful defaults now; refine at build (per-module views review pass, backlog).
- **K8 `is_exam_topic`** → gives way to a **topic↔assessment LINK** once Education's `assessments` exists.
- **K9 Auto-population** (topics from syllabus/TOC/schedule; v1 import_source + bulk import) → device-side
  parsing, **opt-in, extension-model**; captured intent, maturity-flagged.
- **K11 Search** → add **`fts_knowledge`** (knowledge objects currently absent from FTS5).
- **K12 Tags** → confirmed by KN-B: the **shared scoped tag system IS the container-nesting mechanism**
  (Module⊃Area⊃Subject multi-membership via tags); knowledge inline `tags` migrate to shared scoped tags.

## Status
- [x] intake "whole" — all gaps resolved or logged (K1/K3/K4/K5/K10 resolved 07-10; K6–K12 INTERP defaults applied)
- [x] EXTRACTION confirmed → own module `docs/features/knowledge/`; Learning → 3 sub-contexts
- [x] prose role: n/a — context was never `ambiguous` (schema-defined feature context)
