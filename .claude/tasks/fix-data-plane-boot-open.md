# Task: fix-data-plane-boot-open
# Status: in-progress
# Linear: LIF-250
# Profile: Bug Fix / Hotfix
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: fe-calendar #19 S7 live Visual Gate (2026-10-22, PR #157) — Victor: "file the database boot problem as a fix needed (file it properly in the plan and also in the order)"
# Title: Data-plane boot: DB worker open times out (dev intermittent · prod build never opens)

## Goal
Repair the Done `data-plane-wiring` (#59, LIF-237, PR #148): the DB worker's `open` RPC times out after 15 s —
intermittently on the dev server (the app's Retry recovers), and on EVERY load of the production build (the worker never
requests its wasm). Then re-time the fe-calendar Year range on a booting production build (S7 budget ≤ 1 s).

## Bug unit (the analysis — §XXX TRIAGE)
`docs/specs/fixes/data-plane-boot-open/_index.md` — findings · facets (3 labelled hypotheses, root cause UNKNOWN) ·
files · acceptance (10/10 boots dev + prod · Year re-time · a production-build OPFS smoke).

## Order (golive-replan G3 placement rule)
`#60` in `delivery-structure-reconstruction/reconstructed-structure.md` — right after `data-plane-wiring` (#59), ahead of
the M1.2.4 debt units (L1/L2): a repair of a Done unit is debt (`g3-order.md` §1), and every live surface sits behind the
boot (BR-RT-BOOT). Wave **L0′** in `g3-order.md` §2. Plan row: `golive-replan/debt-plan.md` §1.

## Dependencies
- blocked by `data-plane-wiring`

## Build Steps
Plan of record: `docs/specs/fixes/data-plane-boot-open/_index.md` § Resolution + § Build steps (triage 2026-10-22,
root cause FACT: the fixed 15 s client RPC timer fails a live first-run `open` — module eval + 32 migrations).
- [x] 1. `web-adapter.ts` single-flight bootstrap
- [x] 2. `worker.ts` receipt ack + idempotent `open` (+ worker test)
- [x] 3. `client.ts` per-op deadline (open/migrate ack watchdog) + `client.test.ts` rewrite
- [x] 4. `composition-root.ts` clear `buildPromise` on rejection (+ test)
- [x] 5. Prod-build Playwright config + boot smoke + `e2e` script
- [x] 6. Verify: 10/10 dev + prod (fresh · reload · 3-parallel load) · Retry probe · Year re-time · suites/tsc/eslint
- [ ] 7. §XXIX currency (F007 · web-client-runtime current-* · decisions) + commit/PR

## Route History
- 2026-10-22 — worktree `.claude/worktrees/fix-data-plane-boot-open` off origin/main `8f2542b`. Steps 1–2 (reproduce +
  triage) done; re-grounded in `docs/` per Victor; Step 3 impact scan CLEAR (only break = `client.test.ts:96-107`, which
  encodes the defect); Step 4 plan written to the spec. Deviation §XXVIII: filing acceptance item 3 (pagehide release /
  retry-with-backoff) replaced — it targeted a refuted hypothesis.
- 2026-10-22 — plan approved (Victor); Steps 1–6 built + verified (unit tests mutation-checked; dev/prod boot matrix
  incl. 3-parallel load all green; Year median 347 ms on prod); engineering gate PASS; currency done.
