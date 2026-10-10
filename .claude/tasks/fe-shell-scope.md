# Task: fe-shell-scope
# Status: in_progress
# Linear: LIF-219
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #15 · NEW (from LIF-199 split)

## Goal
② Frontend — unit #15. SHELL · Bar 1 + the Spaces scope-selector (global scope) + 6 global surfaces redistributed.

## Dependencies
- blocked by `fe-shell` — **satisfied** (PR #118 merged; `apps/web/src/shell/` on origin/main).

## Branch
`fe-shell-scope` (off origin/main @ 329e9cb) · worktree `.claude/worktrees/fe-codec-controls-refinement`.

## Delivery (Entity Delivery Flow ②) — `docs/specs/foundation/fe-shell-scope/delivery/`
- **Step 0 BASELINE** ✓ — shell/CLAUDE.md + nav/CLAUDE.md + spaces current-* all current; 5 findings (no `listSpaces`
  read · net-new scope state · owed ADR-006 amendment · Bar-1 placement · fe-spaces-page distinct).
- **Step 1 Interpretation** ✓ — `interpretation.md` (D1–D9 · N1–N5 · O1–O5 · IR1–IR7).
- **Step 1.5 Envision Gate** ✓ FIRED + **APPROVED** — `envision.md`, EC-1…EC-8. Direction: *Both — responsive split*
  (top strip + System panel); ADR-006 amendment homed forward. Greybox built→reviewed→deleted.
- **Step 2 Decomposition** ✓ **APPROVED (Approval 1)** — `slice-map.md` (3 slices) + `seam-contract.md`; gate-1 review SHIP.
  Decisions: drop "account" (no backing, redundant w/ Settings) · delete dead `global-bar.tsx` · scope = emit-to-seam.

## Slice log
- [x] **S1 — Scope selector + substrate** — `stores/scope-store.ts` (Zustand `activeSpaceId|null`) · `shell/spaces-scope.ts`
  (`SpacesScopeRead = ProviderRead<SpaceOption[]>` + stub→[]) · `shell/scope-selector.tsx` (Menu switcher, 5 states) +
  `.test.tsx` (7). Covers EC-1/EC-2. tsc 0 · lint 0 err · @vida/web **345/345** · code-review SHIP · **Visual Gate PASS**
  (5 states × light/dark/warm dark_reader × 375/1440, measured 0 AA fails). Currency: `shell/CLAUDE.md`. _(commit pending)_
- [ ] **S2 — Global surfaces, re-homed** (both forms) — EC-3/EC-4/EC-6.
- [ ] **S3 — Bar 1 assembly + dual-home wiring** (`systemPanelSlot` seam + routes + delete `global-bar.tsx`) — EC-5.

## Deferred (homed)
- Live `listSpaces` read + dangling-`activeSpaceId` reconcile → first consumer (seam-contract §E).
- Live view scoping (scope → filtered views) → ViewProviderRegistry consumers.
- ADR-006 amendment (formalize the global-scope selector surface) → tracked follow-up.
- Space CRUD + Spaces page → fe-spaces-page #20. Modules panel body (module nav) → separate re-home.
