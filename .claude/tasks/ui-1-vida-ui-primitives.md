# Task: ui-1-vida-ui-primitives
# Status: in-progress
# Linear: LIF-86
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System · reconstructed-structure.md #27
# Profile: Design System
# Scenario: Default (design-system/scenarios/default.md)

## Goal
Build the 10 Vida UI primitives in `@vida/ui` against the DS-5 contracts
(`docs/specs/components/ds-5-primitive-contracts/`): Button, Input, Checkbox, Select,
Card, Tabs, Menu, Dialog, Popover, Toast. Each primitive implements its authored API +
the applicable 8 visual states, registers its `light_/dark_<Comp>` sub-theme in
`tamagui.config.ts`, and passes the component **Visual Gate** (deferred here by DS-5 per
the frontend-visual-gate render table). Gated **per component** (§XXVI double-gate each).

## Dependencies
- blocked by `ds-5-primitive-contracts` (contracts + component.json tokens — DONE, merged PR #7)

## Scope fences
- IN: the 10 primitive `.tsx` in `packages/ui/src/components`, their stories (8 states ×
  light｜dark), the 9 `light_/dark_<Comp>` sub-theme registrations in `tamagui.config.ts`,
  standing up the component render harness (Visual Gate mechanism).
- OUT: platform views calendar/gallery/list/graph/timeline (UI-2 #28); the editor (UI-3 #29);
  new token VALUES (DS-2) or new component TOKENS (DS-5 — already firmed); app shell/routes (UX-3).

## Build order (atomic → molecular → overlay) — per DS-5 §3
0. Component render harness (Visual Gate mechanism) standup — prerequisite
1. Button  2. Input  3. Checkbox        (atomic)
4. Select  5. Card   6. Tabs   7. Menu   (molecular)
8. Dialog  9. Popover  10. Toast         (overlay/organism — each cites its zIndex token)

## Build Steps  (each U1–U10 = one §XXVI double-gate + component Visual Gate)
- [x] U0 — Storybook standup (`pnpm storybook`) — DONE 2026-08-06. SB 9.1.20 + react-vite +
      addon-a11y; UIProvider decorator + light｜dark toolbar; tsconfig.storybook.json (new files
      type-checked); process-shim (untamed-Tamagui `process is not defined` triage, ISOLATED).
      Verified real-browser: renders ~1.5s, card white↔navy on toggle, 0 pageerrors, 31/31, both
      typechecks green, build-storybook OK. Victor confirmed fast + toggle. Fix doc: docs/specs/fixes/ui-1-storybook-slow-load/.
- [ ] U1 — Button
- [ ] U2 — Input
- [ ] U3 — Checkbox
- [ ] U4 — Select
- [ ] U5 — Card
- [ ] U6 — Tabs
- [ ] U7 — Menu
- [ ] U8 — Dialog
- [ ] U9 — Popover
- [ ] U10 — Toast
- [ ] UF — final consolidated gate sweep + version/changelog + §XXIX currency + PR

## Open questions
- OQ-1 [RESOLVED via docs, 2026-08-06]: Visual Gate render mechanism = **Storybook**
  (`pnpm storybook`). The frontend-visual-gate.md render table (:44) names Storybook as the
  Components-row mechanism and states it "stands up at DS-5/UI-1"; the DS-5 spec calls it the
  "Components/Storybook row" (_index.md:3,:39). Not a live fork — the "(or a preview page)"
  parenthetical is a fallback, superseded by the named artifact + `pnpm storybook` command.
  U0 stands up Storybook on Tamagui + React 19 (`packages/ui` gets its first bundler config).
