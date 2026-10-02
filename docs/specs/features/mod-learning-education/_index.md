# Spec: feature:mod-learning-education
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: see §7.

<!--
  FORWARD spec stub — born with the task (connected-build-loop). §2–§6 are written for real via the
  PLAN step (Entity Delivery Flow Step 1/2 — /documentation-component + the Decomposition Gate), which
  produces docs/features/learning/delivery/{interpretation,slice-map,seam-contract}.md + the service/
  spec set. This _index is the home + the pointer.
-->

## 1. Identity
`createLearningEducationService` — the ① backend service tier for the Learning/Education module,
built over the DB-4 schema `packages/core/src/db/schema/learning.ts` (migration
`024_learning_education.ts`, 15 tables). [FACT: migration 024_learning_education.ts]

It composes the foundation substrates (sessions, measurement, review, spaces/notes, journals, effect
rail) and exposes a typed service API the `fe-learning-education` ② track (P6) consumes. Deny-safe M2
ports cover ICS feed fetch, document ingestion/parse, and AI. [INTERP: from the MOD-books/MOD-knowledge precedent]

**What it is NOT:** not the frontend (② / P6), not the ICS sync transport engine (M2), not the
document parser (M2), not a re-implementation of the knowledge review engine (composed from
`foundation/review`). [UNKNOWN: exact knowledge/skills partition boundary vs mod-knowledge — resolve at Interpretation]

## 2. Business Rules
[FILL IN via the Decomposition Gate — invariants · validation · edge cases · all terminal states · fail-loud behavior]

## 3. Contract
[FILL IN — the LearningEducationService API surface (seam-contract.md); types · inputs/outputs · typed error cases]

## 4. Acceptance
- [ ] [FILL IN from §2/§3 once the slice-map is approved]

## 5. Implementation Prompt
[FILL IN per slice — numbered build sequence citing §1–§4; filled from each slice's service/ spec §5]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs Interpretation] knowledge/skills partition ownership vs mod-knowledge
- [UNKNOWN: needs Interpretation] ICS sync engine M1-vs-M2 boundary (deny-safe port vs built)
- [UNKNOWN: needs Interpretation] grading/assessment measurement axis homing (education_measurements)

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-02 | 2026-10-02-mod-learning-education | initial draft (stub — born with task) |
