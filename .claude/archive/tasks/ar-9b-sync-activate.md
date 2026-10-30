# Task: ar-9b-sync-activate
# Status: planned
# Linear: LIF-98
# Project: M4 — Venues / Multi-Device
# Milestone: M4.0 — Venues
# Phase: 2 (venues)
# Source: docs/roadmap.md → M4 · P2-①

## Goal
Activate the sync engine (LWW/HLC/Yjs reconciliation, flush the queue) — the activation half split from AR-9 no-flush scaffolding. Needs a second device + encryption beneath (M3).

## Dependencies
- blocked by `ar-9-sync-scaffolding-noflush`
- blocked by `db-2-sync-metadata-columns`
- blocked by `ar-3-crypto-vault-keymgmt`

