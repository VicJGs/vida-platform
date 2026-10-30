# Task: ar-1-monorepo-topology
# Status: done
# Linear: LIF-72
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer
# Reconciled 2026-07-27: work complete (roadmap §5 AR-1 ✅; turbo.json + package export chain live);
#   stub lagged at 'planned' → flipped to done so LIF-72 reflects reality (was Backlog).

## Goal
Lock the monorepo topology: Turbo pipeline (build/typecheck/lint/test task graph), tsconfig
project references, and the package export chain `types → core → editor → ui`. Ensures every
downstream package resolves and builds in dependency order. One of the four Phase-1.0 entry points.

## Dependencies
- (root — no blockers; one of the four Phase-1.0 entry points)
