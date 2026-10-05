---
Session 2 — 2026-10-03
Goal: Build the next slice (S3) of createLearningEducationService ① over DB-4 024_learning_education
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
Branch: mod-learning-education (worktree .claude/worktrees/mod-learning-education) · Node 24 via nvm
---

## Accomplished
- **S3 — Curriculum fork + lineage SHIPPED** (`163069f`), full Entity Delivery Flow (ED-11 · A3 · H10).
  - `forkCurriculum(sourceId, {name?})` — deep-copies a curriculum's LIVE terms + subjects into a new tree
    with a `forked_from_id` lineage pointer; copy is a working instance (`is_template=false`); the source is
    never mutated (every write targets a new row — "base never mutated on fork" is structural).
  - Two-pass term `parent_term_id` remap (→ cloned parent; dangling → null). Single-`or()` subject union
    (`curriculum_id=source` OR `term_id ∈ live terms`); routing SHAPE preserved (remap set refs, keep null
    null); `progress` reset to null (R2/M3); `metadata` preserved verbatim; soft-deleted excluded (R4);
    no-FK per-row eventually-consistent (R5).
  - `TemplateImmutableError` = EXPORTED typed vocabulary, NOT wired (R9); `updateCurriculum` unchanged.
    `CurriculumNotFoundError` on a missing/soft-deleted source.
- Gates: g1 /critique REVISE→folded (B1 routing-shape + N1–4) → Approval 1 → /preflight PASSED (A1–5 folded)
  → g2 /critique SHIP → Approval 2 → implement → **Verification Gate 39/39 live-store (Node 24)** · full
  `@vida/core` **1572/1572** (no regression) · tsc 0 · eslint 0 · gitleaks clean → independent code-review
  **SHIP** (3 test-strength NITs folded) → pre-ship /critique SHIP.
- §XXIX currency promoted: `docs/modules/learning-education/current-{spec,business-rules}.md` (BR-LE-S3-1..9 + 2b).
- Spec persisted: `docs/specs/features/mod-learning-education/sessions/PLAN-2026-10-03-S3-curriculum-fork.md`.

## Decisions Made
- **`TemplateImmutableError` exported-not-wired (R9).** The fork writes only new rows ⇒ base never mutated by
  construction ⇒ no M1-reachable throw site ⇒ export the vocabulary, don't wire it (the `IntegrationConsentError`
  precedent). NOT wired to `updateCurriculum`/children/deletion.
- **Forked copy `is_template=false` — doc-FACT.** F5 structural-default rule (`db-4-learning-education/_index.md:151`)
  ⇒ "a new curriculum is not a template" (also rules out inherit-`true`); `contract.md:13` models fork as the
  create-from-template path.
- **Fork is per-row, not transactional (R5).** No-FK eventually-consistent; partial fork is re-drivable.
- **Routing shape preserved on the clone;** `progress` reset, `metadata` preserved.

## Open Questions
- **Victor drift-catch (gate 1):** I framed 3 doc-resolved matters as decisions (fork atomicity ·
  `TemplateImmutableError` scope · a "one-way template lock") and tried to WIRE the error to make it reachable.
  All doc-resolved (R5 · slice-map+R9 · invention removed); re-grounded. Lesson captured in memory
  [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]] with the new "don't manufacture
  reachability for an error" angle. (Resolved — not an open blocker; a process watch-item.)
- Carry-forward (S5): ICS `@vida/types` names `default_course_id`/`matched_course_id` still pre-reframe vs schema
  `default_subject_id`/`matched_subject_id` — reconcile in the S5 ICS mapper.
- Open flag (S2): a fully-unrouted subject is ALLOWED (doc-grounded; Victor may still override).

## Next Session
First step: **S4 — Schedule + class sessions** (ED-4/ED-5 · S1–S7 sessions · BR-ED-7). Register the `class`
session sub-type via `registerLearningEducation` (try/catch `DuplicateSubType`, `allowed_effects:[]`, R1) BEFORE
`createClassSession`; one `subject_schedule` per subject (UNIQUE); `createSession('class')` + its own 1:1
`class_sessions` extension (no `deleted_at`, R4); `getWeeklySchedule(range)` derives cross-subject.
Context to reload: `docs/features/learning/education/delivery/{slice-map,seam-contract,interpretation}.md` (S4 row
+ R1/R4) · `docs/modules/learning-education/current-*` · `services/books/service.ts` (registerBooks precedent,
session sub-type registration + 1:1 extension) · `foundation/sessions/types.ts` · `schema/learning.ts`
(class_sessions / subject_schedules). Env: Node 24 via nvm; work in the worktree; per-slice cadence; PR when ① complete.
