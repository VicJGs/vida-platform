# Task: ux-3-shell-layout-responsive
# Status: in-progress
# Linear: LIF-92
# Profile: add-frontend-component (design-led)
# Scenario: Default (design-led frontend spec)
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ⑤ UX

## Goal
Design the shell layout + responsive behavior — the daily-driver frame: how nav/sidebar/content
compose, how it reflows across widths, and the density that makes it livable all day. The spec
UI-4 implements as app-shell components.

## Dependencies
- blocked by `ux-1-information-architecture`

## Progress
- **Step 0 — Baseline DONE (2026-08-09):** `docs/specs/foundation/ux-3-shell-layout-responsive/baseline.md`.
  Ground truth gathered from live `main`. Key facts: (a) UX-3 = layout/responsive MODEL of the reserved
  shell regions (dock · Spaces-bar seam · global-bar · content `<Outlet/>` · ⌘K/modal overlay host); UI-4
  implements it — UX-3 builds NO chrome. (b) Shell code context is **from-zero** (routes.tsx is a placeholder;
  shell store = only `isSidebarOpen`) → no prior `current-*` to refresh; contexts read (nav, web-runtime,
  command-bar) verified current. (c) **NO breakpoint/`media` system exists** (Tamagui config has none) →
  UX-3 must DEFINE it. (d) `@vida/ui` NOT wired into apps/web (that's UI-4). (e) Spacing = 4pt-grid token
  scale (DS-2 owns values). Class = **FULL §XXVI double-gate** (same as UX-1/UX-2 design-spec class).

## Open Questions (resolve at PLAN / Step 1)
- OQ-1: Breakpoint set — ✅ RESOLVED by design.md §X (NOT an open decision): `375/768/1440/1920`, mobile-first,
  3 primary test widths 375/768/1440. Was nearly drifted (I invented 768/1024/1440).
- OQ-2: Code artifact vs pure-doc — emit a `createMedia`/`regions.ts` artifact (FULL-with-artifact). Open at PLAN.
- OQ-3: Density model — ✅ MOSTLY RESOLVED by design.md §IV/§X: named padding scale (Compact/Default/Loose/
  Spacious), containers max 1280 centered, side padding 16/24/32, touch targets 44×44. Compose from these.
- OQ-4: Overlay/modal host geometry — UX-3 owns placement; radius/elevation from design.md §V (drawer xl16/modal lg12/Level-3).
- OQ-5 (NEW): Breakpoint-artifact home — encode the standard's breakpoints app-local + reserve UI-4 `createMedia`
  seam, OR add `media` to DS-4's `tamagui.config.ts`. Genuinely open — Victor's call at Approval 1.

## Gate progress
- **Approval 1 ✅ (2026-08-09)** — PLAN Rev 4 approved. Independent critique SHIP (Rev 3, all 11 numbers verified
  vs design.md); Rev 4 removed 2 manufactured forks (D2/D5) — direction fully doc-determined, no open decisions.
- **Approval 2 ✅ (2026-08-09)** — IMPL-PLAN preflight PASSED (F1: content max-width is a global rule, not per-bp);
  gate-2 critique SHIP (token names verified, values exact, scope holds).
- **IMPLEMENTED ✅ (2026-08-09)** — 5 files: `apps/web/src/shell/{breakpoints,regions}.ts`(+22 tests)+`CLAUDE.md`,
  `docs/core/architecture/shell-layout.md`(+README row). typecheck 0 · @vida/web 66/66 (22 new) · lint 0-err · root 10/10.
  **Post-impl audit SHIP** (independent — values/tokens verified, 0 scope violations, code↔doc aligned, faithful to IMPL-PLAN).
  §XXIX currency: the arch doc + shell/CLAUDE.md ARE the durable home (from-zero shell context — no separate current-*).
- **NEXT:** on `main`, clean tree, NOT committed. Awaiting Victor go → branch `ux-3-shell-layout-responsive` + commit + PR (UX-1/UX-2 pattern), then task-complete + tracker --sync (LIF-92 → Done). Unblocks UX-6 (#26), UI-4 (#30).

## Drift caught (2026-08-09, pre-Approval-1)
Victor flagged the D1–D5 decisions as possible drift. Check confirmed: **YES on two axes.**
1. **Profile mislabel** — the `#`-table said "Generic" (loads only `process`); the authoritative
   `m1.0-delivery-plan.md:210` binds UX-3 to **add-frontend-component (design-led)** with authority
   **STANDARDS design.md (responsive)** + gate **quality-gate-design/-components**. Corrected the profile;
   loaded design/components/motion/engineering.
2. **Invented what the standard already fixed** — design.md §X fixes breakpoints (375/768/1440/1920, mobile-first),
   containers (1280 max, 16/24/32 padding), touch targets (44×44); §IV fixes the density/padding scale; §V fixes
   overlay radius/elevation. My PLAN Rev 2 invented a conflicting 4-breakpoint set → **drift**. PLAN Rev 3 aligns.
Lesson candidate: load the DELIVERY-PLAN's per-issue profile, not the coarse `#`-table label, or the wrong
standards load and the gate invents what's already standardized.
