# Task: ds-2-foundations
# Status: done (2026-08-03)
# Profile: Design System
# Scenario: Default
# Linear: LIF-82
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System

## Goal
Define the visual foundations as tokens: the color system, typography scale, spacing scale, and
radius/shadow scales. These are the primitives every component and layout composes from — set once
so the product reads as one coherent surface.

## Dependencies
- blocked by `ds-1-token-pipeline`

## Outcome (2026-08-03)
DONE. Pipeline extended (source→3-file list · aux namespaces skip · `fonts.ts` · B8 4pt-grid · dark-overlay loader ·
`tokenRef` bracket-notation) + real seed authored (indigo/slate/emerald palette, 4pt space+size, radius, zIndex,
7-size type scale, shadow ×3, `semantic.dark.json` 10 parallel dark overrides). @vida/ui 20/20 · root typecheck 10/10.
Frontend Visual Gate PASS (provisional). ⚠ **palette is a placeholder, not Vida's brand** — brand pass swaps VALUES
later ([[ds-2-palette-is-provisional-placeholder]]). Spec: `docs/specs/components/ds-2-foundations/_index.md` (implemented).
Also this session: built the **Frontend Visual Gate** + the **frontend source-of-truth** planning layer (foundation docs).
Next: DS-3 (motion foundation).
