# Task: mod-routines
# Status: paused
# Scenario: Default (Entity Delivery Flow ①)
# Profile: Add Backend Component
# Linear: LIF-138
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Routines (orchestrator) — routines linked to habits/tasks

## Status note (2026-10-14)
⏸ PAUSED pending `mod-tasks` (#65 / LIF-142). Entity Delivery Flow front matter DONE through the
Decomposition Gate (Approval 1): `docs/features/routines/delivery/{interpretation,slice-map,seam-contract}.md`
— 9 backend slices approved. **D1 resolved (Victor): build Tasks first**, then resume routines with a
**required** `tasks: TasksService` dep (not the deny-safe port). D2 (notes entity_type=`routine_step`) + D3
(two-seam completion) approved. Resume = reconcile substrate sigs vs the shipped TasksService, then start S1.

## Dependencies
- blocked by `mod-tasks`  ← added 2026-10-14 (Tasks-first decision; routines drives task-type steps + RT-4 recurrent task)
- blocked by `mod-journals`
- blocked by `mod-knowledge`
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-effect-rail`
- blocked by `xs-measurement-engine`
- blocked by `xs-spaces-tags-links`
- blocked by `xs-views`
