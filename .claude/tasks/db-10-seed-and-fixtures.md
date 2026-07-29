# Task: db-10-seed-and-fixtures
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the dogfood seed + fixtures: a realistic single-user vault (Victor's data shapes) so every
downstream module has something to render against from day one, and so tests have deterministic
fixtures. Runs through the repository layer so seeded rows are encrypted + sync-queued like real
writes.

## Dependencies
- blocked by `db-6-repository-layer`
- blocked by `db-7-migrations-runner`
- blocked by `db-9-enums-zod`  <!-- seed rows must satisfy enum CHECK constraints; db-9 owns the canonical enum values/Zod. Slug→canonical map key (was db-9-enums-and-zod-validators); delivery-planning-loop U1 -->

Note: db-9 added — seed fixtures write enum-valued rows through the repository and must use the canonical enums.
