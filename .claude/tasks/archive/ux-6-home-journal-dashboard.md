# Task: ux-6-home-journal-dashboard
# Status: done
# Scenario: Default
# Profile: New Feature
# Linear: LIF-95
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ⑤ UX

## Goal
Design the landing experience: Home = the Journal daily dashboard — today's auto-generated summary,
agenda (tasks/reminders/schedule), and the free-form entry, aggregating across modules. The screen
Victor opens every day. Defined here as UX; the aggregation engine + module feeds land in Phase 1b.

## Dependencies
- blocked by `ux-3-shell-layout-responsive` (per-issue edge, DONE ✅)
- **GATED by sub-wave sequencing: the UX wave `-d` needs the UI wave `-c` (`m1.0-delivery-plan.md:129,141`
  — "UX-6 (needs UI-4)"). NOT eligible until UI-2 → UI-3 → UI-4 are built.** This is why `--next` never
  picks UX-6 and why the raw `#`-order read (UX-6 ← UX-3 only) is insufficient here.

## Notes
- 2026-08-09: briefly mis-activated as the head off the raw `#`-order rule; reverted to `planned` — the
  `-d needs -c` sub-wave constraint governs. Un-parks after UI-4 (#30). Head that session → UI-2 (#28).
- 2026-08-17: activated (UI-4 done → `-d` released). **DELIVERABLE SHAPE = DESIGN MODEL** (declarative
  artifact + doc in `apps/web/src`, NO rendered component, NO Visual Gate) — identical to UX-3/4/5.
  Docs-fixed, not a fork: derived-graph.md:31 "Home/Journal screen **DESIGN** within the shell" ·
  delivery-plan:270 "design issue" · ui-4 `_index.md`:29 UI-4 scopes OUT "the Journal Home content
  (UX-6, gated behind this)" so the `/` `<h2>Vida</h2>` placeholder is INTENTIONAL, not a gap. The
  rendering + aggregation engine (`summary(date)`) are downstream: MOD-journals #33 (M1.1) + Phase-1b
  module feeds, consuming this design. Boundary here = the M1.0 UX design only.
