# Task: ar-9b-sync-activate
# Status: planned
# Cluster: M4 Venues / Multi-Device
# Milestone: Sync & Server
# Phase: 2 (venues)
# Source: docs/roadmap.md → M4 · P2-①

## Goal
Activate the sync engine (LWW/HLC/Yjs reconciliation, flush the queue) — the activation half split from AR-9 no-flush scaffolding. Needs a second device + encryption beneath (M3).

## Dependencies
- blocked by `ar-9-sync-scaffolding-noflush`
