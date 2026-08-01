# Task: db-10-seed-and-fixtures
# Status: planned
# Linear: LIF-62
# Profile: Add Backend Component
# Scenario: Default
#
# ⏸ PARKED 2026-07-31 — build stood down. The db-10 triage escalated STRUCTURAL: db-10 is a SYMPTOM of a
# malformed Project>Milestone>Issue delivery structure (mis-homed to M1.0; charter needs the whole OS). Superseded
# by task `delivery-structure-reconstruction`. `sessions/PLAN-2026-07-31-*` is kept as DOGFOOD input, not deleted.
# Do not build until the reconstruction re-homes + re-relates db-10.
# Project: M1 — Whole Manual OS
# Milestone: M1.4 — Internal-Integration Hardening
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the dogfood seed + fixtures: a realistic single-user vault (Victor's data shapes) so every
downstream module has something to render against from day one, and so tests have deterministic
fixtures. Runs through the repository layer so seeded rows are encrypted + sync-queued like real
writes.

## Dependencies
- blocked by `db-6-repository-layer`
- blocked by `db-7-migrations-runner`
- blocked by `db-9-enums-zod`
- blocked by `mod-books`
- blocked by `mod-bucket-list`
- blocked by `mod-checkins`
- blocked by `mod-duties`
- blocked by `mod-finance`
- blocked by `mod-finance-commitments`
- blocked by `mod-fiscal-legal`
- blocked by `mod-gamification`
- blocked by `mod-habits`
- blocked by `mod-health`
- blocked by `mod-journals`
- blocked by `mod-knowledge`
- blocked by `mod-languages`
- blocked by `mod-learning`
- blocked by `mod-notes`
- blocked by `mod-notifications`
- blocked by `mod-preferences`
- blocked by `mod-projects`
- blocked by `mod-projects-investigations`
- blocked by `mod-purposes`
- blocked by `mod-relationships`
- blocked by `mod-routines`
- blocked by `mod-sessions`
- blocked by `mod-skills`
- blocked by `mod-spaces`
- blocked by `mod-tasks`

