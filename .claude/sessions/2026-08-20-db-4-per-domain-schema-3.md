---
Session 3 — 2026-08-20
Goal: DB-4 per-domain schema — author domain group #12 Learning/Education (+ICS), full 5-phase lifecycle
Profile: Add Backend Component
---

## Accomplished
- **Group #12 Learning/Education (+ICS) DONE + committed (`327b535`)** — the heaviest DB-4 group, **15 tables**
  (`024_learning_education.ts`, v24; `schema/learning.ts`): 3 FACT-floor reshaped (`subjects`[=courses]·`ics_feed_configs`·
  `ics_synced_events`) + 12 net-new INTENDED (`institutions`·`self_taught`·`programs`·`curricula`·`terms`·`class_sessions`
  [Sessions `class` sub-type]·`subject_schedules`·`grading_systems`·`grading_components`·`assessments`·`subject_documents`·
  `education_measurements`).
- **11 net-new enum tuples** (`@vida/types/learning.ts`) + 11 z.enum validators (`validators/learning.ts`); `ENTITY_TYPES += 7`
  (`class_session` excluded — sub-type via base `session`).
- 2 R6 reframes (inline `courses.tags`→entity_tags SP1; `courses.progress NOT NULL DEFAULT 0`→nullable M3); the 8-level
  hierarchy; `class_sessions` = `class` session extension (no `deleted_at`); `subject_schedules` UNIQUE(subject_id);
  `education_measurements` axes M1×M2; `subject_documents` = PJ-8 vault. No-FK; **deleted_at on 11 of 15**. 15 FIXED CHECK.
- Full §XXVI double-gate (gate-1 SHIP · preflight PASSED 6 folds · gate-2 SHIP) + post-impl SHIP — both refute-prompted
  critics confirmed zero manufactured deferrals + no over-invented columns + guards held.
- Phase-5 introspection test (`learning-education-introspection.test.ts`, 60 cases × 4 dims) + 15 new enum-parity rows.
  `@vida/core` **578 tests** green; `LATEST_VERSION`=24; typecheck 11/11; eslint 0.
- §XXIX promoted (`database-layer/current-{spec,business-rules}` BR-ED-1…10); TASKS.md + task file + session-log updated;
  committed together with the code (`327b535`, 15 files, +1341).

## Decisions Made
- A `(design pass)` LABEL is a **build-phase forward-pointer**, not a defer, when the intake §Resolution is WHOLE →
  authored `grading_components` now (Victor drift-catch; reinforced [[build-phase-flags-mean-resolve-now-not-defer]]).
- `class_sessions` = the `class` Session sub-type extension (own id + session_id UNIQUE, no FK, no deleted_at) — not a
  standalone table (`SESSION_SUB_TYPE` already had `'class'`; contract.md:49).
- `education_measurements.measurement_kind` = notNull **no default** (dedicated measure entity, caller-supplied) —
  deliberate divergence from `deliverables`' `'milestone'` default; `binding_mode` nullable no-default (⇒ derive).
- Homework stays Tasks-owned (C-HW — no local table); AI extraction pipeline deferred to ADR-014/015 service
  (`source=ai` column authored). (All doc-fixed boundaries, not decisions.)

## Open Questions
- none blocking. DB-11 carry-forward grows: Learning row-interface reconcile (Course→Subject rename,
  `default_course_id`→`default_subject_id`, stale Course progress/tags).
- Known: CI is red repo-wide from the pnpm `action-setup` infra conflict (local green — not this group's).
- Known: the vault 1 MB crypto test is a timing flake (timed out at 26s once, passed on retry at 6.9s).

## Next Session
First step: open P0 table group **#13 Languages**, Phase 1 — but its P1 differs: the intent source is **ADR-002 §5.10
Language Learning Domain** (~9 tables, fully specified in `@vida/types/learning.ts`), because `docs/features/languages/*.md`
are 0-byte stubs → **author `structure-data.md` from the ADR first**, then run P2→P5. Grep intake+reruns FIRST.
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" (#13 row) + `docs/roadmap/schema-foundation-build-flow.md` §2 ·
`@vida/types/learning.ts` (the Language* interfaces) · ADR-002 §5.10 Language Learning Domain · groups #9–#12 as the pattern ·
memories [[build-phase-flags-mean-resolve-now-not-defer]] · [[open-vocab-columns-take-no-sql-check]] · [[session-extensions-carry-no-deleted-at]].
Open #13 FRESH (clean-context — #12 was 15 tables / ~120K ctx).
