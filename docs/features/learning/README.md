<!-- Learning umbrella index — the Learning domain (~17 tables) is documented as 5 SUB-CONTEXTS, each with the
     canonical 5 aspects (decision 2026-07-01: token discipline — one context per pass). Skills was EXTRACTED
     as its own module (see ../../intake/_scope-reconciliation-v1.md). Language is separate (Wave 3). -->

# Learning — Vida Platform (umbrella)

The Learning domain is documented as **5 sub-contexts**, each a full feature context with the canonical 5
aspect docs:

| Sub-context | Status | Tables | Docs |
|---|:---:|---|---|
| **Education** (renamed from "Courses & Classes", 2026-07-02) | ✅ | `courses`(=subjects) · `ics_feed_configs` · `ics_synced_events` (+ large INTENDED hierarchy) | [education/](education/) |
| Books | ⬜ | `books` · `book_chapters` | — |
| Knowledge | ⬜ | `study_topics` · `topic_reviews` · `knowledge_notes` | — |
| Study Sessions & Planner | ⬜ | `study_sessions` + §5.11 planner (5 tables) | — |
| Flashcards | ⬜ | `flashcard_decks` · `flashcards` · `flashcard_reviews` | — |

- **Skills** (`skills`/`skill_resources`) was **separated** into its own module — the v2 tables are a downgraded
  version of a larger envisioned module. `[FACT: ../../intake/_scope-reconciliation-v1.md]`
- **Education is the hub**: Books link to subjects, Knowledge topics belong to subjects, Study Sessions target
  subjects, homework are education-tasks. Document the siblings against Education's contract.
