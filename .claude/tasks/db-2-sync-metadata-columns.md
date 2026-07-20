# Task: db-2-sync-metadata-columns
# Status: planned
# Cluster: ① Database Layer
# Milestone: Schema
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Add the sync-metadata columns to every syncable table: `_sync_id/_version/_device_id/_lww_ts/
_status/_hash` plus `_sync_field_ts` (ADR-003 §17), `effect_event_id` + UNIQUE-on-output
(ADR-004 F1), and the HLC representation decision (F6/D4-d). Phase 1 is single-user localhost:
these columns are WRITTEN in every transaction but NEVER flushed, so the Phase-2 sync bolt-on is
non-structural.

## Dependencies
- blocked by `db-1-schema-primitives`
