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
- [x] **S2 — Step 1 module enable-set picker ✅** (EC-4). Built `apps/web/src/onboarding/{modules.ts,use-module-selection.ts,
  module-picker.tsx}` + test. `modules.ts` = pure projection: the visible-dock roster grouped by `ModuleGroup`, MIRRORING
  `shell/module-dock.tsx` `visibleDockGroups()` (`placement:'dock'` + `isFeatureEnabled` fail-closed gate → 14 modules / 5
  groups; gamification + empty `platform-services` drop) + `defaultModuleEnableSet()` (all visible-dock ON = today's
  behavior, the anti-lie default). `use-module-selection.ts` = in-memory enable-set + the deferred `ModuleEnablementWrite`
  seam (`commit` stubbed no-op, no "saved" claim — EC-7). `module-picker.tsx` = `ModulePickerView` (PURE, state-as-prop) +
  `ModulePicker` hook shell; grouped `aria-pressed` toggle chips (local `ToggleChip`, `type="button"`, §VIII focus ring,
  decorative aria-hidden ✓ marker). tsc 0 · eslint 0 · **onboarding suite 47/47** (10 new) · **Visual Gate PASS** (Brave;
  3 presets × L/D × 375/768/1440: text AA 4.94–6.03 incl warm-dark · on/off state-indicator fill-diff 4.39–5.27 ≥3:1 ·
  0 overflow · 14 chips/5 groups, gamification excluded). **g2 independent review = SHIP** (1 NIT folded: `type="button"`
  on the raw render:'button' chip, `global-surfaces-list.tsx:53` precedent). Honesty guard test uses an independent oracle
  (`MODULE_MAP.filter`). Cross-step state persistence + commit-into-flow deferred to S4 (forward-only flow). Next: **S3 — theme picker**.
- [x] **S3 — Step 2 theme picker + live preview ✅** (EC-5). Built `apps/web/src/onboarding/{use-theme-selection.ts,
  theme-picker.tsx}` + test. `use-theme-selection.ts` = selected preset + the deferred `ThemePersistWrite` seam
  (`preview` drives the app-owned `UIProvider selection` lever, injected as `onPreview` — live in M1, IR4; `commit`
  stubbed no-op). `theme-picker.tsx` = `ThemePickerView` (PURE, state-as-prop) + `ThemePicker` hook shell; the shipped
  `THEME_PRESETS` as `aria-pressed` single-select swatches, each with a 4-token palette band. **Load-bearing mechanism:**
  a non-active preset's palette can't be shown via nested `<Theme>` (the active `<body class="t_<preset>">` scope
  `:root.t_<mode> .t_<preset>` out-specifies any in-tree wrapper → bands collapse to the active preset); resolved via a
  throwaway `getComputedStyle` probe under `<html>` (`resolvePresetPalette`, [[webgl-canvas-color-needs-getcomputedstyle-probe]])
  in a POST-PAINT effect (the provider applies theme classes in its own layout effect → a render-time read sees undefined
  vars). tsc 0 · eslint 0 · **onboarding suite 55/55** (8 new; 2 jsdom load-timeout flakes resolved environmental —
  pass isolated + at `--testTimeout=20000`). **Visual Gate PASS** (Brave; 3 presets × L/D × 375/768/1440: bands DISTINCT
  per preset 3/3 · label AA 13.0–15.7 · selected ring 3:1 = 5.93–7.31 · **live preview re-roots the surface** t_light→
  t_reader + Reader pressed · 0 overflow). **g2 independent review = SHIP** (3 NITs: try/finally probe cleanup folded ·
  stale header comment fixed · S4-must-pass-provider's-active-mode noted below). Next: **S4 — reach + app-mount + PR**.
- [x] **S4 — Reach wiring (≥2-path) + app-mount + unit PR ✅** (EC-1). Built `apps/web/src/onboarding/{guided-setup-store.ts,
  guided-setup-reach.ts,guided-setup-entry.tsx,guided-setup-mount.tsx}` + test; wired `App.tsx`. **Reach (≥2 distinct paths):**
  `guided-setup-reach.ts` registers `link` (post-first-run invitation) + `contextual` (EmptyState slot) → floor met.
  **Surfaces:** `GuidedSetupInvitation` (post-first-run opt-in, EmptyState-composed, "Set up" + "Skip for now") +
  `GuidedSetupSlotButton` (the `EmptyState.guidedSetup` slot content for empty module surfaces). **Mount:** `guided-setup-store.ts`
  (`none|invited|running` phase, Zustand/ephemeral BR-RT-6) + `GuidedSetupTakeover` (lifts module+theme selections to the
  flow · `renderStepBody` modules→ModulePickerView/theme→ThemePickerView-with-active-mode · live preview via `onPreview` ·
  commit→onClose). **App.tsx**: fixed opaque overlay over the still-mounted router (no route-state loss) + minimally
  stateful `UIProvider selection` (live preview real; full switcher stays deferred) + onboarding handoff `invite()`s once
  post-completion (reject → no invite, onboarding retry preserved). `onboarding.tsx` NOT edited. tsc 0 · eslint 0 ·
  **onboarding 61/61 · App.tsx 6/6 · App.integration 4/4 · full @vida/web 508/508**. **Visual Gate PASS** (Brave; invitation
  AA 4.94–17.29 × 3 presets × L/D × 375/768/1440 · 0 overflow · **E2E live preview** — picking a theme re-roots the whole
  flow through App's selection). **g2 independent review = SHIP** (NIT-1/2 folded: added 3 `<App/>`-level tests covering
  reach-path-(a) — invitation appears post-completion · Skip returns to app · Set up opens the flow; NIT-3 cosmetic, by design).
- **✅ UNIT COMPLETE (S1–S4).** All 4 slices built + gated + Visual-Gate-PASS + g2-SHIP. **Next: push branch → open PR → LIF-216 in-review.**

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
- 2026-10-12 — **S2 module enable-set picker ✅** (`9c7d218` is S1; this = S2). `modules.ts`/`use-module-selection.ts`/
  `module-picker.tsx` + test (PLAN-s2-module-picker.md). Mirrors the dock's `visibleDockGroups()` → honest default (all
  visible-dock ON); `aria-pressed` toggle chips grouped by `ModuleGroup`. tsc 0 · eslint 0 · onboarding 47/47 · Visual
  Gate PASS (AA 4.94–6.03 · state-diff 4.39–5.27 · 0 overflow, Brave 3×2×3) · g2 SHIP (type="button" NIT folded) · onboarding
  CLAUDE.md currency added (guided-setup §). Throwaway harness deleted. Next: **S3 — theme picker + live preview (EC-5)**.
- 2026-10-12 — **S3 theme picker + live preview ✅** (`use-theme-selection.ts`/`theme-picker.tsx` + test; PLAN-s3-theme-picker.md).
  `aria-pressed` single-select preset swatches; `preview` drives the injected app-owned selection lever (live in M1).
  **Key find (Visual-Gate-caught twice):** per-preset palette bands need a `getComputedStyle` probe under `<html>` (the
  active `<body>` preset scope out-specifies nested `<Theme>`), run in a POST-PAINT effect (render-time read sees
  undefined vars → cells=0/0/0 → 4/4/4 after moving useMemo→useEffect). tsc 0 · eslint 0 · onboarding 55/55 · Visual Gate
  PASS (bands distinct 3/3 · AA 13.0–15.7 · ring ≥5.93 · live-preview re-root · 0 overflow) · g2 SHIP (3 NITs folded/noted)
  · onboarding CLAUDE.md currency added. Throwaway harness deleted. Next: **S4 — reach wiring + app-mount + unit PR (EC-1)**.
- 2026-10-12 — **S4 reach + app-mount ✅ — UNIT COMPLETE.** `guided-setup-{store,reach,entry,mount}.tsx` + test; `App.tsx`
  wired (stateful selection + fixed overlay + post-completion `invite()`). 2 reach paths (`link`+`contextual`) clear the
  ≥2 floor; live preview re-roots the app via App's selection. tsc 0 · eslint 0 · onboarding 61/61 · App 6/6 · full
  @vida/web 508/508 · Visual Gate PASS (invitation AA + E2E live preview) · g2 SHIP (added 3 `<App/>` seam tests for
  reach-path-(a); onboarding.tsx untouched). CLAUDE.md currency + PLAN-s4 written. **Next: push → PR → LIF-216 in-review.**
