<!-- Learning umbrella index — the Learning domain is now ONE SUB-CONTEXT (Education). The rest were extracted:
     Skills → own module (../../intake/_scope-reconciliation-v1.md); BOOKS → own module 2026-07-03
     (../../intake/books.md); KNOWLEDGE → own module 2026-07-10 (../../intake/knowledge.md); SESSIONS &
     SCHEDULING → foundation module 2026-07-12 (../sessions-and-scheduling/); FLASHCARDS → a study-method
     SERVICE sub-context of KNOWLEDGE 2026-07-12 (../knowledge/flashcards/ + ../../intake/flashcards.md).
     Language is separate (Wave 3). -->

# Learning — Vida Platform (umbrella)

The Learning domain is now documented as **one sub-context (Education)** — everything else was extracted to
its own module or moved under another module (see header):

| Sub-context | Status | Tables | Docs |
|---|:---:|---|---|
| **Education** (renamed from "Courses & Classes", 2026-07-02) | ✅ | `courses`(=subjects) · `ics_feed_configs` · `ics_synced_events` (+ large INTENDED hierarchy) | [education/](education/) |

- **Flashcards** (`flashcards`) was **reframed** into a **study-method service sub-context of Knowledge**
  [../knowledge/flashcards/](../knowledge/flashcards/) (2026-07-12): retention + gathering; content+drill only,
  everything generic (Knowledge's engine). Reference impl of **ADR-005**. `[FACT: ../../intake/flashcards.md]`

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
- **Sessions & Scheduling** (`study_sessions` + §5.11 planner) was **extracted AND promoted** to a
  **foundation module** [../sessions-and-scheduling/](../sessions-and-scheduling/) (2026-07-12): a polymorphic
  **Session** supertype with sub-types (a `class_session` for Education, `review_session` for Flashcards, plus
  reading/practice/workout/… across the OS) + an **aggregator scheduling engine**. Education's `class_session`
  and the Flashcards `review_session` conform to its Integration Contract. `[FACT: ../../intake/sessions-and-scheduling.md]`
- **Education is the hub**: Knowledge objects link to Education's planning Topics (KN-2/KN-10), Sessions target
  subjects (via `class_session`/`study_session`), homework are education-tasks, and the Books module's
  partition links books to subjects. Document the siblings against Education's contract.
