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
- [~] Decomposition Gate — delivery/slice-map.md (10 slices) + seam-contract.md written; **g1 critic REVISE→folded** (B1 missing `effects?` dep + B2 entity_types already registered + NIT3/4/5); **Approval 1 pending Victor**
- [ ] Per-slice service track (Steps 3–11) iterated from the approved slice-map
- [ ] ① backend COMPLETE — all slices shipped, @vida/core green, §XXIX currency, PR opened

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; filled when the slice spec §5 is approved. -->
- [ ] [filled per slice from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): not applicable — full Entity Delivery Flow. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-10-02 | activated stub → in-progress; scaffolded spec stub + session file | Step 0 BASELINE → Step 1 Interpretation (read Education aspect docs + part-1.2 rerun + parts before scoping) |

## Notes
Env: Node 24 via nvm. Branch `mod-learning-education` off main; per-slice §XXVI double-gate +
live-store Verification Gate + independent code-review + §XXIX currency; PR when ① (all slices) complete.
