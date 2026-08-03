# Task: ds-1-token-pipeline
# Status: in_progress
# Profile: Design System
# Scenario: Design System — default (re-land of a parked, already-built branch)
# Linear: LIF-81
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System

## ▶ Re-land context (2026-08-03)
Un-parked as the computed next head (`--next` / `--plan initiative` rank #1 among READY;
root of the DS `-b` track — unblocks ds-2/3/4/5). The build already passed its gate on
2026-07-27 (branch `ds-1-token-pipeline` @ fd9f144: `packages/ui/src/themes/*`, 13/13 tests,
eng-gate PASS, current-* at docs/ui/token-pipeline/). Remaining = INTEGRATION, not build:
re-apply the isolated `packages/ui/themes` code onto current main (branch 57 behind),
regenerate `pnpm-lock.yaml`, re-verify green against today's main, ship gate, merge+push.
Working branch: `ds-1-reland` (off main @ f5e40f8).

## Goal
Stand up the design-token pipeline: Figma Variables → Tokens Studio → Style Dictionary → CSS
custom properties + a Tamagui theme. One export path so a token changed in Figma propagates to
code without hand-editing. The source of every color/space/type value downstream. One of the
experience-track entry points.

## Dependencies
- (root — no blockers; experience-track entry point)
