# Task: ds-4-tamagui-config-dark-mode
# Status: planned
# Linear: LIF-84
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System

## Goal
Assemble the Tamagui configuration from the foundation tokens and wire dark mode as a first-class
theme (not an afterthought). Produces the universal theme object `@vida/ui` primitives consume
across web (and later mobile/desktop).

## Dependencies
- blocked by `ds-2-foundations`
- blocked by `ds-3-motion-foundation`  <!-- added 2026-07-28: createTamagui() takes the animations config at config time; the motion foundation (ds-3) feeds it -->

Note: ds-3 added — the Tamagui config assembles the animation driver from the motion foundation.
