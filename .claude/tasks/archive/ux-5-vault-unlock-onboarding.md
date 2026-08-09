# Task: ux-5-vault-unlock-onboarding
# Status: done
# Linear: LIF-94
# Profile: New Feature
# Scenario: Default
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ⑤ UX

## Goal
Design the vault-unlock + first-run onboarding flow: account/vault creation, the unlock gate on
every launch, and the zero-knowledge explanation that sets expectations (your data never leaves
the device in plaintext). The front door — depends on the crypto/vault lifecycle (AR-3).

## Dependencies
- blocked by `ux-1-information-architecture`

<!-- ar-3 (crypto/vault, M3) removed 2026-07-28: an M1.0 design issue cannot be build-blocked by M3 impl.
     The vault-unlock-coupled part is already carved to ux-5b-vault-unlock (M3). This M1.0 issue = the
     basic first-run/onboarding flow design, blocked only by ux-1 (IA). ar-3 stays an impl-time note. -->
Note: this M1.0 issue is the first-run onboarding DESIGN; vault-unlock impl lives in ux-5b (M3).

## Completion (2026-08-09)
Delivered the first-run onboarding **design model** (new-feature/Default) — a doc + a typed declarative artifact;
**no rendered component, no Visual Gate** (screens deferred to UI-4; the deliverable shape fixed by authority
ADR-019/new-feature + not-visual-gated-by-render-table + `impl UI-4` — same as UX-3/UX-4).

**Shipped:**
- `apps/web/src/onboarding/steps.ts` — `ONBOARDING_STEPS` (welcome·privacy·vault·ready) + per-step
  `OnboardingCopyContract` (BR-4 copy-honesty: `m1` M1.0 local-first / `m3?` M3 ZK, gated).
- `apps/web/src/onboarding/first-run.ts` — `isFirstRun` + `FIRST_RUN_COMPLETE_KEY` (`'first_run:completed'`,
  device-local `app_state`) + `FIRST_RUN_BRANCH` (the App.tsx seam as data).
- `+ steps.test.ts / first-run.test.ts` (8) · `onboarding/CLAUDE.md` · `docs/core/architecture/onboarding.md` (+README row).
- Spec trail: `docs/specs/foundation/ux-5-onboarding/` (baseline · PLAN · IMPLEMENTATION-PLAN).

**Design decisions:** everything crypto/auth is a **deferred seam** (AR-3/UX-5b/M3) — no step presumes a vault key
(ADR-017: auth off in M1.0). Two-signal independence: the onboarding branch keys ONLY on the `first_run:completed`
marker, NOT `exists()` (they disagree on first launch by design). The device-local marker is deliberately distinct
from the synced `UserProfile.onboarding_completed`. First-run is a boot-phase branch in `App.tsx` (not a route);
UI-4 wires it (no `App.tsx`/`routes.tsx`/schema edit this unit).

**Gates:** §XXVI double-gate — gate-1 critique REVISE (2 blockers: wrong app_state path · barrel-vs-precedent →
fixed) → Approval 1; /preflight PASSED + 2 folds (vitest import order · unnecessary `!`); gate-2 critique SHIP + 2
material integrity fixes (key-name collision vs synced flag → namespaced `first_run:completed` · citation path) →
Approval 2. Both critiques independent/adversarial.

**Verify:** @vida/web typecheck 0 · @vida/web **87/87** (+8) · root typecheck 10/10 · lint 0-err.

**Unblocks:** UI-4 (#30, renders + wires it). Feeds UX-5b (#M3, adds real vault/unlock). Leaf otherwise.

## Route History
- 2026-08-09 picked up as #-order head (← UX-1 ✅); new-feature/Default; full §XXVI double-gate; shipped as design model.
