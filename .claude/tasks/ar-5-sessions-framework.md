# Task: ar-5-sessions-framework
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer (ADR-004)

## Goal
Build the Sessions framework substrate (ADR-004): the session supertype + per-type extensions, a
single-write-path guard so all session state changes go through one channel, and local
`applied_effects` dedup keyed on `effect_event_id`. This underpins study/focus/pomodoro sessions
and the effect rail (AR-7). Module-level session UI lands later in Phase 1b.

## Dependencies
- blocked by `ar-2-database-adapter-web`
