# Task: db-4-per-domain-schema
# Status: planned
# Profile: add-backend-component
# Scenario: add-backend-component (schema-foundation build — 5-phase lifecycle, per-domain sub-issues)
# Linear: LIF-66
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/features/<module>/structure-data.md ×19 (ADR-002 §5.20 Stream (ii)) · flow: docs/roadmap/schema-foundation-build-flow.md
<!-- Model B (upfront foundation) decided 2026-08-18: DB-4 is a REAL gated build head, not a stream.
     It authors ALL per-domain schema BEFORE M1.1; M1.1 modules build service+UI on the finished schema. -->

## Goal
Author the **complete per-domain Drizzle schema** (all ~19 domains) as a self-contained, gated M1.0 foundation build,
consuming the DB-3 substrate spine. This finishes the M1.0 schema foundation; M1.1+ modules then build service + UI on
it and **author no schema**. Delivered as **one component sub-issue per domain group** (added when this issue starts),
each running the 5-phase lifecycle at domain granularity.

## Intent source (Phase 1)
- The **19 `docs/features/<module>/structure-data.md`** docs (§5.20 Stream (ii)): books · check-ins · finance
  (+fiscal-legal) · habits · journals · knowledge (+flashcards) · pomodoro · preferences · projects · relationships ·
  routines · sessions-and-scheduling · skills · tasks · health/{core,nutrition,training} · learning/education.
- **Cross-module MOVES** (§5.20): `bucket_list_items`→`dreams`; `pomodoro_sessions`→Sessions realm; `skill_resources`→`entity_links`.

## Dependencies
- blocked by `db-1-schema-primitives` (✅ done)
- blocked by `db-3-stream-i-consolidation` (substrate spine — must finish first)

## Build Steps (per domain group — 5-phase lifecycle, flow doc §2/§4)
- [ ] **P0 · Slice** — enumerate the domain groups; create one component sub-issue per domain.
- [ ] Per domain group: **P1 intent intake** (its structure-data.md, FULL) → **P2 current-state read** →
      **P3 plan double-gate** → **P4 implement** (SQL migration + Drizzle modules + `ENTITY_TYPES` appends) →
      **P5 foundation-soundness verify** (the module that consumes it, e.g. MOD-notes for Notes, finds every table/column).
- [ ] **Close** — when all domains authored + verified, mark DB-4 Done → M1.0 schema foundation complete → M1.1 opens.

## Route History
- 2026-08-01: created as a `# Stream: true` non-head (Model A).
- 2026-08-18: **re-chartered as a real gated build head (Model B)** — Victor's schema-foundation blueprint. Stream
  header removed; profile add-backend-component; per-domain-sub-issue 5-phase grain. Flow:
  `docs/roadmap/schema-foundation-build-flow.md`. Blocked by DB-3; runs in its own clean-context session(s) after DB-3.
