# Task: ar-9-sync-scaffolding-noflush
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Wire the offline sync scaffolding without activating it: `sync_queue` rows are written in every
mutation transaction, and the sync engine is stubbed behind the adapter interface. Nothing flushes
in Phase 1 (single-user localhost) — this exists so Phase 2 can activate push/pull reconciliation
(LWW/HLC/Yjs) as a non-structural bolt-on rather than a schema change.

## Dependencies
- blocked by `ar-2-database-adapter-web`
<!-- removed 2026-07-26 (m1.0-delivery-plan Step 7): stale `blocked by db-2-sync-metadata-columns` —
     db-2 is PARKED (superseded by ADR-017); its `_sync_*` columns fold into AR-9's own scope. -->

