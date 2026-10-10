# Task: fe-home
# Status: in-progress
# Linear: LIF-187
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #18 — #18 Home — 4-region (schedule·stats·day-actions·quick-actions) + arrangement toggle + journal Editor facet; built on UX-6 model. (+ Wrapped reviews.)
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Home** surface (G6 unit #18): a 4-region dashboard (schedule · stats · day-actions · quick-actions) + arrangement toggle + journal Editor facet, built on the UX-6 model (+ Wrapped reviews). Consumes `mod-journals` ① + cross-module providers. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard` ✅ (#5, DashboardView)
- blocked by `fe-codec-entity-facet` ✅ (#6, EntityView)
- `fe-codec-canvas-editor` #7 (reshape-runbook) — NON-blocking: entry = `@vida/editor` mount SEAM (row 7 = "reuse UI-3")

## Build log (② frontend · Entity Delivery Flow · branch `fe-home`)
- **Front matter:** interpretation.md · **Envision Gate FIRED + human (Victor) review PASSED** (first greybox caught the
  wrong architecture — plain-text entry + fixed 4-card strip; corrected to the ADR-008 two-entity model: inline-block
  journal page + personalized standalone-widget dashboard) · Decomposition **Approval 1** (3 slices). Docs:
  `docs/specs/foundation/fe-home/delivery/{interpretation,envision,slice-map,seam-contract}.md`.
- **S1 HomeDashboard** (`home-dashboard.tsx`) — standalone-widget grid over DashboardView (8 OS domains) + `renderHomeWidget`/
  `useHomeWidgets` seams (EC-4/EC-5).
- **S2 JournalPageRegion** (`journal-page-region.tsx`) — inline-block editor page (prose + inline regions + "/" affordance);
  `VidaEditor` mount = N6 seam (EC-3).
- **S3 HomeSurface** (`home-surface.tsx`) — greet + arrangement layer (reads Settings pref, default journalFirst; fe-home
  owns the layout, RP4) + `/` route wiring (EC-1/EC-2/EC-6/EC-7).
- **Gates:** tsc 0 · eslint 0 · home+routes tests green · full @vida/web **338/338** · **Visual Gate PASS** (Brave, 2
  arrangements × 3 presets × light/dark × 375/1440: axe 0 · AA 0-fail incl. warm-dark · 0 overflow — gate CAUGHT a
  composite-opacity AA fail on muted `/type` labels [2.26], fixed) · **g2 independent review SHIP** (2 nits folded:
  unconditional seam reads for a drop-in ProviderRead swap + dropped an `as` cast) · /critique SHIP.
- **Currency:** `apps/web/src/home/CLAUDE.md` updated (rendered surface + seams).
- **Deferred (homed):** real standalone widget bodies (per-capability) · real `@vida/editor` mount + inline node-views
  (first consumer) · live data (`buildDashboard`/registry) · arrangement toggle CONTROL + persisted write (fe-settings).
- **Status: COMPLETE, pending commit + PR** (branch `fe-home` off `origin/main` `a50408e`).
