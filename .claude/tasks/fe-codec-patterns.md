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
- [~] S1 — The 8-state machine (`apps/web` state-conventions EXTEND; Verification Gate) ← IMPLEMENTED
      Spec `s1-eight-state-machine.md` · §XXVI double-gate (g1 REVISE→4 folded · preflight PASSED · g2 SHIP).
      `apps/web/src/state-conventions/interaction-state.ts` (+test): `InteractionState` 8-superset · `collapseToTerminal`
      (exhaustive switch/never, total) · `deriveInteractionState` (idle on empty-query-alone; typing; results remap;
      unavailable=producer-only) · `renderKindFor`/`INTERACTION_RENDER`. Currency: state-conventions.md §1/§3 + CLAUDE.md.
      Verification Gate: interaction-state 16/16 · state-conventions 29/29 · tsc 0 · eslint 0 · App.integration 4/4 isolated
      (full-suite re-run confirming). Worktree deps built (@vida/types/core/ui dist).
- [ ] S2 — `ReducedMotion` (`@vida/ui`; Visual Gate)
- [ ] S3 — `EmptyState` teaching-invitation (`@vida/ui`; Visual Gate)
- [ ] S4 — `SyncStatus` + `HonestProgress` (`@vida/ui`; Visual Gate)
- [ ] S5 — Conventions: `ReachabilityRegistry` · `ProviderRead` · `VoiceCopy` (`apps/web`; Verification Gate)

## Key resolutions (doc-grounded — interpretation §6)
- No new canon / no `@vida/types` consolidation — 8-state = the SearchStatus superset pattern, collapses to `@vida/core` `TerminalState`; consolidation deferred + is the canon owner's job [state-conventions.md:44-52].
- Homes follow BR-2: `@vida/ui` can't import `@vida/core` → rendering primitives take state as a prop; canon-importing logic + app conventions live in `apps/web`.
- Envision Gate SATISFIED by the gated P4/P5/P6 specimens (no re-greybox).
