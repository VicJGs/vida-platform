# Task: db-3-stream-i-consolidation
# Status: planned
# Linear: LIF-65
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Stream: true
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer (ADR-002 §5.20)
<!-- # Stream: true — never a delivery head (folds into consumer gates per delivery-plan §5.1.1); delivery-planning-loop U1 -->

## Goal
Execute the Stream (i) RETIRE/ADD/AMEND per ADR-002 §5.20. ADD the cross-cutting spine tables:
`sessions` + per-type extensions, `planned_blocks`, `applied_effects` (local), `entity_tags`,
`spaces`, `space_enabled_blocks`, `views`, the capability-registry table, `block_instances`,
`templates`, `capability_grants`, `values`, `contributions`, `purpose_reviews`, `plan_steps`,
`consequence_ledger`, `currencies`, `store`, `rules`, and the review-engine tables. RETIRE the 10
superseded (flat `study_sessions`, `flashcard_*`, `page_tags`, `xp_history`, bare purpose
junctions…). These are the substrate the per-domain schema (DB-4) hangs off.

## Dependencies
- blocked by `db-1-schema-primitives`
