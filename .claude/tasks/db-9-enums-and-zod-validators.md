# Task: db-9-enums-and-zod-validators
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Establish the canonical enum layer: SQL CHECK constraints on every enum column paired with the
matching Zod validators as the single source of truth in `@vida/types` / `@vida/core`. The SQL
CHECK and the Zod validator must never drift — one canonical set of allowed values per enum.

## Dependencies
- blocked by `db-1-schema-primitives`
