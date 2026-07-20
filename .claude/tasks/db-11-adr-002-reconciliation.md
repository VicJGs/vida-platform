# Task: db-11-adr-002-reconciliation
# Status: planned
# Cluster: ① Database Layer
# Milestone: Reconciliation
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Reconcile ADR-002 with the schema that actually shipped: rewrite §5, and recompute §7 (table
count) and §8 (encryption map) from the consolidated schema. Closes the §5.20 "owed-tables" debt
so the data-model ADR is authoritative again rather than deferring to a future build session.

## Dependencies
- blocked by `db-3-stream-i-consolidation`
- blocked by `db-4-per-domain-schema`
