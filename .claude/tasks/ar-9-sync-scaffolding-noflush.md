# Task: ar-9-sync-scaffolding-noflush
# Status: planned
# Cluster: ② Architecture Layer
# Milestone: Services & Sync Scaffold
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Wire the offline sync scaffolding without activating it: `sync_queue` rows are written in every
mutation transaction, and the sync engine is stubbed behind the adapter interface. Nothing flushes
in Phase 1 (single-user localhost) — this exists so Phase 2 can activate push/pull reconciliation
(LWW/HLC/Yjs) as a non-structural bolt-on rather than a schema change.

## Dependencies
- blocked by `ar-2-database-adapter-web`
- blocked by `db-2-sync-metadata-columns`
