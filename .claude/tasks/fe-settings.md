# Task: fe-settings
# Status: in-progress
# Linear: LIF-193
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #24 — #24 Settings — net-new controls (theme·motion·density·Home arrangement·sync-vis·Atlas·module-rename) + searchable index. (ThemeProvider split → fe-codec-theme.)
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Settings** surface (G6 unit #24): net-new controls (theme · motion · density · Home arrangement · sync-visibility · Feature Atlas · module-rename) + a searchable index. ThemeProvider split out → `fe-codec-theme`. Consumes `mod-preferences` ①. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-theme` (✅ done)

## Build Steps (Entity Delivery Flow ② · worktree `.claude/worktrees/fe-settings` off origin/main `5ef0ce7`, Node 24)
Front matter: ✅ Baseline · ✅ Interpretation · ✅ Envision (12 ECs approved, D-ENV-1 Switch) · ✅ Decomposition (gate-1 SHIP, 3 refinements folded, Approval 1). Delivery `docs/specs/foundation/fe-settings/delivery/`.
- [x] **S1 — `Switch` primitive** (`@vida/ui`, EC-3) — pill toggle, direct tokens, injected CSS off `:checked`/`:focus-visible`; `--vida-switch-travel` inline; invalid via `$colorSignalDanger`. tsc 0 · eslint clean · 10/10 unit · Visual Gate PASS (3 presets × L/D; ON-track flips; invalid danger-fix gate-caught) · g2 SHIP. §XXIX: `packages/ui/src/CLAUDE.md` Switch paragraph.
- [ ] S2 — App theme store + `App.tsx` rewire (EC-5 mechanism) · Verification Gate
- [ ] S3 — Settings shell + `/settings` route + Appearance pane (live apply) + honest states + home-arrangement read activation · Visual Gate
- [ ] S4 — Searchable index · Visual Gate
- [ ] S5 — Modules pane (show/hide + rename + Surfaces) + escape-hatch · Visual Gate
- [ ] S6 — Locale · Notifications · delegated placeholders · Visual Gate
