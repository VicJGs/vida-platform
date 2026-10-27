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
- [x] Merge origin/main `c09346c` (LIF-250 #159 + notes close-out #161): 4 doc conflicts resolved by meaning; `getServices()` now clears a rejected build around the R1-locked `build()` — R3's recorded `buildPromise` limit is gone. tsc 0 · targeted 252/252.
- [x] R4 reduce-motion — **PLAN-R4 rev 2: Approval 1 (Victor 2026-10-26) incl. §XXVIII D-R4-1** (hook reads a provider context fed by the same prop as the `data-vida-motion` attribute — the attribute-observer reading races first paint). Critique REVISE (4 blocking) folded. Found: 13 CSS gates (calendar-motion added post-ledger) + an ungated Sigma camera (R4-BR-8). IMPL-PLAN-R4 rev 2: /preflight PASSED · **Approval 2 (Victor) incl. D-R4-2/3/4**. Built TDD 1–11 · mutations 11/11 killed · ui 764/764 · web 999/999 · tsc 0 · eslint 0 err · live Visual Gate PASS (9/13 gates live-proven, 4 unit-proven) · **Victor `visual-approved` 2026-10-27** · pre-ship /critique REVISE (doc currency) → folded → **SHIP** · committed. **Next: R5 Modules + ⌘K.**
- [x] Merge origin/main `5769ab1` (mod-routines #162/#163; known-failures.md F008-variant/F009 both kept). tsc 0 core/ui/web.
- [~] R5 Modules + ⌘K — **PLAN-R5 rev 2: Approval 1 (Victor 2026-10-27), D-R5-1 = A + A1** (Alt+P by `e.code`; `pinCommand` creates absent rows); option D (Settings pinned-commands row) → edge at R8. Critique REVISE (4 blocking: pin no-op on absent key · pin off-chain · index-tracked active option · `e.key` on mac) folded. IMPL-PLAN-R5 rev 2: /preflight PASSED (run 1 BLOCKED on R3-BR-10 copy, folded) · gate-2 critique REVISE (3 blocking: awaited invalidate · SR can't learn Alt+P · nav→settings cycle) folded · **Approval 2 (Victor) incl. D-R5-2 (dock unmounted → unit-proven) + D-R5-3 (`pinCommand` label params)**. **Next: TDD build steps 0–15.**
- [ ] Step 6 slices (remaining): R5 Modules+⌘K → R6 Locale/Notif → R7 onboarding → R-T transition → R8 entity close (ELC-1…9)
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
| R3 /critique | pre-ship critique REVISE: boot cost unmeasured · C8 stale · failed later-error Retry leaked focus | gaps the tests didn't cover | ✅ measured (+70 ms vs merge base) · C8 fixed · end-Retry-on-settle + re-key status (mutation #5) → SHIP |
| R3 step 22 | matrix graphics probe measured text-only rail buttons, then Select borders | probe over-reached WCAG 1.4.11 | ✅ narrowed to identifying graphics; low boundaries recorded in decisions.md |
| R4 step 0 | merge origin/main — 4 doc conflicts (decisions · known-failures · session-log · web-client-runtime BRs) | both sides appended | ✅ resolved by meaning (`c09346c`) |
| R4 PLAN g1 | critique REVISE: attribute-observer hook races first paint (uSES subscribes passively) · doc rows missing · guard un-importable · Sigma camera ungated | PLAN premise wrong on React + sweep incomplete | ✅ rev 2 · §XXVIII D-R4-1 (context carrier) Victor-approved |
| R4 IMPL g2 | critique REVISE: `clearCodec` runs on every theme swap · Sigma duration 0 → NaN frame | PLAN rev 2 premises false on disk | ✅ D-R4-2/3/4 Victor-approved at Approval 2 |
| R4 Visual Gate | 3 timed-out runs: /tmp/vg empty · guided-setup overlay · ambiguous "Modules" + no cleanup on error | harness drift | ✅ repo playwright-core · Skip for now · scoped locator · finally-close (playbook memory) |
| R4 /critique | pre-ship REVISE: stale doc statuses + D9 row's superseded design + PLAN lines contradicting D-R4-2/3 | doc currency | ✅ folded → SHIP |

## Knowledge Loaded
- `docs/features/preferences/delivery/{slice-map,reconciliation,interpretation}.md` · `sessions/PLAN-R2-live-seam.md` — R3 PLAN
- fe-settings / fe-home / fe-gamification `envision.md` ECs · `docs/core/architecture/state-conventions.md` §3.1 — R3 PLAN
- `docs/modules/preferences/current-*` · web-client-runtime `current-business-rules.md` — preflight
- `@tanstack/query-core` 5.101.4 `retryer.js` · `queryObserver.js:445` · `focusManager.js` — the loop triage
- 2026-10-26: `docs/core/architecture/state-conventions.md` §2/§3/§4 · `performance-strategy.md` §5 · `query.js:411-417` (fetchState) — rev 2.2 grounding
- 2026-10-26: `.claude/docs/decisions.md:138,162` · `standards/design.md:218` · `standards/engineering.md:117` (WCAG 1.4.11) · `standards/process.md` §XXVIII — Retry design + gate
- 2026-10-26: memory `visual-gate-playbook` — Step 22 live gate
- 2026-10-26/27 (R4): `slice-map.md` R4 · `reconciliation.md` D8/D9 + §H · `interpretation.md:148-156` · fe-codec-theme `seam-contract.md` · `docs/ui/token-pipeline/current-business-rules.md` B12 · `standards/motion.md` §Reduced Motion · `packages/ui/src/{provider.tsx,hooks/use-reduced-motion.ts,internal/*-styles.ts}` · `apps/web/src/stores/theme-store.ts` · React 19.2.4 `react-dom-client.development.js:8144` (uSES passive subscribe) · sigma 3.0.3 `settings.d.ts:42-48` + `sigma.esm.js:199,425,595` · query-core 5.101.4 types — PLAN/IMPL-R4

## Failures This Session
- F008 — cold first-test timeouts + calendar dense-day fail even alone at load 300–400 — environmental (reproduced on `main`), recorded
- (new, unnumbered) — first-read-error refetch loop — **resolved** 2026-10-26: PLAN-R3 rev 2.2 (`retryOnMount: false` + §3 Retry), mutation #4
- F008 (2026-10-26 variant) — 2 `App.test` timeouts at load ~40 → 12/12 alone ×2 — environmental, recorded
- Visual-Gate harness (not product): OPFS `createSyncAccessHandle` "another open Access Handle" on reopening a persistent profile right after close → 4 s pause + retry · the no-flash probe first missed the transparent-root UA canvas (negative control caught it) — resolved
- F008 (2026-10-26 R4 merge) — targeted run 8 fails at load ~270 → 1 fail (`App.integration` ⌘K→/notes, cold lazy-chunk 5 s timeout) → passes alone ×2 (1.9 s) — environmental, recorded
- R4 Visual-Gate harness (not product): 3 timed-out runs — /tmp/vg deps gone · guided-setup overlay intercepted clicks · strict-mode "Modules" + no ctx cleanup → node hung — resolved (playbook memory)
- R4 F008 variants — `tabs.test` first test 5.9 s cold (23/23 alone) · full apps/web run killed at the 2 h limit with sed-buffered output (32 KB) → chunked 999/999 — environmental, recorded
