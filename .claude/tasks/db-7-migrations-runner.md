# Task: db-7-migrations-runner
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the migrations runner: forward-only migrations, schema versioning, and a dev-reset path.
Runs against the local SQLite (wa-sqlite/OPFS on web) so the dogfood vault can evolve its schema
without data loss during Phase 1. DB-7 **authors the `app_state` foundation fragment** — its own
schema-version store, read/written by `getSchemaVersion`/`setSchemaVersion` (ADR-002 §9.1) — as
`schema/foundation/`, raw DDL, NOT synced (no `baseColumns`/`syncColumns`, ADR-002 §5.1). Migrations
are authored **per-feature** (ADR-018 §3.5b — no monolithic `001_initial` bootstrap).

## Dependencies
- blocked by `ar-2-database-adapter-web`
<!-- removed 2026-07-27 (dep-reconcile triage): stale `blocked by db-4-per-domain-schema` — the runner is
     generic (applies hand-written SQL migrations regardless of which tables); it needs the driver (ar-2) +
     primitives (db-1, transitive), NOT per-domain schema. Migrations authored per-feature (ADR-018 §3.5b). -->
<!-- NOTE: DB-7 authors the `app_state` foundation fragment (its schema-version store; see Goal). SIBLING of DB-6. -->

