<!-- Learning umbrella index — the Learning domain is documented as 3 SUB-CONTEXTS, each with the
     canonical 5 aspects (decision 2026-07-01: token discipline — one context per pass). Skills was EXTRACTED
     as its own module (see ../../intake/_scope-reconciliation-v1.md); BOOKS was EXTRACTED as its own module
     2026-07-03 (see ../../intake/books.md); KNOWLEDGE was EXTRACTED as its own module 2026-07-10 (see
     ../../intake/knowledge.md). Language is separate (Wave 3). -->

# Learning — Vida Platform (umbrella)

The Learning domain is documented as **3 sub-contexts**, each a full feature context with the canonical 5
aspect docs:

| Sub-context | Status | Tables | Docs |
|---|:---:|---|---|
| **Education** (renamed from "Courses & Classes", 2026-07-02) | ✅ | `courses`(=subjects) · `ics_feed_configs` · `ics_synced_events` (+ large INTENDED hierarchy) | [education/](education/) |
| Study Sessions & Planner | ⬜ | `study_sessions` + §5.11 planner (5 tables) | — |
| Flashcards | ⬜ | `flashcard_decks` · `flashcards` · `flashcard_reviews` | — |

- **Knowledge** (`study_topics`/`topic_reviews`/`knowledge_notes`) was **extracted** into [its own module](../knowledge/)
  (2026-07-10): the knowledge Universe — the user's lifelong catalog, the most-personalizable module — where
  Education *plans* acquisition and Knowledge *holds/transforms/creates* it. Serves consumer modules
  (Education/Skills/Finance/Health/…) via per-consumer **compound sets**, and provides Education a mastery
  **measurement source** (KN-10). `[FACT: ../../intake/knowledge.md]`
- **Books** (`books`/`book_chapters`) was **extracted** into [its own module](../books/) (2026-07-03): a full
  reading Universe (all reading — learning + enjoyment) with a **partition serving Learning** via the
  Books↔Education API (`book_subjects`), the Tasks↔Education pattern. `[FACT: ../../intake/books.md]`
- **Skills** (`skills`/`skill_resources`) was **separated** into its own module — the v2 tables are a downgraded
  version of a larger envisioned module. `[FACT: ../../intake/_scope-reconciliation-v1.md]`
- **Education is the hub**: Knowledge objects link to Education's planning Topics (KN-2/KN-10), Study Sessions
  target subjects, homework are education-tasks, and the Books module's partition links books to subjects.
  Document the siblings against Education's contract.
