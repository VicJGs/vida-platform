# Task: fe-gamification
# Status: planned
# Linear: LIF-181
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #32 — #32 Gamification — System Dash · rule-authoring Flow (conditional).
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for gamification — the UI/UX tier over the finished ① service (`mod-gamification`), 7 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard` ✅ (LIF-208 Done)
- blocked by `fe-codec-flow-session` ✅ (LIF-210 Done)

## Register architecture — DOC-RESOLVED (GM-16; interpretation.md §7)
Dual, user-adaptive register (game for students/teens · calm for adults). **`game` is a GLOBAL preset**
(built in G0), applied via the Preferences/Onboarding theme picker (GM-16 — the System does NOT own theming);
persona → suggest-`game`-at-onboarding is Onboarding's hand-off. The System reads persona only for **reward
COPY** (EC-10). D-REG-1 (the game preset) is **RESOLVED in-unit (G0)**; D-REG-2 (`motivation_style` setter) =
`fe-settings` (LIF-193, in progress) — this unit reads it deny-safe (absent ⇒ neutral framing).

## Build Steps (slice log)
- **G0 · Game global preset ✅ DONE** (`3a7d525` + `0306eb0`) — the manhwa-"System" register: `color.game` ramp
  (cool-violet accent + slate neutral) + `fontFamily.game` (geometric sans) + `semantic.game(.dark).json`
  overlays + `build-tokens.mjs` PRESETS + `theme-resolution.ts`/`provider.tsx` extended; regenerated themes.ts
  (8 base) + fonts.ts. **tsc 0 · @vida/ui 526/526 · B10 AA matrix includes game · Visual Gate PASS** (Brave,
  measured: surface/accent resolve to game ramp both modes · sans voice swaps · AA muted-light 4.88 / body
  16.91 / accent-on-tinted 6.32–8.38 ≥ 4.5 · danger preset-invariant). §XXIX currency updated. EC-1, EC-2.
- **S1 · Multi-mode shell + Overview + wiring** — next (EC-3, EC-4, EC-10).
- S2 Currencies · S3 Achievements · S4 Rules+Flow · S5 Activity — pending.
- NB: worktree consumes @vida/ui via node_modules symlinks → main; the Visual Gate aliased @vida/ui → worktree
  src via a throwaway `vite.vg.config.ts` (deleted). Commit with explicit paths (never stage the symlinks).
