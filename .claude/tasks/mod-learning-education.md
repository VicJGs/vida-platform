# Task: mod-learning-education
# Status: in-progress
# Linear: LIF-130
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/features/mod-learning-education/_index.md
# Source: reconstructed-structure.md #52 (LIF-130; ADR-016 model)
# Branch: mod-learning-education (off main)
# Created: 2026-10-02 (stub from backend-replan P5)

## Goal
Build `createLearningEducationService` ① backend service tier over the DB-4 Learning/Education
schema (migration `024_learning_education.ts`, 15 tables), via the Entity Delivery Flow — composing
the sessions, measurement, review, spaces, notes, and journals substrates, with deny-safe M2 ports
for ICS feed fetch and document ingestion. (Legacy charter: "Education — ICS surface; live feed → M2;
courses/homework/exams surface" — the realigned schema taxonomy supersedes the legacy naming.)

## Dependencies
- blocked by `mod-journals`               ✅ Done (LIF-127)
- blocked by `mod-notes-and-pages`        ✅ Done (LIF-131)
- blocked by `mod-sessions`               ✅ Done (LIF-139)
- blocked by `xs-ai`                       ✅ Done (LIF-167)
- blocked by `xs-backlinks-search-export`  ✅ Done (LIF-168)
- blocked by `xs-ingestion`                ✅ Done (LIF-172)
- blocked by `xs-measurement-engine`       ✅ Done (LIF-173)
- blocked by `xs-spaces-tags-links`        ✅ Done (LIF-175)
(all blockers Done → READY)

## Context
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow)
Head: #52 · LIF-130 · M1.1.2 — Feature Modules · Backend. Books (#51) was its blocker and is now Done;
highest direct-dependent count (6) in the ready group.

Files involved (to be confirmed at BASELINE/Interpretation):
- `packages/core/src/db/schema/learning.ts` — the 15-table schema (the ADR-realigned model)
- `packages/core/src/db/migrations/024_learning_education.ts`
- `docs/features/learning/education/{identity,structure-data,business-rules,contract,conventions}.md`
- `docs/features/learning/README.md` + the part-1.2 rerun for learning/education
- New: `packages/core/src/services/learning-education/` (service tier)
- New: `docs/features/learning/delivery/{interpretation,slice-map,seam-contract}.md` + `service/` spec set
- New: `docs/modules/learning-education/current-*` (§XXIX currency)

Schema tables (migration 024): `subjects` · `ics_feed_configs` · `ics_synced_events` · `institutions`
· `self_taught` · `programs` · `curricula` · `terms` · `class_sessions` · `subject_schedules`
· `grading_systems` · `grading_components` · `assessments` · `subject_documents` · `education_measurements`.
NB: the realigned taxonomy (subjects/programs/curricula/terms/assessments/grading) supersedes the
legacy capability-framework naming (courses/classes/homework/exams) — ground on the schema + module docs.

Integration points (to be confirmed at Interpretation):
- `foundation/sessions` (class_sessions / study sessions sub-types + registration)
- `foundation/measurement` (education_measurements source + pace/grade signals)
- `foundation/review` (knowledge/skills review bindings, if in scope)
- Journals (`/summary` PULL contribution), Spaces/Notes (entity_links/tags), effect rail (emit-only)
- Deny-safe M2 ports: ICS feed fetch (`ics?`), document ingestion/parse (`ingestion?`), ai (`ai?`)

## Open Questions
- [to be filled at BASELINE/Interpretation — e.g. knowledge/skills partition ownership vs mod-knowledge,
  ICS sync engine M1-vs-M2 boundary, grading/assessment measurement axis homing]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — schema (`learning.ts` 15 tables) + aspect docs + part-1.2 rerun + capability legs + sibling seams mapped; "INTENDED" reconciled = built @ DB-4
- [x] Interpretation layer written — delivery/interpretation.md (deps · needs · organization · R1–R10 implicit rules · C-* guards · UNKNOWNs)
- [x] Decomposition Gate — delivery/slice-map.md (10 slices) + seam-contract.md; g1 critic REVISE→folded (B1/B2/NIT3-5); **Approval 1 GRANTED**
- [~] Per-slice service track — **S1·S2·S3·S4 SHIPPED** (hierarchy spine · subjects+DB-11 · curriculum fork · schedule+class sessions); S5–S10 remain
- [ ] ① backend COMPLETE — all slices shipped, @vida/core green, §XXIX currency, PR opened

### Slice log
- [x] **S1 — hierarchy spine + routing** (`2026-10-02`): `createLearningEducationService` born; CRUD for institutions/self_taught/programs/curricula/terms + `resolveParentChain` (ED-2/3/11/12). `@vida/types` +5 interfaces; validators +10 schemas. tsc 0 · 14/14 live-store · full @vida/core **1547/1547** · eslint 0. g1-gate SHIP · independent code-review SHIP (0 defect; R4/resolveParentChain/column-fidelity verified) · §XXIX currency born (BR-LE-S1-1..8).
- [x] **S2 — subjects + DB-11 reconcile** (`2026-10-02`): `subjects` CRUD + routing ENFORCED (`UnroutedSubjectError`; empty routing allowed per A1, doc-reconciled) + `listSubjects` filter; `progress` never settable (R2/M3); `course_type` nullable modality (R6); **`@vida/types` `Course`→`Subject` DB-11 reconcile** (drop `tags`, nullable progress/counters, +routing/degree_tier); defensive `metadata` parse (R10). tsc 0 · 25/25 live-store · full @vida/core **1557/1557** · eslint 0. code-review REVISE→folded (B1 bare-JSON.parse→defensive; B2 empty-routing doc-reconciled→grounded; NIT4 update-progress test; NIT3→S5 carry-forward). §XXIX currency (BR-LE-S2-1..5). **Next: S3 — curriculum fork (deep-copy + lineage).**
  - ⚠ **S2 doc-reconciled call (flagged for Victor override):** a *fully-unrouted* subject (no curriculum, no term) is ALLOWED — grounded in the DB-4 schema's nullable `curriculum_id` ("per A1 optional depth") + progressive-fill intent (ED-14); the pre-DB-4 "never orphaned flat list" reads as the v2 anti-pattern, not a creation mandate.
  - ⚠ **S5 carry-forward:** ICS `@vida/types` names (`default_course_id`/`matched_course_id`) still pre-reframe vs schema (`default_subject_id`/`matched_subject_id`) — reconcile in the S5 ICS mapper.
- [x] **S3 — curriculum fork + lineage** (`2026-10-03`): `forkCurriculum(sourceId,{name?})` deep-copies LIVE terms+subjects → new tree, `forked_from_id` lineage, copy `is_template=false` (F5 default), **base never mutated by construction**; two-pass term `parent_term_id` remap; single-`or()` subject union (curriculum_id OR term_id∈live-terms); routing SHAPE preserved (remap set refs, keep null null); `progress` reset / `metadata` preserved; soft-deleted excluded (R4); dangling parent/term → null (R5); `CurriculumNotFoundError` on bad source. **`TemplateImmutableError` EXPORTED vocabulary, NOT wired (R9)** — `updateCurriculum` unchanged. tsc 0 · 39/39 live-store (14 new) · full @vida/core **1572/1572** · eslint 0 · gitleaks clean. Full Entity Delivery Flow: g1 /critique REVISE→folded (B1 routing-shape + N1-4) → Approval 1 → /preflight PASSED (A1-5 folded) → g2 /critique SHIP → Approval 2 → implement → independent code-review SHIP (3 NITs folded: trivially-passing progress test + untested metadata-preserve + dangling term_id assert) → pre-ship /critique SHIP. §XXIX currency (BR-LE-S3-1..9 + 2b). **Next: S4 — schedule + class sessions (register `class` sub-type).**
  - **Victor drift-catch (gate 1):** I framed 3 doc-resolved matters as decisions (fork atomicity · TemplateImmutableError scope · one-way template lock) + tried to WIRE the error to make it reachable. All doc-resolved: R5 (eventually-consistent) · slice-map+R9 (exported-not-wired) · invention (removed). Re-grounded; residual `is_template=false` promoted INTERP→FACT (F5 `_index.md:151` + contract.md:13). Memory [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]] updated.
- [x] **S4 — schedule + class sessions (register `class` sub-type)** (`2026-10-03`): `registerLearningEducation()` (idempotent, `DuplicateSubType`-guarded) registers `CLASS_SESSION_TYPE_DEF` (ADR-004 §3.2 transcription — `effects:[]`/`allowed_effects:[]` C-E2; `default_purpose` OMITTED, No-Guessing); `setSchedule` (one-per-subject UNIQUE upsert, explicit `deleted_at` filter); `createClassSession` (base `sessions('class')` + 1:1 `class_sessions` extension + `attach('subject',…)` §3.2.1; `started_at`=required meeting time, B1); `listSessions`/`getWeeklySchedule` (derive via `sessions.getSession`, soft-deleted base excluded; range INCLUSIVE both ends). `@vida/types` +`ClassSession`/`SubjectSchedule` (net-new; `ClassSession` omits `deleted_at`). tsc 0 · 48/48 service live-store (+9) · full @vida/core **1581/1581** · eslint 0 · enum-parity green. Full Entity Delivery Flow: g1 /critique REVISE→folded (**B1** weekly-schedule time-field: `started_at` set at create or scheduled meetings never render; **B2** omit invented `default_purpose`) → Approval 1 → /preflight PASSED → g2 SHIP → Approval 2 → implement → independent code-review **SHIP** (3 findings folded: SHOULD-FIX half-open→inclusive to match `TimeRange`; NIT boundary test; NIT untimed-case framing) → pre-ship DoD SHIP. §XXIX currency (BR-LE-S4-1..8). **Next: S5 — ICS feeds + events (deny-safe `ics?` fetch).**
  - **§XXVIII in-build deviation:** dropped the spec's invented `ClassSessionNotFoundError` — no S4 throw site + not in the ratified seam-contract error list (No-Guessing; distinct from the ratified exported-unwired `TemplateImmutableError`).
- ⚠ **Shared-tree collision (resolved):** a parallel `frontend-track` session (`fe-codec-theme`) committed my uncommitted S1 as `08f4b9a` "wip" then switched away; I moved to a dedicated worktree `.claude/worktrees/mod-learning-education` to finish without disrupting it. Lesson [[reread-task-file-before-phase-exec]].

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; filled when the slice spec §5 is approved. -->
- [ ] [filled per slice from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): not applicable — full Entity Delivery Flow. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-10-02 | activated stub → in-progress; scaffolded spec stub + session file | Step 0 BASELINE → Step 1 Interpretation (read Education aspect docs + part-1.2 rerun + parts before scoping) |
| 2026-10-02 | BASELINE + Interpretation + Decomposition (Approval 1); **S1 shipped** (hierarchy spine + routing, all gates green); shared-tree collision resolved via worktree | S2 — subjects + DB-11 `Course`→`Subject` reconcile |
| 2026-10-03 | **S3 shipped** — curriculum fork + lineage (full Entity Delivery Flow: 2 gates + Verification Gate 39/39 + independent code-review SHIP + pre-ship /critique); Victor drift-catch on 3 doc-resolved "decisions" → re-grounded (R5/R9/F5); §XXIX currency BR-LE-S3-* | S4 — schedule + class sessions (register `class` session sub-type) |
| 2026-10-03 | **S4 shipped** — schedule + class sessions: register `class` sub-type · `setSchedule` upsert · `createClassSession` (base session + 1:1 extension + subject attach) · `listSessions`/`getWeeklySchedule`. Full Entity Delivery Flow (g1 REVISE B1/B2→folded · preflight PASSED · g2 SHIP · Verification Gate full-suite 1581 · independent review SHIP, 3 findings folded incl. inclusive-range alignment); §XXIX currency BR-LE-S4-*; §XXVIII deviation (dropped invented ClassSessionNotFoundError) | S5 — ICS feeds + events (deny-safe `ics?`; also the S5 DB-11 `default_course_id`/`matched_course_id` reconcile) |

## Notes
Env: Node 24 via nvm. Branch `mod-learning-education` off main; per-slice §XXVI double-gate +
live-store Verification Gate + independent code-review + §XXIX currency; PR when ① (all slices) complete.
