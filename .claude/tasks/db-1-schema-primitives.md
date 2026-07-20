# Task: db-1-schema-primitives
# Status: planned
# Cluster: ① Database Layer
# Milestone: Schema
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Stand up Drizzle in `packages/core/src/db/schema/` and codify the column conventions every
table inherits: UUIDv7 TEXT primary keys (client-generated, time-sortable), Unix-ms INTEGER
timestamps, 0/1 INTEGER booleans, INTEGER-cents money, `YYYY-MM-DD` TEXT calendar dates, and
JSON-as-TEXT for arrays/nested objects. This is the substrate DB-3/DB-4 build the consolidated
schema on. (ADR-002; CLAUDE.md conventions.)

## Dependencies
- (root — no blockers; one of the four Phase-1.0 entry points)
