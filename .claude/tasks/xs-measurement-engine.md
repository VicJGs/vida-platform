# Task: xs-measurement-engine
# Status: complete (FULL RATIFY — no production code; 2026-09-18)
# Linear: LIF-173
# Profile: Add Backend Component
# Scenario: Entity Re-scope (Entity Delivery Flow recovery variant — backend flavor)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Measurement engine — measurable + rollup derivation (measurement XCU-01…17, spaces SP-33).

## Dependencies
- blocked by `xs-effect-rail` (satisfied — #32 merged, commit d67d3ae)

## Outcome (2026-09-18) — FULL RATIFY
Entity Re-scope recovery flow. The 15 in-issue legs (`decomposition.md:46`) were already satisfied by the
AR-7 Increment-3 measurement engine (built 2026-08-03, `PLAN-2026-08-03-measurement.md` §1 == this brief),
DB-4 columns, and the #31/#32 effect rail. **Zero production code owed.**

Gates: Documentation Gate SHIP · Interpretation Gate REVISE→PASS · independent adversarial refutation CONCEDED
(15/15 legs) · pre-ship /critique SHIP. Witness: 12 measurement tests green + typecheck clean.

Deliverable = the ratify-proof doc set: `docs/features/measurement/delivery/{interpretation,reconciliation,
slice-map}.md` + a §XXIX ratification marker in `docs/core/measurement/current-spec.md`.

Deferrals (all homed OUTSIDE #33): DB-4 #10 (columns) · MOD-purposes #46 (contributions/laddering) ·
source MODs (real sources) · build-phase (curves/perf-envelope) · ADR-012 economy (multi-condition) · #85 (sandbox).
