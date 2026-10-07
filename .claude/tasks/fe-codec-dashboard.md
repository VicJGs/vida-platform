# Task: fe-codec-dashboard
# Status: done
# Linear: LIF-208
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #5 · NEW

## Goal
② Frontend — unit #5. CODEC · Dashboard shell — integration-block grid.

## Dependencies
- blocked by `fe-codec-patterns` ✅

## Build Log (DONE 2026-10-07 — Entity Delivery Flow ②, worktree + branch `fe-codec-dashboard`)
Front matter (`94159e5`): interpretation (3-lens; blocks types-only→render-prop shell; app-plane binds the SHIPPED
`block_instances`/capability canon; gate-1 REVISE→folded 2 blocking) · Envision FIRED + human review PASSED (EC-1..EC-8
pinned: `size`-enum spans + `Card` cell frame) · decomposition (2 slices; shell owns generic terminal states; gate-1
REVISE→folded B1 schema-namespace import + `blockLoading` hatch).

**S1 `DashboardView`** (`@vida/ui`, `01e4964`) — RN-safe flex grid of `size`-enum span cells (`maxWidth` cap stops a lone
non-`full` cell filling, EC-6) · `Card` cell frame + `⋯` slot · `renderBlock` success-only, shell owns loading/empty/error
(calm muted `role=status`) + 3 override hatches · empty-dashboard teach. g2 REVISE→folded B1 (`$h3`/`$h4` undefined tokens
→ `$heading`/`$subheading`). /critique SHIP. **Visual Gate PASS** (Brave, 3 presets × light/dark: heading serif AA
15.84–17.29 · cell text 4.52–5.22 incl. warm-dark · axe 0 · EC-1..EC-8; the gate caught `$colorSignalDanger` error text
failing light-mode AA 3.63 → muted, the `Message` precedent). tsc 0 · @vida/ui 446 tests (9 new).

**S2 adapter** (`apps/web`, `0ff7709`) — pure `parseBlockConfig`/`toCellDescriptor`/`isStandalone`/`toBlocks` (async:
resolve defs via `CapabilityRegistry.get` → filter `standalone` → thread derived state → preserve order → degrade
unresolvable to a skip) + `DashboardAdapter` convention. Live `useDashboard` hook deferred to first consumer. g2 SHIP
(`BlockInstanceLike` structural refinement sanctioned — `CapabilityDefinition` has no title). apps/web tsc 0 · 11 tests.

**Follow-up (NOT this unit):** `collection-view.tsx:170` carries the same latent `$h3` undefined-token defect (→ a sibling
one-line fix; flagged by g2). Also pre-existing: danger `#ef4444`=3.63 AA (ds-2 provisional palette → Figma M4).
