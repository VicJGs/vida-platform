---
Session 2 — 2026-08-20
Goal: DB-4 per-domain schema — author groups #9-Skills · #10-Knowledge · #11-Books (P0 table order), full 5-phase lifecycle each
Profile: Add Backend Component (5-phase schema-foundation)
---

## Accomplished
- **Adopted P0 table order** (Victor directive) — Finance had been built out-of-order as table #15; from Skills on, follow the table.
- **Group Skills (P0 #9) DONE** — 7 tables (`021_skills`, v21): `skills`·`skill_levels`·`skill_activities`·`skill_actions`
  (Sessions `practice` sub-type extension)·`skill_dev_logs`·`skill_dependencies`·`skill_definitions`. §5.9 STALE → roster;
  mastery DERIVED; 7 net-new enums; `ENTITY_TYPES += 6` (skill_action excluded); corrected roster's stale "skill reserved".
  Double-gate + preflight + post-impl all SHIP. `@vida/core` 426 green.
- **Group #10 Knowledge (+flashcards) DONE** — 7 tables (`022_knowledge`, v22): `knowledge_objects`·`object_kinds`·
  `knowledge_containers`·`references`·`compound_sets`·`knowledge_lab_entries`·`flashcards`. Largest reframe; 5 v2 tables
  collapse into the generic engine + pages + knowledge_objects. `references` = quoted SQL keyword. Gate-1 REVISE→resolved
  (`references.url` [E], ZK regression); post-impl reconciled `data_refs`→plain. `@vida/core` 458→green.
- **Group #11 Books DONE** — 10 tables (`023_books`, v23): the reading Universe (2nd-largest reframe). `books`/`book_chapters`
  reshaped + `book_assets` · 3 annotations · `reading_sessions` (S1 extension) · `reading_plans` · 2 junctions. `deleted_at`
  on 8 of 10 (F1); no measurement axes on `reading_plans` (C-M1). `@vida/core` **503 green**.
- **Cross-group audit fix** — `skill_actions` (Skills) wrongly carried `deleted_at`; session extensions must not. Removed +
  re-verified. Audit found it the sole instance across all authored groups. Codified as BR-DB-AUDIT.
- §XXIX current-spec + current-business-rules promoted for all three groups (BR-SK/KN/BK families + BR-DB-AUDIT). 12 of 22 done.

## Decisions Made
- **P0 table order is now authoritative** for DB-4 group sequencing (Victor) — Finance was the out-of-order exception.
- **Session sub-type extensions carry NO `deleted_at`** (base `sessions` owns lifecycle); explicit "no soft delete" children
  (`book_chapters`) omit it too. Blanket "deleted_at on all" replaced by a per-table split. (BR-DB-AUDIT)
- **`reading_plans` stores no measurement axes** — the plan goal is a Purpose target (C-M1, Purpose-owned) — the Skills pattern.
- **compound_sets / knowledge_lab_entries = base tables only** — the AI-assist/automation surfaces are undesigned → deferred.
- **mapping (BK-4) + conflict (BK-8)** deferred — a design-pass and a Preferences/derived concern, not Books tables.

## Open Questions
- None blocking. Carry-forward: DB-11 interface reconcile grows (Skill*/Knowledge*/Flashcard/Book*/Reading* row interfaces
  + retire stale `BOOK_FORMAT`, learning.ts `Skill`/`study_topic`/`flashcard`).
- ⚠ Environment: sandbox `/tmp` hit ENOSPC late-session (did not affect any test run or file write; worth clearing).
- ⚠ CI red repo-wide = the known pnpm action-setup infra conflict (local green); not this work.

## Next Session
First step: open **P0 table group #12 Learning/Education (+ICS)**, Phase 1 intent intake — FRESH clean-context.
Grep intake+reruns FIRST: the rerun `part-1.2-reruns/learning-education.md` is the HEAVIEST unit (2 R6 reframes +
M1/M2 decomposition [ED-10 enum → Projects axes] + ICS/document-extraction X*/AI*). Read the FULL 5-aspect
`docs/features/learning/education/` + ADR-002 §5.10 (`courses`, `ics_feed_configs`, `ics_synced_events`) + the rerun
BEFORE scoping (the Books lesson). Apply the deleted_at split (extensions + explicit-no-soft-delete children omit it).
Context to reload: task "## P0 Output" table (#12 roster) · `docs/roadmap/schema-foundation-build-flow.md` §2 ·
`database-layer/current-{spec,business-rules}.md` · the two new memories (read-all-aspects-before-scoping ·
session-extensions-no-deleted_at). Mirror the Skills/Knowledge/Books build (`schema/<mod>.ts` + `0NN_<mod>.ts` +
`<mod>-introspection.test.ts` + enum-parity rows + `ENTITY_TYPES`).
