# Task: db-6-repository-layer
# Status: in_progress
# Profile: Add Backend Component
# Scenario: default
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer
# Activated: 2026-07-28 (M1.0 delivery campaign — first ready head off AR-2)

## Goal
Build the typed repository layer over the schema: CRUD with the encrypt/decrypt seam applied
per the DB-5 boundary map, soft-delete via `deleted_at` (NULL = live), and a **co-transactional
`sync_queue` enqueue** on every mutation — the *producer* side of the no-flush scaffolding, written
in the **same SQLite transaction** as the row (ADR-004 §3.4). DB-6 also **authors the `sync_queue`
foundation fragment** (`schema/foundation/`, raw DDL — NOT synced, no `baseColumns`/`syncColumns`,
ADR-002 §5.1). The *reader/flush* engine is AR-9 (stubbed, activates M4). This is the single
data-access surface every module and service goes through.

## Dependencies
- blocked by `ar-2-database-adapter-web`
<!-- removed 2026-07-27 (dep-reconcile triage): stale `blocked by db-4-per-domain-schema` — the repository is
     TABLE-AGNOSTIC (pass any Drizzle table; db/CLAUDE.md, ADR-002 §4); it does NOT need per-domain schema.
     Build-time dep = the DrizzleDb type (ar-2) + primitives (db-1, transitive via ar-2). ADR-016 §3.2: Drizzle
     objects are the query mirror. DB-6 authors its OWN `sync_queue` foundation fragment (see Goal) — no db-4 gate. -->
<!-- removed 2026-07-26 (m1.0-delivery-plan Step 7): stale `blocked by db-5-encryption-boundary-map` —
     DB-5 is M3; it AMENDS the repository at the encryption flip, it does not block the M1.0 pass-through
     seam (ADR-017). The Goal's "per the DB-5 boundary map" is the M3 target, not an M1.0 prereq. -->
<!-- NOTE: DB-6 and DB-7 are SIBLINGS off ar-2 — DB-6 needs the sync_queue Drizzle OBJECT (schema surface), not
     DB-7's runner (ADR-016 §3.2 build-time vs runtime). No DB-6←DB-7 edge. -->

