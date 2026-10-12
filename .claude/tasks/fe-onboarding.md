# Task: fe-onboarding
# Status: in-progress
# Worktree: .claude/worktrees/fe-onboarding (branch fe-onboarding off origin/main @ 5ef0ce7, Node 24)
# Linear: LIF-216
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #26 · EXTEND ux-5

## Goal
② Frontend — unit #26. X-CUT · Onboarding render + optional guided setup (copy-honest).

## Dependencies
- blocked by `fe-codec-flow-session` ✅ (done — the guided/stepped surface archetype)
- blocked by `fe-codec-patterns` ✅ (done — 8-state · EmptyState · SyncStatus · VoiceCopy conventions)

## Context (grounding)
- **EXTEND ux-5** — the shipped onboarding model + basic screens already exist in `apps/web/src/onboarding/`:
  `steps.ts` (`ONBOARDING_STEPS` + per-step copy contracts) · `first-run.ts` / `use-first-run.ts` /
  `first-run-repo.ts` (first-run marker + repo) · `onboarding.tsx` (UI-4 S4 basic 4-screen flow) · `CLAUDE.md`.
- **Scope (stub):** "Onboarding render + **optional** guided setup (**copy-honest**)" — guided setup is optional;
  all copy must honor the M1.0/M3 honesty contract (local-first now, ZK at M3) that UX-5 established.
- CODEC deps shipped: `fe-codec-flow-session` (stepped surface) + `fe-codec-patterns` (state/empty/sync/voice).

## Entity Front Matter (Entity Delivery Flow ②) — delivery/ at docs/specs/foundation/fe-onboarding/delivery/
- [x] **Step 0 BASELINE ✅** — `delivery/baseline.md`. Terrain mapped: first-run render + model + copy-honesty SHIP
      (UX-5/UI-4 S4, `apps/web/src/onboarding/`). Net-new (doc-grounded, surface-map:34 "MISSING") = the **optional/
      skippable guided-setup Flow** — "pick modules & theme" [p5 specimen:164], type=Flow, on shipped flow-session #11
      + patterns #2; plus copy-honesty reconcile + guided-setup reach wiring. 6 open Qs → Interpretation/Envision
      (consumption-fit · persistence seams · reach paths · copy RATIFY-vs-gap · render refine-vs-ratify · §3.75 likely FIRES).
- [x] **Step 1 INTERPRETATION ✅** — `delivery/interpretation.md` (D1-6 · N1-6 · IR1-7 · boundary · §3.75). All 6
      BASELINE open Qs resolved from docs: consume FlowSessionView **presentationally** (IR1, not a session) · picks →
      **deferred ProviderRead/write seams** (modules=M1.1 feature-flags, theme=deferred switcher — IR3/N6) · reach =
      completion branch + `EmptyState.guidedSetup` slot (≥2-path, N1) · copy + shipped render = **RATIFY** (IR5/IR7) ·
      guided setup is opt-in/reachable-anytime, NOT a 2nd boot gate (IR2).
- [x] **Step 1.5 ENVISION ✅ APPROVED (Victor, 2026-10-11)** — `delivery/envision.md`. Greybox built+driven (Brave),
      approved. **EC-1…EC-10 pinned** (EC-3 = Victor's directive: **persistent LEFT-rail vertical stage indicator** so
      the user sees position; content to its right). Scene-F resolved → **lighter purpose-built flow frame** (not
      FlowSessionView — unsuppressable session affordances misfit; dep = build-order blocked-by, not import-mandate),
      grounded in Decomposition. RATIFY: shipped first-run render + copy model.
- [~] **Step 2 DECOMPOSITION** — `delivery/{slice-map,seam-contract}.md`. 4 slices (S1 frame+left-rail · S2 module
      picker · S3 theme picker+preview · S4 reach+PR); Intent Coverage Gate EC-1…9 all homed. **Scene-F grounded**:
      lighter frame, not FlowSessionView (unsuppressable session affordances + layout mismatch; dep=build-order).
      **Independent gate-1 critic = SHIP** (all load-bearing claims verified vs source; 2 NITs folded: convention paths,
      S2 default-enable-set check). **AWAITING Victor Approval 1** → then per-slice build (S1 first).

## Build Steps (per-slice §XXVI double-gate + blocking Visual Gate; PR at S4) — all `frontend`
- [x] **S1 — Guided-setup flow frame ✅** (EC-2/3/6/8/9). Built `apps/web/src/onboarding/{guided-setup-steps.ts,
  step-rail.tsx,use-guided-setup.ts,guided-setup.tsx}` + test. The flow shell: **LEFT-rail vertical stepper** (StepRail,
  done=filled✓/current=ring/upcoming=muted) + content pane + never-a-wall footer (Continue · Skip this step · persistent
  Skip setup →) + honest completion (Enter Vida, local-first copy) + pageNav focus + reduced-motion + self-owned Surface.
  Step bodies injected via `renderStepBody` (S2/S3). tsc 0 · eslint 0 · **onboarding suite 37/37** (11 new) · **Visual Gate
  PASS** (Brave; 3 presets × L/D × 1440/375: AA 4.52–5.22 incl warm-dark · 0 fails · 0 errors; left-rail + 375 top-strip
  reflow). **g2 code-review REVISE→folded**: B1 harness-delete · B2 flex-collapse guard (drop flex-grow when column) ·
  N1 marker convention reconciled in PLAN · N2 muted-error documented (AA-safe vs danger 3.63). Re-entrancy = useRef latch
  (same-tick, gate-caught). Next: **S2 — module picker**.
- [ ] S2 — Step 1 module enable-set picker (EC-4).
- [ ] S3 — Step 2 theme picker + live preview (EC-5).
- [ ] S4 — Reach wiring (≥2-path) + app-mount + unit PR (EC-1).

## Parking lot
_(none yet)_

## Log
- 2026-10-11 — task picked up (stub → in_progress); worktree `.claude/worktrees/fe-onboarding` cut off origin/main
  @ 5ef0ce7 (Node 24). Chosen as next FE head (fe-calendar/fe-settings have parallel-session worktrees).
- 2026-10-11 — **Step 0 BASELINE ✅** (`delivery/baseline.md`). Direct read of `apps/web/src/onboarding/*` +
  `onboarding.md` + Explore fan-out for the intent corpus / CODEC deps / mount seam. **Load-bearing finding:** the
  onboarding RENDER already ships; the net-new is the doc-grounded **guided-setup Flow** (pick modules + theme,
  skippable — p5 specimen:164). Next: **Step 1 — INTERPRETATION** (resolve the 6 open Qs from docs; write interpretation.md).
- 2026-10-11 — **Step 1 INTERPRETATION ✅** (`delivery/interpretation.md`); all 6 open Qs doc-resolved; **Envision FIRES**.
- 2026-10-11 — **Step 1.5 ENVISION greybox BUILT + driven** (Brave via playwright-core; `apps/web/{envision.html,
  src/__envision__/*}` + `__envision-shot.mjs`, all THROWAWAY). 6 scenes (reach · modules · theme · done · 2nd-reach
  slot · ⚠ FlowSessionView-as-is fit question) × editorial/reader/quietDesk × light/dark × 1440/390. Screenshots
  `/tmp/envision/*.png`. **Load-bearing design finding surfaced:** `FlowSessionView` #11 bakes SESSION affordances
  (Mark done · Require proof · Attach doc/photo/audio + deliverable Timeline) into the current stage → misfits a setup
  flow; scene F shows it as-is. **AWAITING Victor's Envision review + EC-n pin** (BLOCKING) — he designs on this foundation.
