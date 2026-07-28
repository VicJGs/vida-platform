# Task: ar-9-sync-scaffolding-noflush
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Wire the offline sync **engine** scaffolding without activating it: the *reader/flush* side
(`sync/{queue,resolver,crdt}.ts`) is stubbed behind the adapter interface. Nothing flushes in Phase 1
(single-user localhost) — this exists so Phase 2 can activate push/pull reconciliation (LWW/HLC/Yjs)
as a non-structural bolt-on rather than a schema change.
**Scope boundary (dep-reconcile 2026-07-27):** the `sync_queue` table + the co-transactional enqueue
*write* are **DB-6's** (producer side, ADR-004 §3.4) — NOT AR-9. AR-9 owns only the reader/flush engine
stub that consumes the queue at M4 (ADR-017 §5).

## Dependencies
- blocked by `db-6-repository-layer`
<!-- changed 2026-07-27 (dep-reconcile triage): was `blocked by ar-2` (too loose). The sync ENGINE stub reads the
     `sync_queue` that DB-6 writes → AR-9 ← DB-6. The `sync_queue` table + enqueue-write moved to DB-6 (ADR-004
     §3.4 co-transactional). ar-2 is transitive via db-6. -->
<!-- removed 2026-07-26 (m1.0-delivery-plan Step 7): stale `blocked by db-2-sync-metadata-columns` —
     db-2 is PARKED (superseded by ADR-017); its `_sync_*` columns fold into AR-9's own scope. -->

