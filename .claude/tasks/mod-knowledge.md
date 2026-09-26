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

## Slice tracker (decomposition.md — 8 slices)
- [x] S1 Types reconcile + Kinds + Objects + Hierarchy
- [x] S2 Containers + References + link/tag cross-cut
- [ ] S3 Review engine ①: methods + curves + bindings
- [ ] S4 Review engine ②: due + record + derive + rollup
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
