# Task: fe-calendar
# Status: in-progress
# Linear: LIF-203
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #19 · NEW

## Goal
② Frontend — unit #19. X-CUT · Global Calendar — dueIn cross-module lane (dayparted + timed), ProviderRead.

## Dependencies
- blocked by `fe-codec-canvas-board`
- blocked by `fe-codec-seams`

## ⚑ Approved design vision — the "living calendar" (2026-10-05, from LIF-230 session)
A design session under `fe-codec-primitives-refinement` grew the calendar from "polish the month grid" into this
surface's flagship, and Victor approved homing it HERE (split-to-#19). **Design input is captured + Victor-approved:**
`docs/specs/foundation/fe-calendar/calendar-vision.md` + two mockups in `docs/specs/foundation/fe-calendar/mockups/`.
Scope this surface should build:
1. **Multi-range renderer** — one renderer, 6 ranges in a switcher: Year · Month · Week · Day · **Agenda** · **Living**.
   Agenda = daypart-grouped actionable schedule (Must/Can, timed+all-day). Month = the refined grid (LIF-230 ships that
   aesthetic; reuse it). Week/Day = time-column; Year = density overview.
2. **The "Living" lens (the signature)** — 5 cross-module moves: ① past-as-record (journal/Review) · ② habit threads
   (`habit_completions`) · ③ open-time surfacing (availability/planner) · ④ purpose budget (ADR-011 contributions) ·
   ⑤ drift flag (task reschedule history). Temporal asymmetry: past=record · today=live · future=intention.
3. **Architecture:** presentational renderers in `@vida/ui` (data-prop, Visual-Gate'd with fixtures) + THIS surface's
   ProviderRead cross-module fan-out feeding them. Still a read-only lens (ADR-007); writes = owning-module capabilities.
This is why #19 was always "dueIn cross-module lane, ProviderRead" — the vision now makes it concrete. Pick up the
vision doc FIRST when #19 is sequenced.

## Progress (Entity Delivery Flow ② · add-frontend-component / default)
- **Step 0 Baseline** ✅ — refreshed `docs/infrastructure/web-client-runtime/current-spec.md` (CODEC seams + #19).
- **Step 1 Interpretation** ✅ — `delivery/interpretation.md` (11 deps · 6 needs · 10 IRs).
- **Step 1.5 Envision Gate** ✅ PASS (Victor, 2026-10-10; v1→v2 OS-rebuild→v3 Month-consistency+Agenda-tidy). Checkpoints EC-1…EC-14 + EC-F1…F4 locked in `delivery/envision.md`; evidence in `mockups/greybox/*.png` (greybox deleted).
- **Step 2 Decomposition Gate** ✅ APPROVED (Victor) — `delivery/slice-map.md` (7 slices) + `delivery/seam-contract.md`. Decisions D1–D5 resolved (Daypart · reuse buildDashboard · first-consumer reads · CalendarView hideHeader · drift=slip-flag).
- **S1** ✅ PASS (2026-10-10) — `CalendarSurface` + `calendar-ui-store` + `/calendar` route + `CalendarView.hideHeader`. Full Visual Gate green (AA matrix, axe 0). Month uses a fixture (live data = S7).

## Next session (resume here)
- **FIRST ACTION:** fresh `/begin` on the `fe-calendar` branch/worktree. Next slice = **S2 (Agenda renderer, `@vida/ui`)** per `delivery/slice-map.md`; then S3 Week/Day · S4 Year · S5 Living · S6 backend reads · S7 useCalendar fan-out.
- Env: Node 24 for @vida/ui + @vida/web; Visual Gate = Brave via `/tmp/vg-calendar/s1-gate.mjs` pattern (poll past "Loading…" → complete onboarding → **client-side** nav `history.pushState`+popstate to the route, NOT page.goto which re-triggers onboarding; measure the digit TEXT node, not the wrapper div). Rebuild @vida/ui dist before an apps/web typecheck consuming new exports.
- The slice-map ledger is the authoritative progress oracle (S1 ✅, S2–S7 ☐).
