---
Session 4 — 2026-10-04
Goal: Build `createLearningEducationService` ① backend over DB-4 024_learning_education (Entity Delivery Flow). This session: S7 + S8.
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1) · branch mod-learning-education (worktree)
---

## Accomplished
- **S7 — assessments + grade/GPA compute** shipped (`29b1b16`). `createAssessment`/`recordResult`/`listAssessments`
  + derived `computeGrade(subjectId)→GradeResult` / `computeGPA({type:'term'|'curriculum',id})→GpaResult` over
  `assessments`, composing `foundation/measurement` (direct import `normalize`/`rollup`) + the resolved grading system.
  Grade is derived-never-stored (recordResult writes `score` only). Scope inheritance subject→program→institution
  (institution derived from `program.parent_type`/`parent_id`; self_taught stops at program). Two-level rollup +
  5 flags (`no-system`/`ambiguous-system`/`incomplete`/`unmapped-assessments` [null OR foreign component]/`missing-scale`)
  + score>max clamp. `@vida/types` `Assessment` net-new; `AssessmentNotFoundError`/`GradingComponentNotFoundError`
  (both real throw sites). BR-LE-S7-1..8. +39 live-store tests.
- **S8 — education measurement** shipped (`d7f51a9`). `setMeasurement(ref,{measurement_kind,binding_mode?})` /
  `getProgress(ref)` over `education_measurements`, derive-on-read. One-per-ref upsert (subject/program, fail-loud,
  preserves the stored override; C-M5 separate storage). `getProgress` = integer 0–100 | null (the integer-column +
  books.progress unit); inlines resolveProgress §3.2 (stored override wins, else derive) to bridge the 0–100-stored /
  [0,1]-engine unit gap. Subject: `derived-pull`/no-mode ⇒ `computeGrade×100`; `manual`/`event-trigger` ⇒ null.
  Program: equal-weight `rollup` of its subjects ([0,1]-fed, never 0–100), subject-set = the S7/S3 curriculum union per
  the program's live curricula. `measurement_kind` declared-metadata (M1 derivation kind-agnostic). `@vida/types`
  `EducationMeasurement` net-new. BR-LE-S8-1..8. +13 live-store tests.
- Each slice ran the full Entity Delivery Flow (g1 /critique → Approval 1 → /preflight → Approval 2 → implement →
  live-store Verification Gate (Node 24) → independent adversarial code-review SHIP → pre-ship /critique → §XXIX
  currency). @vida/core green end of session: **1648/1648**, tsc 0, eslint 0, enum-parity 159, gitleaks clean.
- Per Victor's standing directive this session: **every g1/g2/preflight finding re-grounded in code/docs before
  approval** (B1 measurement-direct-import vs the drifted seam-contract dep; B2 institution-derived-from-program;
  validator-default convention; B3 foreign-component-never-silent; S8 0–100 unit forced by the integer column).

## Decisions Made
- **S7 measurement engine access = DIRECT import, not a dep (B1).** The seam-contract's `measurement:{engine}` was
  design-time drift; the live convention (books/service.ts:143, gamification) imports the pure functions. Re-grounded
  against code, not the frozen contract.
- **S7 grade derived-never-stored; scope inheritance subject→program→institution** (institution via
  `program.parent_type/parent_id`; self_taught stops at program — ParentChainResolution has no institution field).
- **S7 compute is fail-soft-with-flag** (never a wrong number; foreign-component assessments flagged, never silently
  dropped — B3); grade returned normalized [0,1] + scale metadata, the letter-label map is ②/M-later (undefined in docs).
- **S8 getProgress unit = integer 0–100** — forced by the `integer` progress column (can't hold [0,1]) + the
  books.progress/subjects.progress precedent; derive in [0,1], scale at the boundary; resolveProgress inlined for the
  unit bridge (the books `getUnifiedProgress` precedent).
- **S8 derivation:** subject `derived-pull`/null ⇒ grade×100, `manual`/`event-trigger` ⇒ null; program ⇒ [0,1]-fed
  rollup; `measurement_kind` is declared metadata (kind-agnostic M1 derivation); no `advertise()`, no Projects storage
  (C-M5). The null-mode⇒grade and event-trigger⇒null-at-M1 interpretations were surfaced and okayed at Approval 1.
- The Verification Gate's **tsc** caught a test-only type bug (`'homework'` ∉ `AssessmentType`) that vitest's esbuild
  skipped — tsc is part of the gate, not optional.

## Open Questions
- None blocking. Two S7/S8 INTERPRETATION calls were okayed by Victor (ambiguous-system pick-order; grade-as-normalized
  -not-label; null-mode⇒grade; event-trigger⇒null-at-M1) — all reversible, none contradict the docs.
- Forward-notes in currency: the `education_measurements.progress` override has no M1 setter (forward seam — M-later
  manual-set + the 0–100/[0,1] reconciliation); a direct per-kind `normalize` for a subject measured not-via-grade is M-later.

## Next Session
First step: **S9 — subject vault + tags/links/notes** — `addDocument(subjectId, {title, docType?, blob?|storageRef?})`
with the deny-safe `attachment?` port (absent ⇒ `attachment-unavailable`, the ICS/books precedent), `getVault(subjectId)`
→ { documents, notes } together, and compose SpacesService `entity_tags`/`entity_links`/`pages` WRITES on the already-
registered `subject`/`subject_document` entity_types (retire inline `courses.tags`; guard `tag_id` resolves —
[[spaces-junctions-split-read-write-tagentity-blind-inserts]]). `subject_documents` has NO `deleted_at` (PJ-8 vault
pattern → softDelete:false). Then S10 (cross-module fan-out + Journal) closes ①.
Context to reload: `.claude/tasks/mod-learning-education.md` (slice log) · `docs/features/learning/education/delivery/
{slice-map,seam-contract}.md` S9 (lines 26, 63-66) · `docs/modules/learning-education/current-*` · the SpacesService
WRITE surface (NotesService/mod-knowledge S2 precedent) · `foundation/spaces` registry · schema `learning.ts`
subject_documents (310-322). Env: Node 24 via nvm; FRESH `/begin` → resume in the worktree, branch mod-learning-education.
