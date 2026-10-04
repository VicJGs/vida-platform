# Task: fe-codec-patterns
# Status: in-progress
# Linear: LIF-211
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #2 · EXTEND ux-4

## Goal
② Frontend — unit #2. CODEC · Pattern-kit — EmptyState·SyncStatus·ReducedMotion·VoiceCopy·ReachabilityRegistry·ProviderRead + the 8-state machine.

## Dependencies
- blocked by `fe-codec-theme` (Done — PR #74)

## Slice Progress (Entity Delivery Flow ② · worktree `.claude/worktrees/fe-codec-patterns`, branch `worktree-fe-codec-patterns`)
- [x] **Front matter** — interpretation · slice-map · seam-contract (authored 2026-10-04, Step 0 BASELINE + Step 1 + Step 2)
      → gate-1 /critique REVISE→4 folded (collapse-not-a-map precision · `saving` honesty · state→primitive mapping added · ProviderRead teeth honest) → **Approval 1 GRANTED (2026-10-04)**
- [x] S1 — The 8-state machine (`apps/web` state-conventions EXTEND; Verification Gate) ✅ `3b35ad2`
      Spec `s1-eight-state-machine.md` · §XXVI double-gate (g1 REVISE→4 folded · preflight PASSED · g2 SHIP).
      `apps/web/src/state-conventions/interaction-state.ts` (+test): `InteractionState` 8-superset · `collapseToTerminal`
      (exhaustive switch/never, total) · `deriveInteractionState` (idle on empty-query-alone; typing; results remap;
      unavailable=producer-only) · `renderKindFor`/`INTERACTION_RENDER`. Currency: state-conventions.md §1/§3 + CLAUDE.md.
      Verification Gate: interaction-state 16/16 · state-conventions 29/29 · tsc 0 · eslint 0 · App.integration 4/4 isolated
      (full-suite re-run confirming). Worktree deps built (@vida/types/core/ui dist).
- [x] S2 — `ReducedMotion` — **RATIFY (no new component; Victor-confirmed 2026-10-04)**. Baseline caught: the B12 enforcer
      already exists — `useReducedMotion()` (exported, JS-driven `animation`-prop gate) + the `@media`/`motion.ts`
      convention in every animating `*-styles.ts` (sweep = 0 unguarded). Corrected interpretation W2→RESOLVED/R5 +
      slice-map S2 (build→ratify); named the codec primitive on the hook. No new component, no Visual Gate.
- [x] S3 — `EmptyState` teaching-invitation (`@vida/ui`; Visual Gate) ✅
      Spec `s3-empty-state.md` · §XXVI double-gate (g1 REVISE→2 folded: $subheading→$heading · title heading-semantics;
      preflight PASSED · g2 SHIP) · pre-ship /critique SHIP (1 a11y-merge hardening, Card N1). `components/empty-state.tsx`
      (+stories +test) · barrel · CLAUDE.md. role=group named by title (title also role=heading aria-level 2,
      titleLevel-overridable); slots icon/children/action/guidedSetup; direct semantic tokens.
      **Visual Gate PASS (Brave, 6-cell preset×mode matrix + 375):** fonts swap (Spectral/Fraunces/Source Serif 4) ·
      accent reaches the Button (ink-blue/oxblood/olive) · surfaces swap · full-matrix AA (title 15.8–17.3 / body
      4.94–6.53, BOTH modes incl. warm-dark) · 375 layout clean. 8/8 unit · tsc 0 · eslint 0.
- [x] S4 — `SyncStatus` + `HonestProgress` (`@vida/ui`; Visual Gate) ✅
      Spec `s4-sync-status.md` · §XXVI double-gate (g1 REVISE→3 folded: $pill→$full · indeterminate valuenow-omitted APG ·
      B12 scaleX-not-width; preflight PASSED · g2 SHIP · pre-ship SHIP). Deferred-item RESOLVED (P4): honest M1 =
      `saved`/`error`, no `saving`, no cloud claim; cloud states = M3 seam. `components/sync-status.tsx` +
      `internal/sync-status-styles.ts` (+stories +test) · barrel · CLAUDE.md. Dot = direct semantic signal tokens
      (preset-invariant); HonestProgress role=progressbar (determinate scaleX / indeterminate valuetext + shimmer).
      **Visual Gate PASS (Brave, 6-cell):** label AA 4.52–5.22 both modes · dot preset-INVARIANT (rgb 16,185,129) ·
      ARIA valuenow 35/80 + indeterminate omitted · no sync/cloud/saving copy. 10/10 unit · tsc 0 · eslint 0.
- [ ] S5 — Conventions: `ReachabilityRegistry` · `ProviderRead` · `VoiceCopy` (`apps/web`; Verification Gate)

## Key resolutions (doc-grounded — interpretation §6)
- No new canon / no `@vida/types` consolidation — 8-state = the SearchStatus superset pattern, collapses to `@vida/core` `TerminalState`; consolidation deferred + is the canon owner's job [state-conventions.md:44-52].
- Homes follow BR-2: `@vida/ui` can't import `@vida/core` → rendering primitives take state as a prop; canon-importing logic + app conventions live in `apps/web`.
- Envision Gate SATISFIED by the gated P4/P5/P6 specimens (no re-greybox).
