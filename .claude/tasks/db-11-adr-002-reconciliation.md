# Task: db-11-adr-002-reconciliation
# Status: planned
# Linear: LIF-63
# Project: M1 — Whole Manual OS
# Milestone: M1.4 — Internal-Integration Hardening
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Reconcile ADR-002 with the schema that actually shipped: rewrite §5, and recompute §7 (table
count) and §8 (encryption map) from the consolidated schema. Closes the §5.20 "owed-tables" debt
so the data-model ADR is authoritative again rather than deferring to a future build session.

## Dependencies
- blocked by `db-1-schema-primitives`
- blocked by `mod-books`
- blocked by `mod-check-ins`
- blocked by `mod-finance`
- blocked by `mod-gamification`
- blocked by `mod-habits`
- blocked by `mod-health-core`
- blocked by `mod-health-nutrition`
- blocked by `mod-health-training`
- blocked by `mod-journals`
- blocked by `mod-knowledge`
- blocked by `mod-languages`
- blocked by `mod-learning-education`
- blocked by `mod-notes-and-pages`
- blocked by `mod-notifications`
- blocked by `mod-preferences`
- blocked by `mod-projects`
- blocked by `mod-purposes-and-goals`
- blocked by `mod-relationships`
- blocked by `mod-routines`
- blocked by `mod-sessions`
- blocked by `mod-skills`
- blocked by `mod-tasks`
