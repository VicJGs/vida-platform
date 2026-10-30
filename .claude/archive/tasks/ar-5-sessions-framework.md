# Task: ar-5-sessions-framework
# Status: completed (2026-07-28 · commit f045ac1 · LIF-76)
# Linear: LIF-76
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer (ADR-004)

## Goal
Build the Sessions framework substrate (ADR-004): the session supertype + per-type extensions, a
single-write-path guard so all session state changes go through one channel, and local
`applied_effects` dedup keyed on `effect_event_id`. This underpins study/focus/pomodoro sessions
and the effect rail (AR-7). Module-level session UI lands later in Phase 1b.

## Dependencies
- blocked by `db-6-repository-layer`
- blocked by `db-9-enums-zod`  <!-- slug→canonical map key (was db-9-enums-and-zod-validators); delivery-planning-loop U1 -->
<!-- reconciled 2026-07-27 (dep-reconcile triage): was `blocked by ar-2` only (under-specified). A sessions
     framework persists through the repository (DB-6) and needs canonical enums/Zod (DB-9); its own tables are the
     DB-3 stream slice, co-built. ar-2 is transitive via db-6. Matches delivery-plan §5 a2. -->

