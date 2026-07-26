# Task: db-6-repository-layer
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the typed repository layer over the schema: CRUD with the encrypt/decrypt seam applied
per the DB-5 boundary map, soft-delete via `deleted_at` (NULL = live), and an in-transaction
`sync_queue` write on every mutation (the no-flush scaffolding). This is the single data-access
surface every module and service goes through.

## Dependencies
- blocked by `db-4-per-domain-schema`
- blocked by `ar-2-database-adapter-web`
<!-- removed 2026-07-26 (m1.0-delivery-plan Step 7): stale `blocked by db-5-encryption-boundary-map` —
     DB-5 is M3; it AMENDS the repository at the encryption flip, it does not block the M1.0 pass-through
     seam (ADR-017). The Goal's "per the DB-5 boundary map" is the M3 target, not an M1.0 prereq. -->

