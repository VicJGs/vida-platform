# Task: mod-knowledge
# Status: in_progress
# Linear: LIF-128
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)
# Profile: Add Backend Component
# Scenario: add-backend-component / Default (Entity Delivery Flow v1)

## Goal
Knowledge (+ generic review engine, Flashcards svc) — the `createKnowledgeService` ①
backend over DB-4 group #10 (`022_knowledge`: 7 owned tables) + the DB-3 review engine
(`review_curves`/`method_bindings`/`review_events`). 56 legs homed per decomposition.md:65.

## Route History
- 2026-09-25: REBUILD started. The prior Antigravity branch `mod-knowledge` (2 ungated
  commits, ~14 of 56 legs, no review engine / no cross-module seams, S5 self-marked Pending,
  7 scratch `.cjs` at repo root, blind rewrite of shared `@vida/types/knowledge.ts`) is kept
  as SHAPE-reference only — discarded, never merged. Building fresh from docs under the full
  §XXVI / Entity Delivery Flow gate on branch `mod-knowledge-rebuild` off main. Linear LIF-128
  reverted to planned (erroneously pushed Done). [Victor: rebuild via Claude Code + reconcile now]
- 2026-09-25: **S1 SHIPPED** (of 8 slices) — types reconcile (10 interfaces, provenance preserved) + kinds/objects/
  hierarchy CRUD + cycle guard + typed errors. Full Entity Delivery Flow: PLAN → gate-1 SHIP → Approval 1 →
  preflight PASSED → gate-2 SHIP → Approval 2 → implement → Verification Gate (22 live-store tests, @vida/core
  1344 green, tsc 0, eslint 0) → independent code-review SHIP (4 MINOR folded) → §XXIX currency. Fixed the KN-9
  mastery-settable bug + the json<T> serialization seam Antigravity missed. Committed `a433a3d`.
- 2026-09-25: **S2 SHIPPED** — containers + references + link/tag cross-cut (KNO-10,11,12,13,14,29,30,45). 12 methods
  composing SpacesService (writes) + BacklinkResolver (reads); the **key interpretation catch**: both resolvers are
  read-only, so decomposition.md:54,56 was imprecise — S2 composes both halves (NotesService precedent). Full flow:
  PLAN-s2 → gate-1 REVISE→5 folds (F1 scopedTag silent-orphan guard · F2 listMemberships read · F3 local
  KnowledgeEntityRef · F4 remove-path guards · F5 companions) → Approval 1 → preflight PASSED + gate-2 SHIP (2 tidy-
  ups) → Approval 2 → implement → Verification Gate (19 S2 live-store tests, round-trips through real spaces/backlinks)
  → independent code-review SHIP (1 MINOR: ReferenceNotFoundError folded) → §XXIX currency. @vida/core 1363 green,
  tsc 0, eslint 0. Added `KnowledgeContainerNotFoundError`/`ReferenceNotFoundError`; deps grew (+spaces,+backlinks).

- 2026-09-26: **S3 SHIPPED** — review engine ① (KNO-15..20): the generic scheduling substrate built into
  `foundation/review/` (`createReviewEngine`, D1 — cross-consumed), composed into `createKnowledgeService` as the
  required `review` dep. Methods = the `kind='study_method'` partition of the ONE capability registry (empty-envelope
  register, F2/D2 — not a parallel store); curves over `review_curves` (json `params` stringify/parse seam recurs);
  bindings over `method_bindings` (no-FK refs not asserted, BR-S3-6); 2-tier `resolveDefaultMethod` (default_method_id
  else null — realm tier homed forward to S7). Full flow: PLAN-s3 → **gate-1 REVISE→3 folds** (F1 dropped invented
  `'spaced_rep'`/`'elaboration'` method ids = No-Guessing violation → 2-tier resolver; F2 `seedPresetCurves`→S4;
  F3 citation) → Approval 1 → preflight PASS + **gate-2 SHIP** (2 NITs folded: deps-shape, top-level barrel) →
  Approval 2 → implement → Verification Gate (**13 new tests**, live-store) → independent code-review **SHIP** (0
  findings) → §XXIX currency. @vida/core **1376 green**, tsc 0, eslint 0, gitleaks clean. Not yet committed at log
  time.

- 2026-09-27: **S4 SHIPPED** — review engine ② (KNO-21..24): `recordReview` (append-only `review_events`, no mastery
  write), `getDue`/`dueIn` (due-queue from events + bound review-curve interval; never-reviewed ⇒ due now),
  `deriveMastery` (0–100 or null, derive-on-read via `foundation/measurement.normalize` — generic engine verb), and
  `rollupMastery` (knowledge service, walks `parent_object_id` via `measurement.rollup`, visited-set backstop, [0,1]↔0–100
  bridge). **A DRIFT happened + was corrected:** I first framed the mastery 0–100 mapping as an open design decision
  needing intent/ADR + ran AskUserQuestion; Victor: "clear drift, the documentation states how this works." Re-grounded:
  mastery = derive-on-read via the measurement engine, curve-parameterized ("tune the curve, not the number", KN-9),
  internals build-phase (ADR-011:76) — no formula to decide. Memory [[mastery-measurement-derivation-is-doc-resolved-not-a-decision]].
  Full flow after correction: PLAN-s4 → gate-1 REVISE→3 folds+3 NITs (F1 named the events→normalize reduction; F2
  citation provenance to KN-9; F3 narrowed the measurement precedent = first service consumer) → Approval 1 → preflight
  PASS + gate-2 SHIP → Approval 2 → implement (`DueItem`→`ReviewDueItem` barrel-collision rename) → Verification Gate
  (13 new tests incl. 3-level rollup + cycle-backstop) → independent code-review **SHIP** (0 bugs; race ruled out —
  parent_object_id is single-parent) → §XXIX currency. @vida/core **1389 green**, tsc 0, eslint 0, gitleaks clean.

## Slice tracker (decomposition.md — 8 slices)
- [x] S1 Types reconcile + Kinds + Objects + Hierarchy
- [x] S2 Containers + References + link/tag cross-cut
- [x] S3 Review engine ①: methods + curves + bindings
- [x] S4 Review engine ②: due + record + derive + rollup
- [ ] S5 Measurement source + Education seams
- [ ] S6 Pages-notes + Compound sets + Lab + AI/search/ingestion seams
- [ ] S7 Flashcards sub-service
- [ ] S8 Event fan-out + Journal contribution

## Dependencies
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-ai`
- blocked by `xs-backlinks-search-export`
- blocked by `xs-capability`
- blocked by `xs-effect-rail`
- blocked by `xs-ingestion`
- blocked by `xs-measurement-engine`
- blocked by `xs-spaces-tags-links`
