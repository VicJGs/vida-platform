# Task: db-7-migrations-runner
# Status: planned
# Cluster: ① Database Layer
# Milestone: Migrations & Search
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the migrations runner: forward-only migrations, schema versioning, and a dev-reset path.
Runs against the local SQLite (wa-sqlite/OPFS on web) so the dogfood vault can evolve its schema
without data loss during Phase 1.

## Dependencies
- blocked by `db-4-per-domain-schema`
- blocked by `ar-2-database-adapter-web`
