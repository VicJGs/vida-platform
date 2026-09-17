# Task: xs-capability
# Status: done
# Linear: LIF-169
# Profile: Add Backend Component
# Scenario: Default
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Capability registry + enforcement services (ADR-010; XCU-07, SP-28/29/32).

## Dependencies
- (none)

## Route History
- 2026-09-17 — Step 0 BASELINE (foundation/capability current-* verified current) → Step 1 interpretation → Step 2 Decomposition Gate. Ratify mode (P3 4 legs) + recovery flavor (AR-7 registry built). Gate-1 /critique REVISE(R1-R4)→fixed→SHIP · **Approval 1** · /preflight BLOCKED(B1)+A1/A2→resolved via ADR-008:119-121→PASSED · gate-2 /critique SHIP · **Approval 2**. Spec set: docs/specs/foundation/xs-capability/{delivery,service}/.

## Build Steps
- [x] S1 — enforcement decision core + grant reads (enforcer.ts + types.ts + index.ts + __tests__/enforcer.test.ts). Verification Gate PASS: typecheck 0 · 811+16 core tests green · lint clean · live-store smoke (better-sqlite3 + migration 005 + Repository). Post-impl /critique REVISE→P1 (total fail-closed default + INV-9 sensitivity-consumer-contract)→fixed→SHIP.
- [x] S2 — grant lifecycle writes (grant/revoke) → Verification Gate PASS: typecheck 0 · 819 core tests green · lint clean · live-store smoke. ⚠ Live gate caught a real seam bug: `Repository.findWhere` does NOT apply the soft-delete filter (only findAll/findById/count do) → getGrant/revoke must filter `isNull(deleted_at)` explicitly (fixed via `activeGrant()` clause). A mocked test would have hidden it.
- [x] S3 — offered-set resolver (offered-set.ts: resolveOfferedSet inline=union/standalone=restrict) → Verification Gate PASS: typecheck 0 · 824 core tests green · lint clean · live-store smoke (inline union · standalone restrict · empty/stale/soft-deleted palette).
- [x] Currency §XXIX — refreshed docs/core/capability/current-spec.md + current-business-rules.md (BR-9..17) + foundation/capability/CLAUDE.md; reconciled stale AR-7 deferrals (enforce/re-grant now BUILT at #31; execution sandbox/DSL/UI → #116).
