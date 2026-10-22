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

## golive-replan absorption (G4, 2026-10-21)
Debt this issue absorbs (`docs/specs/foundation/golive-replan/debt-plan.md` §2 · coverage-report.md): primitives-refinement Calendar "Today" SR label · S7 closes under the Entity Live Close (ELC-1…9, incl. every pinned EC live).

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

## Build Steps (S7 — PLAN-S7-entity-close.md §5, Approval 2 2026-10-21)
- [x] 1 V13 `color?` + `off` (R7)
- [x] 2 CalendarView ", today" + controlled unfurl (G13/G14/R8)
- [x] 3 `pulseKey` today pulse on 5 renderers (R9)
- [x] 4 `@vida/ui` tsc · eslint · suite
- [x] 5 `db/test-driver.ts` + `composeServices` + live-vault test
- [x] 6 `calendar-derive.ts` (TZ-forced)
- [x] 7 `calendarQueries` + `use-calendar.ts`
- [x] 8 `calendar-sample.ts` (fixtures moved)
- [x] 9 surface flip (useCalendar · unfurl · pulse · fade)
- [x] 10 BR-6 node-env read-only test
- [x] 11 repo tsc · eslint · suites sequential (Node 24)
- [x] 12 /component-audit · code-review · /critique
- [x] 13 live Visual Gate (Victor) — PASS 2026-10-22
- [x] 14 ELC record · Linear · currency · commit · PR

## Session Log
- 2026-10-21 (S5 + S6 SHIPPED, main merged) — branch `fe-calendar` (NOT pushed), HEAD **`a3e36ca`**:
  **S5 `8f98082`** — `@vida/ui` **`LivingView`** (V13: ④ budget honest-null · ② threads + the vision's connector · 7
  temporal day Cards via alive-hooks · today's ordered entries w/ open-time offer + slip flag; lanes degrade alone) +
  `internal/calendar-shared.ts` (rule of three) + `living-format.ts` + surface Living dispatch (`livingFixture`, `weekSpan`)
  — **all six ranges live** on fixtures. Visual Gate PASS (Victor, 26 cells, text AA ≥4.52, axe 0). **Victor: "there should
  be no calls for me — check the documentation"** → connector (envision:54 deferred thread ink) + flag colour (EC-13 +
  decisions:127 → S2 MUST token) were doc-resolved, D-S5-DEV-1 withdrawn. **Merge `5d23b48`** of origin/main (51 behind —
  golive-replan ELC process.md landed; kept both sides of this file + components.md); post-merge ui 666/666 · web 698/698.
  **S6 `a3e36ca`** — grounding first: 3 of 4 seam §C reads already answered (EC-9 RATIFY sessions `listAvailability`/
  `listAvailabilityExceptions` · EC-10 RATIFY `listTasks({open})` per tasks current-spec:286-289 · EC-6 HONEST-NULL via
  `listPurposes`, no advertise — D-S6-DEV-1, borrowed leg → LIF-195); BUILT `habits.getCompletionGrid` (BR-HB-35; 14 tests
  Sao_Paulo + Tokyo; mutation killed). Found: purposes/habits have NO colour column → V13 `color?` (S7); rest day → `off`
  ThreadState (S7). **NEXT: S7 — the ENTITY-CLOSE slice** (fresh session). Resume: cd worktree · nvm use 24 · `git log -1` =
  `a3e36ca` · `git fetch` + ahead/behind (memory).
- 2026-10-20 (S4 SHIPPED) — **`60dfde9`** on branch `fe-calendar` (NOT pushed): `@vida/ui` **`YearView`** (UI-2 · V12 — 12
  mini-months, has 4px@.75 / busy 6px dots, today ring, current month accented only when the ring exists, each mini-month a
  `role=table` with offset-aware `aria-colindex`) + pure `internal/year-layout.ts` (resolveYear · buildYear · indexDensity)
  + surface Year dispatch + **month drill-in wired** (navigation, not a write → `clampToMonth` + `setRange('month')`, focus
  lands on the Month grid — FOCUS_CONTRACT `tabChange → panel`). §XXVIII **D-S4-DEV-1** (has-dot .75; .55 failed 3:1 in
  4/6) · **D-S4-DEV-2** (CalendarView opt-in `tabIndex` + ring). Full §XXVI stack: gate-1 REVISE (12) → re-critique SHIP
  (+4) · Approval 1 (F5 heading-as-drill) · preflight PASSED · gate-2 REVISE (11) · **grounding pass** (Victor "ground it in
  the documentation" → heading role REVERSED, focus-after-drill ADDED, weight 500) · Approval 2 · build · g2 review SHIP (9
  folded) · **Visual Gate PASS (Victor-reviewed, 29 cells)**. @vida/ui 636/636 · @vida/web 683/683. Currency: v12 spec ·
  v4 `tabIndex` · `_index` V12 · ui CLAUDE.md · runtime spec · slice-map · seam-contract §A · decisions · components.
  **NEXT: S5 Living lens renderer** (slice-map S5, `LivingView`, EC-6..EC-10). Resume: cd worktree · nvm use 24 ·
  `git log -1` = `60dfde9`.
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
| S4 PLAN | gate-1 + gate-2 critiques (has-dot 3:1 computed · greybox governs the gap · colindex · button UA reset) | independent critics | ✅ 27 folded → Approvals 1/2 |
| S4 PLAN | Grounding pass — G11 heading role reversed (sibling convention) · focus-after-drill added (FOCUS_CONTRACT) · weight 500 | Victor: "ground it in the documentation" | ✅ PLAN revised → proceed |
| S4 build | D-S4-DEV-2 CalendarView `tabIndex` (tsc rejected rest passthrough) · accname leading-space fix | build-caught | ✅ approved at the S4 gate |
| S4 gate | 1-up at 375 = HARNESS missing `index.css` (UA body margin) — not the product | Visual Gate probe of the container chain | ✅ harness fixed, gate PASS |
| S5 PLAN | Two "calls" presented for Approval 1 (connector · flag colour) were doc-resolved | Victor: "There should be no calls for me, check the documentation" | ✅ envision:54 + EC-13/decisions:127 → no deviation |
| S5 build | sr suffix in a flex row dropped by browsers · lanes blanked by state · loading tab stop (axe) | g2 review + Visual Gate | ✅ inside inline Text · lanes independent · tabIndex 0 always |
| S5→S6 | merge origin/main (golive-replan ELC process.md) relayed by the golive session | cross-session request (Victor's direction) | ✅ `5d23b48`, after S5's gate (not mid-gate) |
| S6 PLAN | 3 of 4 seam §C reads already answered; colour has no source | grounding sweep + gate-1 (re-verified on disk) | ✅ one method built; D-S6-DEV-1/2/3 |
| S7 PLAN | G1 D2 superseded by dueIn · Planner "orphan" + TZ "mismatch" were drift (Victor) · G8 Must/Can source found at preflight | grounding + 2 critique rounds + Victor at Approval 1 + preflight | ✅ PLAN rev 2.1 → Approvals 1/2 |
| S7 build | g2 code review: 15 folded · finding 3 (Living past relationships) | independent review | ✅ 15 folded · D-S7-DEV-4 Victor-approved 2026-10-22 + built |

## Failures This Session
- F001 — Visual-Gate static-box probe matched nothing (Chrome snaps 1.5px border → 1px) — resolved (select by box size; memory).
- F002 — mutation check restored with `git checkout --`, wiping uncommitted canvas-view edits — resolved (restored from the pre-mutation copy, re-verified; memory `mutation-check-restore-from-copy-never-git-checkout`).
- F003 — @vida/ui first-test-of-file timeouts under full-suite load (calendar-view, export-dialog) — env flake, green in isolation (known pattern).
- F004 — Week page overflow at 375 from sr-only spans escaping the scroll region — resolved (`position:relative`; known-failures F004).
- F005 — engine-dependent list accessible names ("Thu8" in jsdom) — resolved (explicit sr-only name; known-failures F005).
- F006 — full suites killed by the background limit (10 min) then reaped under low system memory; 6 first-test cold-start timeouts — resolved (suites run sequentially; 105/105 alone; `testTimeout:15000` in week-view.test).
- F007 — debug probe hung: a stray `cat > file` with no stdin blocked the command (misread as memory pressure) — resolved (Write tool for probe files).
- F008 — accessible name "January2026" (accname drops a leading space inside an sr-only span) — resolved (sibling text node; memory tamagui gotchas).
- F009 — Visual Gate read 1-up at 375: harness skipped the app's `index.css` → UA body margin −16px — resolved (harness mirrors main.tsx CSS; memory visual-gate-playbook).
- F010 — CalendarView first test timed out under load (5.5s) — env flake (F003 pattern), green alone.
- F011 — `@vida/core` encryption/vault.test "handles large data (1 MB)" times out (≈28s vs 20s) even alone — PRE-EXISTING environment slowness (test untouched since DB-6, unrelated to S6); open, not touched.
- F012 — ModuleDock timeout (5–6.5s) under full-suite load twice — env flake (memory: heavy Tamagui shell tests), 5/5 alone.
- F013 — live gate: "DB worker RPC 1 (open) timed out after 15000ms" — INTERMITTENT on a page load in the automated Chromium, on the dev server AND the prod preview (first diagnosis "vite reload lock" was incomplete — it recurred without a reload). The app's own Retry opened the DB with the seeded data intact each time → consistent with the previous document's worker still holding the exclusive AccessHandlePoolVFS OPFS handles. Boot path untouched by S7 (empty diff on worker/web-driver/boot/vite.config). Also observed: the PROD build's worker never fetches its wasm within the window. PRE-EXISTING data-plane boot behaviour → surfaced to Victor for a home; not an S7 defect.
- F014 — live gate: a sliced body.innerText probe read the seeded Month as "no chips" — a PROBE bug, not product (the screenshot showed every seeded item on its day); measure with the screenshot + per-element queries, not a truncated text dump (memory: measure, don't hypothesize).
- F015 — final full-suite run: 10 ui + 10 web FIRST-test-of-file timeouts (5–19s) while the dev server, prod preview and Playwright browser ran concurrently — env load (the F003/F006/F012 class); every failed file green in isolation after stopping the servers (ui 168/168 · web 134/134).
