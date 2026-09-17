# Session 2026-09-17 — xs-capability (#31, LIF-169)

**Task completed.**

Profile: add-backend-component / Default (Entity Delivery Flow v1). Branch `backend-replan`. Commit `f4937e9`.

## Goal
First M1.1.1 module build (head #31) — the ADR-010 declare→grant→enforce **envelope-enforcement service tier** over
the AR-7 capability registry.

## Delivered
- `packages/core/src/foundation/capability/enforcer.ts` — `createCapabilityEnforcer`: `checkAction`/`assertPermitted`
  (fail-closed decision core, shipped-bypass, total default) · `getGrant`/`isEnvelopeCurrent` · `grant`/`revoke` ·
  `canonicalEnvelopeHash` · `SENSITIVE_MODULE_CLASSES`
- `offered-set.ts` — `createOfferedSetResolver`: `resolveOfferedSet` (inline=union / standalone=restrict)
- `types.ts` (+ enforcement types/errors), `index.ts` (exports), `__tests__/{enforcer,offered-set}.test.ts`
- Spec set: `docs/specs/foundation/xs-capability/{delivery,service}/` · Currency: `docs/core/capability/current-*`
  (BR-9..17) + `foundation/capability/CLAUDE.md`

## Gate trail
Step 0 baseline → Step 1 interpretation → Step 2 Decomposition Gate: gate-1 /critique REVISE (R1–R4) → SHIP · Approval 1
· /preflight BLOCKED (B1 hash asymmetry → resolved via ADR-008:119-121) → PASSED · gate-2 /critique SHIP · Approval 2.
S1/S2/S3 each Verification-Gate-passed (live-store smoke). Post-impl: S1 REVISE (P1 total fail-closed + INV-9) → SHIP;
final S2/S3 SHIP (N1 folded).

## Verification
typecheck 0 · @vida/core **824 tests green** (36 files, +28 new) · lint clean.

## Gate-caught defects (not green-test-caught)
1. Fail-closed default hole — an unrecognized action returned `undefined` → TypeError. Fixed (defensive `default`).
2. `Repository.findWhere` does NOT apply the soft-delete filter → revoked grants still resolved. Fixed via
   `activeGrant()` = `isNull(deleted_at)`. Memory saved: [[repository-findwhere-skips-softdelete-filter]].

## Scope boundary (grounded, no invention)
#31 = envelope decision (the *what*). Execution sandbox/DSL/UI → #116; per-source layer → #44; egress mediation → #43;
effect firing → #32. Two Victor drift-catches corrected: (a) don't present a doc-closed choice as an A/B fork
(XCU-07 "no new column/table" is a FACT); (b) B1 was already solved in ADR-008:119-121 (declaration = {bindings,effects}).

## Next
Head **#32 xs-effect-rail** (M1.1.1, deps none).
