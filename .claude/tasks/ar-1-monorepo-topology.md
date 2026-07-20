# Task: ar-1-monorepo-topology
# Status: planned
# Cluster: ② Architecture Layer
# Milestone: Boot & Adapter
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Lock the monorepo topology: Turbo pipeline (build/typecheck/lint/test task graph), tsconfig
project references, and the package export chain `types → core → editor → ui`. Ensures every
downstream package resolves and builds in dependency order. One of the four Phase-1.0 entry points.

## Dependencies
- (root — no blockers; one of the four Phase-1.0 entry points)
