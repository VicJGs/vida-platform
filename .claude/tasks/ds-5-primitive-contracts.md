# Task: ds-5-primitive-contracts
# Status: planned
# Linear: LIF-85
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System
# Profile: Design System
# Scenario: Default (design-system/scenarios/default.md)

## Goal
Author the primitive component contracts (API + visual states, not yet built): Button, Input,
Select, Checkbox, Card, Dialog, Popover, Toast, Tabs, Menu. Each contract fixes props, variants,
and the full state matrix (default/hover/focus/active/disabled/loading/error) so `@vida/ui` (UI-1)
implements against a spec rather than improvising.

## Dependencies
- blocked by `ds-4-tamagui-config-dark-mode`
