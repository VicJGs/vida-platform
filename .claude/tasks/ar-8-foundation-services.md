# Task: ar-8-foundation-services
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Build the cross-cutting foundation services in `@vida/core`: full-text search (over the DB-8 FTS5
tables), the backlinks / entity-link resolver, export serializers (MD/PDF/DOCX), analytics
primitives, and neural-graph data prep. Module-owned engines (journal aggregation, study planner,
points economy) live in their own module clusters — these are the shared ones.

## Dependencies
- blocked by `ar-2-database-adapter-web`
- blocked by `db-8-fts5-search`
