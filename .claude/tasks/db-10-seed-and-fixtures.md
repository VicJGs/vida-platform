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
