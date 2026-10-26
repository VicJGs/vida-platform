# Task: preferences-rescope
# Status: in-progress
# Linear: LIF-247
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Preferences live close: Settings + onboarding writes persist (the hub)

## Goal
Preferences live close: Settings + onboarding writes persist (the hub). Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
register `preferences` · fe-settings 6 STUB legs persist · theme persistence · home arrangement persist/hydrate · locale readers · gamification persona setter · `usePreferences` fake success (ELC-6) · fe-settings ❌ ECs · onboarding writes (module/theme selections) + its ❌ EC + EmptyState first consumers

## Ledger home
docs/features/preferences/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- (none beyond data-plane-wiring — the hub)

## Progress (entity-rescope path) — worktree `.claude/worktrees/preferences-rescope` (branch `preferences-rescope` @ c025710)
- [x] Step 0 baseline: `docs/modules/preferences/current-*` (② surface plane added)
- [x] Step 1 Documentation Gate: `delivery/documentation-gate.md` rev 4
- [x] Steps 2–3 Interpretation + Gate: `delivery/interpretation.md` rev 5 (Victor: U1 → intake G5; A6 = drift; A13 → architecture)
- [x] Step 3.5 Envision: SKIP, ECs carried (EC-P1 withdrawn: `game` is a module, not a theme)
- [x] Step 4 Reconciliation: `delivery/reconciliation.md`, DRY at pass 9 (72 rows after Re-scope Gate corrections)
- [x] Step 5 Re-scope Gate: `delivery/slice-map.md` re-scope slices **APPROVED by Victor 2026-10-21** (R1 → R8 + R-T)
- [x] R1 write integrity — Verification Gate PASS 2026-10-21 (PLAN-R1 §8); awaiting Victor's commit go
- [x] R2 live preferences seam — Verification Gate PASS 2026-10-22 (PLAN-R2 §7); committed + pushed
- [x] Merge origin/main `f796c34` (fe-calendar #157/#158): composition-root = main's pure `composeServices` + R2 preferences + R1 lock in `build()`; the pure compose test now runs over the locked db (nested-tx deadlock guard)
- [x] R3 boot/Appearance — PLAN-R3 rev 2.2 + IMPL rev 3.1 (Victor 2026-10-26). Build steps 0–23 done (uncommitted): 16b loop guard + Retry · 17 Home live arrangement · 18 store/bridge 10 fields · 19 blast radius · 20 mutations #1–#5 killed · 21 suite 895/895, tsc 0, eslint 0 · 22 live Visual Gate items 9–14 PASS (no-flash w/ negative control · arrangement first frame · states · 108-cell matrix text ≥4.52/axe 0/0 overflow · persistence · boot +70 ms ≈ noise) · 23 docs §XXIX + independent /critique REVISE→folded→**SHIP**. Victor `visual-approved` 2026-10-26 → committed. **Next: R4 reduce-motion.**
- [ ] Step 6 slices (remaining): R3 boot/Appearance → R4 reduce-motion → R5 Modules+⌘K → R6 Locale/Notif → R7 onboarding → R-T transition → R8 entity close (ELC-1…9)
- [ ] Owed at close (from the main checkout): mint the i18n platform unit (task + Linear) · write cross-unit edges onto owning tasks

## Route History
- 2026-10-21 Victor corrections: U1 (intake G5) · A13 (architecture > planning artifacts) · `game` = module, not theme (fe-gamification EC-1/2 re-pinned).

- 2026-10-22: paused after R2 at Victor's request (commit + push, review before R3). Next: PLAN-R3.
- 2026-10-22: merged origin/main (`f796c34`). R3 gated (Approvals 1+2). Build 0–16.

| Step | Detour | Why | Resolved |
|---|---|---|---|
| merge | composition-root conflict (main's pure `composeServices` vs R1 lock + R2 prefs) | both sides edited `build()` | ✅ lock applied in `build()`; lock test split out; pure test runs over the locked db |
| R3 step 16 | refetch loop on a first-read error — PLAN-R3 R3-BR-2's "refetches once on mount" contradicted query-core 5.101.4 + the governing `state-conventions.md` §3 | plan premise drifted from the doc | ✅ Victor 2026-10-26: PLAN-R3 rev 2.2 / IMPL rev 3.1 — corrected TO the doc (`retryOnMount: false` + §3 Retry affordance); build step 16b |
| R3 step 16 | pane tests import the real composition root via `useSettings()` | blast radius missed | ✅ `compositionRootMock()` added to 3 pane tests |

## Knowledge Loaded
- `docs/features/preferences/delivery/{slice-map,reconciliation,interpretation}.md` · `sessions/PLAN-R2-live-seam.md` — R3 PLAN
- fe-settings / fe-home / fe-gamification `envision.md` ECs · `docs/core/architecture/state-conventions.md` §3.1 — R3 PLAN
- `docs/modules/preferences/current-*` · web-client-runtime `current-business-rules.md` — preflight
- `@tanstack/query-core` 5.101.4 `retryer.js` · `queryObserver.js:445` · `focusManager.js` — the loop triage

## Failures This Session
- F008 — cold first-test timeouts + calendar dense-day fail even alone at load 300–400 — environmental (reproduced on `main`), recorded
- (new, unnumbered) — first-read-error refetch loop — **open**, deviation pending approval

