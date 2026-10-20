# Task: fe-calendar
# Status: in_progress
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


## Session Log
- 2026-10-20 (S3 SHIPPED) — **`84ce041`** on branch `fe-calendar` (NOT pushed): `@vida/ui` **`WeekView`** (UI-2 · V11 —
  Week AND Day, Day = one column) + pure `internal/week-layout.ts` (formatHour · normalizeSpan · windowFor · layoutDay) +
  surface Week/Day dispatch + **BR-16 root fix** — `timeFormat`/`weekStartsOn` READ from `preferences-store`;
  `weekStartOf` replaced the hard-coded `mondayOf` across every range (Month via `CalendarView weekStartsOn`). Full §XXVI
  stack: gate-1 REVISE (12) → re-critique SHIP · **grounding pass** (Victor "check the documentation" ×3 — I-1 window
  auto-extend + I-2 overlap lanes doc-DERIVED, I-5 undated chips doc-FIXED, + missed BR-16) · Approval 1 · preflight (3
  citation fixes) · gate-2 REVISE (10) · Approval 2 · build · g2 review (8 folded) · /critique SHIP · **Visual Gate PASS
  (Victor-reviewed)** incl. §XXVIII **D-S3-DEV-1** (shared-lane blocks show start only, range sr-only). Gate caught (jsdom-
  invisible): sr-only spans escaped the overflow:auto region → page 616px at 375 · engine-dependent column names.
  @vida/ui 605/605 · @vida/web 677/677. Currency: v11 spec · `_index` V10/V11 · ui CLAUDE.md · runtime spec · slice-map ·
  seam-contract §A/§B · decisions ledger. **NEXT: S4 Year renderer** (slice-map S4, `YearView`, EC-5) — GROUND FIRST in
  the owner docs (Sessions owns `/calendar`) + shipped stores BEFORE flagging any interpretation. Resume: cd worktree ·
  nvm use 24 · `git log -1` = `84ce041` (or the docs follow-up on top).
- 2026-10-18 (S1 chrome fix SHIPPED) — **`5e261ff`** on branch `fe-calendar` (NOT pushed), bug unit
  `docs/specs/fixes/fe-calendar-s1-chrome-375/` RESOLVED: <768 `Range:` Menu condense (EC-1, useMedia + `__bp`) · all range
  chrome 48px (decisions.md:82) · CanvasView title `lineHeight="$display"` + `Actions` wrap (BR-CB-S1-12) · honest "This
  week ·" · clamped month/year nav. Visual Gate PASS (Victor-reviewed), 60 cells, 0 page overflow. S1 ledger's false PASS
  CORRECTED. Victor steer ×2: "ground everything in the documentation" / "the decisions are in there" → all 3 calls
  were decisions.md rows (touch floor :82 · surfaced-shared-defect = root fix in-unit :1117/1119 · latent = sibling fix
  :109). Siblings recorded (not folded) in `docs/specs/fixes/ds-type-lineheight-unpaired/` — 24 unpaired large-type
  sites · sm-32px shell/Collection controls + Menu rows ~37px under the ≥44 floor · focus drop at the 768 swap.
  **NEXT: S3 Week/Day renderer** (slice-map S3, `@vida/ui` `WeekView`, EC-4). Resume: cd worktree · nvm use 24 ·
  `git log -1` = `5e261ff`.
- 2026-10-18 (S2 SHIPPED) — Worktree merged origin/main (`12639ee`, routes.tsx union; S1 re-verified: tsc 0 · lint 0 ·
  calendar-view 22/22 · apps/web 661/661). **S2 Agenda renderer committed `614c6b9`** (branch `fe-calendar`, NOT pushed):
  `@vida/ui` `AgendaView` (V10, 21 tests) + `@vida/types` `DAYPART` + surface `agendaFixture`/agenda dispatch. Full §XXVI
  stack; Victor steer "ground everything in the documentation" → 3 corrections (D1 mint IN S2 per slice-map:14-17 ·
  today-dayparted asymmetry = doc-FACT · bands settled <12/12–17:59/≥18, all-day→morning). Visual Gate PASS
  (Victor-reviewed) incl. §XXVIII D-S2-DEV-1 (Tamagui focus/hover pseudo-styles) · DEV-2 (375 rail reflow) · DEV-3 (no
  no-op handler → no dead checkboxes); gate caught control border 1.2–1.7:1→`$colorTextMuted` + hit 42→46.
  **Surfaced 2 PRE-EXISTING S1 chrome defects** — EC-1 switcher never condenses <768 (375 page overflow, sw 520, also on
  Month @ a1148f9) · wrapping CanvasView period title overlaps itself at 375 (+ "This week ·" on every week).
  **NEXT (Victor-approved order): S1 chrome fix as its OWN triaged + gated bug unit (`docs/specs/fixes/…`), THEN S3
  Week/Day.** Resume: cd worktree · nvm use 24 · `git log -1` = `614c6b9`.
- 2026-10-18 — QUEUED AS NEXT HEAD (Victor; post fe-session-hud close). **State: IN FLIGHT — front matter
  COMPLETE** (interpretation · envision v3 · seam-contract · slice-map under
  `docs/specs/foundation/fe-calendar/delivery/` + the Victor-approved calendar-vision.md) **+ S1 built,
  gated, Victor-approved** (`a1148f9` — CalendarSurface + role=toolbar range switcher + Month; commit msg
  carries the gate record). Worktree `.claude/worktrees/fe-calendar`, branch `fe-calendar`, based on main
  @ `a50408e` (2026-10-10 — now ~10 merges behind; main @ 33278c1 has settings/gamification/notifications/
  onboarding/session-runtime/session-hud routes).
  **RESUME (first actions):** cd the worktree · nvm use 24 · `git fetch && git merge origin/main`
  (expect the routes.tsx union conflict — keep ALL routes + calendar's) · `pnpm install` + package dist
  rebuild · re-verify S1 (tsc/eslint/calendar tests green post-merge) · re-read slice-map for S2 · continue
  the per-slice §XXVI stack. NOTE: tracker shows this unit "blocked" — FALSE (both blockers Done+archived;
  live-verified 2026-10-18). NOTE: the HUD now occupies the strip hard-right; any calendar strip assumptions
  should re-check co-fit.

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| S2 PLAN | Grounding pass (D1 mint into S2, asymmetry = FACT, bands settled) | Victor: "ground everything in the documentation" | ✅ PLAN revised → Approval 1 |
| S2 build | §XXVIII DEV-1/2/3 (pseudo-styles · 375 reflow · no no-op handler) | build-time grounding + g2 review | ✅ approved at the S2 gate |
| S2 gate | S1 chrome defects surfaced → own bug unit before S3 | page overflow + title overlap pre-existing at a1148f9 | ✅ `5e261ff` |
| Fix PLAN | Grounding passes ×2 (useMedia/__bp · lg floor · root-fix vs sibling homing) | Victor: "the decisions are in there" | ✅ decisions.md:82/109/1117/1119 |
| Fix build | §XXVIII D-FIX-DEV-1 (CanvasView actions wrap) | 48px toolbar overflowed at 768 / quietDesk 375 | ✅ approved, gate PASS |
| S3 PLAN | Grounding pass — 3 "interpretations" were doc-resolved + missed BR-16 (locale prefs) | Victor: "check the documentation" ×3 | ✅ PLAN revised → Approval 1 |
| S3 gate | sr-only containing-block page overflow · explicit column names · D-S3-DEV-1 short time | Visual Gate (screenshots + page probe) | ✅ fixed / approved, gate PASS |

## Failures This Session
- F001 — Visual-Gate static-box probe matched nothing (Chrome snaps 1.5px border → 1px) — resolved (select by box size; memory).
- F002 — mutation check restored with `git checkout --`, wiping uncommitted canvas-view edits — resolved (restored from the pre-mutation copy, re-verified; memory `mutation-check-restore-from-copy-never-git-checkout`).
- F003 — @vida/ui first-test-of-file timeouts under full-suite load (calendar-view, export-dialog) — env flake, green in isolation (known pattern).
- F004 — Week page overflow at 375 from sr-only spans escaping the scroll region — resolved (`position:relative`; known-failures F004).
- F005 — engine-dependent list accessible names ("Thu8" in jsdom) — resolved (explicit sr-only name; known-failures F005).
- F006 — full suites killed by the background limit (10 min) then reaped under low system memory; 6 first-test cold-start timeouts — resolved (suites run sequentially; 105/105 alone; `testTimeout:15000` in week-view.test).
