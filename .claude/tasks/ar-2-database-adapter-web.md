# Task: ar-2-database-adapter-web
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Build the `DatabaseAdapter` abstraction and its web implementation: `wa-sqlite` + OPFS +
SQLCipher WASM (partly built already), exposed as an async Drizzle proxy driver so the repository
layer runs unchanged on web today and on native adapters (mobile/desktop) in Phase 2. This is the
seam that keeps the DB layer platform-agnostic.

## Dependencies
- blocked by `ar-1-monorepo-topology`
- blocked by `db-1-schema-primitives`
