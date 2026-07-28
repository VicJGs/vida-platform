# Task: db-6-repository-layer
# Status: completed (2026-07-28 · commit 7f90c9b · LIF-68)
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

## Build Steps (all done — 2026-07-28, commit 7f90c9b)
- [x] B1 verify @vida/types SyncOperation/SyncQueueItem (reuse, no dup)
- [x] B2 schema/foundation/sync-queue.ts (Drizzle mirror)
- [x] B3 migrations/001_sync_queue.ts (hand-written DDL, ADR-002 §5.1)
- [x] B4 register migration 001 in runner (seam (i)) + barrel in schema/index.ts
- [x] B5 lazy vault-key at ALL sites (create/update/decrypt) — empty [E] set pass-through
- [x] B6 co-transactional UPSERT enqueue in create/update/hardDelete via db.transaction()
- [x] B7 tests/repository.test.ts — 10 cases (atomicity, coalescing, pass-through, seam, regression)
- [x] B8 verify — @vida/core 55/55; root typecheck 10/10

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| Baseline | reframed from-zero → reconcile+extend | repository.ts already existed (v1-carried) | current-* refreshed with true floor |
| PLAN critique | 3 findings resolved by SOURCE verification | critic's own claims needed checking (No-Guessing) | sync_queue→ADR-002§5.1; enc→ADR-017:20; proxy .transaction() EXISTS |
| Impl critique | UPSERT correctness fix | UNIQUE(table,row,op) collides on repeated pre-flush updates | enqueue = onConflictDoUpdate (coalesce) |

## Knowledge Loaded
- docs/infrastructure/database-layer/current-{spec,business-rules}.md — Step 0 baseline
- ADR-002 §5.1, ADR-004 §3.4, ADR-017:20 — grounding; drizzle-orm 0.45.1 sqlite-proxy session.js:46-53 — verify

## Failures This Session
- F1 — repository tests threw "Vault not initialized" — RESOLVED (await initVault() in setup; libsodium-ready ≠ vault-unlock)
- F2 — atomicity assertion regex mismatch (drizzle wraps injected error) — RESOLVED (match /sync_queue/)
- F3 — better-sqlite3 not a @vida/core dep — RESOLVED (added devDep + pnpm install)
- F4 (out-of-charter) — pre-existing vault.test.ts 1MB timeout under load — RESOLVED (5s→20s; not a DB-6 regression)

